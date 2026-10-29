import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import Waiting from "@/components/Waiting";
import { Pencil } from "@/components/illust";
import { useSession } from "@/store/session";
import { useGuardianMode, useSettings } from "@/store/settings";
import { useLibrary } from "@/store/library";
import { useAuth, consumeTrial } from "@/store/auth";
import { generateStory, ApiError, ENGINE } from "@/api";
import { makeCover } from "@/features/story/cover";
import type { JobStatus } from "@/types/character";

/** 백엔드 job 상태(계약 1-3). 서버가 문장과 애니메이션을 다 만든 뒤에 succeeded 가 된다 */
const STEP: Record<JobStatus, number> = { pending: 1, running: 2, succeeded: 3, failed: 0 };

type Result = Awaited<ReturnType<typeof generateStory>>;
interface Run {
  key: string;
  started: number;
  ctrl: AbortController;
  promise: Promise<Result>;
  listen: (s: JobStatus) => void;
}

/** 지금 만들고 있는 이야기. 같은 요청이면 다시 보내지 않고 이어 받는다 — S-04 와 같은 이유
 *  (개발 모드 StrictMode 가 effect 를 두 번 돌려 이야기 Job 이 둘 생겼다, 2026-10-29) */
let running: Run | null = null;

function startStory(key: string, make: (onStatus: (s: JobStatus) => void, signal: AbortSignal) => Promise<Result>): Run {
  if (running && running.key === key) return running;
  running?.ctrl.abort();
  const ctrl = new AbortController();
  const run = { key, started: performance.now(), ctrl, listen: () => {} } as unknown as Run;
  run.promise = make((s) => run.listen(s), ctrl.signal);
  const clear = () => { if (running === run) running = null; };
  run.promise.then(clear, clear);
  running = run;
  return run;
}

function cancelStory() {
  running?.ctrl.abort();
  running = null;
}

export default function S08Generating() {
  const nav = useNavigate();
  const { character, name, picks, said, setStory, setError, imageUrl } = useSession();
  const add = useLibrary((s) => s.add);
  const mode = useAuth((a) => a.mode);
  const diagnostics = useSettings((s) => s.diagnostics);
  const voiceMode = useSettings((s) => s.voiceMode);
  const protagonist = useSettings((s) => s.protagonistVoice);
  const storyLength = useSettings((s) => s.storyLength);
  const guardian = useGuardianMode();
  const [step, setStep] = useState(0);
  const [diag, setDiag] = useState("");
  const [showStop, setShowStop] = useState(false);

  useEffect(() => {
    if (!character) { nav("/upload", { replace: true }); return; }
    const t = setTimeout(() => setShowStop(true), 3000);
    const voice = { mode: voiceMode, protagonist, name };
    const key = JSON.stringify([character.id, picks, said, voice, storyLength]);
    const run = startStory(key, (onStatus, signal) =>
      generateStory(character.id, picks, said, onStatus, signal, voice, storyLength));
    let live = true;   // 이 화면이 아직 붙어 있는지 — 떨어진 화면은 결과로 이동하지 않는다
    run.listen = (s) => {
      if (!live) return;
      setStep(STEP[s]);
      setDiag(`${s} · ${Math.round((performance.now() - run.started) / 1000)}s · ${ENGINE}`);
    };
    run.promise
      .then((res) => {
        if (!live) return;
        // 고른 카드를 이야기에 붙여 둔다 — 내 이야기(S-12)에서 다시 볼 때도 소품을 얹을 수 있게
        const s = { ...res, guardian, picks: { place: picks.place, problem: picks.problem, action: picks.action, result: picks.result } };
        setStory(s); add(s);
        // 책장 표지: 아이 그림을 작게 줄여 붙인다. 늦게 끝나도 같은 이야기(storyId)를 덮어쓸 뿐이다
        if (imageUrl) makeCover(imageUrl).then((cover) => { if (cover) add({ ...s, cover }); });
        if (mode === "guest") consumeTrial();
        nav("/story", { replace: true });
      })
      .catch((e) => {
        if (!live || (e as Error).name === "AbortError") return;
        setError(e instanceof ApiError ? e.code : "ENGINE_ERROR"); nav("/error");
      });
    return () => { live = false; clearTimeout(t); };
  }, [character, picks, said, setStory, add, setError, nav, mode, voiceMode, protagonist, name, guardian, imageUrl, storyLength]);

  const stop = () => { cancelStory(); nav("/steps"); };

  return (
    <Screen back={stop} speech="이야기를 쓰고 있어요" segment={3}
      acts={showStop ? <BigButton onClick={stop}>그만하기</BigButton> : undefined}>
      <Waiting message="이야기를 쓰고 있어요" steps={3} current={step}
               diagnostics={diagnostics ? diag : null} art={<Pencil />} />
    </Screen>
  );
}
