import { useState } from "react";
import LegalDoc, { LEGAL_TITLE } from "@/legal/LegalDoc";
import type { LegalKind } from "@/legal/LegalDoc";

/** 가입 동의 세 가지. 개인정보 수집 · 이용은 약관과 묶지 않고 따로 받는다 (개인정보 보호법).
 *  계정은 어른 것이라 만 14세 이상인지도 받는다 (pt_docs legal 제4조) */
const ITEMS: { key: "terms" | "privacy" | "adult"; label: string; doc?: LegalKind }[] = [
  { key: "terms", label: "[필수] 이용약관에 동의합니다", doc: "terms" },
  { key: "privacy", label: "[필수] 개인정보 수집 · 이용에 동의합니다", doc: "privacy" },
  { key: "adult", label: "[필수] 만 14세 이상의 보호자 또는 교사입니다" },
];

type Checked = Record<(typeof ITEMS)[number]["key"], boolean>;

/** 세 가지를 모두 체크해야 onChange(true) */
export default function Consents({ onChange }: { onChange: (all: boolean) => void }) {
  const [checked, setChecked] = useState<Checked>({ terms: false, privacy: false, adult: false });
  const [open, setOpen] = useState<LegalKind | null>(null);
  const all = ITEMS.every((i) => checked[i.key]);

  const set = (next: Checked) => {
    setChecked(next);
    onChange(ITEMS.every((i) => next[i.key]));
  };

  return (
    <div className="consents">
      <label className="check consents-all">
        <input type="checkbox" checked={all}
          onChange={(e) => set({ terms: e.target.checked, privacy: e.target.checked, adult: e.target.checked })} />
        전체 동의
      </label>
      {ITEMS.map((i) => (
        <div key={i.key} className="consents-row">
          <label className="check">
            <input type="checkbox" checked={checked[i.key]}
              onChange={(e) => set({ ...checked, [i.key]: e.target.checked })} />
            {i.label}
          </label>
          {i.doc && (
            <button type="button" className="btn link" onClick={() => setOpen(i.doc!)}>보기</button>
          )}
        </div>
      ))}

      {open && (
        <div className="legal-sheet" role="dialog" aria-modal="true" aria-label={LEGAL_TITLE[open]}>
          <div className="legal-sheet-card">
            <div className="legal-sheet-head">
              <h2>{LEGAL_TITLE[open]}</h2>
              <button type="button" className="btn link" onClick={() => setOpen(null)}>닫기</button>
            </div>
            <div className="legal-sheet-body"><LegalDoc kind={open} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
