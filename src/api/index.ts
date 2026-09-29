import { JOINT_ORDER } from "@/types/character";
import type { Character, ErrorCode, JobStatus, JointName, Keypoints } from "@/types/character";
import type { StepChoice, StepKind, Story } from "@/types/story";
import { CHOICES, MAX_SAID, labelOf } from "@/features/story/choices";
import { mockAnalyze, mockGenerate } from "./mock/engine";

/* 백엔드 계약: drawtale-backend `docs/api-contract.md` (초안 v0.1, 2026-09-28).
   서버와 주고받는 모양은 이 파일 안에만 있다. 화면은 `@/types` 의 모양만 본다. */

export const ENGINE = (import.meta.env.VITE_ENGINE ?? "mock") as
  "mock" | "agent" | "finetuned";

const useMock = ENGINE === "mock";

const BASE = "/api/v1";
/** 계약 2-2: 1~2초 간격으로 polling */
const POLL_MS = 1500;
/** 분석은 S-04 의 30초 타이머 안에서 끝나야 한다 */
const ANALYZE_LIMIT_MS = 30_000;
/** 이야기는 서버 렌더까지 30~40초 걸린다 (백엔드 프론트엔드-시작하기 3-5).
 *  백엔드의 AI 타임아웃(300초)보다 길게 기다리지는 않는다 */
const STORY_LIMIT_MS = 300_000;

/** 화면이 E-01 문구를 고르는 코드를 싣고 던진다 */
export class ApiError extends Error {
  constructor(public code: ErrorCode, public serverCode?: string) {
    super(serverCode ?? code);
  }
}

/** 백엔드 오류 코드(계약 1-4, 3-2) → E-01 코드. 없는 것은 전부 ENGINE_ERROR 다.
 *  서버의 `message` 는 어른용 문장이라 아이 화면에 띄우지 않는다 */
const ERROR_MAP: Record<string, ErrorCode> = {
  NO_CHARACTER_DETECTED: "NO_CHARACTER",
  INVALID_IMAGE: "UNSUPPORTED_IMAGE",
  FILE_TOO_LARGE: "UNSUPPORTED_IMAGE",
  AI_TIMEOUT: "ENGINE_TIMEOUT",
  // 이야기 생성 job 오류 (백엔드 dev 51816e4, OpenAI moderation)
  CONTENT_BLOCKED: "CONTENT_BLOCKED",
};
const toErrorCode = (serverCode?: string): ErrorCode =>
  (serverCode && ERROR_MAP[serverCode]) || "ENGINE_ERROR";

// ─── 서버 응답 모양 (계약 2절) ───

interface ServerJoint { name: JointName; x: number; y: number }
interface ServerError { code: string; message: string }
interface ServerJob { id: string; status: JobStatus; error: ServerError | null }
interface ServerCharacter {
  id: string;
  image_width: number;
  image_height: number;
  joints: ServerJoint[] | null;
  joints_corrected: boolean;
}
interface ServerStory {
  id: string;
  character_id: string;
  place: string;
  text: string | null;
  audio_url: string | null;
  animation_url: string | null;
  created_at: string;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(BASE + path, init);
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    const code = (body as { error?: ServerError } | null)?.error?.code;
    throw new ApiError(toErrorCode(code), code ?? `HTTP_${r.status}`);
  }
  return body as T;
}

const aborted = () => new DOMException("aborted", "AbortError");

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); reject(aborted()); }, { once: true });
  });
}

/** 계약 2-2. succeeded 가 될 때까지 기다린다. failed 면 job 의 오류 코드로 던진다 */
async function waitJob(
  jobId: string, limitMs: number,
  onStatus: (s: JobStatus) => void, signal?: AbortSignal
) {
  const until = Date.now() + limitMs;
  for (;;) {
    if (signal?.aborted) throw aborted();
    const job = await call<ServerJob>(`/jobs/${jobId}`, { signal });
    onStatus(job.status);
    if (job.status === "succeeded") return;
    if (job.status === "failed") {
      throw new ApiError(toErrorCode(job.error?.code), job.error?.code);
    }
    if (Date.now() > until) throw new ApiError("ENGINE_TIMEOUT");
    await sleep(POLL_MS, signal);
  }
}

/** 원본 픽셀 좌표 → 0~1 (계약 1-2) */
function toCharacter(c: ServerCharacter): Character {
  if (!c.joints) throw new ApiError("ENGINE_ERROR", "NO_JOINTS");
  const keypoints = {} as Keypoints;
  for (const j of c.joints) {
    keypoints[j.name] = { x: j.x / c.image_width, y: j.y / c.image_height };
  }
  return {
    id: c.id, width: c.image_width, height: c.image_height,
    keypoints, corrected: c.joints_corrected,
  };
}

function toStory(s: ServerStory): Story {
  return {
    storyId: s.id,
    characterId: s.character_id,
    title: `${s.place}에 간 날`,
    createdAt: s.created_at.slice(0, 10),
    text: s.text ?? "",
    audioUrl: s.audio_url,
    animationUrl: s.animation_url,
  };
}

/** S-03 → S-04. 그림을 올리고 분석이 끝날 때까지 기다린다 (계약 2-1 → 2-2 → 2-3) */
export async function analyzeCharacter(
  file: File,
  onStatus: (s: JobStatus) => void,
  signal?: AbortSignal
): Promise<Character> {
  if (useMock) return mockAnalyze(file, onStatus, signal);

  const form = new FormData();
  form.append("image", file);
  const { character_id, job_id } = await call<{ character_id: string; job_id: string }>(
    "/characters", { method: "POST", body: form, signal });
  onStatus("pending");
  await waitJob(job_id, ANALYZE_LIMIT_MS, onStatus, signal);
  return toCharacter(await call<ServerCharacter>(`/characters/${character_id}`, { signal }));
}

/** S-06 관절 보정 저장 (계약 2-4). 15개 전부를 원본 픽셀 좌표로 보낸다 */
export async function saveJoints(character: Character, keypoints: Keypoints): Promise<Character> {
  if (useMock) return { ...character, keypoints, corrected: true };
  const joints = JOINT_ORDER.map((name) => ({
    name,
    x: Math.round(keypoints[name].x * character.width * 10) / 10,
    y: Math.round(keypoints[name].y * character.height * 10) / 10,
  }));
  return toCharacter(await call<ServerCharacter>(`/characters/${character.id}/joints`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ joints }),
  }));
}

/** S-07 선택지. 서버에 엔드포인트가 없어서 프론트 목록을 쓴다 (계약 2-5 ⚠) */
export async function fetchSteps(kind: StepKind, count: number): Promise<StepChoice[]> {
  return CHOICES[kind].slice(0, count);
}

/** S-08 이야기 생성 (계약 2-5 → 2-2 → 2-6). 서버가 MP4 까지 만든 뒤에 돌아온다.
 *  아이가 말로 덧붙인 단계는 카드 글자 대신 아이 말을 보낸다 (계약이 자유 문자열 50자) */
export async function generateStory(
  characterId: string,
  picks: Record<StepKind, string>,
  said: Partial<Record<StepKind, string>>,
  onStatus: (s: JobStatus) => void,
  signal?: AbortSignal
): Promise<Story> {
  const text = (k: StepKind) => said[k]?.slice(0, MAX_SAID) || labelOf(k, picks[k]);
  const labels = {
    place: text("place"),
    problem: text("problem"),
    action: text("action"),
    result: text("result"),
  };
  if (useMock) return mockGenerate(characterId, labels, onStatus, signal);

  const { story_id, job_id } = await call<{ story_id: string; job_id: string }>("/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ character_id: characterId, ...labels }),
    signal,
  });
  onStatus("pending");
  await waitJob(job_id, STORY_LIMIT_MS, onStatus, signal);
  return toStory(await call<ServerStory>(`/stories/${story_id}`, { signal }));
}
