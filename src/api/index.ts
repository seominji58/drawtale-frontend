import type { Character, ErrorCode, JobStatus, Keypoints } from "@/types/character";
import { BIPED, type FormDef } from "@/features/character/forms";
import type { AskKind, ProtagonistVoice, StepChoice, StepKind, Story, StoryLength, VoiceMode } from "@/types/story";
import { MAX_SAID, choicesFor, labelOf } from "@/features/story/choices";
import { mockAnalyze, mockGenerate } from "./mock/engine";
import { useAuth } from "@/store/auth";

/* 백엔드 계약: drawtale-backend `docs/api-contract.md` (초안 v0.1, 2026-09-28).
   서버와 주고받는 모양은 이 파일 안에만 있다. 화면은 `@/types` 의 모양만 본다. */

export const ENGINE = (import.meta.env.VITE_ENGINE ?? "mock") as
  "mock" | "agent" | "finetuned";

const useMock = ENGINE === "mock";

/** 배포에서는 백엔드가 다른 주소에 있다 (Static Web Apps 와 VM 이 따로). 비어 있으면 vite 프록시 */
export const BASE = import.meta.env.VITE_API_BASE || "/api/v1";
/** 계약 2-2: 1~2초 간격으로 polling */
const POLL_MS = 1500;
/** 분석은 S-04 의 30초 타이머 안에서 끝나야 한다 */
const ANALYZE_LIMIT_MS = 30_000;
/** 이야기는 서버 렌더까지 30~40초 걸린다 (백엔드 프론트엔드-시작하기 3-5).
 *  백엔드 로컬 .env.example 의 AI_TIMEOUT_SECONDS(300)보다 길게 기다리지는 않는다.
 *  배포 값(120)이나 코드 기본값(60)은 더 짧아서 그때는 백엔드가 먼저 끝낸다 */
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
  // 여러 명 · 사람이 아닌 그림 (백엔드 dev 971a0a3, AI feat/joint-confidence)
  MULTIPLE_CHARACTERS: "MULTIPLE_CHARACTERS",
  LOW_CONFIDENCE: "LOW_CONFIDENCE",
  // 이야기 생성 job 오류 (백엔드 dev 51816e4, OpenAI moderation)
  CONTENT_BLOCKED: "CONTENT_BLOCKED",
  // 요청 수 제한 · 하루 한도 (백엔드 2026-11-02 보안)
  RATE_LIMITED: "BUSY",
  DAILY_LIMIT: "BUSY",
};
const toErrorCode = (serverCode?: string): ErrorCode =>
  (serverCode && ERROR_MAP[serverCode]) || "ENGINE_ERROR";

// ─── 서버 응답 모양 (계약 2절) ───

/** score 는 analysis.joints 에만 있다 (계약 2-3) */
interface ServerJoint { name: string; x: number; y: number; score?: number | null }
interface ServerError { code: string; message: string }
interface ServerJob { id: string; status: JobStatus; error: ServerError | null }
interface ServerCharacter {
  id: string;
  preview_url?: string | null;
  preview_status?: "rendering" | "ready" | "failed" | null;
  image_width: number;
  image_height: number;
  joints: ServerJoint[] | null;
  joints_corrected: boolean;
  /** 형태 · 관절을 찾았나 (계약 2-3, 2026-11-04). 예전 서버는 보내지 않는다 */
  form?: string; joints_found?: boolean | null;
  /** AI 가 처음 짚은 관절 (보정해도 변하지 않음, 계약 2-3) */
  analysis: { joints: ServerJoint[]; confidence?: number | null; cutout_url?: string | null } | null;
}
interface ServerStory {
  id: string;
  character_id: string;
  place: string;
  text: string | null;
  audio_url: string | null;
  animation_url: string | null;
  still_url?: string | null;
  still_hands?: { l: number[]; r: number[] } | null;
  sprite_url?: string | null; sprite_frames?: number | null; sprite_box?: [number, number, number, number] | null; action_motion?: string;
  created_at: string;
  /** 긴 이야기일 때만 (계약 2-6 `book`) */
  book?: {
    title: string;
    pages: {
      page: number; stage: StepKind; action: string; text: string; child_words: string;
      audio_url?: string | null; animation_url?: string | null;
      /** 바탕이 투명한 프레임 묶음 (계약 2-6, 2026-11-03). 예전 서버 · 예전 이야기는 없음 */
      sprite_url?: string | null;
      sprite_frames?: number; sprite_box?: [number, number, number, number];
      /** 배경 그림 계획 (10/27). 화면은 세부 장소(location · background 낱말)만 쓴다. AI 실패면 null */
      scene?: {
        hero_on_page: boolean;
        characters: { name: string; slot: "right-middle" | "right-bottom" }[];
        background: string;
        location?: string;
      } | null;
    }[];
    order_pages: number[];
    /** 배경에 그릴 인물 이름 → 영어 생김새 (10/27) */
    character_sheet?: Record<string, string>;
  } | null;
}

/** 로그인한 보호자의 토큰 (store/auth.ts 가 둔다). **모든 요청에 싣는다** — 가입 없이는 쓸 수 없게
 *  바뀌어(03 F-ACC-03 · 04, 2026-11-03) 서버가 토큰 없는 요청을 401 로 막는다 */
function authHeader(): Record<string, string> {
  const t = localStorage.getItem("storyblanks.token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** 429(F-NFR-10) 는 서버가 알려 준 시간만큼 기다렸다 다시 보낸다. 오래 붙잡지 않게 60초까지만 */
const RATE_LIMIT_RETRIES = 2;

async function call<T>(path: string, init?: RequestInit, retries = RATE_LIMIT_RETRIES): Promise<T> {
  const r = await fetch(BASE + path, { ...init, headers: { ...authHeader(), ...(init?.headers as Record<string, string>) } });
  // 토큰이 만료됐거나 서버에서 지워졌다. 기기에서도 로그아웃해 로그인 화면으로 보낸다
  if (r.status === 401) useAuth.getState().logout();
  // 하루 한도처럼 몇 시간 뒤라고 하면 기다리지 않고 바로 안내한다(E-01 BUSY) — 2026-11-02
  const retryAfter = Number(r.headers.get("Retry-After")) || 5;
  if (r.status === 429 && retries > 0 && retryAfter <= 60) {
    await sleep(retryAfter * 1000, init?.signal ?? undefined);
    return call<T>(path, init, retries - 1);
  }
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

/** 잠깐 끊긴 것: 네트워크가 안 닿거나(fetch 의 TypeError) 서버 앞단이 잠시 응답하지 못한 것(502·503·504).
 *  기다리는 동안 이런 일이 생겨도 작업은 서버에서 계속 돌고 있다 (설계서 7장 「연결 끊김」) */
const isBriefOutage = (e: unknown) =>
  e instanceof TypeError ||
  (e instanceof ApiError && /^HTTP_50[234]$/.test(e.serverCode ?? ""));

/** 계약 2-2. succeeded 가 될 때까지 기다린다. failed 면 job 의 오류 코드로 던진다.
 *  연결이 잠깐 끊기면 오류로 끝내지 않고 대기 한도 안에서 다시 묻는다 */
async function waitJob(
  jobId: string, limitMs: number,
  onStatus: (s: JobStatus) => void, signal?: AbortSignal
) {
  const until = Date.now() + limitMs;
  for (;;) {
    if (signal?.aborted) throw aborted();
    let job: ServerJob;
    try {
      job = await call<ServerJob>(`/jobs/${jobId}`, { signal });
    } catch (e) {
      if (!isBriefOutage(e) || signal?.aborted) throw e;
      if (Date.now() > until) throw new ApiError("ENGINE_TIMEOUT");
      await sleep(POLL_MS, signal);
      continue;
    }
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
  const norm = (joints: ServerJoint[]) => {
    const k = {} as Keypoints;
    for (const j of joints) k[j.name] = { x: j.x / c.image_width, y: j.y / c.image_height };
    return k;
  };
  const ai = c.analysis?.joints?.length === c.joints.length ? c.analysis.joints : undefined;
  // 점수는 15개가 다 있을 때만 믿는다. 하나라도 없으면 예전 서버로 보고 모른다고 둔다
  const scored = ai?.every((j) => typeof j.score === "number");
  return {
    id: c.id, width: c.image_width, height: c.image_height,
    keypoints: norm(c.joints), corrected: c.joints_corrected,
    aiKeypoints: ai && norm(ai),
    aiScores: scored ? Object.fromEntries(ai!.map((j) => [j.name, j.score as number])) : undefined,
    confidence: c.analysis?.confidence ?? undefined,
    previewUrl: c.preview_url ?? null,
    previewStatus: c.preview_status ?? null,
    cutoutUrl: c.analysis?.cutout_url ?? null,
    form: c.form ?? "biped",
    jointsFound: c.joints_found ?? null,
  };
}

function toStory(s: ServerStory): Story {
  return {
    storyId: s.id,
    characterId: s.character_id,
    title: s.book?.title || `${s.place}에 간 날`,
    createdAt: s.created_at.slice(0, 10),
    place: s.place,
    text: s.text ?? "",
    audioUrl: s.audio_url,
    animationUrl: s.animation_url,
    stillUrl: s.still_url ?? null,
    stillHands: s.still_hands ?? null,
    spriteUrl: s.sprite_url ?? null,
    sprite: s.sprite_url && s.sprite_frames ? { frames: s.sprite_frames, box: s.sprite_box ?? [0, 0, 1, 1] } : null,
    actionMotion: s.action_motion ?? "wave",
    book: s.book ? {
      title: s.book.title,
      pages: s.book.pages.map((p) => ({
        page: p.page, stage: p.stage, action: p.action, text: p.text, childWords: p.child_words ?? "",
        audioUrl: p.audio_url ?? null, animationUrl: p.animation_url ?? null,
        spriteUrl: p.sprite_url ?? null,
        sprite: p.sprite_url && p.sprite_frames ? { frames: p.sprite_frames, box: p.sprite_box ?? [0, 0, 1, 1] } : null,
        scene: p.scene ? { location: p.scene.location ?? "", background: p.scene.background ?? "", characters: p.scene.characters ?? [] } : null,
      })),
      orderPages: s.book.order_pages,
      characterSheet: s.book.character_sheet ?? {},
    } : null,
  };
}

/** S-03 → S-04. 그림을 올리고 분석이 끝날 때까지 기다린다 (계약 2-1 → 2-2 → 2-3).
 *  keepOriginal 은 S-13 「원본 그림 보관」. 끄면 서버가 원본을 늦어도 24시간 뒤 지운다 */
export async function analyzeCharacter(
  file: File,
  onStatus: (s: JobStatus) => void,
  signal?: AbortSignal,
  keepOriginal = false,
  /** 「누구를 그렸어요?」에서 고른 형태 (계약 2-1 `form`). 사람이면 보내지 않는다 — 예전 서버도 그대로 */
  shape = "biped",
): Promise<Character> {
  if (useMock) return mockAnalyze(file, onStatus, signal);

  const form = new FormData();
  form.append("image", file);
  form.append("keep_original", String(keepOriginal));
  if (shape !== "biped") form.append("form", shape);
  const { character_id, job_id } = await call<{ character_id: string; job_id: string }>(
    "/characters", { method: "POST", body: form, signal });
  onStatus("pending");
  await waitJob(job_id, ANALYZE_LIMIT_MS, onStatus, signal);
  return toCharacter(await call<ServerCharacter>(`/characters/${character_id}`, { signal }));
}

/** 얼굴 방향 바꾸기 (계약 2-14) — 옆모습 형태를 머리 쪽만 반대로 다시 분석한다. 고친 관절은 지워지고 미리보기를 다시 만든다 */
export async function turnCharacter(id: string, signal?: AbortSignal): Promise<Character> {
  const { job_id } = await call<{ job_id: string }>(`/characters/${id}/turn`, { method: "POST", signal });
  await waitJob(job_id, ANALYZE_LIMIT_MS, () => undefined, signal);
  return fetchCharacter(id, signal);
}

/** 형태 목록 (계약 2-13). 준비된 것만 온다. 목 엔진 · 예전 서버면 2족형만 */
export async function fetchForms(): Promise<FormDef[]> {
  if (useMock) return [BIPED];
  try {
    return (await call<{ forms: FormDef[] }>("/forms")).forms;
  } catch {
    return [BIPED];
  }
}

/** 캐릭터를 다시 읽는다. S-05 가 미리보기가 다 만들어졌는지 물을 때 쓴다 (계약 2-3) */
export async function fetchCharacter(id: string, signal?: AbortSignal): Promise<Character> {
  return toCharacter(await call<ServerCharacter>(`/characters/${id}`, { signal }));
}

/** 서버의 원본 그림을 지운다 (계약 2-10). 관절과 이야기는 남는다.
 *  탭을 닫는 중에도 끝나도록 keepalive 로 보내고, 실패해도 서버가 보관 시간 뒤 지우므로 넘어간다 */
export function releaseOriginal(characterId: string): void {
  if (useMock) return;
  fetch(`${BASE}/characters/${characterId}/original`, { method: "DELETE", headers: authHeader(), keepalive: true })
    .catch(() => {});
}

/** S-10 순서 맞추기 한 번의 기록 (계약 2-11). 화면을 떠나는 중에도 끝나도록 keepalive 로 보낸다.
 *  기록이 빠져도 아이 흐름에는 영향이 없으므로 실패는 넘어간다 */
export function recordActivity(
  storyId: string,
  a: { attempts: number; completed: boolean; cardCount: number; level: number }
): void {
  if (useMock) return;
  fetch(`${BASE}/stories/${storyId}/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      attempts: a.attempts, completed: a.completed, card_count: a.cardCount, level: a.level,
    }),
    keepalive: true,
  }).catch(() => {});
}

/** S-06 관절 보정 저장 (계약 2-4). 15개 전부를 원본 픽셀 좌표로 보낸다 */
export async function saveJoints(character: Character, keypoints: Keypoints): Promise<Character> {
  if (useMock) return { ...character, keypoints, corrected: true };
  const joints = Object.keys(keypoints).map((name) => ({
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
export async function fetchSteps(kind: AskKind, count: number, problemId?: string): Promise<StepChoice[]> {
  return choicesFor(kind, problemId).slice(0, count);
}

/** S-08 이야기 생성 (계약 2-5 → 2-2 → 2-6). 서버가 MP4 까지 만든 뒤에 돌아온다.
 *  아이가 말로 덧붙인 단계는 카드 글자 대신 아이 말을 보낸다 (계약이 자유 문자열 50자).
 *  voice 는 S-13 「읽어주기」 · 「주인공 목소리」와 S05Name 의 이름. 캐릭터 목소리면 서버가 대사를 넣어 쓰고
 *  인물 종류에 맞는 목소리로 읽는다 (계약 2-5) */
export async function generateStory(
  characterId: string,
  picks: Partial<Record<AskKind, string>>,
  said: Partial<Record<StepKind, string>>,
  onStatus: (s: JobStatus) => void,
  signal?: AbortSignal,
  voice: { mode: VoiceMode; protagonist: ProtagonistVoice; name?: string | null; guardian?: boolean } = {
    mode: "narration", protagonist: "girl",
  },
  length: StoryLength = "short",
  /** 서버가 이야기 번호를 정하자마자 — 화면이 「만들던 이야기」로 기억해 두고, 그만두기 · 늦게 끝난 이야기 찾기에 쓴다 */
  onCreated?: (ids: { storyId: string; jobId: string }) => void,
): Promise<Story> {
  const text = (k: StepKind) => said[k]?.slice(0, MAX_SAID) || labelOf(k, picks[k], picks.problem);
  const labels = {
    place: text("place"),
    problem: text("problem"),
    action: text("action"),
    result: text("result"),
  };
  // 카드 대신 아이 말을 보낸 단계. 긴 이야기면 서버가 그 말을 그대로 살리고 그 쪽에 표시한다 (계약 2-5 `spoken`)
  const spoken = (Object.keys(labels) as StepKind[]).filter((k) => !!said[k]);
  // 네 칸 사이에 더 고른 인물 · 기분 카드 (로컬 시험, open-decisions 0-11). 긴 이야기 대본에만 쓰인다
  const extras = {
    who: labelOf("who", picks.who) || undefined,
    feel_problem: labelOf("feelProblem", picks.feelProblem) || undefined,
    feel_result: labelOf("feelResult", picks.feelResult) || undefined,
  };
  const hasExtras = Object.values(extras).some(Boolean);
  // 실제 서버처럼 나레이션 판은 이름을 글에 쓰지 않는다 (「나는」, 백엔드 write_story_book)
  if (useMock) return mockGenerate(characterId, labels, onStatus, signal, length, spoken,
    voice.mode === "characters" ? voice.name : null, extras);

  const { story_id, job_id } = await call<{ story_id: string; job_id: string }>("/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({
      character_id: characterId, ...labels,
      // 보호자 목소리로 나레이션 (S-13 「내 목소리로 읽어주기」, 계약 2-12). 목소리가 없으면 서버가 기본으로 읽는다
      ...(voice.guardian ? { narrator: "guardian" } : {}),
      voice_mode: voice.mode, protagonist_voice: voice.protagonist,
      // 캐릭터 목소리 판에서 나레이터가 3인칭으로 부를 이름 (S05Name). 없으면 서버가 짓는다
      ...(voice.name ? { protagonist_name: voice.name } : {}),
      length, spoken,
      ...(hasExtras ? { extras } : {}),
    }),
    signal,
  });
  onCreated?.({ storyId: story_id, jobId: job_id });
  onStatus("pending");
  await waitJob(job_id, STORY_LIMIT_MS, onStatus, signal);
  return toStory(await call<ServerStory>(`/stories/${story_id}`, { signal }));
}

// ---- 보호자 목소리 (계약 2-12, 2026-11-02) ----
// 로그인한 보호자만. 녹음은 서버에 저장하지 않고 ElevenLabs 로 넘겨 목소리를 만든다.

export interface GuardianVoice {
  registered: boolean;
  /** 서버가 목소리를 받을 수 있는지 (ElevenLabs 설정) */
  available: boolean;
  consentedAt: string | null;
}

/** 동의 화면 세 칸 (S13Voice). 모두 true 여야 서버가 받는다 */
export interface VoiceConsent { collect: boolean; transfer: boolean; ownVoice: boolean; version: string }

const MOCK_VOICE = "storyblanks.mock.voice";

export async function getMyVoice(): Promise<GuardianVoice> {
  if (useMock) {
    const at = localStorage.getItem(MOCK_VOICE);
    return { registered: !!at, available: true, consentedAt: at };
  }
  const r = await call<{ registered: boolean; available: boolean; consented_at: string | null }>(
    "/me/voice", { headers: authHeader() });
  return { registered: r.registered, available: r.available, consentedAt: r.consented_at };
}

export async function registerMyVoice(wav: Blob, consent: VoiceConsent): Promise<GuardianVoice> {
  if (useMock) {
    await sleep(1200);
    const at = new Date().toISOString();
    localStorage.setItem(MOCK_VOICE, at);
    return { registered: true, available: true, consentedAt: at };
  }
  const form = new FormData();
  form.append("audio", wav, "voice.wav");
  form.append("agree_collect", String(consent.collect));
  form.append("agree_transfer", String(consent.transfer));
  form.append("own_voice", String(consent.ownVoice));
  form.append("consent_version", consent.version);
  const r = await call<{ registered: boolean; available: boolean; consented_at: string | null }>(
    "/me/voice", { method: "POST", headers: authHeader(), body: form });
  return { registered: r.registered, available: r.available, consentedAt: r.consented_at };
}

/** 목소리 지우기 (동의 철회). 서버가 ElevenLabs 목소리와 그 목소리로 만든 음성을 함께 지운다 */
export async function deleteMyVoice(): Promise<void> {
  if (useMock) { localStorage.removeItem(MOCK_VOICE); return; }
  const r = await fetch(BASE + "/me/voice", { method: "DELETE", headers: authHeader() });
  if (!r.ok && r.status !== 204) throw new ApiError("ENGINE_ERROR", `HTTP_${r.status}`);
}

/** 계정 탈퇴 (S-13, 2026-11-03). 서버가 그 계정의 그림 · 이야기 · 음성 · 영상 · 보호자 목소리 · 로그인 기록을 모두 지운다
 *  (계약 2-8 DELETE /auth/me). 되돌릴 수 없다 — 화면이 먼저 묻는다 */
export async function deleteAccount(): Promise<void> {
  if (useMock) return;
  const r = await fetch(BASE + "/auth/me", { method: "DELETE", headers: authHeader() });
  if (!r.ok && r.status !== 204) throw new ApiError("ENGINE_ERROR", `HTTP_${r.status}`);
}

/** S-08 「그만하기」 — 서버 작업도 멈추게 한다 (계약 2-5 그만두기, 2026-11-04). 전에는 화면만 떠나서 서버가 끝까지 돌았고,
 *  그동안 같은 계정은 새 이야기가 「쉬어 갈게요」(BUSY)로 막혔다. 실패해도 화면은 그냥 떠난다 */
export async function cancelStoryJob(storyId: string): Promise<void> {
  if (useMock) return;
  try {
    await fetch(BASE + `/stories/${storyId}/cancel`, { method: "POST", headers: authHeader(), keepalive: true });
  } catch { /* 서버가 끝까지 돌 뿐이다 */ }
}

/** 화면이 기다리다 놓친 이야기(시간 초과 · 탭 닫힘)가 서버에서 끝났는지. 끝났으면 이야기를 받아 온다 (2026-11-04) */
export async function findStory(storyId: string, jobId: string): Promise<{ state: "done"; story: Story } | { state: "failed" | "waiting" }> {
  if (useMock) return { state: "failed" };
  try {
    const job = await call<ServerJob>(`/jobs/${jobId}`);
    if (job.status === "failed") return { state: "failed" };
    if (job.status !== "succeeded") return { state: "waiting" };
    return { state: "done", story: toStory(await call<ServerStory>(`/stories/${storyId}`)) };
  } catch (e) {
    // 지워졌거나 남의 것(404)이면 더 찾지 않는다. 서버가 잠깐 안 되면 다음에 다시
    return e instanceof ApiError && /NOT_FOUND|HTTP_404/.test(e.serverCode ?? "") ? { state: "failed" } : { state: "waiting" };
  }
}

/** 책장(S-12)에서 다시 연 이야기를 서버에서 새로 받는다 (2026-11-02 보안).
 *  음성 · 영상 주소에는 기한이 있어서(로컬 서명 24시간 · Azure SAS 2시간) 저장해 둔 주소는 곧 열리지 않는다.
 *  기기에만 있는 것(고친 제목 · 표지 · 고른 카드 · 보호자 모드)은 그대로 둔다. 못 받으면 저장본 그대로 */
export async function refreshStory(st: Story): Promise<Story> {
  if (useMock) return st;
  try {
    const fresh = toStory(await call<ServerStory>(`/stories/${st.storyId}`, { headers: authHeader() }));
    return {
      ...fresh,
      title: st.title,
      createdAt: st.createdAt,
      book: fresh.book ? { ...fresh.book, title: st.title } : fresh.book,
      cover: st.cover, picks: st.picks, guardian: st.guardian,
    };
  } catch {
    return st;
  }
}
