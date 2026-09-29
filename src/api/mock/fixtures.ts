import type { Keypoints } from "@/types/character";
import type { StepChoice, StepKind, Story } from "@/types/story";

/** Amateur Drawings 기본 자세를 0~1 로 정규화한 값 */
export const REST_KEYPOINTS: Keypoints = {
  hip:            { x: 0.500, y: 0.536, score: 0.95 },
  torso:          { x: 0.500, y: 0.366, score: 0.93 },
  neck:           { x: 0.500, y: 0.307, score: 0.88 },
  head:           { x: 0.500, y: 0.193, score: 0.92 },
  right_shoulder: { x: 0.380, y: 0.357, score: 0.76 },
  right_elbow:    { x: 0.320, y: 0.468, score: 0.34 },
  right_hand:     { x: 0.295, y: 0.575, score: 0.81 },
  left_shoulder:  { x: 0.620, y: 0.357, score: 0.89 },
  left_elbow:     { x: 0.680, y: 0.468, score: 0.87 },
  left_hand:      { x: 0.705, y: 0.575, score: 0.90 },
  right_hip:      { x: 0.430, y: 0.550, score: 0.93 },
  right_knee:     { x: 0.415, y: 0.711, score: 0.85 },
  right_foot:     { x: 0.400, y: 0.868, score: 0.79 },
  left_hip:       { x: 0.570, y: 0.550, score: 0.93 },
  left_knee:      { x: 0.585, y: 0.711, score: 0.86 },
  left_foot:      { x: 0.600, y: 0.868, score: 0.80 },
};

const icon = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#EDF2F8" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="50" fill="url(#bg)"/>
      <text x="60" y="80" font-size="64" text-anchor="middle">${label}</text>
    </svg>`
  )}`;

/* ───────── 그림 자리 ─────────
   실제 그림은 docs/art-direction.md 를 따라 GPT Image 로 뽑는다.
   목 엔진은 백엔드가 없으므로 프론트가 파일을 직접 참조한다 (같은 문서 7절).
   실서버에서는 GET /api/steps 와 POST /api/stories 가 URL 을 내려주므로
   아래 상수와 헬퍼는 목에서만 쓰인다. */

/** public/icons/{id}.png 를 넣은 뒤 true 로 바꾼다 */
const USE_REAL_ICONS = false;
/** public/bg/bg-{장소id}-{장면번호}.png 를 넣은 뒤 true 로 바꾼다 */
const USE_REAL_BG = false;

/** 장면 배경. 파일이 아직 없으면 null 이고, S-09 는 흰 무대를 그대로 쓴다 */
export const bgUrl = (placeId: string | undefined, scene: number) =>
  USE_REAL_BG && placeId ? `/bg/bg-${placeId}-${scene}.png` : null;

/** [id, 라벨, 임시 이모지] — id 는 kind 안에서만 유일하다 (docs/id-conventions.md 1절).
 *  그래서 아이콘 파일도 kind 로 갈라 둔다: /icons/{kind}/{id}.png */
const RAW: Record<StepKind, [string, string, string][]> = {
  place: [
    ["space", "우주", "🪐"],
    ["forest", "숲", "🌳"],
    ["sea", "바다", "🌊"],
    ["school", "학교", "🏫"],
    ["town", "마을", "🏘"],
    ["cave", "동굴", "🕳"],
  ],
  problem: [
    ["lost", "길을 잃었어요", "❓"],
    ["rain", "비가 내렸어요", "🌧"],
    ["hungry", "배가 고팠어요", "🍞"],
    ["dark", "어두워졌어요", "🌙"],
    ["fall", "넘어졌어요", "💥"],
    ["alone", "혼자가 됐어요", "😢"],
  ],
  action: [
    ["ask", "물어봤어요", "🗣"],
    ["run", "달려갔어요", "🏃"],
    ["hide", "숨었어요", "🫣"],
    ["help", "도와줬어요", "🤝"],
    ["wait", "기다렸어요", "⏳"],
    ["shout", "크게 불렀어요", "📣"],
  ],
  result: [
    ["home", "집에 갔어요", "🏠"],
    ["friend", "친구를 만났어요", "🧑‍🤝‍🧑"],
    ["gift", "선물을 받았어요", "🎁"],
    ["sun", "해가 떴어요", "☀️"],
    ["sleep", "잠이 들었어요", "😴"],
    ["party", "모두 기뻐했어요", "🎉"],
  ],
};

export const CHOICES: Record<string, StepChoice[]> = Object.fromEntries(
  Object.entries(RAW).map(([kind, rows]) => [
    kind,
    rows.map(([id, label, emoji]) => ({
      id,
      label,
      iconUrl: USE_REAL_ICONS ? `/icons/${kind}/${id}.png` : icon(emoji),
    })),
  ])
);

export const SAMPLE_STORIES: Story[] = [
  {
    storyId: "demo-1",
    title: "숲으로 간 날",
    createdAt: "2026-09-10",
    scenes: [
      { index: 0, sentence: "내 친구가 숲으로 갔어요.", audioUrl: null, motion: "walk", backgroundUrl: null },
      { index: 1, sentence: "그런데 길을 잃었어요.", audioUrl: null, motion: "look", backgroundUrl: null },
      { index: 2, sentence: "친구를 크게 불렀어요.", audioUrl: null, motion: "wave", backgroundUrl: null },
      { index: 3, sentence: "그래서 집에 갈 수 있었어요.", audioUrl: null, motion: "jump", backgroundUrl: null },
    ],
  },
];
