import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Friend } from "@/components/illust";
import { useAuth, trialLeft } from "@/store/auth";

/** S-14 처음 실행.
 *  주된 행동은 바로 시작하기 하나다. 로그인과 회원가입은 아래 글자 줄로 내린다.
 *  가입을 앞에 세우면 이 서비스의 가장 강한 순간을 보여주기 전에 사람이 나간다. */
export default function S14Welcome() {
  const nav = useNavigate();
  const startGuest = useAuth((s) => s.startGuest);
  const left = trialLeft();

  return (
    <Screen back={null} speech={null} audience="adult" autoSpeak={false}
      acts={
        left > 0
          ? <BigButton go onClick={() => { startGuest(); nav("/"); }}>바로 시작하기</BigButton>
          : <BigButton go onClick={() => nav("/login")}>로그인</BigButton>
      }>
      <div className="stage">
        <div className="illust-wrap"><Friend wave /></div>
      </div>

      <h1 className="question" style={{ textAlign: "center" }}>
        {left > 0 ? "그림이 이야기가 돼요" : "체험을 다 썼어요"}
      </h1>
      <p className="hint" style={{ textAlign: "center" }}>
        {left > 0
          ? `종이에 그린 그림을 찍으면 움직이는 이야기가 됩니다. 로그인 없이 ${left}편까지 만들어 볼 수 있어요.`
          : "로그인하면 이어서 만들 수 있어요. 지금까지 만든 이야기는 저장되지 않았습니다."}
      </p>

      <div className="spacer" />

      <div className="aside-links">
        {left > 0 ? (
          <>
            <span>계정이 있으신가요?</span>
            <button className="btn link" onClick={() => nav("/login")}>로그인</button>
            <span className="sep">·</span>
            <button className="btn link" onClick={() => nav("/signup")}>회원가입</button>
          </>
        ) : (
          <>
            <span>처음이신가요?</span>
            <button className="btn link" onClick={() => nav("/signup")}>회원가입</button>
          </>
        )}
      </div>
      <p className="hint" style={{ fontSize: "var(--t-label)", textAlign: "center" }}>
        계정은 보호자와 교사의 것입니다. 아이 정보는 받지 않습니다.
      </p>
    </Screen>
  );
}
