import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterPreview from "@/features/character/CharacterPreview";
import { useSession } from "@/store/session";
import { useSettings, useWithAdult, LEVEL_CONFIG } from "@/store/settings";
import { listen, voiceSupported } from "@/features/story/voice";
import type { ListenError } from "@/features/story/voice";
import { speak, stopSpeak } from "@/lib";

/** S-05 다음 「친구 이름 짓기」 (설계서에 없음, open-decisions 0-6).
 *  캐릭터 목소리 판에서만 나온다 — 나레이터가 주인공을 이 이름으로 3인칭으로 부른다.
 *  쉬운 두 글자 이름. 성별을 가리지 않는 이름만 둔다 */
const NAMES = ["토토", "하루", "콩이", "별이", "보리", "솜이"];
/** 서버가 받는 이름 길이 (계약 2-5 protagonist_name) */
const MAX_NAME = 10;

const HEARD_ERROR: Record<ListenError, string> = {
  "no-speech": "잘 못 들었어요. 한 번 더 말해 볼까요?",
  denied: "마이크를 쓸 수 없어요. 어른에게 알려 주세요.",
  unsupported: "지금은 말로 할 수 없어요. 이름 카드에서 골라요.",
  failed: "잘 못 들었어요. 이름 카드에서 골라도 돼요.",
};

export default function S05Name() {
  const nav = useNavigate();
  const { imageUrl, keypoints, name, setName } = useSession();
  const level = useSettings((s) => s.level);
  const muteAll = useSettings((s) => s.muteAll);
  // 「어른과 함께」에서 로그인한 보호자가 켜야만 말로 짓는다 (아이 목소리가 브라우저 인식 서버로 간다, F-SET-06)
  const voiceOn = useWithAdult().voice && voiceSupported();
  const [listening, setListening] = useState(false);
  const [heardError, setHeardError] = useState<ListenError | null>(null);
  const stopListen = useRef<AbortController | null>(null);
  const lock = useRef(0);

  useEffect(() => () => { stopListen.current?.abort(); stopSpeak(); }, []);
  if (!imageUrl || !keypoints) { nav("/upload", { replace: true }); return null; }

  const names = NAMES.slice(0, LEVEL_CONFIG[level].choiceCount);

  const choose = (n: string) => {
    const now = Date.now();
    if (now - lock.current < 300) return;   // 연타 방지
    lock.current = now;
    setName(n);
    speak(`${n}, 좋은 이름이에요`, muteAll);
  };

  const hear = () => {
    if (listening) return;
    stopSpeak();
    setHeardError(null);
    setListening(true);
    const ctrl = new AbortController();
    stopListen.current = ctrl;
    listen(ctrl.signal)
      .then((t) => {
        const n = t.replace(/[^\p{L}\p{N}]/gu, "").slice(0, MAX_NAME);
        if (n) { lock.current = 0; choose(n); } else throw new Error("no-speech");
      })
      .catch((e: Error) => {
        const code = (e.message in HEARD_ERROR ? e.message : "failed") as ListenError;
        setHeardError(code);
        speak(HEARD_ERROR[code], muteAll);
      })
      .finally(() => setListening(false));
  };

  const go = (withName: boolean) => {
    stopListen.current?.abort();
    stopSpeak();
    if (!withName) setName(null);   // 이름 없이 가면 서버가 지어 준다
    nav("/steps");
  };

  return (
    <Screen back="/confirm" speech="친구 이름을 지어 줄까요?" segment={2}
      acts={<BigButton go disabled={!name || listening} onClick={() => go(true)}>이 이름으로 할래요</BigButton>}>
      <h2 className="question">친구 이름을 지어 줄까요?</h2>

      <div className="stage" style={{ flexDirection: "column", gap: 12 }}>
        <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", justifyContent: "center" }}>
          <CharacterPreview />
        </div>
        {name && (
          <button className="said now" onClick={() => speak(name, muteAll)}
            style={{ border: 0, fontFamily: "inherit", fontSize: "var(--t-question)", padding: "10px 32px", cursor: "pointer" }}>
            {name}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "var(--gap)", flex: "0 0 auto" }}>
        {names.map((n) => (
          <button key={n} className={`btn ${name === n ? "on" : ""}`} onClick={() => choose(n)}
            aria-pressed={name === n}
            style={{ width: "auto", minWidth: 140, fontSize: "var(--t-button)", background: name === n ? "var(--butter)" : undefined }}>
            {n}
          </button>
        ))}
        {/* 말로 짓기. 듣는 동안은 배경 블록과 글자로 알린다 (움직임 없음) */}
        {voiceOn && (
          <button className="btn" onClick={hear} aria-pressed={listening}
            style={{ width: "auto", minWidth: 140, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: listening ? "var(--butter)" : undefined }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
            <span>{listening ? "듣고 있어요" : "말로 짓기"}</span>
          </button>
        )}
      </div>
      {heardError && <p className="hint">{HEARD_ERROR[heardError]}</p>}

      <div className="aside-links">
        <button className="btn link" onClick={() => go(false)}>이름 없이 할래요</button>
      </div>
    </Screen>
  );
}
