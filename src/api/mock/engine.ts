import type { Character, JobStatus } from "@/types/character";
import { STEP_ORDER } from "@/types/story";
import type { Book, BookPage, StepKind, Story, StoryLength } from "@/types/story";
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
    aiKeypoints: { ...REST_KEYPOINTS },
    // 실서버처럼 점수를 준다. 왼팔 두 관절을 자신 없게 두어 S-05-05 링크와 S-06 빨간 점이 보이게 한다
    aiScores: Object.fromEntries(Object.keys(REST_KEYPOINTS).map((n) =>
      [n, n === "left_elbow" || n === "left_hand" ? 0.3 : 0.9])),
    confidence: 0.95,
  };
}

/** 문장은 백엔드 목 AI 와 같은 틀로 만든다 (drawtale-backend `services/jobs.py`).
 *  목에는 서버 렌더가 없으므로 animationUrl 은 null 이고, S-09 는 캔버스로 대신 보여준다 */
export async function mockGenerate(
  characterId: string,
  labels: Record<StepKind, string>,
  onStatus: (s: JobStatus) => void,
  signal?: AbortSignal,
  length: StoryLength = "short",
  spoken: StepKind[] = [],
  name?: string | null
): Promise<Story> {
  await fakeJob(onStatus, 1200, signal);
  const book = length === "long" ? mockBook(labels, spoken, name) : null;
  return {
    storyId: "s-" + Date.now(),
    characterId,
    title: book?.title ?? `${labels.place}에 간 날`,
    createdAt: new Date().toISOString().slice(0, 10),
    text: book ? book.pages.map((p) => p.text).join(" ")
      : `오늘 나는 ${labels.place}에 갔어요. 그런데 ${labels.problem}. `
        + `그래서 나는 ${labels.action}. 그랬더니 ${labels.result}.`,
    audioUrl: null,
    animationUrl: null,
    book,
  };
}

/** 백엔드 `services/book.py` 의 fallback_book 과 같은 틀 (8쪽: 장소 1 · 문제 2 · 행동 2 · 결과 3).
 *  OpenAI 없이 도는 틀 문장이다. 아이가 말로 덧붙인 단계는 그 단계 첫 쪽에 「내가 말한 부분」으로 표시한다 */
function mockBook(labels: Record<StepKind, string>, spoken: StepKind[], name?: string | null): Book {
  const who = name ? `${name}${hasFinal(name) ? "은" : "는"}` : "나는";
  const t = (s: string) => s.replace(/[.\s]+$/, "");
  const place = t(labels.place);
  const lines: Record<StepKind, string[]> = {
    place: [`햇살이 반짝이는 날이었어요. ${who} ${place}에 갔어요.`],
    problem: [`그런데 그때였어요! ${t(labels.problem)}.`, "“어떡하지?” 잠깐 멈춰 섰어요. 가슴이 콩닥콩닥 뛰었어요."],
    action: [`${who} 용기를 냈어요. 그리고 ${t(labels.action)}.`, "한 걸음, 또 한 걸음. 천천히 해 보았어요."],
    result: [`드디어! ${t(labels.result)}.`, "“해냈다!” 얼굴에 웃음이 활짝 피었어요.", `${place}에서 보낸 하루는 정말 멋진 날이었어요.`],
  };
  const action: Record<StepKind, string> = { place: "walk", problem: "idle", action: "run", result: "dance" };
  const pages: BookPage[] = [];
  for (const stage of STEP_ORDER) {
    lines[stage].forEach((text, j) => pages.push({
      page: pages.length + 1, stage, action: j === 0 ? action[stage] : "idle", text,
      childWords: j === 0 && spoken.includes(stage) ? labels[stage] : "",
    }));
  }
  const orderPages = STEP_ORDER.map((s) => pages.find((p) => p.stage === s)!.page);
  return { title: `${place}에 간 날`, pages, orderPages };
}

function hasFinal(word: string) {
  const c = word.charCodeAt(word.length - 1);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
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
