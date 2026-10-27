import { STEP_ORDER } from "@/types/story";
import type { AskKind, ExtraKind, StepChoice, StepKind, SupportLevel } from "@/types/story";

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

/** 문제마다 따로 나오는 행동 카드 (2026-10-27 사용자 「문제 4개 각각에 맞는 행동 선택지」 — 목업 내용, 확정은 회의 뒤).
 *  문제를 4장으로 고정하므로(open-decisions 0-12) 문제 × 행동 = 4 × 4 = 16장. 조합 수는 그대로 256가지다
 *  (문제 하나를 고르면 행동은 그 문제의 4장 중 하나). 문제를 말로 정했거나 목록에 없는 문제면 RAW.action 을 쓴다.
 *  [id, 라벨, 임시 이모지, 영상 동작] — 동작은 서버 렌더 기본 동작 여섯 가지(idle · walk · run · jump · wave · dance) 중 하나.
 *  실제 아이콘이 없어 이모지를 쓴다 (docs/image-replacement-plan.md — 행동 카드가 16장이 된다) */
const ACTIONS_BY_PROBLEM: Record<string, [string, string, string, string][]> = {
  lost: [
    ["ask", "길을 물어봤어요", "🗣", "wave"],
    ["map", "지도를 봤어요", "🗺", "idle"],
    ["back", "왔던 길로 돌아갔어요", "👣", "walk"],
    ["shout", "크게 불렀어요", "📣", "wave"],
  ],
  rain: [
    ["umbrella", "우산을 썼어요", "☂️", "walk"],
    ["shelter", "나무 밑으로 갔어요", "🌳", "run"],
    ["splash", "첨벙첨벙 놀았어요", "💦", "jump"],
    ["wait", "비가 그치길 기다렸어요", "⏳", "idle"],
  ],
  hungry: [
    ["lunchbox", "도시락을 꺼냈어요", "🍱", "idle"],
    ["share", "나눠 먹었어요", "🤝", "wave"],
    ["fruit", "열매를 땄어요", "🍎", "jump"],
    ["askfood", "먹을 것을 찾아갔어요", "🔍", "walk"],
  ],
  dark: [
    ["light", "손전등을 켰어요", "🔦", "idle"],
    ["hide", "숨었어요", "🫣", "idle"],
    ["sing", "노래를 불렀어요", "🎵", "dance"],
    ["star", "별빛을 따라갔어요", "⭐", "walk"],
  ],
};
/** 행동 카드 id → 영상 동작 (서버가 동작을 정하지 못할 때 쓸 값. 지금 서버는 라벨 낱말로 고른다) */
export const ACTION_MOTION: Record<string, string> = Object.fromEntries(
  Object.values(ACTIONS_BY_PROBLEM).flat().map(([id, , , motion]) => [id, motion])
);

/** 네 칸 사이에 더 묻는 칸의 카드 (2026-10-27 로컬 시험 — 회의에서 빼면 지운다, open-decisions 0-11).
 *  카드로만 고른다 — 이름 · 아이 말은 받지 않는다. 실제 아이콘이 없어 임시 이모지를 쓴다.
 *  수준마다 앞에서부터 2 · 4 · 6장이 보이므로 자주 쓸 것을 앞에 둔다 */
const RAW_EXTRA: Record<ExtraKind, [string, string, string][]> = {
  who: [
    ["friend", "친구", "🧒"],
    ["dog", "강아지", "🐶"],
    ["mom", "엄마", "👩"],
    ["dad", "아빠", "👨"],
    ["rabbit", "토끼", "🐰"],
    ["dino", "공룡", "🦕"],
  ],
  feelProblem: [
    ["scared", "무서웠어요", "😨"],
    ["sad", "슬펐어요", "😢"],
    ["worried", "걱정됐어요", "😟"],
    ["surprised", "놀랐어요", "😲"],
    ["curious", "궁금했어요", "🤔"],
    ["angry", "화났어요", "😠"],
  ],
  feelResult: [
    ["happy", "기뻤어요", "😊"],
    ["excited", "신났어요", "🤩"],
    ["proud", "뿌듯했어요", "😌"],
    ["thankful", "고마웠어요", "🥰"],
    ["sleepy", "졸렸어요", "😪"],
    ["sorry", "아쉬웠어요", "🥲"],
  ],
};

/** 인물 · 기분 칸을 묻는지. false 로 두면 네 칸만 묻는다 (회의에서 빼기로 하면 이것부터) */
export const ASK_EXTRAS = true;

/** 지원 수준별로 묻는 순서. Level 1 은 인물만 더하고, 2 · 3 은 기분까지 묻는다 — 칸이 늘수록 아이가 지치므로 */
export function askOrder(level: SupportLevel): AskKind[] {
  if (!ASK_EXTRAS) return STEP_ORDER;
  return level === 1
    ? ["place", "who", "problem", "action", "result"]
    : ["place", "who", "problem", "feelProblem", "action", "result", "feelResult"];
}
/** 모든 칸의 순서. 앞 칸을 바꾸면 뒤 칸을 지울 때 쓴다 (수준과 상관없이 같은 순서) */
export const ASK_ALL: AskKind[] = ["place", "who", "problem", "feelProblem", "action", "result", "feelResult"];

export const CHOICES = {
  ...Object.fromEntries(
    Object.entries(RAW).map(([kind, rows]) => [
      kind,
      rows.map(([id, label, emoji]) => ({
        id,
        label,
        iconUrl: USE_REAL_ICONS ? `/icons/${kind}/${id}.png` : icon(emoji),
      })),
    ])
  ),
  ...Object.fromEntries(
    Object.entries(RAW_EXTRA).map(([kind, rows]) => [
      kind,
      rows.map(([id, label, emoji]) => ({ id, label, iconUrl: icon(emoji) })),
    ])
  ),
} as Record<AskKind, StepChoice[]>;

const toChoice = ([id, label, emoji]: [string, string, string, ...string[]]): StepChoice => ({ id, label, iconUrl: icon(emoji) });
const ACTION_CHOICES: Record<string, StepChoice[]> = Object.fromEntries(
  Object.entries(ACTIONS_BY_PROBLEM).map(([p, rows]) => [p, rows.map(toChoice)])
);

/** 그 칸에 보일 카드. 행동은 고른 문제에 따라 달라진다 */
export function choicesFor(kind: AskKind, problemId?: string): StepChoice[] {
  if (kind === "action" && problemId && ACTION_CHOICES[problemId]) return ACTION_CHOICES[problemId];
  return CHOICES[kind];
}

/** 고른 id 를 서버에 보낼 라벨로 바꾼다. 행동은 문제별 카드에서 먼저 찾는다 */
export const labelOf = (kind: AskKind, id: string | undefined, problemId?: string) =>
  choicesFor(kind, problemId).find((c) => c.id === id)?.label
    ?? CHOICES[kind].find((c) => c.id === id)?.label ?? "";

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

/** 말하기 · 적기로 정할 수 있는 칸. 장소는 카드로만 고른다 — 아이 말로 받으면 장소가 너무 넓어진다
 *  (2026-10-23 사용자 결정). 「오늘 나는 ○○에 갔어요」 틀에 문장이 들어가면 깨지는 것도 같은 이유 */
export const VOICE_STEPS: StepKind[] = ["problem", "action", "result"];

/** 백엔드 계약 2-5: 단계마다 자유 문자열 50자 */
export const MAX_SAID = 50;
