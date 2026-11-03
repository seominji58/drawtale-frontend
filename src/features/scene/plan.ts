/** S-09 장면 계획 — 쪽마다 어느 자리에서, 주인공 · 다른 인물 · 소품이 어떻게 움직이고 밤낮이 어떤지 (2026-11-03).
 *  앞 쪽에서 끝난 모습(주인공 자리 · 밤낮)을 다음 쪽이 이어받아 시작한다 — 쪽이 바뀌어도 장면이 이어져 보이게.
 *  움직임은 그 쪽에 들어올 때 한 번만 (쪽은 아이가 넘긴다 — 자동 전환 아님, pt_docs 14 16장) */
import type { BookPage } from "@/types/story";
import { ACTION_PROP } from "@/features/story/choices";
import { LOCATIONS, locationFor } from "./locations";
import AR from "./props-ar.json";

/** 남녀 그림이 따로 있는 직업 (2026-11-03 사용자 「인물 묶음별로 남녀 그림」) — 그림 이름은 `${종류}-m` · `${종류}-f` */
const GENDERED = ["caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper", "keeper", "police", "cook", "mail"] as const;
type Gendered = (typeof GENDERED)[number];
export type PersonId = "friend" | "friend2" | "adult" | "grandma" | "grandpa" | "mom" | "dad" | "teacher" | "baby" | "dog" | "cat"
  | `${Gendered}-${"m" | "f"}` | "nurse" | "busdriver" | "classmates" | "bat" | "bird" | "rabbit" | "squirrel" | "alien";
type Kind = Exclude<PersonId, `${Gendered}-${"m" | "f"}`> | Gendered;
export type PropId = PersonId | "cover" | "sign";
/** 사람 · 동물 (옆에 서는 것). 숨을 것 · 표지판은 아니다 */
export const isPerson = (id: PropId) => id !== "cover" && id !== "sign";

/** 「숨었어요」에서 주인공 앞을 가리는 물건 — 대본 글에 나온 숨는 곳으로 고른다 (11/3 사용자 「우주에서 박스에 숨는데 대본은 잠자리 주머니」).
 *  [낱말, 그림(public/scenes/ 기준), 화면 높이 대비 키]. 글에서 먼저 나온 것. 맞는 그림이 없으면(담요 · 잠자리 주머니 · 틈 …)
 *  물건 없이 사라지기만 한다 — pt_docs 05 S-09-05 「배경만 남긴다」 */
const COVERS: [RegExp, string, number][] = [
  [/상자|박스|포대|궤짝/, "props/box.webp", 0.36],
  [/덤불|수풀|풀숲|나무(?= ?(?:뒤|뿌리|밑|아래|사이|옆))|화분|잎/, "props/bush.webp", 0.38],
  [/바위|돌멩이|돌 /, "cave-entrance/rocks.webp", 0.3],
  [/틈|돌벽|굴 벽/, "cave/rocks.webp", 0.3],
  [/통나무/, "forest-trail/log.webp", 0.22],
  [/고깃배|보트|배 (?:뒤|안|밑|옆)/, "sea-pier/boat.webp", 0.26],
  // 장소 그림에 이미 있는 물건을 앞에 하나 더 (11/3 「대본에 들어갔는데 실제로 없는 오브젝트」)
  [/미끄럼틀/, "playground/slide.webp", 0.5],
  [/파라솔/, "sea/parasol.webp", 0.48],
  [/사물함/, "school-hallway/lockers.webp", 0.48],
  [/책장/, "school-library/shelf.webp", 0.38],
  [/책상/, "school-classroom/desks.webp", 0.32],
  [/식탁|탁자/, "home-kitchen/table.webp", 0.34],
  // 새로 그린 숨는 곳 (11/3, tools/art/gen_objects.py)
  [/담요|이불|침낭|잠자리 주머니|돗자리/, "props/blanket.webp", 0.3],
  [/텐트/, "props/tent.webp", 0.44],
  [/모래 언덕/, "props/dune.webp", 0.26],
  [/시소/, "props/seesaw.webp", 0.2],
  [/정자|기둥/, "props/pavilion.webp", 0.56],
  [/구령대/, "props/podium.webp", 0.24],
];

/** 쪽 글에 나오면 주인공 옆에 놓는 물건 (11/3 사용자 「대본에 들어갔는데 실제로 없는 오브젝트」 · 「물건은 전부 만들어줘」 —
 *  카드 이야기 512가지에서 센 것, 아티팩트 「대본 인물 · 물건 목록」).
 *  [낱말, 그림(public/scenes 기준), 화면 높이 대비 키, 놓는 자리]. 가로세로 비율은 오린 그림에서 잰 값(props-ar.json).
 *  「공」 · 「게」 · 「새」처럼 짧은 낱말은 다른 낱말 속 글자가 걸리지 않게 낱말 단위로.
 *  놓는 자리: ground 땅(발끝), air 공중(새 · 박쥐 · 풍선), wall 벽(시계 — 실내에서만, 바깥이면 뺌) */
type Spot = "ground" | "air" | "wall";
const W1 = (w: string) => new RegExp(`(?:^|[^가-힣])${w}(?:을|를|이|가|은|는|과|와|도|랑|들|한 마리|의)?(?=[^가-힣]|$)`);
const THINGS: [RegExp, string, number, Spot][] = [
  [/손전등/, "props/flashlight.webp", 0.1, "ground"],
  [/랜턴|등불/, "props/lantern.webp", 0.17, "ground"],
  [W1("공"), "props/ball.webp", 0.12, "ground"],
  [/빵(?!빵)/, "props/bread.webp", 0.12, "ground"],
  [/의자/, "props/chair.webp", 0.2, "ground"],
  [/벤치/, "town-park/bench.webp", 0.18, "ground"],
  [/반창고/, "props/bandage.webp", 0.08, "ground"],
  [/풍선/, "props/balloons.webp", 0.3, "air"],
  // 11/3 밤 30장
  [/둥지/, "props/nest.webp", 0.1, "ground"],
  [/크레파스|크레용|도화지/, "props/crayons.webp", 0.1, "ground"],
  [/쿠션|방석/, "props/cushion.webp", 0.1, "ground"],
  [/깔개|매트|러그/, "props/rug.webp", 0.07, "ground"],
  [/울타리/, "props/fence.webp", 0.16, "ground"],
  [/대문/, "props/gate.webp", 0.32, "ground"],
  [/조개|불가사리/, "props/shells.webp", 0.07, "ground"],
  [/웅덩이/, "props/puddle.webp", 0.05, "ground"],
  [/계단/, "props/stairs.webp", 0.22, "ground"],
  [/가방|배낭/, "props/backpack.webp", 0.14, "ground"],
  [/시계/, "props/clock.webp", 0.13, "wall"],
  [/모자/, "props/hat.webp", 0.08, "ground"],
  [/블록|블럭/, "props/blocks.webp", 0.14, "ground"],
  [/그림책|동화책|공책|책을|책이|책 한|책장을 넘/, "props/books.webp", 0.1, "ground"],
  [/갈매기/, "props/seagull.webp", 0.12, "air"],
  [/우주선/, "props/spaceship.webp", 0.36, "ground"],
  [/양동이|삽으로|삽을|모래 삽/, "props/sandtoys.webp", 0.12, "ground"],
  [/우유|코코아|보리차|컵/, "props/milk.webp", 0.08, "ground"],
  [/도토리|솔방울/, "props/acorns.webp", 0.06, "ground"],
  [/선물/, "props/gift.webp", 0.12, "ground"],
  [/인형/, "props/teddy.webp", 0.14, "ground"],
  [/꽃게|작은 게|게 한|게가|게를|게도/, "props/crab.webp", 0.07, "ground"],
  [/깃발/, "props/flag.webp", 0.3, "ground"],
  [/우체통/, "props/mailbox.webp", 0.26, "ground"],
  [/다리를 건|나무다리|돌다리|다리 위|작은 다리/, "props/bridge.webp", 0.16, "ground"],
  [/수건|손수건/, "props/towel.webp", 0.07, "ground"],
  [/케이크|쿠키|과자|간식/, "props/cake.webp", 0.1, "ground"],
  [/우산/, "props/umbrella.webp", 0.24, "ground"],
  [/기차/, "props/toytrain.webp", 0.1, "ground"],
  [/화분/, "props/flowerpot.webp", 0.16, "ground"],
  // 대본 인물로 나오지 않고 글에만 나오는 작은 동물 (인물로 나오면 인물 그림이 선다)
  [W1("새"), "props/bird.webp", 0.12, "air"],
  [/박쥐/, "props/bat.webp", 0.14, "air"],
  [/토끼/, "props/rabbit.webp", 0.16, "ground"],
  [/다람쥐/, "props/squirrel.webp", 0.16, "ground"],
];
/** 오린 그림의 가로 ÷ 세로 (tools/art/process_cast2.py 가 잰다). 없으면 1 */
const ar = (src: string) => (AR as Record<string, number>)[src] ?? 1;
/** 한 쪽에 놓는 물건은 이만큼까지 (내 소품 포함) */
const MAX_THINGS = 3;

export interface ThingPlan {
  /** 그림 주소 (장면 그림이면 public/scenes 기준 경로, 내 소품이면 data URL) */
  src: string;
  /** 화면 높이 대비 키 · 가로 ÷ 세로 */
  h: number;
  ar: number;
  /** 땅 · 공중 · 벽 (내 소품은 땅) */
  spot?: Spot;
  /** 내 소품이면 그 이름 (그림 설명) */
  name?: string;
}

/** 내 소품 이름이 쪽 글에 나오나 — 이름 그대로(띄어쓰기 무시) 또는 마지막 낱말(「노란 우산」 → 「우산」) */
function mentions(text: string, name: string): boolean {
  const flat = text.replace(/\s+/g, "");
  const whole = name.replace(/\s+/g, "");
  const last = name.trim().split(/\s+/).pop() ?? "";
  if (whole && flat.includes(whole) && whole.length >= 2) return true;
  if (!last) return false;
  // 한 글자 이름(「해」 · 「공」)은 다른 낱말 속 글자(「해요」 · 「공원」)가 걸리지 않게 낱말 단위로
  if (last.length === 1) return new RegExp(`(?:^|[^가-힣])${last}(?:을|를|이|가|은|는|과|와|도|랑|이랑)?(?=[^가-힣]|$)`).test(text);
  return flat.includes(last);
}

/** 쪽마다 놓을 물건 — 내 소품이 먼저(같은 낱말이면 내가 그린 것), 그다음 장면 그림. 글에서 먼저 나온 순 */
export function thingsFor(text: string, mine: { name: string; png: string; height: number }[] = [], indoor = false,
  skip: Set<string> = new Set()): ThingPlan[] {
  const hits: { at: number; t: ThingPlan; key: string }[] = [];
  for (const p of mine) {
    if (!mentions(text, p.name)) continue;
    const last = p.name.trim().split(/\s+/).pop() ?? p.name;
    hits.push({ at: text.indexOf(last), t: { src: p.png, h: p.height, ar: 1, name: p.name }, key: last });
  }
  for (const [re, src, h, spot] of THINGS) {
    const m = re.exec(text);
    if (!m) continue;
    if (spot === "wall" && !indoor) continue;   // 바깥에는 걸 벽이 없다
    if (skip.has(src)) continue;
    // 내 소품이 같은 낱말이면 장면 그림은 빼고 내가 그린 것만
    if (hits.some((x) => m[0].includes(x.key) || x.key.includes(m[0].replace(/[^가-힣]/g, "").slice(0, 3)))) continue;
    hits.push({ at: m.index, t: { src, h, ar: ar(src), spot }, key: m[0] });
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, MAX_THINGS).map((x) => x.t);
}
export function coverFor(text: string): { src: string; h: number } | null {
  let best: { src: string; h: number } | null = null, at = Infinity;
  for (const [re, src, h] of COVERS) {
    const m = re.exec(text);
    if (m && m.index < at) { at = m.index; best = { src, h }; }
  }
  return best;
}

export interface PropPlan {
  id: PropId;
  /** 대본 인물이면 가로 자리(0~1) — 없으면 layout 의 소품 자리 */
  x?: number;
  /** 대본 인물 이름 (같은 인물이 앞 쪽에도 있었는지 볼 때) */
  name?: string;
  /** 이 쪽에서 들어오면 어느 쪽에서 걸어오는지. 없으면 처음부터 서 있다 */
  enter?: "left" | "right";
  /** 숨을 것(cover)의 그림 · 키 */
  src?: string;
  h?: number;
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
  /** 「숨었어요」 — out: 이 쪽에서 앞 물건 뒤로 천천히 사라지고 그대로 숨어 있다, gone: 이미 숨어 있다(행동 단계 다음 쪽).
   *  다시 나타나지 않는다 (11/3 사용자 「숨기 했으면 다시 나타나면 안되는데」 — pt_docs 05 S-09-05 「2초 뒤 다시 나타난다」와 다름) */
  hide: "out" | "gone" | null;
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
  /** 쪽 글에 나온 물건 · 내 소품 — 주인공 옆 땅에 */
  things: ThingPlan[];
}

interface Picks { place?: string; problem?: string; action?: string; result?: string }

const SLOT = 0.52;
const FRIEND_RESULTS = new Set(["new_friend", "tears_stop", "thanked", "best_friend", "party_friend"]);
const ADULT_RESULTS = new Set(["adult_took", "party_lost", "party_friend"]);
const LOOP_ACTIONS: Record<string, number> = { wave: 3, jump: 2, dance: 2 };
const INDOOR = new Set(["cave", "home-living", "home-kitchen", "home-bedroom", "school-classroom", "school-cafeteria",
  "school-hallway", "school-music", "school-library", "space-ship", "cave-lake"]);

export const isIndoor = (location: string) => INDOOR.has(location);

/** 대본 인물의 생김새(영어) · 이름(한국어)으로 그림을 고른다 (2026-11-03 — public/scenes/props).
 *  위에서부터 먼저 맞는 것, 생김새가 먼저. 영어는 낱말 단위로 ("woman" 의 man, "location" 의 cat 이 걸리지 않게).
 *  동물 · 직업을 가족보다 먼저 본다 — 「매점 아주머니」 · 「동굴 안내원」이 엄마 그림으로, 「아기 다람쥐」가 아기 그림으로
 *  나오던 것 (카드 이야기 512가지 인물 93명, 아티팩트 「대본 인물 · 물건 목록」). 직업은 남녀 그림 (genderOf).
 *  그림이 없는 것(물건)은 세우지 않는다 */
const KINDS: [Kind, RegExp, RegExp][] = [
  // 동물 · 외계인 (「아기 박쥐」 · 「엄마 새」가 아기 · 엄마 그림으로 가지 않게 맨 앞)
  ["caveguide", /\b(cave guide|bat keeper)\b/, /동굴 안내|박쥐 지킴이/],
  ["bat", /\bbats?\b/, /박쥐/],
  ["bird", /\b(birds?|sparrow|owl|chick)\b/, /새$|새들|참새|부엉이/],
  ["rabbit", /\b(rabbits?|bunny|bunnies)\b/, /토끼/],
  ["squirrel", /\bsquirrels?\b/, /다람쥐/],
  ["alien", /\baliens?\b/, /외계인/],
  // 직업 (「우주 경찰관」은 우주 대원, 「숲 해설가 선생님」은 숲 지킴이 — 더 좁은 것이 먼저)
  ["astronaut", /\b(astronaut|spacesuit|space suit|space police|space guide|spaceship captain|space station|space explorer|moon base)\b/, /우주|선장|대장/],
  ["ranger", /\b(forest ranger|ranger|forest guide)\b/, /숲 지킴이|숲 해설|숲 선생/],
  ["lifeguard", /\blifeguard\b/, /안전 ?요원|바다 지킴이|바닷가 지킴이|해변 지킴이|구조대/],
  ["caveguide", /\bguide\b.*\bcave\b|\bcave\b.*\bguide\b/, /안내원/],
  ["police", /\bpolice\b/, /경찰/],
  ["cook", /\b(school cook|cook|lunch lady|chef|nutrition)\b/, /급식|조리|영양|요리사/],
  ["mail", /\b(mail carrier|mailman|postman|postal)\b/, /우체부|집배원/],
  ["nurse", /\bnurse\b/, /보건|간호/],
  ["busdriver", /\bbus driver\b/, /버스 기사|기사님/],
  ["classmates", /\b(classmates|group of [a-z ]*(children|kids|friends))\b/, /친구들|반 아이들/],
  ["grandma", /\b(grandmother|grandma|granny|old woman|old lady)\b/, /할머니/],
  ["grandpa", /\b(grandfather|grandpa|old man)\b/, /할아버지/],
  ["shopkeeper", /\b(baker|bakery|shopkeeper|florist|flower shop|fruit (shop|stall|seller)|stationery|snack shop|shop owner|guesthouse)\b/,
    /빵집|가게|꽃집|문구점|매점|민박|사장님|주인/],
  ["keeper", /\b(playground keeper|park keeper|school guard|gate keeper|safety keeper|safety vest|crossing guard)\b/, /지킴이/],
  ["teacher", /\b(teacher|librarian)\b/, /선생님|사서/],
  ["baby", /\b(baby|toddler|infant)\b/, /아기/],
  ["dog", /\b(dog|puppy)\b/, /강아지|멍멍/],
  ["cat", /\b(cat|kitten)\b/, /고양이|야옹/],
  ["mom", /\b(mother|mom|mommy|aunt|woman|lady)\b/, /엄마|어머니|이모|고모|아주머니|아줌마/],
  ["dad", /\b(father|dad|daddy|uncle|man)\b/, /아빠|아버지|삼촌|아저씨/],
  ["adult", /\b(adult|grown-?up|doctor|driver|farmer|guard|staff|worker|clerk)\b/, /어른|의사|직원/],
  ["friend2", /\b(girl|sister)\b/, /여자\s*아이|언니|누나|여동생/],
  ["friend", /\b(boy|child|kid|friend|student|classmate|brother)\b/, /친구|아이|오빠|동생/],
];
/** 직업 그림의 남녀 — 생김새(영어)와 이름(한국어)의 낱말로. 모르면 남 */
function genderOf(desc: string, name: string): "m" | "f" {
  return /\b(woman|female|lady|girl|mother|aunt|grandmother|she|her)\b/.test(desc) || /언니|아주머니|아줌마|이모|엄마|누나|할머니|여자/.test(name)
    ? "f" : "m";
}
export function personKind(desc: string, name = ""): PersonId | null {
  const d = desc.toLowerCase();
  // 동물 · 직업 · 할머니 · 할아버지(선생님 앞까지)는 생김새 · 이름 모두 가족보다 먼저 — 「놀이터 지킴이」의 생김새가 「a man …」이라
  // 아빠 그림으로 가던 것. 그다음 나머지를 생김새 → 이름 순으로
  const cut = KINDS.findIndex(([k]) => k === "teacher");
  const first = KINDS.slice(0, cut), rest = KINDS.slice(cut);
  const k = first.find(([, en]) => en.test(d))?.[0] ?? first.find(([, , ko]) => ko.test(name))?.[0]
    ?? rest.find(([, en]) => en.test(d))?.[0] ?? rest.find(([, , ko]) => ko.test(name))?.[0] ?? null;
  if (!k) return null;
  return (GENDERED as readonly string[]).includes(k) ? (`${k}-${genderOf(d, name)}` as PersonId) : (k as PersonId);
}

/** 대본 자리 → 가로 자리. 주인공은 왼쪽 가운데라 인물은 오른쪽 */
const SLOT_X: Record<string, number> = { "right-middle": 0.78, "right-bottom": 0.66 };

/** 쪽마다 계획. place 는 장소 카드 id (말로 정한 장소면 부르지 않는다).
 *  인물: 대본이 그 쪽에 적은 인물(scene.characters)이 먼저다 — 글에 나오는 사람이 화면에 나온다.
 *  대본에 인물이 없는 쪽만 고른 카드로 정한다 (친구 카드면 친구, 어른 카드면 어른) */
export function planPages(pages: BookPage[], picks: Picks, sheet: Record<string, string> = {},
  mine: { name: string; png: string; height: number }[] = []): PagePlan[] {
  const place = picks.place!;
  const out: PagePlan[] = [];
  let x = SLOT, loc: string | undefined, night = false;
  const stageIdx = (s: string) => ["place", "problem", "action", "result"].indexOf(s);
  // 숨는 곳은 행동 쪽들의 글에서 한 번 정해 쪽이 바뀌어도 같은 물건
  const cover = coverFor(pages.filter((p) => p.stage === "action").map((p) => p.text).join(" "));
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
      if (actionProp === "cover" && cover) props.push({ id: "cover", ...cover });
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
    const hiding = p.stage === "action" && picks.action === "hide";
    const hide = !hiding ? null : out.some((q) => q.hero.hide) ? "gone" : "out";
    if (hiding) { from = to = SLOT; }
    out.push({
      location: loc,
      env: { night, sun },
      hero: { from, to, move, loops: LOOP_ACTIONS[p.action] ?? 0, fallen: p.stage === "problem" && picks.problem === "fall", hide },
      props,
      // 대본 인물로 이미 선 동물은 글에 나와도 또 놓지 않고, 우주선 안에서는 우주선을 놓지 않는다
      things: p.stage === "action" && picks.action === "hide" ? []
        : thingsFor(p.text, mine, isIndoor(loc), new Set([
          ...props.filter((q) => ["bird", "bat", "rabbit", "squirrel"].includes(q.id)).map((q) => `props/${q.id}.webp`),
          ...(loc === "space-ship" ? ["props/spaceship.webp"] : []),
        ])),
    });
    x = to;
  }
  return out;
}

export const knownPlace = (place?: string) => !!place && !!LOCATIONS[place];
