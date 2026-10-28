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

/** 카드 그림이 있는 카드. 없는 카드는 이모지로 보인다.
 *  2026-10-28 확인: public/icons 의 행동 · 결과 그림과 problem/lost · alone · hungry · rain 은 모두 같은 사람 실루엣
 *  자리표시라 카드끼리 구분이 안 된다 — 쓰지 않는다. 진짜 그림은 장소 6장과 문제 둘(넘어졌어요 · 어두워졌어요)뿐이다
 *  (나머지 그림은 docs/image-replacement-plan.md) */
const ICON_FILE: Record<string, string> = {
  "place/school": "place/school", "place/town": "place/town", "place/forest": "place/forest",
  "place/sea": "place/sea", "place/space": "place/space", "place/cave": "place/cave",
  "problem/fall": "problem/fall", "problem/dark": "problem/dark",
};
const iconOf = (kind: string, id: string, emoji: string) => {
  const f = ICON_FILE[`${kind}/${id}`];
  return USE_REAL_ICONS && f ? `${import.meta.env.BASE_URL}icons/${f}.png` : icon(emoji);
};

/** 칸마다 보여 주는 카드 수. 2026-10-27 사용자 「지원 수준 안 남기고 고정, 8 4 4 4」 —
 *  장소 8 · 문제 4 · 행동 4(고른 문제마다) · 결과 4(고른 문제마다).
 *  pt_docs 05 는 지원 수준에 따라 장수를 줄이지만(수준 1 은 앞 2장) 사용자 결정으로 고정이다 (open-decisions 0-12) */
export const CARD_COUNT: Record<StepKind, number> = { place: 8, problem: 4, action: 4, result: 4 };

/** 카드 내용은 pt_docs 05 S-07 「카드」 표 그대로다 (2026-10-28 확정, a7eb2b2). 순서도 표의 순서 — 앞에서부터 보여 준다.
 *  [id, 라벨, 임시 이모지] — id 는 kind 안에서만 유일하다 (docs/id-conventions.md 1절) */
const RAW: Record<StepKind, [string, string, string][]> = {
  place: [
    ["home", "집", "🏠"],
    ["playground", "놀이터", "🛝"],
    ["school", "학교", "🏫"],
    ["town", "마을", "🏘"],
    ["forest", "숲", "🌳"],
    ["sea", "바다", "🌊"],
    ["space", "우주", "🪐"],
    ["cave", "동굴", "🕳"],
  ],
  problem: [
    ["fall", "넘어졌어요", "💥"],
    ["crying", "친구가 울고 있었어요", "😢"],
    ["lost", "길을 잃었어요", "❓"],
    ["dark", "어두워졌어요", "🌙"],
  ],
  // 아래 둘은 문제를 말로 정해(보호자 모드) 표에 없는 문제일 때만 쓴다. 표에 없는 임시 카드다 —
  // 동작 넷(손 흔들기 · 걷기 · 뛰기 · 대기)이 하나씩, 결과는 어느 문제 뒤에도 붙는 말
  action: [
    ["wave", "손을 흔들었어요", "👋"],
    ["walk", "천천히 걸어갔어요", "🚶"],
    ["run", "달려갔어요", "🏃"],
    ["wait", "기다렸어요", "⏳"],
  ],
  result: [
    ["okay", "금방 괜찮아졌어요", "🙂"],
    ["relief", "마음이 놓였어요", "😌"],
    ["brave", "용기가 생겼어요", "💪"],
    ["smile", "웃음이 났어요", "😄"],
  ],
};

/** 문제마다 따로 나오는 행동 카드 16장 (pt_docs 05 「행동 카드 16장」). 한 문제 안의 네 장은 모두 다른 동작이다.
 *  [id, 라벨, 임시 이모지, 동작, 소품] — 동작은 05 의 다섯 가지(wave 손 흔들기 · walk 걷기 · run 뛰기 · idle 대기 ·
 *  hide 사라지기 — 렌더를 부르지 않음). 소품은 05 의 기본 소품(adult 어른 · friend 친구 · cover 숨을 것), 없으면 "".
 *  id 는 행동 16장 안에서 유일하다 (ACTION_MOTION 이 id 로 찾는다) */
const ACTIONS_BY_PROBLEM: Record<string, [string, string, string, string, string][]> = {
  fall: [
    ["fall_run", "툭툭 털고 달려갔어요", "🏃", "run", ""],
    ["call_adult", "어른을 불렀어요", "📣", "wave", "adult"],
    ["walk_again", "천천히 다시 걸었어요", "🚶", "walk", ""],
    ["fall_rest", "잠깐 쉬며 기다렸어요", "⏳", "idle", ""],
  ],
  crying: [
    ["help_friend", "다가가서 도와줬어요", "🤝", "walk", "friend"],
    ["wave_smile", "손을 흔들어 웃게 했어요", "👋", "wave", "friend"],
    ["run_adult", "어른에게 달려갔어요", "🏃", "run", "adult"],
    ["wait_beside", "옆에서 기다려 줬어요", "⏳", "idle", "friend"],
  ],
  // 앞 두 장은 안전 수칙이다 — 그 자리에서 기다리고, 어른에게 묻는다
  lost: [
    ["stay_wait", "그 자리에서 기다렸어요", "⏳", "idle", ""],
    ["ask_adult", "어른에게 물어봤어요", "🗣", "wave", "adult"],
    ["find_way", "길을 찾아 나섰어요", "🧭", "walk", ""],
    ["run_road", "큰 길로 달려갔어요", "🏃", "run", ""],
  ],
  dark: [
    ["hide", "숨었어요", "🫣", "hide", "cover"],
    ["run_light", "밝은 곳으로 달려갔어요", "🏃", "run", ""],
    ["tiptoe", "살금살금 걸어갔어요", "🐾", "walk", ""],
    ["still_wait", "가만히 기다렸어요", "⏳", "idle", ""],
  ],
};

/** 문제마다 따로 나오는 결과 카드 16장 (pt_docs 05 「결과 카드 16장」). 그 문제의 행동 네 장 어느 것 뒤에도 맞는다.
 *  「모두 기뻐했어요」는 두 문제에 다 있어 id 를 나눴다 (같은 칸 안에서 id 가 겹치지 않게) */
const RESULTS_BY_PROBLEM: Record<string, [string, string, string][]> = {
  fall: [
    ["brave_again", "다시 씩씩해졌어요", "💪"],
    ["okay", "금방 괜찮아졌어요", "🙂"],
    ["smile", "웃음이 났어요", "😄"],
    ["play_again", "다시 신나게 놀았어요", "🤸"],
  ],
  crying: [
    ["friend_smiled", "친구가 웃었어요", "😊"],
    ["played_together", "함께 놀았어요", "🧑‍🤝‍🧑"],
    ["best_friend", "친한 친구가 됐어요", "💛"],
    ["party_friend", "모두 기뻐했어요", "🎉"],
  ],
  lost: [
    ["found_way", "길을 찾았어요", "🗺"],
    ["back_safe", "무사히 돌아왔어요", "🏡"],
    ["relief", "마음이 놓였어요", "😌"],
    ["party_lost", "모두 기뻐했어요", "🎉"],
  ],
  dark: [
    ["sun", "해가 떴어요", "☀️"],
    ["brave", "용기가 생겼어요", "💪"],
    ["sleep", "잠이 들었어요", "😴"],
    ["back_safe", "무사히 돌아왔어요", "🏡"],
  ],
};

/** 행동 카드 id → 영상 동작 (05 동작 열). 지금 서버는 라벨 낱말로 동작을 고르므로 아직 쓰지 않는다 */
export const ACTION_MOTION: Record<string, string> = Object.fromEntries(
  Object.values(ACTIONS_BY_PROBLEM).flat().map(([id, , , motion]) => [id, motion])
);
/** 행동 카드 id → 기본 소품 (05 소품 열). 소품이 없으면 키가 없다 */
export const ACTION_PROP: Record<string, string> = Object.fromEntries(
  Object.values(ACTIONS_BY_PROBLEM).flat().filter(([, , , , prop]) => prop).map(([id, , , , prop]) => [id, prop])
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

/** 인물 · 기분 칸을 묻는지. false 면 네 칸만 묻는다.
 *  2026-10-27 사용자 결정: 네 칸(장소 · 문제 · 행동 · 결과)만 고른다 — 꺼 둠 (open-decisions 0-11) */
export const ASK_EXTRAS = false;

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
      rows.map(([id, label, emoji]) => ({ id, label, iconUrl: iconOf(kind, id, emoji) })),
    ])
  ),
  ...Object.fromEntries(
    Object.entries(RAW_EXTRA).map(([kind, rows]) => [
      kind,
      rows.map(([id, label, emoji]) => ({ id, label, iconUrl: icon(emoji) })),
    ])
  ),
} as Record<AskKind, StepChoice[]>;

const byProblem = (kind: "action" | "result", table: Record<string, [string, string, string, ...string[]][]>) =>
  Object.fromEntries(Object.entries(table).map(([p, rows]) =>
    [p, rows.map(([id, label, emoji]) => ({ id, label, iconUrl: iconOf(kind, id, emoji) }))])) as Record<string, StepChoice[]>;
const ACTION_CHOICES = byProblem("action", ACTIONS_BY_PROBLEM);
const RESULT_CHOICES = byProblem("result", RESULTS_BY_PROBLEM);

/** 그 칸에 보일 카드. 행동 · 결과는 고른 문제에 따라 달라진다 (문제를 말로 정했으면 RAW 의 임시 카드) */
export function choicesFor(kind: AskKind, problemId?: string): StepChoice[] {
  if (kind === "action" && problemId && ACTION_CHOICES[problemId]) return ACTION_CHOICES[problemId];
  if (kind === "result" && problemId && RESULT_CHOICES[problemId]) return RESULT_CHOICES[problemId];
  return CHOICES[kind];
}

/** 고른 id 를 서버에 보낼 라벨로 바꾼다. 행동 · 결과는 문제별 카드에서 먼저 찾는다 */
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
