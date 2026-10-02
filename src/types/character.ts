/** 캐릭터. 백엔드 계약(drawtale-backend `docs/api-contract.md` 1·2절)을 따른다.
 *  서버는 원본 이미지 픽셀 좌표로 주고받는다. 프론트 안에서는 0~1 로 바꿔 들고 다니고,
 *  바꾸는 곳은 `src/api/index.ts` 한 곳뿐이다. */

/** 관절 15개. 이름과 순서가 백엔드 계약 1-1 과 같다 */
export const JOINT_ORDER = [
  "hip", "torso", "neck",
  "right_shoulder", "right_elbow", "right_hand",
  "left_shoulder", "left_elbow", "left_hand",
  "right_hip", "right_knee", "right_foot",
  "left_hip", "left_knee", "left_foot",
] as const;
export type JointName = (typeof JOINT_ORDER)[number];

/** 캔버스가 뼈대를 만들 때만 쓰는 관절. 서버와 주고받지 않는다.
 *  `root` 는 hip 자리, `head` 는 torso → neck 방향으로 연장한 자리 (open-decisions 1번 A안) */
export type RigJoint = JointName | "root" | "head";

/** 이미지 너비·높이로 나눈 0~1 값 */
export interface Point { x: number; y: number }
export type Keypoints = Record<JointName, Point>;

export interface Character {
  id: string;
  /** 원본 이미지 픽셀 크기. 서버와 좌표를 주고받을 때 쓴다 */
  width: number;
  height: number;
  /** 현재 관절. 어른이 보정했으면 보정값이다 */
  keypoints: Keypoints;
  corrected: boolean;
  /** AI 가 처음 짚은 관절. S-06 「처음 자리로」가 쓴다. 서버가 주지 않으면 없다 */
  aiKeypoints?: Keypoints;
  /** AI 가 관절마다 얼마나 확신하는지 (0~1, 계약 2-3). 서버가 주지 않으면 없다 */
  aiScores?: Partial<Record<JointName, number>>;
  /** 캐릭터 검출 점수 (0~1). 없으면 모른다 */
  confidence?: number;
}

/** 이 점수보다 낮은 관절은 S-06 에서 따로 표시한다 (계약 2-3) */
export const LOW_JOINT_SCORE = 0.4;
/** 검출 점수가 이보다 낮으면 어른 확인을 권한다 */
export const LOW_DETECTION = 0.6;

/** AI 가 자신 없어 한 관절 */
export const lowJoints = (c: Character): JointName[] =>
  JOINT_ORDER.filter((n) => (c.aiScores?.[n] ?? 1) < LOW_JOINT_SCORE);

/** S-05-05 「어른에게 도움 받기」를 보일지. 점수를 모르면(목 엔진, 예전 서버) 늘 보인다 */
export const needsAdult = (c: Character): boolean =>
  c.aiScores === undefined || (c.confidence ?? 1) < LOW_DETECTION || lowJoints(c).length > 0;

/** 백엔드 Job 상태 (계약 1-3). S-04·S-08 대기 표시가 쓴다 */
export type JobStatus = "pending" | "running" | "succeeded" | "failed";

/** E-01 이 문구를 고르는 코드. 백엔드 코드는 `src/api/index.ts` 가 이리로 옮긴다 */
export type ErrorCode =
  | "NO_CHARACTER" | "MULTIPLE_CHARACTERS" | "LOW_CONFIDENCE"
  | "UNSUPPORTED_IMAGE" | "ENGINE_TIMEOUT" | "ENGINE_ERROR"
  /** 이야기 입력(카드·아이 말)이나 만든 문장이 검열에 걸렸다 (백엔드 moderation) */
  | "CONTENT_BLOCKED";
