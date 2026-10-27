import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import ChoiceCard from "@/components/ChoiceCard";
import BigButton from "@/components/BigButton";
import { useSession } from "@/store/session";
import { useSettings, useWithAdult, LEVEL_CONFIG } from "@/store/settings";
import { fetchSteps } from "@/api";
import { ASK_QUESTION, EXTRA_STAGE, STEP_LABEL, STEP_ORDER, isStep } from "@/types/story";
import { CARD_COUNT, MAX_SAID, VOICE_STEPS, askOrder, labelOf, sentenceFor } from "@/features/story/choices";
import { listen, voiceSupported } from "@/features/story/voice";
import type { ListenError } from "@/features/story/voice";
import { speak, stopSpeak } from "@/lib";
import type { AskKind, StepChoice, StepKind } from "@/types/story";

/** 카드 대신 아이가 말하거나 적은 말로 칸을 채웠을 때의 picks 값. 서버에는 said 의 글이 간다 (api generateStory) */
const OWN = "own";

/** 말하기가 안 됐을 때 아이 말 (기술 용어 없이) */
const HEARD_ERROR: Record<ListenError, string> = {
  "no-speech": "잘 못 들었어요. 한 번 더 말해 볼까요?",
  denied: "마이크를 쓸 수 없어요. 어른에게 알려 주세요.",
  unsupported: "지금은 말로 할 수 없어요. 카드를 고르거나 적어 주세요.",
  failed: "잘 못 들었어요. 카드만으로 해도 돼요.",
};

export default function S07Steps() {
  const nav = useNavigate();
  const { picks, pick, said, say, setError } = useSession();
  const level = useSettings((s) => s.level);
  const muteAll = useSettings((s) => s.muteAll);
  // 「어른과 함께」에서 로그인한 보호자가 켜야만 말하기 · 적기 칸이 보인다 (F-SET-06).
  // 적기는 목소리를 보내지 않으므로 음성 인식이 없는 브라우저에서도 보이고, 마이크만 숨긴다
  const ownOn = useWithAdult().voice;
  const micOn = ownOn && voiceSupported();
  const named = useSettings((s) => s.voiceMode) === "characters";
  const cfg = LEVEL_CONFIG[level];

  // 묻는 칸 순서. 네 칸 사이에 인물 · 기분 칸이 끼고, 수준마다 다르다 (open-decisions 0-11)
  const flow = askOrder(level);
  const initialAt = flow.findIndex((k) => !picks[k]);
  const [viewAt, setViewAt] = useState(initialAt === -1 ? flow.length - 1 : initialAt);
  const kind: AskKind | null = viewAt >= 0 && viewAt < flow.length ? flow[viewAt] : null;

  const [choices, setChoices] = useState<StepChoice[]>([]);
  const [pending, setPending] = useState<StepChoice | null>(null);
  const [listening, setListening] = useState(false);
  const [heardError, setHeardError] = useState<ListenError | null>(null);
  /** S-07-13 칸에 적힌 글. 들은 글도 여기 먼저 들어가고, 「이걸로 할래요」를 눌러야 이야기에 들어간다 */
  const [draft, setDraft] = useState("");
  const stopListen = useRef<AbortController | null>(null);

  useEffect(() => () => stopListen.current?.abort(), []);

  useEffect(() => {
    if (viewAt === flow.length) { nav("/generating", { replace: true }); return; }
    if (kind) {
      // 행동 카드는 고른 문제에 따라 다르다 (ACTIONS_BY_PROBLEM). 문제를 바꾸면 뒤 칸은 지워진다 (store pick)
      // 네 칸은 칸마다 정한 장수(CARD_COUNT, 8 · 4 · 4 · 4), 인물 · 기분 칸(시험)은 수준 설정대로
      fetchSteps(kind, isStep(kind) ? CARD_COUNT[kind] : cfg.choiceCount, picks.problem)
        .then(setChoices)
        .catch(() => { setError("ENGINE_ERROR"); nav("/error"); });
    }
  }, [kind, cfg.choiceCount, nav, setError, viewAt, flow.length, picks.problem]);

  // 칸이 바뀌면 입력 칸을 그 칸에 정해 둔 말로 채운다. 앞 칸으로 돌아오면 적어 둔 말을 고칠 수 있다
  useEffect(() => {
    stopListen.current?.abort();
    setHeardError(null);
    setDraft(kind && isStep(kind) && picks[kind] === OWN ? said[kind] ?? "" : "");
  }, [kind]);   // picks · said 는 칸이 바뀔 때의 값만 읽는다

  if (!kind) return null;

  // 말하기 · 적기는 네 칸 중 VOICE_STEPS 에만. 인물 · 기분 칸은 카드로만 고른다 (이름을 받지 않으려고)
  const step: StepKind | null = isStep(kind) ? kind : null;
  const canOwn = ownOn && !!step && VOICE_STEPS.includes(step);
  /** 아래 네 점 중 켜질 단계. 인물 · 기분 칸은 붙은 단계의 점이 켜진다 */
  const stage: StepKind = step ?? EXTRA_STAGE[kind as Exclude<AskKind, StepKind>];
  const stageAt = STEP_ORDER.indexOf(stage);
  /** 그 칸에 정해진 말 (아이 말이 있으면 그것, 없으면 카드 라벨) */
  const shown = (k: StepKind) => (picks[k] === OWN ? said[k] : undefined) || labelOf(k, picks[k], picks.problem);
  const next = () => { stopListen.current?.abort(); stopSpeak(); setViewAt((v) => v + 1); };

  const choose = (id: string) => {
    const c = choices.find((x) => x.id === id)!;
    if (cfg.confirmStep) setPending(c);
    else {
      pick(kind, id);
      next();
    }
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
        const text = t.slice(0, MAX_SAID);
        setDraft(text);   // 인식 원문은 바로 쓰지 않는다. 확정해야 들어간다 (S-07-14)
        if (step) speak(sentenceFor(step, text), muteAll);   // 아이 말이 들어간 문장을 바로 읽어 준다
      })
      .catch((e: Error) => {
        if (ctrl.signal.aborted) return;   // 「다음」 등으로 떠나며 끊은 것은 실패가 아니다
        const code = (e.message in HEARD_ERROR ? e.message : "failed") as ListenError;
        setHeardError(code);
        speak(HEARD_ERROR[code], muteAll);
      })
      .finally(() => setListening(false));
  };

  // S-07-14: 칸에 적힌 말로 이 칸을 정하고 다음 칸으로. 확정한 글만 서버로 간다
  const typed = draft.trim().slice(0, MAX_SAID);
  const confirmOwn = () => {
    if (!typed || listening || !step) return;
    pick(step, OWN);
    say(step, typed);
    speak(sentenceFor(step, typed), muteAll);
    setViewAt((v) => v + 1);
  };

  return (
    <Screen back={viewAt === 0 ? (named ? "/name" : "/confirm") : () => { stopListen.current?.abort(); setViewAt((v) => v - 1); }}
      speech={ASK_QUESTION[kind]} segment={3}>
      {kind === "result" && (
        <p className="hint" style={{ marginBottom: "-10px", marginTop: "10px" }}>
          {shown("place")} · {shown("problem")} · {shown("action")}
        </p>
      )}
      <h2 className="question">{ASK_QUESTION[kind]}</h2>

      {/* 카드와 말하기 · 적기를 나란히 둔다. 아래에 두면 카드가 그만큼 작아져 아이콘이 줄어든다 */}
      <div className="pick-area">
        <div className="choices" data-count={choices.length}>
          {choices.map((c) => (
            <ChoiceCard key={c.id} choice={c} selected={picks[kind] === c.id} onPick={choose} />
          ))}
        </div>

        {/* S-07-13 카드 대신 말하기 · 적기. 카드에 없는 장소 · 일도 아이가 정한다.
            보호자 모드에서만 보인다 (F-SET-06) — 아이 목소리가 브라우저 인식 서버로 가고, 글쇠판은 어른이 쓴다 */}
        {canOwn && (
          <form data-audience="adult" className="own"
            onSubmit={(e) => { e.preventDefault(); confirmOwn(); }}>
              <span className="own-title">카드에 없으면</span>
            {micOn && (
              <button type="button" className={`btn own-mic ${listening ? "on" : ""}`} onClick={hear}
                aria-pressed={listening} aria-label={listening ? "듣고 있어요" : "누르고 말하기"}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0014 0M12 18v3" />
                </svg>
                <span>{listening ? "듣는 중" : "말하기"}</span>
              </button>
            )}
            <div className="own-field">
              <input value={draft} maxLength={MAX_SAID} disabled={listening}
                aria-label="카드 대신 이야기에 넣을 말"
                placeholder="여기에 적어요"
                onChange={(e) => setDraft(e.target.value)} />
              <em>
                {heardError ? HEARD_ERROR[heardError]
                  : typed && step ? sentenceFor(step, typed)
                  : "진짜 이름이나 학교 이름은 쓰지 않아요"}
              </em>
            </div>
            <button type="submit" className="btn go own-ok" disabled={!typed || listening}>이걸로 할래요</button>
          </form>
        )}
      </div>

      {/* 단계 표시. 칸마다 크레파스 색이 달라서 지금 어디인지 색으로도 읽힌다 */}
      <div className="steps">
        {STEP_ORDER.map((k, i) => (
          <span key={k}
            className={`step ${i === stageAt ? "on" : ""} ${i < stageAt ? "done" : ""}`}
            style={i === stageAt ? { color: `var(--c-${k})` } : undefined}>
            <i /> {STEP_LABEL[k]}
          </span>
        ))}
      </div>

      {pending && (
        <div className="box">
          <p className="question" style={{ marginBottom: 14 }}>이걸로 할까요?</p>
          <div className="row">
            <BigButton go onClick={() => { pick(kind!, pending.id); setPending(null); next(); }}>예</BigButton>
            <BigButton onClick={() => setPending(null)}>다시</BigButton>
          </div>
        </div>
      )}
    </Screen>
  );
}
