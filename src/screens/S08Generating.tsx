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
import { generateStory, ApiError, ENGINE } from "@/api";
import type { JobStatus } from "@/types/character";
import type { StepKind } from "@/types/story";

/** 백엔드 job 상태(계약 1-3). 서버가 문장과 애니메이션을 다 만든 뒤에 succeeded 가 된다 */
const STEP: Record<JobStatus, number> = { pending: 1, running: 2, succeeded: 3, failed: 0 };

export default function S08Generating() {
  const nav = useNavigate();
  const { character, picks, said, setStory, setError } = useSession();
  const add = useLibrary((s) => s.add);
  const mode = useAuth((a) => a.mode);
  const diagnostics = useSettings((s) => s.diagnostics);
  const [step, setStep] = useState(0);
  const [diag, setDiag] = useState("");
  const [showStop, setShowStop] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!character) { nav("/upload", { replace: true }); return; }
    const t = setTimeout(() => setShowStop(true), 3000);
    // S-04 와 같은 이유로 effect 안에서 새로 만든다
    const ctrl = new AbortController();
    abort.current = ctrl;
    const started = performance.now();
    generateStory(character.id, picks as Record<StepKind, string>, said, (s) => {
      setStep(STEP[s]);
      setDiag(`${s} · ${Math.round((performance.now() - started) / 1000)}s · ${ENGINE}`);
    }, ctrl.signal)
      .then((s) => {
        setStory(s); add(s);
        if (mode === "guest") consumeTrial();
        nav("/story", { replace: true });
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof ApiError ? e.code : "ENGINE_ERROR"); nav("/error");
      });
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [character, picks, said, setStory, add, setError, nav, mode]);

  const stop = () => { abort.current?.abort(); nav("/steps"); };

  return (
    <Screen back={stop} speech="이야기를 쓰고 있어요" segment={3}
      acts={showStop ? <BigButton onClick={stop}>그만하기</BigButton> : undefined}>
      <Waiting message="이야기를 쓰고 있어요" steps={3} current={step}
               diagnostics={diagnostics ? diag : null} art={<Pencil />} />
    </Screen>
  );
}
