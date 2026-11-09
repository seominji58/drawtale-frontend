import { useState } from "react";
import BigButton from "./BigButton";
import { useGuardian } from "@/store/guardian";

/** 보호자 소개 카드 3장 (pt_docs 20 3-2-1 튜토리얼, 2026-11-06).
 *  처음 가입 · 로그인한 보호자에게 한 번 — 이 앱으로 할 수 있는 것 / 보호자 기능 / 보호자 비밀번호.
 *  본 것은 계정(서버 onboarded)과 기기에 기억한다. 설정 보호자 칸의 「보호자 소개 다시 보기」로 언제든.
 *  어른이 읽는 카드라 어른 화면 크기, 움직임 없음 */

const PAGES: { head: string; lines: string[] }[] = [
  {
    head: "한칸이야기로 할 수 있는 것",
    lines: [
      "아이가 그린 친구가 이야기의 주인공이 됩니다",
      "아이가 장소 · 문제 · 행동 · 결과 카드를 고르면 그림책이 만들어집니다",
      "그림책은 소리 내어 읽어 주고, 친구 그림이 장면 안에서 움직입니다",
    ],
  },
  {
    head: "보호자만 쓰는 기능",
    lines: [
      "📷 종이에 그린 그림을 사진으로 올리기",
      "🎤 아이가 말로 이야기 보태기",
      "🗣 보호자 목소리로 이야기 읽어 주기",
      "✏️ 내 소품 그리기 · 책장 제목 바꾸기 · 지우기",
      "아이 화면에서는 🔒 표시로 보이고, 보호자 비밀번호를 넣어야 열립니다",
    ],
  },
  {
    head: "보호자 비밀번호",
    lines: [
      "오른쪽 위 톱니(설정)는 아이도 열 수 있어요. 소리 · 이야기 길이처럼 아이가 바꿔도 되는 것만 열려 있습니다",
      "「보호자 칸」과 🔒 기능은 숫자 4자리 비밀번호로 엽니다",
      "비밀번호는 계정에 저장되어 다른 기기에서도 같습니다. 잊으면 다시 로그인해서 새로 정합니다",
    ],
  },
];

export default function GuardianIntro() {
  // 본인인증(AgeGate)이 먼저다
  const open = useGuardian((s) => s.intro && s.status?.ageVerified !== false);
  if (!open) return null;
  return <Cards />;
}

function Cards() {
  const [i, setI] = useState(0);
  const { closeIntro, ask, status } = useGuardian();
  const page = PAGES[i];
  const last = i === PAGES.length - 1;
  const needPin = status?.pinSet === false;
  const done = () => {
    if (last && needPin) { ask("보호자 비밀번호 만들기", closeIntro); return; }
    closeIntro();
  };

  return (
    <div className="rename-layer" data-audience="adult" role="dialog" aria-modal="true" aria-label="보호자 소개">
      <div className="paper-card rename-card intro-card">
        <p className="intro-step">{i + 1} / {PAGES.length}</p>
        <p className="rename-label">{page.head}</p>
        <ul className="intro-lines">
          {page.lines.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <div className="rename-acts">
          {i > 0 ? <BigButton onClick={() => setI(i - 1)}>이전</BigButton>
            : <BigButton onClick={closeIntro}>건너뛰기</BigButton>}
          <BigButton go onClick={last ? done : () => setI(i + 1)}>
            {!last ? "다음" : needPin ? "비밀번호 만들기" : "시작하기"}
          </BigButton>
        </div>
      </div>
    </div>
  );
}
