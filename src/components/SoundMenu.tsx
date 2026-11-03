import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/store/settings";
import { applyVolume, silenceAll } from "@/lib";
import { SoundIcon } from "./Screen";

/** 소리 크기 세 가지 (아이 화면이라 쉬운 말로) */
const VOLUMES = [["작게", 0.35], ["보통", 0.7], ["크게", 1]] as const;

function MuteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M17 9l5 6M22 9l-5 6" />
    </svg>
  );
}
function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" />
    </svg>
  );
}

/** C-02 소리 버튼 (2026-11-03 사용자 「소리 버튼을 누르면 볼륨 조절, 음소거, 다시 듣기 기능 리스트업 형태(버튼)」).
 *  누르면 아래로 버튼 목록이 펼쳐진다: 다시 듣기 · 소리 끄기(켜기) · 소리 크기(작게 · 보통 · 크게). 바깥을 누르면 닫힌다.
 *  소리 끄기는 S-13 「소리 전체 끄기」와 같은 설정이다. 꺼져 있으면 버튼 모양이 바뀌고 다시 듣기는 쓸 수 없다 */
export default function SoundMenu({ onReplay }: { onReplay?: () => void }) {
  const muteAll = useSettings((s) => s.muteAll);
  const vol = useSettings((s) => s.volume ?? 1);
  const set = useSettings((s) => s.set);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", off); document.removeEventListener("keydown", esc); };
  }, [open]);

  const near = (v: number) => VOLUMES.reduce((a, b) => (Math.abs(b[1] - v) < Math.abs(a[1] - v) ? b : a))[1];

  return (
    <span className="sound-key" ref={box}>
      <button className={`round ${open ? "on" : ""}`} onClick={() => setOpen((o) => !o)}
        aria-label={muteAll ? "소리 (꺼져 있어요)" : "소리"} aria-expanded={open} aria-haspopup="true">
        {muteAll ? <MuteIcon /> : <SoundIcon />}
      </button>
      {open && (
        <div className="sound-menu paper-card" role="menu" aria-label="소리">
          {onReplay && (
            <button className="btn sound-row" role="menuitem" disabled={muteAll}
              onClick={() => { setOpen(false); onReplay(); }}>
              <ReplayIcon /> 다시 듣기
            </button>
          )}
          <button className="btn sound-row" role="menuitemcheckbox" aria-checked={muteAll}
            onClick={() => { const next = !muteAll; set("muteAll", next); if (next) silenceAll(); }}>
            {muteAll ? <><SoundIcon /> 소리 켜기</> : <><MuteIcon /> 소리 끄기</>}
          </button>
          <div className="sound-vol" role="group" aria-label="소리 크기">
            <span className="sound-vol-name">소리 크기</span>
            <span className="seg">
              {VOLUMES.map(([label, v]) => (
                <button key={v} className={near(vol) === v ? "on" : ""} aria-pressed={near(vol) === v} disabled={muteAll}
                  onClick={() => { set("volume", v); applyVolume(); }}>{label}</button>
              ))}
            </span>
          </div>
        </div>
      )}
    </span>
  );
}
