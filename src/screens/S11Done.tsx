import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import { ORDER_GAME } from "@/store/settings";
import BigButton from "@/components/BigButton";
import { Party } from "@/components/illust";
import { useSession } from "@/store/session";
import { useLibrary } from "@/store/library";
import { firstClip, firstFrameSrc } from "@/features/story/clip";

export default function S11Done() {
  const nav = useNavigate();
  const resetStory = useSession((s) => s.resetStory);
  const story = useSession((s) => s.story);
  const imageUrl = useSession((s) => s.imageUrl);
  const saved = useLibrary((l) => l.stories.find((x) => x.storyId === story?.storyId));
  // 주인공 그림: 동작 영상의 첫 장면(배경을 잘라 낸 캐릭터). 없으면 책장 표지, 그다음 올린 그림.
  // 올린 그림을 먼저 쓰면 사진 배경까지 나왔다 (2026-11-03 사용자 확인)
  const clip = firstClip(story);
  const art = saved?.cover ?? imageUrl ?? null;

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
          <div className="illust-wrap">
            {clip
              ? <video src={firstFrameSrc(clip)} muted playsInline preload="auto" className="illust" />
              : art ? <img src={art} alt="" className="illust" /> : <Party />}
          </div>
          <span className="confetti" aria-hidden />
        </div>
        <div className="hero-side">
          <h2 className="hero-title">다 했어요!</h2>
          <p className="hero-sub">{story ? `「${story.title}」을 내 책장에 꽂아 두었어요` : "멋진 이야기를 만들었어요"}</p>
        </div>
      </div>
    </Screen>
  );
}
