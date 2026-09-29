import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import ChoiceCard from "@/components/ChoiceCard";
import BigButton from "@/components/BigButton";
import { useSession } from "@/store/session";
import { useSettings, LEVEL_CONFIG } from "@/store/settings";
import { fetchSteps } from "@/api";
import { STEP_LABEL, STEP_ORDER, STEP_QUESTION } from "@/types/story";
import type { StepChoice } from "@/types/story";

export default function S07Steps() {
  const nav = useNavigate();
  const { picks, pick, setError } = useSession();
  const level = useSettings((s) => s.level);
  const cfg = LEVEL_CONFIG[level];

  const initialAt = STEP_ORDER.findIndex((k) => !picks[k]);
  const [viewAt, setViewAt] = useState(initialAt === -1 ? STEP_ORDER.length - 1 : initialAt);
  const kind = viewAt >= 0 && viewAt < STEP_ORDER.length ? STEP_ORDER[viewAt] : null;

  const [choices, setChoices] = useState<StepChoice[]>([]);
  const [pending, setPending] = useState<StepChoice | null>(null);

  useEffect(() => {
    if (viewAt === STEP_ORDER.length) { nav("/generating", { replace: true }); return; }
    if (kind) {
      fetchSteps(kind, cfg.choiceCount)
        .then(setChoices)
        .catch(() => { setError("ENGINE_ERROR"); nav("/error"); });
    }
  }, [kind, cfg.choiceCount, nav, setError, viewAt]);

  if (!kind) return null;

  const choose = (id: string) => {
    const c = choices.find((x) => x.id === id)!;
    if (cfg.confirmStep) setPending(c);
    else {
      pick(kind, id);
      setViewAt((v) => v + 1);
    }
  };

  return (
    <Screen back={viewAt === 0 ? "/confirm" : () => setViewAt((v) => v - 1)}
      speech={STEP_QUESTION[kind]} segment={3}>
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
            <BigButton go onClick={() => { pick(kind!, pending.id); setPending(null); setViewAt((v) => v + 1); }}>예</BigButton>
            <BigButton onClick={() => setPending(null)}>다시</BigButton>
          </div>
        </div>
      )}
    </Screen>
  );
}
