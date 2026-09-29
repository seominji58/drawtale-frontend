import type { AnalysisProgress, CharacterAnalysis } from "@/types/character";
import type { GenerateProgress, Story, StepKind } from "@/types/story";
import { mockAnalyze, mockGenerate, mockSteps, mockStories } from "./mock/engine";

export const ENGINE = (import.meta.env.VITE_ENGINE ?? "mock") as
  "mock" | "agent" | "finetuned";

const useMock = ENGINE === "mock";

/** S-03 → S-04. POST /api/characters 후 SSE 로 단계를 받는다. */
export async function analyzeCharacter(
  file: File,
  onProgress: (p: AnalysisProgress) => void,
  signal?: AbortSignal
): Promise<CharacterAnalysis> {
  if (useMock) return mockAnalyze(file, onProgress, signal);

  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/characters", { method: "POST", body: form, signal });
  if (!res.ok) throw new Error("upload failed");
  const { analysisId } = (await res.json()) as { analysisId: string };

  return new Promise((resolve, reject) => {
    const es = new EventSource(`/api/characters/${analysisId}/events`);
    const stop = () => es.close();
    signal?.addEventListener("abort", () => { stop(); reject(new DOMException("aborted", "AbortError")); });
    es.onmessage = (e) => {
      const p = JSON.parse(e.data) as AnalysisProgress;
      onProgress(p);
      if (p.stage === "done") {
        stop();
        fetch(`/api/characters/${analysisId}`).then((r) => r.json()).then(resolve, reject);
      }
    };
    es.onerror = () => { stop(); reject(new Error("sse failed")); };
  });
}

/** S-06 관절 보정 */
export async function patchKeypoints(id: string, keypoints: unknown) {
  if (useMock) return;
  await fetch(`/api/characters/${id}/keypoints`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keypoints }),
  });
}

/** S-07 선택지 */
export async function fetchSteps(kind: StepKind, level: number, count: number) {
  if (useMock) return mockSteps(kind, count);
  const r = await fetch(`/api/steps?kind=${kind}&level=${level}`);
  if (!r.ok) throw new Error("steps failed");
  return r.json();
}

/** S-08 이야기 생성 */
export async function generateStory(
  picks: Record<StepKind, string>,
  onProgress: (p: GenerateProgress) => void,
  signal?: AbortSignal
): Promise<Story> {
  if (useMock) return mockGenerate(picks, onProgress, signal);
  const res = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(picks),
    signal,
  });
  if (!res.ok) throw new Error("generate failed");
  return res.json();
}

/** S-12 목록 */
export async function fetchStories(): Promise<Story[]> {
  if (useMock) return mockStories();
  const r = await fetch("/api/stories");
  if (!r.ok) throw new Error("stories failed");
  return r.json();
}

/** S-10 활동 기록 */
export async function postActivity(storyId: string, tries: number, done: boolean) {
  if (useMock) return;
  await fetch(`/api/stories/${storyId}/activity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tries, done }),
  });
}
