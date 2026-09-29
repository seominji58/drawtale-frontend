import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Party } from "@/components/illust";
import { useSession } from "@/store/session";
import { useAuth, trialLeft } from "@/store/auth";

export default function S11Done() {
  const nav = useNavigate();
  const resetStory = useSession((s) => s.resetStory);
  const { mode, guestNoticeShown, markGuestNotice } = useAuth();
  const left = trialLeft();
  const showNotice = mode === "guest" && !guestNoticeShown;

  return (
    <Screen back="/order" speech="다 했어요!" segment={4}
      acts={
        <>
          <BigButton onClick={() => nav("/story")}>다시 보기</BigButton>
          <BigButton go onClick={() => { resetStory(); nav("/steps"); }}>새 이야기 만들기</BigButton>
          <BigButton onClick={() => nav("/")}>처음으로</BigButton>
        </>
      }>
      <div className="stage">
        <div className="illust-wrap"><Party /></div>
      </div>
      <h2 className="question">다 했어요!</h2>

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
