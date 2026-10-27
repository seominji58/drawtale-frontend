import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import Waiting from "@/components/Waiting";
import { Friend } from "@/components/illust";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { analyzeCharacter, ApiError, ENGINE } from "@/api";
import type { JobStatus } from "@/types/character";

/** 백엔드 job 상태(계약 1-3)를 대기 점 세 개로 보여준다 */
const STEP: Record<JobStatus, number> = { pending: 1, running: 2, succeeded: 3, failed: 0 };

export default function S04Analyzing() {
  const nav = useNavigate();
  const { file, setCharacter, setError } = useSession();
  const diagnostics = useSettings((s) => s.diagnostics);
  const [step, setStep] = useState(0);
  const [diag, setDiag] = useState("");
  const [showStop, setShowStop] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!file) { nav("/upload", { replace: true }); return; }
    const t = setTimeout(() => setShowStop(true), 3000);
    const timeout = setTimeout(() => { setError("ENGINE_TIMEOUT"); nav("/error"); }, 30000);
    // effect 안에서 새로 만든다. ref 에 담아 두면 StrictMode 의 두 번째 실행이
    // 첫 실행 cleanup 에서 이미 끊긴 signal 을 물려받아 분석이 시작되지 않는다
    const ctrl = new AbortController();
    abort.current = ctrl;

    const started = performance.now();
    analyzeCharacter(file, (s) => {
      setStep(STEP[s]);
      setDiag(`${s} · ${Math.round(performance.now() - started)}ms · ${ENGINE}`);
    }, ctrl.signal, useSettings.getState().keepOriginal)
      .then((c) => {
        setCharacter(c);
        nav("/confirm", { replace: true });
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError(e instanceof ApiError ? e.code : "ENGINE_ERROR"); nav("/error");
      });

    return () => { clearTimeout(t); clearTimeout(timeout); ctrl.abort(); };
  }, [file, nav, setCharacter, setError]);

  const stop = () => { abort.current?.abort(); nav("/upload"); };

  return (
    <Screen back={stop} speech="친구를 만들고 있어요" segment={2}
      acts={showStop ? <BigButton onClick={stop}>그만하기</BigButton> : undefined}>
      <Waiting message="친구를 만들고 있어요" steps={3} current={step}
               diagnostics={diagnostics ? diag : null} art={<Friend wave />} />
    </Screen>
  );
}
