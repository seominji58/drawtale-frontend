import type { ReactNode } from "react";
import BigButton from "./BigButton";

/** 「우산을 · 꽃을」처럼 받침에 맞는 「을/를」 */
export const eulReul = (w: string) => {
  const c = w.charCodeAt(w.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0 ? "을" : "를";
};

/** 되돌릴 수 없는 일(지우기 등)을 하기 전 한 번 묻는 종이 카드 (어른 화면 크기, 2026-11-03).
 *  브라우저 확인 창은 쓰지 않는다 — 화면 안에서 묻는다. 바깥을 누르면 그대로 둔다 */
/** no 를 null 로 주면 알림(버튼 하나) — 브라우저 alert() 대신. busy 면 버튼을 잠근다 */
export default function ConfirmCard({ title, children, yes, no = "그대로 두기", onYes, onNo, busy = false }: {
  title: string; children?: ReactNode; yes: string; no?: string | null; onYes: () => void; onNo: () => void; busy?: boolean;
}) {
  return (
    <div className="rename-layer" data-audience="adult" role="dialog" aria-modal="true" aria-label={title}
         onClick={(e) => { if (e.target === e.currentTarget && !busy) onNo(); }}>
      <div className="paper-card rename-card">
        <p className="rename-label">{title}</p>
        {children}
        <div className="rename-acts">
          {no !== null && <BigButton disabled={busy} onClick={onNo}>{no}</BigButton>}
          <BigButton go disabled={busy} onClick={onYes}>{yes}</BigButton>
        </div>
      </div>
    </div>
  );
}
