import { useEffect, useState } from "react";
import LegalDoc, { LEGAL_TITLE } from "@/legal/LegalDoc";
import type { LegalKind } from "@/legal/LegalDoc";

/** 가입 동의 (2026-11-03, 팀장 결정 — 교육 목적이라 약관을 꼭 읽게 한다).
 *
 *  체크 칸이 없다. 「보기」를 누르면 화면 전체가 약관 페이지로 바뀌고,
 *  **맨 아래까지 내려가야** 동의 버튼이 나온다. 이용약관에 동의하면 개인정보 처리방침이 이어서 열린다.
 *  개인정보 수집 · 이용은 약관과 묶지 않고 따로 받는다 (개인정보 보호법).
 *  만 14세 이상 보호자 · 교사 확인은 이용약관 동의에 함께 둔다 (약관 제4조) */
const DOCS: LegalKind[] = ["terms", "privacy"];

const AGREE_LABEL: Record<LegalKind, string> = {
  terms: "만 14세 이상의 보호자 또는 교사이며, 이용약관에 동의합니다",
  privacy: "개인정보 수집 · 이용에 동의합니다",
};

type Agreed = Record<LegalKind, boolean>;

/** 둘 다 동의하면 onChange(true) */
// 소셜 가입은 제공자 화면으로 떠났다 돌아온다. 뒤로 와서 화면이 새로 열리면 동의가 풀려 소셜 버튼이 잠겨 보였다
// (11/3 사용자) — 같은 탭 안에서는 동의한 것을 기억한다 (탭을 닫으면 사라진다)
const KEY = "storyblanks.consents";
function remembered(): Agreed {
  try {
    const v = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (v && typeof v.terms === "boolean" && typeof v.privacy === "boolean") return v;
  } catch { /* 없으면 처음부터 */ }
  return { terms: false, privacy: false };
}

export default function Consents({ onChange }: { onChange: (all: boolean) => void }) {
  const [agreed, setAgreed] = useState<Agreed>(remembered);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(agreed)); } catch { /* 저장 못 해도 된다 */ } }, [agreed]);
  const [open, setOpen] = useState<LegalKind | null>(null);

  useEffect(() => {
    onChange(agreed.terms && agreed.privacy);
  }, [agreed, onChange]);

  const agree = (kind: LegalKind) => {
    setAgreed((a) => ({ ...a, [kind]: true }));
    // 아직 동의하지 않은 다음 약관을 이어서 연다
    setOpen(DOCS.find((d) => d !== kind && !agreed[d]) ?? null);
  };

  if (open) {
    // key: 다음 약관은 새 페이지로 그려 맨 위부터 읽게 한다 (스크롤 위치를 넘기지 않는다)
    return <LegalPage key={open} kind={open} agreed={agreed[open]}
      onAgree={() => agree(open)} onBack={() => setOpen(null)} />;
  }

  return (
    <div className="consents">
      {DOCS.map((d) => (
        <div key={d} className="consents-row">
          <span className="consents-name">[필수] {LEGAL_TITLE[d]}</span>
          {agreed[d] && <span className="consents-done">동의함</span>}
          <button type="button" className={agreed[d] ? "btn link" : "btn consents-read"} onClick={() => setOpen(d)}>
            {agreed[d] ? "다시 보기" : "보기"}
          </button>
        </div>
      ))}
    </div>
  );
}

/** 화면 전체를 덮는 약관 페이지. 동의 버튼은 본문 맨 아래에만 있어 끝까지 내려야 보인다 */
function LegalPage({ kind, agreed, onAgree, onBack }: {
  kind: LegalKind; agreed: boolean; onAgree: () => void; onBack: () => void;
}) {
  return (
    <div className="legal-page" role="dialog" aria-modal="true" aria-label={LEGAL_TITLE[kind]}>
      <div className="legal-page-inner">
        <button type="button" className="btn link" onClick={onBack}>← 가입 화면으로</button>
        <LegalDoc kind={kind} />
        {agreed
          ? <p className="legal-page-done">이미 동의하셨습니다.</p>
          : <button type="button" className="btn go legal-page-agree" onClick={onAgree}>{AGREE_LABEL[kind]}</button>}
        <button type="button" className="btn link" onClick={onBack}>← 가입 화면으로</button>
      </div>
    </div>
  );
}
