import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import LegalDoc, { LEGAL_TITLE } from "@/legal/LegalDoc";
import type { LegalKind } from "@/legal/LegalDoc";

/** /terms · /privacy — 로그인하지 않아도 볼 수 있는 약관 화면 (2026-11-03) */
export default function SLegal({ kind }: { kind: LegalKind }) {
  const nav = useNavigate();
  return (
    <Screen back={null} speech={null} title={LEGAL_TITLE[kind]} audience="adult" autoSpeak={false}>
      <LegalDoc kind={kind} />
      <button type="button" className="btn link" onClick={() => (history.length > 1 ? nav(-1) : nav("/"))}>
        돌아가기
      </button>
    </Screen>
  );
}
