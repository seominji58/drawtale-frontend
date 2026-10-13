import type { StepChoice, StepKind } from "@/types/story";

/* S-07 선택지. 백엔드에 선택지를 내려주는 엔드포인트가 없어서 프론트가 들고 있다
   (백엔드 계약 2-5 ⚠ 「선택지를 서버가 내려줄지」 미정). 서버에는 id 가 아니라
   라벨 문자열을 보낸다 — 계약이 자유 문자열 50자라서다. */

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

/** public/icons/{kind}/{id}.png 를 넣은 뒤 true 로 바꾼다 (docs/art-direction.md) */
const USE_REAL_ICONS = true;

/** [id, 라벨, 임시 이모지] — id 는 kind 안에서만 유일하다 (docs/id-conventions.md 1절) */
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

export const CHOICES = Object.fromEntries(
  Object.entries(RAW).map(([kind, rows]) => [
    kind,
    rows.map(([id, label, emoji]) => ({
      id,
      label,
      iconUrl: USE_REAL_ICONS ? `/icons/${kind}/${id}.png` : icon(emoji),
    })),
  ])
) as Record<StepKind, StepChoice[]>;

/** 고른 id 를 서버에 보낼 라벨로 바꾼다 */
export const labelOf = (kind: StepKind, id: string | undefined) =>
  CHOICES[kind].find((c) => c.id === id)?.label ?? "";

/** 단계 하나가 이야기에서 되는 문장. 백엔드 목 AI 의 문장 틀과 같게 둔다
 *  (drawtale-backend `services/jobs.py` `_mock_story_text`) — 아이가 미리 듣는 문장과 결과가 같도록.
 *  백엔드가 AI 로 문장을 다듬게 되면 여기는 미리 듣기용 초안이 된다. */
export function sentenceFor(kind: StepKind, text: string): string {
  switch (kind) {
    case "place": return `오늘 나는 ${text}에 갔어요.`;
    case "problem": return `그런데 ${text}.`;
    case "action": return `그래서 나는 ${text}.`;
    case "result": return `그랬더니 ${text}.`;
  }
}

/** 말로 덧붙이기를 받는 단계. 장소는 「○○에 갔어요」 틀에 문장이 들어가면 깨져서 받지 않는다 */
export const VOICE_STEPS: StepKind[] = ["problem", "action", "result"];

/** 백엔드 계약 2-5: 단계마다 자유 문자열 50자 */
export const MAX_SAID = 50;
