import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import Waiting from "@/components/Waiting";
import { Friend } from "@/components/illust";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { analyzeCharacter, ApiError, ENGINE } from "@/api";
import type { Character, JobStatus } from "@/types/character";
import { countAnalysis } from "@/store/retry";

/** 백엔드 job 상태(계약 1-3)를 대기 점 세 개로 보여준다 */
const STEP: Record<JobStatus, number> = { pending: 1, running: 2, succeeded: 3, failed: 0 };
/** 분석 대기 한도 (pt_docs 05 S-04 「30초를 넘기면 E-01 ENGINE_TIMEOUT」) */
const LIMIT_MS = 30_000;

interface Run {
  file: File;
  started: number;
  ctrl: AbortController;
  promise: Promise<Character>;
  listen: (s: JobStatus) => void;
}

/** 지금 진행 중인 분석. 같은 그림이면 다시 올리지 않고 이것을 이어 받는다.
 *  개발 모드의 StrictMode 는 effect 를 두 번 돌리는데, 예전에는 두 번째가 그림을 또 올려서
 *  서버에 분석이 두 개 겹쳐 느려지고 30초 한도를 넘겼다 (2026-10-29 실제 앱 시험) */
let running: Run | null = null;

function startAnalysis(file: File, keepOriginal: boolean): Run {
  if (running && running.file === file) return running;
  running?.ctrl.abort();
  const ctrl = new AbortController();
  const run = { file, started: performance.now(), ctrl, listen: () => {} } as unknown as Run;
  run.promise = analyzeCharacter(file, (s) => run.listen(s), ctrl.signal, keepOriginal);
  const clear = () => { if (running === run) running = null; };
  run.promise.then(clear, clear);
  running = run;
  return run;
}

/** 그만하기 · 시간 초과: 서버 응답을 더 기다리지 않는다 */
function cancelAnalysis() {
  running?.ctrl.abort();
  running = null;
}

export default function S04Analyzing() {
  const nav = useNavigate();
  const { file, setCharacter, setError } = useSession();
  const diagnostics = useSettings((s) => s.diagnostics);
  const [step, setStep] = useState(0);
  const [diag, setDiag] = useState("");
  const [showStop, setShowStop] = useState(false);

  useEffect(() => {
    if (!file) { nav("/upload", { replace: true }); return; }
    const run = startAnalysis(file, useSettings.getState().keepOriginal);
    let live = true;   // 이 화면이 아직 붙어 있는지 — 떨어진 화면은 결과로 이동하지 않는다
    const t = setTimeout(() => setShowStop(true), 3000);
    const timeout = setTimeout(() => {
      cancelAnalysis();
      countAnalysis("ENGINE_TIMEOUT"); setError("ENGINE_TIMEOUT"); nav("/error");
    }, Math.max(0, LIMIT_MS - (performance.now() - run.started)));

    run.listen = (s) => {
      if (!live) return;
      setStep(STEP[s]);
      setDiag(`${s} · ${Math.round(performance.now() - run.started)}ms · ${ENGINE}`);
    };
    run.promise
      .then((c) => {
        if (!live) return;
        countAnalysis(null);
        setCharacter(c);
        nav("/confirm", { replace: true });
      })
      .catch((e) => {
        if (!live || (e as Error).name === "AbortError") return;
        const code = e instanceof ApiError ? e.code : "ENGINE_ERROR";
        countAnalysis(code); setError(code); nav("/error");
      });

    return () => { live = false; clearTimeout(t); clearTimeout(timeout); };
  }, [file, nav, setCharacter, setError]);

  const stop = () => { cancelAnalysis(); nav("/upload"); };

  return (
    <Screen back={stop} speech="친구를 만들고 있어요" segment={2}
      acts={showStop ? <BigButton onClick={stop}>그만하기</BigButton> : undefined}>
      <Waiting message="친구를 만들고 있어요" steps={3} current={step}
               diagnostics={diagnostics ? diag : null} art={<Friend wave />} />
    </Screen>
  );
}
