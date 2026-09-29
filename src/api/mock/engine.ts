import type {
  AnalysisProgress, CharacterAnalysis, Keypoints,
} from "@/types/character";
import type { GenerateProgress, Story, StepKind } from "@/types/story";
import { CHOICES, REST_KEYPOINTS, SAMPLE_STORIES, bgUrl } from "./fixtures";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 실제 SSE 와 같은 모양으로 단계를 흘려보낸다.
 *  엔진을 바꿔도 화면은 이 콜백만 보면 되므로 S-04 를 고칠 필요가 없다. */
export async function mockAnalyze(
  file: File,
  onProgress: (p: AnalysisProgress) => void,
  signal?: AbortSignal
): Promise<CharacterAnalysis> {
  const started = performance.now();
  const size = await readSize(file);

  const stages: AnalysisProgress[] = [
    { stage: "uploaded", progress: 0.1, label: "그림을 받았어요" },
    { stage: "segmenting", progress: 0.35, label: "친구를 찾고 있어요" },
    { stage: "estimating_pose", progress: 0.7, label: "관절을 찾고 있어요" },
    { stage: "building_skeleton", progress: 0.9, label: "뼈대를 만들고 있어요" },
  ];
  for (const s of stages) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    onProgress(s);
    await wait(700);
  }
  onProgress({ stage: "done", progress: 1, label: "다 됐어요" });

  return {
    version: "1.0",
    engine: "mock",
    image: size,
    character: {
      found: true,
      confidence: 0.82,
      bbox: [0.22, 0.12, 0.56, 0.78],
      maskUrl: null,
      keypoints: REST_KEYPOINTS as Keypoints,
    },
    elapsedMs: Math.round(performance.now() - started),
  };
}

export async function mockSteps(kind: StepKind, count: number) {
  await wait(160);
  return CHOICES[kind].slice(0, count);
}

export async function mockGenerate(
  picks: Record<StepKind, string>,
  onProgress: (p: GenerateProgress) => void,
  signal?: AbortSignal
): Promise<Story> {
  const steps: GenerateProgress[] = [
    { stage: "generating_text", progress: 0.4, label: "이야기를 쓰고 있어요" },
    { stage: "synthesizing_voice", progress: 0.8, label: "목소리를 만들고 있어요" },
  ];
  for (const s of steps) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    onProgress(s);
    await wait(900);
  }
  onProgress({ stage: "done", progress: 1, label: "다 됐어요" });

  const L = (k: StepKind) => CHOICES[k].find((c) => c.id === picks[k])?.label ?? "";
  // 배경은 장소 하나에 장면 분위기 네 단계다 (docs/art-direction.md 4.3)
  const bg = (scene: number) => bgUrl(picks.place, scene);
  return {
    storyId: "s-" + Date.now(),
    title: `${L("place")}에 간 날`,
    createdAt: new Date().toISOString().slice(0, 10),
    scenes: [
      { index: 0, sentence: `내 친구가 ${L("place")}으로 갔어요.`, audioUrl: null, motion: "walk", backgroundUrl: bg(0) },
      { index: 1, sentence: `그런데 ${L("problem")}.`, audioUrl: null, motion: "look", backgroundUrl: bg(1) },
      { index: 2, sentence: `그래서 ${L("action")}.`, audioUrl: null, motion: "wave", backgroundUrl: bg(2) },
      { index: 3, sentence: `마지막에 ${L("result")}.`, audioUrl: null, motion: "jump", backgroundUrl: bg(3) },
    ],
  };
}

export async function mockStories(): Promise<Story[]> {
  await wait(120);
  return SAMPLE_STORIES;
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
