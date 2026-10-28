import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import { ORDER_GAME } from "@/store/settings";
import BigButton from "@/components/BigButton";
import { Party } from "@/components/illust";
import { useSession } from "@/store/session";
import { useLibrary } from "@/store/library";
import { useAuth, trialLeft } from "@/store/auth";

export default function S11Done() {
  const nav = useNavigate();
  const resetStory = useSession((s) => s.resetStory);
  const story = useSession((s) => s.story);
  const imageUrl = useSession((s) => s.imageUrl);
  const saved = useLibrary((l) => l.stories.find((x) => x.storyId === story?.storyId));
  // 주인공 그림: 이번에 올린 그림, 없으면 책장 표지
  const art = imageUrl ?? saved?.cover ?? null;
  const { mode, guestNoticeShown, markGuestNotice } = useAuth();
  const left = trialLeft();
  const showNotice = mode === "guest" && !guestNoticeShown;

  return (
    <Screen back={ORDER_GAME ? "/order" : "/story"} speech="다 했어요!" segment={4}
      acts={
        <>
          <BigButton onClick={() => nav("/story")}>다시 보기</BigButton>
          <BigButton go onClick={() => { resetStory(); nav("/steps"); }}>새 이야기 만들기</BigButton>
          <BigButton onClick={() => nav("/")}>처음으로</BigButton>
        </>
      }>
      {/* 방금 만든 이야기의 주인공(아이 그림)을 도화지에 붙여 축하한다. 책장에 꽂혔다고 알려 준다 (2026-10-28 디자인) */}
      <div className="hero">
        <div className="stage hero-sheet done">
          <div className="illust-wrap">{art ? <img src={art} alt="" className="illust" /> : <Party />}</div>
          <span className="confetti" aria-hidden />
        </div>
        <div className="hero-side">
          <h2 className="hero-title">다 했어요!</h2>
          <p className="hero-sub">{story ? `「${story.title}」을 내 책장에 꽂아 두었어요` : "멋진 이야기를 만들었어요"}</p>
        </div>
      </div>

      {showNotice && (
        <div className="box warn inline">
          <span>
            {left > 0
              ? `로그인하면 이야기를 보관할 수 있어요. 체험은 ${left}편 남았어요`
              : "체험을 다 썼어요. 로그인하면 계속 만들 수 있어요"}
          </span>
          <button className="btn link" onClick={() => { markGuestNotice(); nav("/login"); }}>
            로그인
          </button>
        </div>
      )}
    </Screen>
  );
}
