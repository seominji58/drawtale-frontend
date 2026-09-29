import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import ChoiceCard from "@/components/ChoiceCard";
import BigButton from "@/components/BigButton";
import { useSession } from "@/store/session";
import { useSettings, LEVEL_CONFIG } from "@/store/settings";
import { fetchSteps } from "@/api";
import { STEP_LABEL, STEP_ORDER, STEP_QUESTION } from "@/types/story";
import { MAX_SAID, VOICE_STEPS, labelOf, sentenceFor } from "@/features/story/choices";
import { listen, voiceSupported } from "@/features/story/voice";
import type { ListenError } from "@/features/story/voice";
import { speak, stopSpeak } from "@/lib";
import type { StepChoice, StepKind } from "@/types/story";

/** 말로 덧붙이기가 안 됐을 때 아이 말 (기술 용어 없이) */
const HEARD_ERROR: Record<ListenError, string> = {
  "no-speech": "잘 못 들었어요. 한 번 더 말해 볼까요?",
  denied: "마이크를 쓸 수 없어요. 어른에게 알려 주세요.",
  unsupported: "지금은 말로 할 수 없어요. 카드만으로 해도 돼요.",
  failed: "잘 못 들었어요. 카드만으로 해도 돼요.",
};

export default function S07Steps() {
  const nav = useNavigate();
  const { picks, pick, said, say, setError } = useSession();
  const level = useSettings((s) => s.level);
  const muteAll = useSettings((s) => s.muteAll);
  // 어른 설정에서 켜야만 말로 덧붙이기를 한다 (아이 목소리가 브라우저 인식 서버로 간다, S-13)
  const voiceOn = useSettings((s) => s.voiceInput) && voiceSupported();
  const cfg = LEVEL_CONFIG[level];

  const initialAt = STEP_ORDER.findIndex((k) => !picks[k]);
  const [viewAt, setViewAt] = useState(initialAt === -1 ? STEP_ORDER.length - 1 : initialAt);
  const kind = viewAt >= 0 && viewAt < STEP_ORDER.length ? STEP_ORDER[viewAt] : null;

  const [choices, setChoices] = useState<StepChoice[]>([]);
  const [pending, setPending] = useState<StepChoice | null>(null);
  /** 카드를 고른 뒤 「더 말해 볼래요?」를 묻고 있는 단계 */
  const [ask, setAsk] = useState<StepKind | null>(null);
  const [listening, setListening] = useState(false);
  const [heardError, setHeardError] = useState<ListenError | null>(null);
  const stopListen = useRef<AbortController | null>(null);

  useEffect(() => () => stopListen.current?.abort(), []);

  useEffect(() => {
    if (viewAt === STEP_ORDER.length) { nav("/generating", { replace: true }); return; }
    if (kind) {
      fetchSteps(kind, cfg.choiceCount)
        .then(setChoices)
        .catch(() => { setError("ENGINE_ERROR"); nav("/error"); });
    }
  }, [kind, cfg.choiceCount, nav, setError, viewAt]);

  if (!kind) return null;

  // 카드를 고른 뒤: 말로 덧붙이기가 켜져 있으면 묻고, 아니면 다음 단계로
  const afterPick = (k: StepKind) => {
    if (voiceOn && VOICE_STEPS.includes(k)) { setHeardError(null); setAsk(k); return; }
    setViewAt((v) => v + 1);
  };

  const choose = (id: string) => {
    const c = choices.find((x) => x.id === id)!;
    if (cfg.confirmStep) setPending(c);
    else {
      pick(kind, id);
      afterPick(kind);
    }
  };

  const hear = () => {
    if (!ask || listening) return;
    stopSpeak();
    setHeardError(null);
    setListening(true);
    const ctrl = new AbortController();
    stopListen.current = ctrl;
    listen(ctrl.signal)
      .then((t) => {
        const text = t.slice(0, MAX_SAID);
        say(ask, text);
        speak(sentenceFor(ask, text), muteAll);   // 아이 말이 들어간 문장을 바로 읽어 준다
      })
      .catch((e: Error) => {
        const code = (e.message in HEARD_ERROR ? e.message : "failed") as ListenError;
        setHeardError(code);
        speak(HEARD_ERROR[code], muteAll);
      })
      .finally(() => setListening(false));
  };

  const leaveAsk = (next: boolean) => {
    stopListen.current?.abort();
    stopSpeak();
    setAsk(null);
    if (next) setViewAt((v) => v + 1);
  };

  // ── 「더 말해 볼래요?」 ──
  if (ask) {
    const label = labelOf(ask, picks[ask]);
    const mine = said[ask];
    const sentence = sentenceFor(ask, mine ?? label);
    return (
      <Screen back={() => leaveAsk(false)} speech="더 말해 볼래요? 안 해도 돼요." segment={3}
        acts={
          <>
            <BigButton onClick={() => leaveAsk(false)}>카드 다시 고르기</BigButton>
            <BigButton go disabled={listening} onClick={() => leaveAsk(true)}>다음</BigButton>
          </>
        }>
        <h2 className="question">더 말해 볼래요?</h2>
        <p className="hint">안 해도 돼요 · 고른 카드: {label}</p>

        <div className="stage" style={{ flexDirection: "column", gap: 20, padding: 24 }}>
          {/* 누르고 말하기. 듣는 동안은 배경 블록과 글자로 알린다 (움직임 없음) */}
          <button className="btn" onClick={hear} aria-pressed={listening}
            style={{
              width: 200, height: 200, borderRadius: 100, flex: "0 0 auto",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
              background: listening ? "var(--butter)" : undefined,
            }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0014 0M12 18v3" />
            </svg>
            <span>{listening ? "듣고 있어요" : mine ? "다시 말하기" : "누르고 말하기"}</span>
          </button>

          {heardError && <p className="hint">{HEARD_ERROR[heardError]}</p>}

          {/* 이야기에 들어갈 문장. 누르면 다시 읽어 준다 */}
          <button className="said now" onClick={() => speak(sentence, muteAll)}
            style={{ border: 0, fontFamily: "inherit", fontSize: "var(--t-question)", padding: "14px 28px", cursor: "pointer" }}>
            {sentence}
          </button>
          {mine && (
            <button className="btn link" onClick={() => say(ask, null)}>내 말 지우고 카드로</button>
          )}
        </div>
      </Screen>
    );
  }

  return (
    <Screen back={viewAt === 0 ? "/confirm" : () => setViewAt((v) => v - 1)}
      speech={STEP_QUESTION[kind]} segment={3}>
      {kind === "result" && (
        <p className="hint" style={{ marginBottom: "-10px", marginTop: "10px" }}>
          {labelOf("place", picks.place)} · {labelOf("problem", picks.problem)} · {labelOf("action", picks.action)}
        </p>
      )}
      <h2 className="question">{STEP_QUESTION[kind]}</h2>

      <div className="choices" data-count={choices.length}>
        {choices.map((c) => (
          <ChoiceCard key={c.id} choice={c} selected={picks[kind] === c.id} onPick={choose} />
        ))}
      </div>

      {/* 단계 표시. 칸마다 크레파스 색이 달라서 지금 어디인지 색으로도 읽힌다 */}
      <div className="steps">
        {STEP_ORDER.map((k, i) => (
          <span key={k}
            className={`step ${i === viewAt ? "on" : ""} ${i < viewAt ? "done" : ""}`}
            style={i === viewAt ? { color: `var(--c-${k})` } : undefined}>
            <i /> {STEP_LABEL[k]}
          </span>
        ))}
      </div>

      {pending && (
        <div className="box">
          <p className="question" style={{ marginBottom: 14 }}>이걸로 할까요?</p>
          <div className="row">
            <BigButton go onClick={() => { pick(kind!, pending.id); setPending(null); afterPick(kind!); }}>예</BigButton>
            <BigButton onClick={() => setPending(null)}>다시</BigButton>
          </div>
        </div>
      )}
    </Screen>
  );
}
