/** 캐릭터 분석 응답 계약 (v1.0)
 *  파인튜닝이든 에이전트든 계약은 동일하다. 엔진 교체는 engine 필드로만 드러난다. */

export type JointName =
  | "root" | "hip" | "torso" | "neck" | "head"
  | "right_shoulder" | "right_elbow" | "right_hand"
  | "left_shoulder" | "left_elbow" | "left_hand"
  | "right_hip" | "right_knee" | "right_foot"
  | "left_hip" | "left_knee" | "left_foot";

/** 좌표는 이미지 크기로 나눈 0~1 값 */
export interface Keypoint { x: number; y: number; score: number }
export type Keypoints = Record<Exclude<JointName, "root">, Keypoint>;

export type EngineId = "finetuned" | "agent" | "mock";

export interface CharacterOk {
  version: "1.0";
  engine: EngineId;
  image: { width: number; height: number };
  character: {
    found: true;
    confidence: number;
    bbox: [number, number, number, number];
    maskUrl: string | null;
    keypoints: Keypoints;
  };
  elapsedMs: number;
}

export type AnalysisErrorCode =
  | "NO_CHARACTER" | "MULTIPLE_CHARACTERS" | "LOW_CONFIDENCE"
  | "UNSUPPORTED_IMAGE" | "ENGINE_TIMEOUT" | "ENGINE_ERROR";

export interface CharacterFail {
  version: "1.0";
  engine: EngineId;
  character: { found: false };
  error: { code: AnalysisErrorCode; message: string; retryable: boolean };
}

export type CharacterAnalysis = CharacterOk | CharacterFail;
export const isOk = (r: CharacterAnalysis): r is CharacterOk => r.character.found;

/** S-04 진행 단계 (SSE) */
export type AnalysisStage =
  | "uploaded" | "segmenting" | "estimating_pose" | "building_skeleton" | "done";
export interface AnalysisProgress { stage: AnalysisStage; progress: number; label: string }
