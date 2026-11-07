import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Friend } from "@/components/illust";

/** 이 서비스가 하는 일 세 단계. 색은 이야기 단계 색을 빌린다 */
const STEPS: [string, string][] = [
  ["var(--c-place)", "종이에 그리거나 화면에 그려요"],
  ["var(--c-problem)", "장소 · 문제 · 행동 · 결과 카드를 골라요"],
  ["var(--c-action)", "내 그림이 움직이는 그림책이 나와요"],
];

/** S-14 처음 실행.
 *  가입 없이는 쓸 수 없다 (pt_docs 03 F-ACC-03 · 04, 2026-11-03 코드 반영). 주된 행동은 로그인,
 *  처음 온 분은 회원가입. 전에 있던 「바로 시작하기」(비회원 체험 2편)는 뺐다.
 *  2026-10-28: 이름(한칸이야기) · 하는 일 세 단계를 보이고 빈 곳을 줄였다 (사용자 「공백이 너무 많고 프로젝트 이름도 안 나와 있다」, 시안 W-Welcome) */
export default function S14Welcome() {
  const nav = useNavigate();

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
            <p className="welcome-tag">내 그림이 주인공이 되는 이야기</p>
          </div>

          <ol className="welcome-steps">
            {STEPS.map(([color, text], i) => (
              <li key={text}><b style={{ background: color }}>{i + 1}</b>{text}</li>
            ))}
          </ol>

          <BigButton go onClick={() => nav("/login")}>로그인</BigButton>
          <div className="aside-links">
            <span>처음이신가요?</span>
            <button className="btn link" onClick={() => nav("/signup")}>회원가입</button>
          </div>
          <p className="welcome-foot">계정은 보호자와 교사의 것이에요. 아이의 개인정보는 받지 않아요.</p>
        </div>
      </div>
    </Screen>
  );
}
