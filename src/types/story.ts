/** 브라우저 캔버스가 계산하는 모션. S-05·S-06 미리보기에만 쓴다.
 *  S-09 애니메이션은 서버가 렌더한 MP4 다 (백엔드 계약 2-6) */
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

/** 백엔드 계약 2-6 의 이야기. 문장은 `text` 한 덩어리로 오고,
 *  S-09·S-10 이 `sentences()` (src/lib.ts) 로 문장 단위로 나눠 쓴다 */
export interface Story {
  storyId: string;
  characterId: string;
  /** 서버에는 없다. 목록(S-12·S-13)에 띄우려고 장소로 만든다 */
  title: string;
  createdAt: string;
  text: string;
  audioUrl: string | null;
  /** 서버가 렌더한 MP4. 목 AI 에서는 원본 그림 URL 이 오고, 목 엔진에서는 null 이다 */
  animationUrl: string | null;
}

/** C-03 전체 진행 표시 구간. 그림 → 친구 → 이야기 → 놀이 */
export type Segment = 1 | 2 | 3 | 4 | null;

export type SupportLevel = 1 | 2 | 3;
export interface Settings {
  level: SupportLevel;
  muteAll: boolean;
  keepOriginal: boolean;
  diagnostics: boolean;
  /** S-07 말로 덧붙이기(STT). 아이 목소리가 브라우저 인식 서버로 가므로 어른이 켠다. 기본 꺼짐 */
  voiceInput: boolean;
}
