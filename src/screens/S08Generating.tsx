import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import Waiting from "@/components/Waiting";
import { Pencil } from "@/components/illust";
import { useSession } from "@/store/session";
import { shelve } from "@/features/story/shelve";
import { useGuardianMode, useSettings, useWithAdult } from "@/store/settings";
import { useLibrary } from "@/store/library";
import { useAuth } from "@/store/auth";
import { generateStory, cancelStoryJob, ApiError, ENGINE } from "@/api";
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
  /** 서버가 정한 이야기 · 작업 번호 (요청을 보낸 뒤부터). 그만두기 · 늦게 끝난 이야기 찾기에 쓴다 */
  ids?: { storyId: string; jobId: string };
}

/** 지금 만들고 있는 이야기. 같은 요청이면 다시 보내지 않고 이어 받는다 — S-04 와 같은 이유
 *  (개발 모드 StrictMode 가 effect 를 두 번 돌려 이야기 Job 이 둘 생겼다, 2026-10-29) */
let running: Run | null = null;

type Ids = NonNullable<Run["ids"]>;
function startStory(
  key: string,
  make: (onStatus: (s: JobStatus) => void, signal: AbortSignal, onCreated: (ids: Ids) => void) => Promise<Result>,
  onCreated: (ids: Ids) => void,
): Run {
  if (running && running.key === key) return running;
  running?.ctrl.abort();
  const ctrl = new AbortController();
  const run = { key, started: performance.now(), ctrl, listen: () => {} } as unknown as Run;
  run.promise = make((s) => run.listen(s), ctrl.signal, (ids) => { run.ids = ids; onCreated(ids); });
  const clear = () => { if (running === run) running = null; };
  run.promise.then(clear, clear);
  running = run;
  return run;
}

/** 화면도 떠나고 서버 작업도 멈춘다 (2026-11-04). 그만둔 이야기는 책장에서 찾지 않는다 */
function cancelStory(): Ids | undefined {
  const ids = running?.ids;
  running?.ctrl.abort();
  running = null;
  if (ids) void cancelStoryJob(ids.storyId);
  return ids;
}

export default function S08Generating() {
  const nav = useNavigate();
  const { character, name, picks, said, setStory, setError, imageUrl } = useSession();
  const add = useLibrary((s) => s.add);
  const addPending = useLibrary((s) => s.addPending);
  const removePending = useLibrary((s) => s.removePending);
  const mode = useAuth((a) => a.mode);
  const diagnostics = useSettings((s) => s.diagnostics);
  const voiceMode = useSettings((s) => s.voiceMode);
  const protagonist = useSettings((s) => s.protagonistVoice);
  const storyLength = useSettings((s) => s.storyLength);
  const guardian = useGuardianMode();
  // 보호자 목소리로 나레이션 (S-13 「내 목소리로 읽어주기」). 목소리가 없으면 서버가 기본 나레이터로 읽는다
  const myVoice = useWithAdult().myVoice;
  const [step, setStep] = useState(0);
  const [diag, setDiag] = useState("");
  const [showStop, setShowStop] = useState(false);

  useEffect(() => {
    if (!character) { nav("/upload", { replace: true }); return; }
    const t = setTimeout(() => setShowStop(true), 3000);
    // 이름은 판과 상관없이 등록해 둔다(S05Name). 나레이션만 판은 서버가 받아 두기만 하고 글은 「나는」 —
    // 나중에 캐릭터 목소리 판으로 바꿀 때 그 이름을 쓴다 (2026-11-02, 계약 2-5 protagonist_name)
    const voice = { mode: voiceMode, protagonist, name, guardian: myVoice };
    const key = JSON.stringify([character.id, picks, said, voice, storyLength]);
    const kept = { place: picks.place, problem: picks.problem, action: picks.action, result: picks.result };
    // 결과를 받기 전에 화면을 떠나도(시간 초과 · 탭 닫힘) 책장이 나중에 찾도록 기억해 둔다
    const run = startStory(key, (onStatus, signal, onCreated) =>
      generateStory(character.id, picks, said, onStatus, signal, voice, storyLength, onCreated),
      (ids) => addPending({ ...ids, picks: kept, guardian, at: Date.now() }));
    let live = true;   // 이 화면이 아직 붙어 있는지 — 떨어진 화면은 결과로 이동하지 않는다
    run.listen = (s) => {
      if (!live) return;
      setStep(STEP[s]);
      setDiag(`${s} · ${Math.round((performance.now() - run.started) / 1000)}s · ${ENGINE}`);
    };
    run.promise
      .then((res) => {
        if (!live) return;
        removePending(res.storyId);
        // 고른 카드를 이야기에 붙여 둔다 — 내 이야기(S-12)에서 다시 볼 때도 소품을 얹을 수 있게.
        // 배경을 잘라 낸 정지 그림이 있으면 그것으로 표지 (2026-11-03). 목 엔진만 원본으로 (잘라 낸 그림이 없다)
        const cutout = res.stillUrl ?? character?.cutoutUrl ?? null;
        setStory(shelve(res, { guardian, picks: kept }, cutout ?? (ENGINE === "mock" ? imageUrl : null), add));
        nav("/story", { replace: true });
      })
      .catch((e) => {
        if (!live || (e as Error).name === "AbortError") return;
        // 오래 걸려 기다리기를 그만둔 것뿐 — 서버는 계속 만든다. 다시 만들게 하지 않고 책장에서 기다리게 한다
        if (e instanceof ApiError && e.code === "ENGINE_TIMEOUT" && run.ids) { setError("STORY_LATER"); nav("/error"); return; }
        if (run.ids) removePending(run.ids.storyId);
        setError(e instanceof ApiError ? e.code : "ENGINE_ERROR"); nav("/error");
      });
    return () => { live = false; clearTimeout(t); };
  }, [character, picks, said, setStory, add, addPending, removePending, setError, nav, mode, voiceMode, protagonist, name, guardian, imageUrl, storyLength, myVoice]);

  const stop = () => { const ids = cancelStory(); if (ids) removePending(ids.storyId); nav("/steps"); };

  return (
    <Screen back={stop} speech="이야기를 쓰고 있어요" segment={3} adultKey={false}
      acts={showStop ? <BigButton onClick={stop}>그만하기</BigButton> : undefined}>
      <Waiting message="이야기를 쓰고 있어요" steps={3} current={step}
               diagnostics={diagnostics ? diag : null} art={<Pencil />} />
    </Screen>
  );
}
