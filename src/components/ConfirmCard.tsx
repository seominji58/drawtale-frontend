import type { ReactNode } from "react";
import BigButton from "./BigButton";

/** 「우산을 · 꽃을」처럼 받침에 맞는 「을/를」 */
export const eulReul = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "을" : "를";
};

/** 되돌릴 수 없는 일(지우기 등)을 하기 전 한 번 묻는 종이 카드 (어른 화면 크기, 2026-11-03).
 *  브라우저 확인 창은 쓰지 않는다 — 화면 안에서 묻는다. 바깥을 누르면 그대로 둔다 */
export default function ConfirmCard({ title, children, yes, no = "그대로 두기", onYes, onNo }: {
  title: string; children?: ReactNode; yes: string; no?: string; onYes: () => void; onNo: () => void;
}) {
  return (
    <div className="rename-layer" data-audience="adult" role="dialog" aria-modal="true" aria-label={title}
         onClick={(e) => { if (e.target === e.currentTarget) onNo(); }}>
      <div className="paper-card rename-card">
        <p className="rename-label">{title}</p>
        {children}
        <div className="rename-acts">
          <BigButton onClick={onNo}>{no}</BigButton>
          <BigButton go onClick={onYes}>{yes}</BigButton>
        </div>
      </div>
    </div>
  );
}
