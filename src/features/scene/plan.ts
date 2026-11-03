/** S-09 장면 계획 — 쪽마다 어느 자리에서, 주인공 · 다른 인물 · 소품이 어떻게 움직이고 밤낮이 어떤지 (2026-11-03).
 *  앞 쪽에서 끝난 모습(주인공 자리 · 밤낮)을 다음 쪽이 이어받아 시작한다 — 쪽이 바뀌어도 장면이 이어져 보이게.
 *  움직임은 그 쪽에 들어올 때 한 번만 (쪽은 아이가 넘긴다 — 자동 전환 아님, pt_docs 14 16장) */
import type { BookPage } from "@/types/story";
import { ACTION_PROP } from "@/features/story/choices";
import { LOCATIONS, locationFor } from "./locations";

export type PersonId = "friend" | "friend2" | "adult" | "grandma" | "grandpa" | "mom" | "dad" | "teacher" | "baby" | "dog" | "cat";
export type PropId = PersonId | "box" | "bush" | "sign";
/** 사람 · 동물 (옆에 서는 것). 숨을 것 · 표지판은 아니다 */
export const isPerson = (id: PropId) => id !== "box" && id !== "bush" && id !== "sign";

export interface PropPlan {
  id: PropId;
  /** 대본 인물이면 가로 자리(0~1) — 없으면 layout 의 소품 자리 */
  x?: number;
  /** 대본 인물 이름 (같은 인물이 앞 쪽에도 있었는지 볼 때) */
  name?: string;
  /** 이 쪽에서 들어오면 어느 쪽에서 걸어오는지. 없으면 처음부터 서 있다 */
  enter?: "left" | "right";
}

export interface HeroPlan {
  /** 가로 자리(0~1) — 시작 · 끝 */
  from: number;
  to: number;
  move: "none" | "walk" | "run";
  /** 제자리 동작을 몇 번 하고 멈출지 (손 흔들기 · 점프 · 춤). 0 이면 멈춘 그림 */
  loops: number;
  /** 「넘어졌어요」 — 살짝 기울어 주저앉은 자세 */
  fallen: boolean;
  /** 「숨었어요」 — 앞 물건 뒤로 천천히 사라졌다 다시 나타난다 (pt_docs 05 S-09-05) */
  hide: boolean;
}

export interface Env {
  night: boolean;
  /** 해가 떠 있는지 (「해가 떴어요」 쪽만 — 평소 낮에는 해를 그리지 않는다, 해는 그 카드의 소품) */
  sun: boolean;
}

export interface PagePlan {
  location: string;
  env: Env;
  hero: HeroPlan;
  props: PropPlan[];
}

interface Picks { place?: string; problem?: string; action?: string; result?: string }

const SLOT = 0.52;
const FRIEND_RESULTS = new Set(["new_friend", "tears_stop", "thanked", "best_friend", "party_friend"]);
const ADULT_RESULTS = new Set(["adult_took", "party_lost", "party_friend"]);
const LOOP_ACTIONS: Record<string, number> = { wave: 3, jump: 2, dance: 2 };
const INDOOR = new Set(["cave", "home-living", "home-kitchen", "home-bedroom", "school-classroom", "school-cafeteria",
  "school-hallway", "school-music", "school-library", "space-ship", "cave-lake"]);

export const isIndoor = (location: string) => INDOOR.has(location);

/** 대본 인물의 생김새(영어) · 이름(한국어)으로 그림을 고른다 (2026-11-03 인물 그림 9가지 — public/scenes/props).
 *  위에서부터 먼저 맞는 것, 생김새가 먼저. 영어는 낱말 단위로 ("woman" 의 man, "location" 의 cat 이 걸리지 않게).
 *  그림이 없는 것(물건 · 다른 동물)은 세우지 않는다 */
const KINDS: [PersonId, RegExp, RegExp][] = [
  ["grandma", /\b(grandmother|grandma|granny|old woman|old lady)\b/, /할머니/],
  ["grandpa", /\b(grandfather|grandpa|old man)\b/, /할아버지/],
  ["teacher", /\b(teacher|librarian)\b/, /선생님|사서/],
  ["baby", /\b(baby|toddler|infant)\b/, /아기/],
  ["dog", /\b(dog|puppy)\b/, /강아지|멍멍/],
  ["cat", /\b(cat|kitten)\b/, /고양이|야옹/],
  ["mom", /\b(mother|mom|mommy|aunt|woman|lady)\b/, /엄마|어머니|이모|고모|아주머니|아줌마/],
  ["dad", /\b(father|dad|daddy|uncle|man)\b/, /아빠|아버지|삼촌|아저씨/],
  ["adult", /\b(adult|grown-?up|nurse|police|doctor|chef|cook|shopkeeper|driver|baker|farmer|guard|staff|worker|clerk)\b/,
    /어른|간호사|경찰|의사|요리사|조리사|가게|기사|주인|직원/],
  ["friend2", /\b(girl|sister)\b/, /여자\s*아이|언니|누나|여동생/],
  ["friend", /\b(boy|child|kid|friend|student|classmate|brother)\b/, /친구|아이|오빠|동생/],
];
export function personKind(desc: string, name = ""): PersonId | null {
  const d = desc.toLowerCase();
  return KINDS.find(([, en]) => en.test(d))?.[0] ?? KINDS.find(([, , ko]) => ko.test(name))?.[0] ?? null;
}

/** 대본 자리 → 가로 자리. 주인공은 왼쪽 가운데라 인물은 오른쪽 */
const SLOT_X: Record<string, number> = { "right-middle": 0.78, "right-bottom": 0.66 };

/** 쪽마다 계획. place 는 장소 카드 id (말로 정한 장소면 부르지 않는다).
 *  인물: 대본이 그 쪽에 적은 인물(scene.characters)이 먼저다 — 글에 나오는 사람이 화면에 나온다.
 *  대본에 인물이 없는 쪽만 고른 카드로 정한다 (친구 카드면 친구, 어른 카드면 어른) */
export function planPages(pages: BookPage[], picks: Picks, sheet: Record<string, string> = {}): PagePlan[] {
  const place = picks.place!;
  const out: PagePlan[] = [];
  let x = SLOT, loc: string | undefined, night = false;
  const stageIdx = (s: string) => ["place", "problem", "action", "result"].indexOf(s);
  for (const p of pages) {
    loc = locationFor(place, p, loc);
    const st = stageIdx(p.stage);
    // 밤: 「어두워졌어요」부터 이어진다. 결과 「해가 떴어요」에서 밝아지고, 「잠이 들었어요」는 밤
    if (picks.problem === "dark" && st >= 1) night = true;
    let sun = false;
    if (p.stage === "result" && picks.result === "sun") { night = false; sun = true; }
    if (p.stage === "result" && picks.result === "sleep") night = true;

    const props: PropPlan[] = [];
    const actionProp = picks.action ? ACTION_PROP[picks.action] : undefined;
    const prevProps = out.length ? out[out.length - 1].props.map((q) => q.id) : [];
    const keep = (id: PropId, enter: "left" | "right") =>
      props.push(prevProps.includes(id) ? { id } : { id, enter });
    if (picks.problem === "crying" && st >= 1 && st <= 2) props.push({ id: "friend" });
    if (p.stage === "action" && actionProp) {
      if (actionProp === "adult") keep("adult", "left");
      if (actionProp === "friend" && !props.some((q) => q.id === "friend")) keep("friend", "right");
      if (actionProp === "sign") props.push({ id: "sign" });
      if (actionProp === "cover") props.push({ id: isIndoor(loc) ? "box" : "bush" });
    }
    if (p.stage === "result" && picks.result) {
      if (FRIEND_RESULTS.has(picks.result)) keep("friend", "right");
      if (ADULT_RESULTS.has(picks.result)) keep("adult", "left");
      if (picks.result === "found_way") props.push({ id: "sign" });
    }
    // 대본 인물이 있으면 사람은 그것으로 바꾼다 (표지판 · 숨을 것은 카드대로 둔다)
    const scripted = (p.scene?.characters ?? [])
      .map((c) => ({ c, kind: personKind(sheet[c.name] ?? "", c.name) }))
      .filter((v): v is { c: { name: string; slot: string }; kind: PersonId } => !!v.kind);
    // 같은 그림이 한 쪽에 둘이면 다른 친구 그림으로 (친구 둘)
    const usedKinds = new Set<PersonId>();
    for (const v of scripted) {
      if (usedKinds.has(v.kind)) v.kind = v.kind === "friend" ? "friend2" : v.kind === "friend2" ? "friend" : v.kind;
      usedKinds.add(v.kind);
    }
    if (scripted.length) {
      const prevNames = out.length ? out[out.length - 1].props.map((q) => q.name).filter(Boolean) : [];
      for (let k = props.length - 1; k >= 0; k--) if (isPerson(props[k].id)) props.splice(k, 1);
      scripted.forEach(({ c, kind }, k) => props.push({
        id: kind, name: c.name, x: SLOT_X[c.slot] ?? (k ? 0.66 : 0.78),
        enter: prevNames.includes(c.name) ? undefined : "right",
      }));
    }

    // 주인공: 걷기 · 뛰기는 옮겨 가고, 제자리 동작은 몇 번 하고 멈춘다
    const move = p.action === "walk" ? "walk" : p.action === "run" ? "run" : "none";
    let from = x, to = x;
    if (move !== "none") {
      const target = props.some((q) => q.id === "sign") ? 0.7
        : props.some((q) => q.id === "adult") ? 0.42
        : props.some((q) => q.id === "friend") ? 0.58 : SLOT;
      // 제자리면 옆에서 들어온다 — 「걸어갔어요」가 보이게
      from = Math.abs(x - target) < 0.08 ? (target > 0.5 ? 0.16 : 0.84) : x;
      if (target === SLOT && from === 0.84) from = 0.16;
      to = target;
    }
    const hide = p.stage === "action" && picks.action === "hide";
    if (hide) { from = to = SLOT; }
    out.push({
      location: loc,
      env: { night, sun },
      hero: { from, to, move, loops: LOOP_ACTIONS[p.action] ?? 0, fallen: p.stage === "problem" && picks.problem === "fall", hide },
      props,
    });
    x = to;
  }
  return out;
}

export const knownPlace = (place?: string) => !!place && !!LOCATIONS[place];
