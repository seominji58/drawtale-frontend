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
}

/** 백엔드 Job 상태 (계약 1-3). S-04·S-08 대기 표시가 쓴다 */
export type JobStatus = "pending" | "running" | "succeeded" | "failed";

/** E-01 이 문구를 고르는 코드. 백엔드 코드는 `src/api/index.ts` 가 이리로 옮긴다 */
export type ErrorCode =
  | "NO_CHARACTER" | "MULTIPLE_CHARACTERS" | "LOW_CONFIDENCE"
  | "UNSUPPORTED_IMAGE" | "ENGINE_TIMEOUT" | "ENGINE_ERROR";
