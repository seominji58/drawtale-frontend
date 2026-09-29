import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import Waiting from "@/components/Waiting";
import { Pencil } from "@/components/illust";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { useLibrary } from "@/store/library";
import { useAuth, consumeTrial } from "@/store/auth";
import { generateStory, ENGINE } from "@/api";
import type { StepKind } from "@/types/story";

export default function S08Generating() {
  const nav = useNavigate();
  const { picks, setStory, setError } = useSession();
  const add = useLibrary((s) => s.add);
  const mode = useAuth((a) => a.mode);
  const diagnostics = useSettings((s) => s.diagnostics);
  const [step, setStep] = useState(0);
  const [diag, setDiag] = useState("");
  const [showStop, setShowStop] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowStop(true), 3000);
    // S-04 와 같은 이유로 effect 안에서 새로 만든다
    const ctrl = new AbortController();
    abort.current = ctrl;
    generateStory(picks as Record<StepKind, string>, (p) => {
      setStep(p.stage === "generating_text" ? 1 : 2);
      setDiag(`${p.stage} · ${ENGINE}`);
    }, ctrl.signal)
      .then((s) => {
        setStory(s); add(s);
        if (mode === "guest") consumeTrial();
        nav("/story", { replace: true });
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError("ENGINE_ERROR"); nav("/error");
      });
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [picks, setStory, add, setError, nav, mode]);

  const stop = () => { abort.current?.abort(); nav("/steps"); };

  return (
    <Screen back={stop} speech="이야기를 쓰고 있어요" segment={3}
      acts={showStop ? <BigButton onClick={stop}>그만하기</BigButton> : undefined}>
      <Waiting message="이야기를 쓰고 있어요" steps={2} current={step}
               diagnostics={diagnostics ? diag : null} art={<Pencil />} />
    </Screen>
  );
}
