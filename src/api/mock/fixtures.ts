import type { Keypoints } from "@/types/character";

/** 목 엔진이 돌려주는 관절 15개 (0~1).
 *  Meta 모델과 같은 뜻으로 둔다 — `neck` 은 목이 아니라 **얼굴 가운데(코)** 다.
 *  `sample.ts` 가 이 자리에 사람을 그리므로 샘플 그림과 관절이 딱 맞는다. */
export const REST_KEYPOINTS: Keypoints = {
  hip:            { x: 0.500, y: 0.536 },
  torso:          { x: 0.500, y: 0.366 },
  neck:           { x: 0.500, y: 0.200 },
  right_shoulder: { x: 0.380, y: 0.357 },
  right_elbow:    { x: 0.320, y: 0.468 },
  right_hand:     { x: 0.295, y: 0.575 },
  left_shoulder:  { x: 0.620, y: 0.357 },
  left_elbow:     { x: 0.680, y: 0.468 },
  left_hand:      { x: 0.705, y: 0.575 },
  right_hip:      { x: 0.430, y: 0.550 },
  right_knee:     { x: 0.415, y: 0.711 },
  right_foot:     { x: 0.400, y: 0.868 },
  left_hip:       { x: 0.570, y: 0.550 },
  left_knee:      { x: 0.585, y: 0.711 },
  left_foot:      { x: 0.600, y: 0.868 },
};
