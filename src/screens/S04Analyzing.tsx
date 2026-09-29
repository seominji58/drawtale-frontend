import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import Waiting from "@/components/Waiting";
import { Friend } from "@/components/illust";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { analyzeCharacter, ENGINE } from "@/api";
import { isOk } from "@/types/character";

const STAGES = ["uploaded", "segmenting", "estimating_pose", "building_skeleton"];

export default function S04Analyzing() {
  const nav = useNavigate();
  const { file, setAnalysis, setError } = useSession();
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

    analyzeCharacter(file, (p) => {
      setStep(STAGES.indexOf(p.stage) + 1);
      setDiag(`${p.stage} · ${Math.round(p.progress * 100)}% · ${ENGINE}`);
    }, ctrl.signal)
      .then((res) => {
        if (!isOk(res)) { setError(res.error.code); nav("/error"); return; }
        setAnalysis(res);
        nav("/confirm", { replace: true });
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setError("ENGINE_ERROR"); nav("/error");
      });

    return () => { clearTimeout(t); clearTimeout(timeout); ctrl.abort(); };
  }, [file, nav, setAnalysis, setError]);

  const stop = () => { abort.current?.abort(); nav("/upload"); };

  return (
    <Screen back={stop} speech="친구를 만들고 있어요" segment={2}
      acts={showStop ? <BigButton onClick={stop}>그만하기</BigButton> : undefined}>
      <Waiting message="친구를 만들고 있어요" steps={4} current={step}
               diagnostics={diagnostics ? diag : null} art={<Friend wave />} />
    </Screen>
  );
}
