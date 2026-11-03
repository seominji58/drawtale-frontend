import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LockIcon } from "./Screen";

/** 어른 설정(보호자 모드 켜기 · 끄기)으로 가는 자물쇠. **3초 길게 누르기로만** 연다 — 아이가 실수로 들어가지 않게
 *  (AGENTS 6장 「일부러 어렵게 되어 있는 장치」). 짧게 누르면 「3초 동안 꾹 눌러 주세요」.
 *  처음엔 S-01 에만 있었다 → 아이 화면 위 줄 어디서나 (2026-11-03 사용자 「보호자모드 들어가는 버튼 다른 페이지들에서도」).
 *  설정을 닫으면 들어오기 전 화면으로 돌아간다 (state.from) */
export default function AdultKey() {
  const nav = useNavigate();
  const loc = useLocation();
  const [held, setHeld] = useState(0);
  const [hint, setHint] = useState(false);
  const timer = useRef<number>();
  const hintTimer = useRef<number>();
  const downAt = useRef(0);
  useEffect(() => () => { clearInterval(timer.current); clearTimeout(hintTimer.current); }, []);

  const down = () => {
    const start = Date.now();
    downAt.current = start;
    setHint(false);
    clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const p = (Date.now() - start) / 3000;
      setHeld(p);
      if (p >= 1) { up(); nav("/settings", { state: { from: loc.pathname } }); }
    }, 60);
  };
  const up = () => {
    clearInterval(timer.current);
    // 짧게 눌렀으면 길게 눌러야 한다고 알려준다
    if (downAt.current && Date.now() - downAt.current < 2900) {
      setHint(true);
      clearTimeout(hintTimer.current);
      hintTimer.current = window.setTimeout(() => setHint(false), 1800);
    }
    downAt.current = 0;
    setHeld(0);
  };

  return (
    <span className="adult-key">
      <button className="round hold" style={{ "--p": `${Math.min(held, 1) * 360}deg` } as CSSProperties}
        onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="어른 설정. 3초 길게 누르세요">
        <LockIcon />
      </button>
      {hint && <span className="hold-hint">3초 동안 꾹 눌러 주세요</span>}
    </span>
  );
}
