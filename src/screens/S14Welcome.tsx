import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Friend } from "@/components/illust";
import { useAuth, trialLeft } from "@/store/auth";

/** 이 서비스가 하는 일 세 단계. 색은 이야기 단계 색을 빌린다 */
const STEPS: [string, string][] = [
  ["var(--c-place)", "종이에 그리거나 화면에 그려요"],
  ["var(--c-problem)", "장소 · 문제 · 행동 · 결과 카드를 골라요"],
  ["var(--c-action)", "내 그림이 움직이는 그림책이 나와요"],
];

/** S-14 처음 실행.
 *  주된 행동은 바로 시작하기 하나다. 로그인과 회원가입은 그 아래 작은 버튼 둘로 둔다.
 *  가입을 앞에 세우면 이 서비스의 가장 강한 순간을 보여주기 전에 사람이 나간다.
 *  2026-10-28: 이름(한칸이야기) · 하는 일 세 단계를 보이고 빈 곳을 줄였다 (사용자 「공백이 너무 많고 프로젝트 이름도 안 나와 있다」, 시안 W-Welcome) */
export default function S14Welcome() {
  const nav = useNavigate();
  const startGuest = useAuth((s) => s.startGuest);
  const left = trialLeft();

  return (
    <Screen back={null} speech={null} audience="adult" autoSpeak={false}>
      <div className="welcome">
        <div className="paper-card welcome-sheet">
          <span className="tape" aria-hidden />
          <span className="tape" aria-hidden />
          <Friend />
        </div>

        <div className="welcome-side">
          <div>
            <h1 className="welcome-name">한칸이야기</h1>
            <p className="welcome-tag">{left > 0 ? "내 그림이 주인공이 되는 이야기" : "체험을 다 썼어요"}</p>
          </div>

          {left > 0 ? (
            <ol className="welcome-steps">
              {STEPS.map(([color, text], i) => (
                <li key={text}><b style={{ background: color }}>{i + 1}</b>{text}</li>
              ))}
            </ol>
          ) : (
            <div className="box">로그인하면 이어서 만들 수 있어요. 지금까지 만든 이야기는 저장되지 않았습니다.</div>
          )}

          {left > 0 ? (
            <>
              <BigButton go onClick={() => { startGuest(); nav("/"); }}>바로 시작하기</BigButton>
              <p className="welcome-note">로그인 없이 이야기 {left}편까지 만들어 볼 수 있어요</p>
              <div className="welcome-pair">
                <BigButton onClick={() => nav("/login")}>로그인</BigButton>
                <BigButton onClick={() => nav("/signup")}>회원가입</BigButton>
              </div>
            </>
          ) : (
            <>
              <BigButton go onClick={() => nav("/login")}>로그인</BigButton>
              <div className="aside-links">
                <span>처음이신가요?</span>
                <button className="btn link" onClick={() => nav("/signup")}>회원가입</button>
              </div>
            </>
          )}
          <p className="welcome-foot">계정은 보호자와 교사의 것이에요. 아이의 개인정보는 받지 않아요.</p>
        </div>
      </div>
    </Screen>
  );
}
