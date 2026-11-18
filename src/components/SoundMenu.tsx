import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { useSettings, useWithAdult } from "@/store/settings";
import { getMyVoice, voiceSampleUrl } from "@/api";
import type { VoiceKind } from "@/api";
import { applyVolume, resumeAll, silenceAll } from "@/lib";
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

  // 읽어 주기 네 가지 (11/10 사용자): 나레이션 · 캐릭터(대사는 등장인물 목소리) · 보호자 · 아이 — 한 줄에서 하나.
  // 설정의 「읽어주기(나레이션 · 캐릭터)」와 「읽어 주는 목소리(기본 · 보호자 · 아이)」 두 칸과 같은 값이라 여기서 바꾸면 설정에도 그대로.
  // 이야기를 만들기 전 화면에서만 보인다 — 만드는 중 · 책을 보는 동안 바꿔도 그 책은 바뀌지 않는다
  const adult = useWithAdult();
  const member = useAuth((a) => a.mode === "member");
  const voiceMode = useSettings((s) => s.voiceMode);
  const { pathname } = useLocation();
  const beforeStory = !["/generating", "/story", "/order", "/done", "/stories"].includes(pathname);
  type Pick = "narration" | "characters" | VoiceKind;
  const current: Pick = adult.childVoice ? "child" : adult.myVoice ? "guardian" : voiceMode === "characters" ? "characters" : "narration";
  const narrator: "base" | VoiceKind = current === "child" || current === "guardian" ? current : "base";
  const [has, setHas] = useState<Record<VoiceKind, boolean>>({ guardian: false, child: false });
  useEffect(() => {
    if (!open || !adult.guardian) return;
    let alive = true;
    void Promise.all([getMyVoice("guardian").catch(() => null), getMyVoice("child").catch(() => null)])
      .then(([g, c]) => { if (alive) setHas({ guardian: !!g?.registered, child: !!c?.registered }); });
    return () => { alive = false; };
  }, [open, adult.guardian]);
  // 바꾸면 「새로 만드는 이야기부터」라고 잠깐 알린다 — 이미 만든 책은 만들 때의 목소리로 읽는다
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<number>();
  const LABEL: Record<Pick, string> = { narration: "나레이션", characters: "캐릭터", guardian: "보호자", child: "아이" };
  const pickVoice = (k: Pick) => {
    if (k === current) return;
    set("guardianNarrator", k === "guardian");
    set("childNarrator", k === "child");
    // 나레이션 · 캐릭터는 읽어주기 방식, 보호자 · 아이는 나레이터 목소리 (읽어주기 방식은 그대로 둔다 — 대사는 등장인물 목소리일 수 있다)
    if (k === "narration" || k === "characters") set("voiceMode", k);
    const what = k === "narration" ? "나레이터 한 사람이" : k === "characters" ? "대사는 등장인물 목소리로" : `${LABEL[k]} 목소리로`;
    setNote(`다음에 만드는 이야기부터 ${what} 읽어요. 이미 만든 책은 그대로예요.`);
    clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 5000);
  };
  useEffect(() => () => clearTimeout(noteTimer.current), []);
  const [hearing, setHearing] = useState(false);
  const hearNarrator = async () => {
    if (narrator === "base" || hearing) return;
    setHearing(true);
    try {
      const url = await voiceSampleUrl(narrator);
      if (!url) return;
      const a = new Audio(url);
      a.onended = a.onerror = () => { URL.revokeObjectURL(url); setHearing(false); };
      await a.play();
      return;
    } catch { /* 못 들려줘도 고르기는 된다 */ }
    setHearing(false);
  };

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
            onClick={() => {
              const next = !muteAll;
              set("muteAll", next);
              // 끄면 지금 소리를 멈추고, 다시 켜면 멈춘 자리부터 이어서 (11/3 사용자 「다시 누르면 소리가 나와야」 ·
              // 「처음부터 말고 이어서」). 처음부터는 「다시 듣기」
              if (next) silenceAll();
              else resumeAll();
            }}>
            {muteAll ? <><SoundIcon /> 소리 켜기</> : <><MuteIcon /> 소리 끄기</>}
          </button>
          {member && beforeStory && (
            <div className="sound-vol" role="group" aria-label="읽어 주기">
              <span className="sound-vol-name">읽어 주기</span>
              <span className="seg seg4">
                {(["narration", "characters", "guardian", "child"] as const).map((k) => {
                  const off = (k === "guardian" || k === "child") && (!adult.guardian || !has[k]);
                  return (
                    <button key={k} className={current === k ? "on" : ""} aria-pressed={current === k} disabled={off}
                      title={off ? (adult.guardian ? "설정에서 먼저 등록해 주세요" : "보호자 모드에서 쓸 수 있어요") : undefined}
                      onClick={() => pickVoice(k)}>{LABEL[k]}</button>
                  );
                })}
              </span>
              {note && <span className="sound-note" role="status">{note}</span>}
              {narrator !== "base" && (
                <button className="btn sound-row" disabled={hearing || muteAll} onClick={() => void hearNarrator()}>
                  <SoundIcon /> {hearing ? "듣는 중…" : "미리 듣기"}
                </button>
              )}
            </div>
          )}
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
