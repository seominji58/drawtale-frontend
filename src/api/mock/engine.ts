import type { Character, JobStatus } from "@/types/character";
import type { StepKind, Story } from "@/types/story";
import { REST_KEYPOINTS } from "./fixtures";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 백엔드 job 처럼 pending → running → succeeded 를 흘린다.
 *  실서버 분기와 같은 콜백이라 S-04 는 엔진을 몰라도 된다 */
async function fakeJob(onStatus: (s: JobStatus) => void, ms: number, signal?: AbortSignal) {
  for (const s of ["pending", "running"] as const) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    onStatus(s);
    await wait(ms);
  }
  if (signal?.aborted) throw new DOMException("aborted", "AbortError");
  onStatus("succeeded");
}

export async function mockAnalyze(
  file: File,
  onStatus: (s: JobStatus) => void,
  signal?: AbortSignal
): Promise<Character> {
  const size = await readSize(file);
  await fakeJob(onStatus, 900, signal);
  return {
    id: "mock-" + Date.now(),
    width: size.width,
    height: size.height,
    keypoints: { ...REST_KEYPOINTS },
    corrected: false,
  };
}

/** 문장은 백엔드 목 AI 와 같은 틀로 만든다 (drawtale-backend `services/jobs.py`).
 *  목에는 서버 렌더가 없으므로 animationUrl 은 null 이고, S-09 는 캔버스로 대신 보여준다 */
export async function mockGenerate(
  characterId: string,
  labels: Record<StepKind, string>,
  onStatus: (s: JobStatus) => void,
  signal?: AbortSignal
): Promise<Story> {
  await fakeJob(onStatus, 1200, signal);
  return {
    storyId: "s-" + Date.now(),
    characterId,
    title: `${labels.place}에 간 날`,
    createdAt: new Date().toISOString().slice(0, 10),
    text: `오늘 나는 ${labels.place}에 갔어요. 그런데 ${labels.problem}. `
      + `그래서 나는 ${labels.action}. 그랬더니 ${labels.result}.`,
    audioUrl: null,
    animationUrl: null,
  };
}

function readSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve({ width: 1000, height: 1000 });
    img.src = url;
  });
}
