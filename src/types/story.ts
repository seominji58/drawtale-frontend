export type MotionId = "idle" | "walk" | "jump" | "wave" | "look";

/** S-07 선택 단계. 인물은 S-05에서 확정되므로 선택 단계에 없다. */
export type StepKind = "place" | "problem" | "action" | "result";
export const STEP_ORDER: StepKind[] = ["place", "problem", "action", "result"];
export const STEP_QUESTION: Record<StepKind, string> = {
  place: "어디로 갔을까요?",
  problem: "무슨 일이 생겼을까요?",
  action: "어떻게 했을까요?",
  result: "그래서 어떻게 됐을까요?",
};
export const STEP_LABEL: Record<StepKind, string> = {
  place: "장소", problem: "문제", action: "행동", result: "결과",
};

export interface StepChoice { id: string; iconUrl: string; label: string }

export interface StoryScene {
  index: number;
  sentence: string;
  audioUrl: string | null;
  motion: MotionId;
  backgroundUrl: string | null;
}
export interface Story {
  storyId: string;
  title: string;
  createdAt: string;
  scenes: StoryScene[];
}

export type GenerateStage = "generating_text" | "synthesizing_voice" | "done";
export interface GenerateProgress { stage: GenerateStage; progress: number; label: string }

/** C-03 전체 진행 표시 구간. 그림 → 친구 → 이야기 → 놀이 */
export type Segment = 1 | 2 | 3 | 4 | null;

export type SupportLevel = 1 | 2 | 3;
export interface Settings {
  level: SupportLevel;
  muteAll: boolean;
  keepOriginal: boolean;
  diagnostics: boolean;
}
