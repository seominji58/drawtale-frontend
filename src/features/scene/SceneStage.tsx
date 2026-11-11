/** S-09 장면 층 (2026-11-03 사용자 결정 「나」 — 투명 캐릭터 + 화면에서 층 쌓기).
 *
 *  배경판 → 하늘(해 · 달 · 별) → 뒤 물건 → 밤빛 → 다른 인물 → 주인공 → 앞 물건(숨을 것)
 *  자리는 `public/scenes/{자리}/layout.json` (x 가운데, foot 발끝 또는 top 윗변, h 화면 높이 대비 — 0~1).
 *  밝기 · 밤빛은 배경 층에만 건다(pt_docs 03). 주인공은 밤에 아주 옅은 그늘만 (사용자 11/3 「옅게와 조금 더 사이」).
 *  해 · 달은 오른쪽(동)에서 곡선으로 떠서 왼쪽(서)으로 진다 (사용자 11/3).
 *  mode — play: 앞 쪽 모습(시작)에서 이 쪽 모습(끝)으로 한 번 움직이고 멈춘다 (쪽에 들어왔을 때)
 *         start: 시작 모습으로 기다린다 (앞으로 넘기는 동안 밑에 깔린 도착할 쪽 — 넘긴 뒤 이어서 움직인다)
 *         end: 끝 모습 그대로 (떠나는 쪽 · 뒤로 넘긴 쪽) */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { Env, MarkKind, PagePlan, PropId, ThingPlan } from "./plan";
import { FOLLOW_TEXT, GREET_TEXT, SAD_TEXT, hasSkyBodies, isIndoor, isPerson, sceneFx, subjectOf } from "./plan";
import { sceneBase } from "./locations";
import AR from "./props-ar.json";
import HANDS from "./hands.json";
import MOVES from "./people-moves.json";

/** 오린 그림의 가로 ÷ 세로 (없으면 기본값) */
const arOf = (src: string, fallback: number) => (AR as Record<string, number>)[src] ?? fallback;
import { drawFrame, loadSprite, type Sprite } from "./sprite";

interface Spot { src: string; x: number; foot?: number; top?: number; h: number; layer?: string }
interface Layout {
  ground?: number;
  plate: string;
  hero: { x: number; foot: number; h: number };
  objects: Spot[];
  props: Record<string, Spot>;
  /** 배경 그림에 그려진 창 (등대 안 둥근 창 · 우주선 창) — 창밖 소품 자리. 창문 그림(window.webp)이 따로 있으면 그것 */
  window?: { x: number; y: number; h: number };
}

const layouts = new Map<string, Promise<Layout>>();
function loadLayout(id: string): Promise<Layout> {
  let p = layouts.get(id);
  if (!p) {
    p = fetch(`${sceneBase(id)}layout.json`).then((r) => { if (!r.ok) throw new Error("layout"); return r.json(); });
    layouts.set(id, p);
    p.catch(() => layouts.delete(id));
  }
  return p;
}

/** 장소 layout 에 없는 인물 그림(대본 인물 9가지, 11/3)의 키 · 폭. 자리는 대본이 정한다(x) */
export const PEOPLE: Record<string, { h: number; w: number; foot?: number }> = {
  friend: { h: 0.46, w: 0.45 }, adult: { h: 0.58, w: 0.42 }, friend2: { h: 0.46, w: 0.45 },
  grandma: { h: 0.54, w: 0.4 }, grandpa: { h: 0.57, w: 0.4 }, mom: { h: 0.58, w: 0.38 }, dad: { h: 0.6, w: 0.38 },
  teacher: { h: 0.58, w: 0.42 }, baby: { h: 0.28, w: 0.62 }, dog: { h: 0.24, w: 0.9 }, cat: { h: 0.24, w: 0.72 },
  // 11/3 밤 — 직업 남녀 · 동물 · 외계인 · 반 친구들 (폭은 오린 그림에서 잰 비율, plan.ts props-ar.json)
  ...Object.fromEntries((["caveguide", "astronaut", "ranger", "lifeguard", "shopkeeper", "keeper", "police", "cook", "mail", "spacepolice"] as const)
    .flatMap((k) => (["m", "f"] as const).map((g) => [`${k}-${g}`, { h: k === "astronaut" ? 0.6 : 0.58, w: arOf(`props/${k}-${g}.webp`, 0.42) }]))),
  // 11/4 — 아이 우주복(아이 키) · 이모
  "spacekid-m": { h: 0.46, w: arOf("props/spacekid-m.webp", 0.5) }, "spacekid-f": { h: 0.46, w: arOf("props/spacekid-f.webp", 0.5) },
  aunt: { h: 0.58, w: arOf("props/aunt.webp", 0.32) },
  // 11/10: 바닷속 잠수부 (어른 · 아이 키)
  "diver-m": { h: 0.58, w: arOf("props/diver-m.webp", 0.45) }, "diver-f": { h: 0.58, w: arOf("props/diver-f.webp", 0.45) },
  "diverkid-m": { h: 0.46, w: arOf("props/diverkid-m.webp", 0.46) }, "diverkid-f": { h: 0.46, w: arOf("props/diverkid-f.webp", 0.46) },
  nurse: { h: 0.58, w: arOf("props/nurse.webp", 0.42) }, busdriver: { h: 0.58, w: arOf("props/busdriver.webp", 0.42) },
  classmates: { h: 0.46, w: arOf("props/classmates.webp", 1.2) }, alien: { h: 0.34, w: arOf("props/alien.webp", 0.8) },
  rabbit: { h: 0.2, w: arOf("props/rabbit.webp", 0.8) }, squirrel: { h: 0.2, w: arOf("props/squirrel.webp", 0.8) },
  // 날아다니는 것은 공중에
  bat: { h: 0.16, w: arOf("props/bat.webp", 1.4), foot: 0.5 }, bird: { h: 0.14, w: arOf("props/bird.webp", 0.9), foot: 0.6 },
};

/** 등장인물 동작 그림띠 (tools/people-moves/make.py, 11/9): 장 수, 한 번 도는 시간(초), 칸 가로세로 비, 멈춘 그림 키 대비 위 · 아래 여유,
 *  loop_from 이 있으면 그 장까지 한 번 넘긴 뒤 그 장부터 끝까지를 끝없이 되풀이한다 (인사: 손 들기 뒤 흔들기) */
interface MoveStrip { frames: number; sec: number; ar: number; pad_top: number; pad_bottom: number; loop_from?: number }
type PersonMoves = Partial<Record<"walk" | "wave" | "hooray", MoveStrip>>
/** 쪽 동작이 기쁨이면 옆 인물도 같이 만세 */
const CHEER_ACTIONS = new Set(["hooray", "jump", "dance"]);
/** 인물이 걸어 들어오는 시간 (ui.css .scene-person-walk · .after-walk 와 같게) */
const ENTER_MS = 2400;

/** 등장인물 그림띠 미리 읽기 (11/9 사용자 「소품 캐릭터들 초반에 여러 프레임 휙휙 뜨는 문제」).
 *  그림띠는 48장을 가로로 이은 긴 그림(약 9000px)이라 처음 붙을 때 아직 읽히지 않았으면, 시간은 흐르는데 비어 있다가
 *  몇 장 지난 자리부터 튀어나와 첫 장들이 휙휙 지나갔다(Chrome 에서 보이기 시작한 순간 그림이 안 읽혀 있었다).
 *  책을 열 때 이야기에 나올 그림띠를 다 읽고 풀어 두고(preloadStripsFor), 장면은 풀린 그림띠만 쓴다 */
const stripReady = new Set<string>();
const stripWait = new Map<string, Promise<void>>();
const stripUrl = (id: string, name: string) => `${sceneBase("people-moves")}${id}.${name}.webp`;
/** 소품 그림 주소, 장면 그림은 「장소/파일」, 내 소품은 data URL(아이가 그린 것) · 절대 주소는 그대로.
 *  손에 듦 · 머리에 씀 자리는 data URL 을 장소 경로로 잘못 붙여 아이가 그린 소품이 깨진 그림으로 나왔다 (11/9) */
const thingSrc = (src: string) => (/^(?:data:|blob:|https?:|\/)/.test(src) ? src : `${sceneBase(src.split("/")[0])}${src.split("/")[1]}`);
function preloadStrip(url: string): Promise<void> {
  if (stripReady.has(url)) return Promise.resolve();
  let w = stripWait.get(url);
  if (!w) {
    const im = new Image();
    im.src = url;
    w = (typeof im.decode === "function" ? im.decode() : new Promise<void>((ok, no) => { im.onload = () => ok(); im.onerror = no; }))
      .then(() => { stripReady.add(url); }, () => { stripWait.delete(url); });
    stripWait.set(url, w);
  }
  return w;
}
/** 이 이야기 장면들에 나오는 등장인물의 그림띠를 미리 읽어 둔다 (S-09 이 책을 열 때) */
export function preloadStripsFor(plans: PagePlan[]): void {
  const ids = new Set(plans.flatMap((pl) => pl.props.map((q) => q.id)));
  for (const id of ids) {
    const m = (MOVES as Record<string, PersonMoves>)[id];
    if (m) for (const name of Object.keys(m)) void preloadStrip(stripUrl(id, name));
  }
}

/** 한 쪽 장면에 들 그림(장소 배치 · 배경판 · 배경 물건 · 쪽 소품 · 주인공 그림 묶음)을 미리 읽고 풀어 둔다.
 *  책 화면은 다음 쪽이 다 읽힌 뒤에 「다음 쪽」을 연다: 넘기고 나서 그림이 오면 빈 쪽이 보였다가 장면이 나타났다 (11/11 사용자) */
const sceneWait = new Map<string, Promise<void>>();
type SpriteRef = { url: string; frames: number; box: [number, number, number, number] } | null | undefined;
export function preloadScene(plan: PagePlan, sprite: SpriteRef, spriteLeft?: SpriteRef): Promise<void> {
  const key = `${plan.key ?? ""}|${plan.location}|${sprite?.url ?? ""}|${spriteLeft?.url ?? ""}`;
  let w = sceneWait.get(key);
  if (!w) {
    const pic = (url: string) => {
      const im = new Image();
      im.src = url;
      return (typeof im.decode === "function" ? im.decode() : new Promise<void>((ok, no) => { im.onload = () => ok(); im.onerror = no; })).catch(() => {});
    };
    const base = sceneBase(plan.location);
    w = loadLayout(plan.location).then((l) => Promise.all([
      pic(base + l.plate),
      ...l.objects.map((o) => pic(base + o.src)),
      ...(plan.things ?? []).map((t) => pic(thingSrc(t.src))),
      ...[sprite, spriteLeft].filter((v): v is NonNullable<SpriteRef> => !!v?.url).map((v) => loadSprite(v.url, v).then(() => {}, () => {})),
    ])).then(() => {}, () => {});
    sceneWait.set(key, w);
  }
  return w;
}

const REDUCE = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const FPS = 12;
// 걷기 · 뛰기는 AI 가 제자리로 렌더하고(11/3 저녁) 화면이 그림 칸째 옮긴다. 옮기는 속도가 렌더의 걸음 속도와
// 같아야 발이 미끄러지지 않는다 — 예전(이동이 들어 있던) 렌더에서 잰 한 장당 이동, 그림 키 대비 (CMU walk · run)
const STRIDE = { walk: 0.0079, run: 0.0129 } as const;
// 그 속도로 너무 오래 걸리면 장을 빨리 넘겨(걸음이 빨라짐) 이 시간 안에. 장 넘김은 FPS 의 MAX_SPEEDUP 배까지
const MOVE_MAX_MS = { walk: 5000, run: 3000 } as const;
const MAX_SPEEDUP = 1.8;

/** 옮겨 가는 시간 · 장 넘김 빠르기. dist 는 화면 너비 대비, heroH 는 화면 높이 대비 그림 키, aspect 는 너비 ÷ 높이 */
function moveTiming(move: "walk" | "run" | "none", dist: number, heroH: number, aspect: number) {
  if (move === "none" || dist <= 0) return { ms: 0, fps: FPS };
  const heights = (dist * aspect) / Math.max(0.05, heroH);          // 그림 키 몇 개만큼 가나
  const natural = (heights / (STRIDE[move] * FPS)) * 1000;           // 렌더 걸음 그대로면 걸리는 시간
  const k = Math.min(MAX_SPEEDUP, Math.max(1, natural / MOVE_MAX_MS[move]));
  return { ms: Math.round(natural / k / 50) * 50, fps: Math.round(FPS * k) };
}
// 해 · 달 자리 [가로, 세로(하늘 칸 기준)]. 오른쪽 = 동쪽(뜨는 쪽), 왼쪽 = 서쪽(지는 쪽)
const SKY = { sunHigh: [68, 8], moonHigh: [50, 10], east: [93, 108], west: [9, 108] } as const;

const spotStyle = (s: Spot): CSSProperties => ({
  left: `${s.x * 100}%`, height: `${s.h * 100}%`,
  ...(s.top !== undefined ? { top: `${s.top * 100}%` } : { bottom: `${(1 - (s.foot ?? 0.9)) * 100}%` }),
});

interface Props {
  plan: PagePlan;
  /** 앞 쪽의 밤낮 — 다르면 들어올 때 바뀐다 */
  prevEnv: Env | null;
  /** 이 쪽 동작의 프레임 묶음. 없으면 멈춘 그림(still) */
  sprite?: { url: string; frames: number; box: [number, number, number, number] } | null;
  /** 사람형 걷기 · 뛰기의 왼쪽 걸음 (sprite 는 오른쪽으로 내딛는다). 왼쪽으로 옮겨 가는 쪽은 이것 — 그림을 뒤집지 않는다 */
  spriteLeft?: { url: string; frames: number; box: [number, number, number, number] } | null;
  /** 배경을 잘라 낸 주인공 정지 그림 */
  still?: string | null;
  /** 정지 그림 안 주인공 손 위치 (서버 still_hands) — 대본에서 주인공이 든 소품을 손에 */
  heroHands?: { l: number[]; r: number[] } | null;
  /** 4족형 정지 그림 안 입 · 머리 꼭대기 · 등 자리 (서버 still_body, 그림 기준): 없으면 그려진 칸에서 어림 */
  heroBody?: { mouth: number[]; head: number[]; back: number[] } | null;
  mode: "play" | "start" | "end";
  /** 주인공 크기 기준 — 키(height, 사람) / 몸길이(width, 4족형처럼 옆으로 긴 몸). 형태 정의의 hero.fit (pt_docs 19) */
  fit?: "height" | "width";
  /** 주인공을 바닥선에서 띄우는 높이 (화면 높이 대비, 형태 정의 hero.float). 헤엄치는 친구 */
  lift?: number;
  /** 주인공 크기 배율 (형태 정의 hero.size). 통통한 물고기는 몸길이 기준이면 사람보다 훨씬 컸다 (11/5) */
  size?: number;
  /** 옆모습 그림의 머리 방향 (-1 왼쪽 · 1 오른쪽 · 0 모름/정면). 머리 반대쪽으로 옮겨 갈 때 좌우로 뒤집는다 */
  facing?: -1 | 0 | 1;
  /** 이 쪽 나레이션 진행 (0~1)과 밤낮 · 날씨가 바뀌는 말의 자리(envCueAt). 둘 다 있으면 나레이션이 그 자리에 왔을 때
   *  앞 쪽 하늘에서 이 쪽 하늘로 천천히 바뀐다. 없으면 쪽에 들어올 때 바로 (11/9 테스트 5번) */
  narration?: number;
  envAt?: number;
  /** 이 쪽 글 — 이름이 나온 인물(말하는 사람)은 손을 흔든다 */
  text?: string;
  /** 이 쪽 주인공 동작 (book page action) — 기쁨이면 옆 인물도 만세 */
  pageAction?: string;
  /** 앞 쪽에서 날고 있었는지 (날개형 높이를 이어 붙인다) */
  prevFly?: boolean | null;
  /** 주인공 이름 (연출의 「누가」를 가린다 — 「별이는 잠이 들었어요」) */
  heroName?: string | null;
  /** 주인공 형태 (forms/*.json id). 4족형이면 든 소품을 입에 물고 · 등에 태운다 (pt_docs 20 2-a) */
  form?: string;
}

/** 몸길이 기준일 때 몸길이 = 장소 주인공 키(hero.h)의 이만큼. 키는 이 배를 넘지 않는다 (옆으로 긴 그림이 너무 커지지 않게) */
const WIDE_LEN = 1.25, WIDE_MAX_H = 0.85;

/** 쪽 사이 자리 기억 (11/10 사용자 「소품이 등장하고 사라지는 타이밍, 위치, 크기 다 중요해」).
 *  붙박이 물건(ThingPlan.keep)은 처음 놓인 자리 · 크기를 다음 쪽에도 그대로, 주인공은 제자리 쪽(HeroPlan.stay)이면 앞 쪽에서 실제로 선 자리를.
 *  열쇠에 이야기 값이 들어 있어 이야기끼리 섞이지 않는다. 먼저 그려진 쪽이 정하고 나머지는 따른다 */
const PINS = new Map<string, { x: number; h: number; footY?: number }>();
/** 사람이 앞에 서도 되는 넓은 풍경 물건 */
const WIDE_SCENERY = new Set(["tent", "spaceship", "rocket", "boat", "bridge", "dune"]);
const HERO_AT = new Map<string, number>();
/** 등장인물 자리: 쪽 열쇠 + 이름(없으면 그림) → 가로 자리 */
const PEOPLE_AT = new Map<string, number>();
const prevKey = (key?: string) => {
  const m = key?.match(/^(.*):(\d+)$/);
  return m && Number(m[2]) > 0 ? `${m[1]}:${Number(m[2]) - 1}` : null;
};

export default function SceneStage({ heroName = null, plan, prevEnv, sprite: spriteRight, spriteLeft, still, mode, heroHands, heroBody, fit = "height", facing = 0, lift: formLift = 0, size = 1, form, narration, envAt, text = "", pageAction = "", prevFly = null }: Props) {
  // 새(날개형)는 나는 쪽에서만 띄운다 — 늘 화면 높이 4할 위에 떠 있어 「옆에서 지켜봤어요」에도 공중에 있었고
  // 땅에 선 인물들과 높이가 맞지 않았다 (11/10). 헤엄치는 친구(지느러미형)는 그대로 뜬다
  // 날고 있는 쪽 높이 — 앞 쪽과 다르면 쪽에 들어올 때 앞 쪽 높이에서 천천히 날아오르거나 내려앉는다 (11/10 「갑자기 낮게 날다 떨어져 걷고」).
  // 전에는 쪽을 넘길 때마다 순간이동하듯 위아래로 튀었다
  // 날고 있는지는 이야기 흐름으로 정한다(plan hero.fly) — 한 번 날아오르면 앉거나 걷는다는 말이 있을 때까지 계속 난다
  // (11/10 사용자 「날다가 내려오는 느낌이 별로」 — 전에는 쪽마다 그 쪽 글만 보고 오르내렸다)
  const liftOf = (fly: boolean | null | undefined) => (form === "winged" && !fly ? 0 : formLift);
  const liftNow = liftOf(plan.hero.fly);
  const liftPrev = prevFly == null ? liftNow : liftOf(prevFly);
  const play = mode === "play";
  // 그림띠가 풀리면 다시 그린다. 걸어 들어오기는 재생을 시작할 때 풀려 있던 것만 (도중에 붙으면 걷다가 그림이 바뀐다),
  // 인사는 늦게 풀려도 그때부터 손을 든다
  const [, setStripTick] = useState(0);
  const readyAtPlay = useRef<Set<string> | null>(null);
  if (!play) readyAtPlay.current = null;
  else if (!readyAtPlay.current) readyAtPlay.current = new Set(stripReady);
  // 왼쪽으로 옮겨 가는 쪽이면 왼쪽 걸음 (사람형, 11/9 「좌우 바뀌면 안 되지」). 없으면(예전 이야기) 받은 걸음 그대로 — 뒤집지 않는다
  const sprite = plan.hero.move !== "none" && plan.hero.to < plan.hero.from && spriteLeft ? spriteLeft : spriteRight;
  const [layout, setLayout] = useState<Layout | null>(null);
  const [spr, setSpr] = useState<Sprite | null>(null);
  // 0 = 시작 모습, 1 = 끝 모습. play 가 아니면 처음부터 끝 모습
  const [phase, setPhase] = useState<0 | 1>(mode !== "end" && !REDUCE ? 0 : 1);
  const lift = phase === 0 && play ? liftPrev : liftNow;
  const [hidden, setHidden] = useState(false);
  // 정면 그림(사람형) 주인공이 옮겨 가는 동안 가는 쪽으로 기울인다 (11/9 사용자 — 정면 제자리 걸음으로 옆으로 미끄러져 어색)
  const [leaning, setLeaning] = useState(false);
  // 걸어 들어오는 인물이 제자리에 다 온 쪽 (눈물 · 연출은 그 뒤에). 쪽(plan)으로 기억한다 — 참/거짓 하나면 쪽이 바뀐 첫 그림에
  // 앞 쪽 값이 남아 눈물이 한 번 보였다 사라졌다 (11/10 「눈물 한 방울 떨어지고 사람 등장하고 또 떨어져」)
  const [arrivedFor, setArrivedFor] = useState<PagePlan | null>(null);
  const followMs = useRef(0);
  // 걸어 들어올 인물의 걷기 그림띠를 쪽에 들어올 때 아직 못 받았으면, 받을 때까지 화면 밖에서 기다렸다가 걸어 들어온다
  // (11/10 「쓩 미끄러지듯 등장」 — 전에는 멈춘 그림이 미끄러져 들어왔다). 이 시간이 지나도 못 받으면 예전처럼 미끄러져 들어온다
  const LATE_WAIT_MS = 3500;
  const [lateGiveUp, setLateGiveUp] = useState(false);
  const lateMs = useRef(0);
  // 늦게 걷기를 시작한 인물 — 기다림이 끝나도(lateGiveUp) 다시 미끄러져 들어오지 않고 제자리에 선다
  const lateStarted = useRef<{ plan: PagePlan | null; ids: Set<string> }>({ plan: null, ids: new Set() });
  if (lateStarted.current.plan !== plan) lateStarted.current = { plan, ids: new Set() };
  // 멈춘 그림의 가로세로 비율 — 옆 인물을 비켜 세울 때 주인공 폭을 잰다
  const [stillAr, setStillAr] = useState<number | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  // 장면은 장면 칸을 꽉 채운다 (11/3 사용자 「한 쪽 꽉 채우는 식」) — 배경판은 덮어 자르고, 물건 · 인물은 보이는 칸 비율로 놓는다.
  // 그래서 칸의 가로세로 비율로 키(높이 대비)를 폭(너비 대비)으로 바꾼다
  const root = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(1.5);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(() => { if (el.clientHeight) setAspect(el.clientWidth / el.clientHeight); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const indoor = isIndoor(plan.location);
  const bodies = hasSkyBodies(plan.location);
  const weather = plan.env.weather ?? null;
  // 비 · 폭풍 · 눈 · 안개면 해는 구름 뒤 (숨긴다)
  const cloudy = weather === "rain" || weather === "storm" || weather === "snow" || weather === "fog";
  const base = sceneBase(plan.location);

  useEffect(() => { let live = true; loadLayout(plan.location).then((l) => live && setLayout(l)).catch(() => {}); return () => { live = false; }; }, [plan.location]);
  // 정지 그림 비율 — 렌더 묶음을 쓸 때도 재 둔다 (위 화면 안 맞춤)
  useEffect(() => {
    if (!still) return;
    let live = true;
    const im = new Image();
    im.onload = () => { if (live) setStillAr(im.naturalWidth / Math.max(1, im.naturalHeight)); };
    im.src = still;
    return () => { live = false; };
  }, [still]);
  // 그림띠를 받는 중이면 true. 못 받으면(sprFailed) 멈춘 그림으로 움직인다
  const [sprFailed, setSprFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setSpr(null);
    setSprFailed(false);
    if (sprite?.url) loadSprite(sprite.url, sprite).then((s) => live && setSpr(s)).catch(() => live && setSprFailed(true));
    // 느린 망에서 너무 오래 서 있지 않게 — 5초가 지나면 멈춘 그림으로 먼저 옮겨 간다
    const giveUp = window.setTimeout(() => live && setSprFailed(true), 5000);
    return () => { live = false; clearTimeout(giveUp); };
  }, [sprite?.url]);  // eslint-disable-line react-hooks/exhaustive-deps
  const sprWaiting = !!sprite?.url && !spr && !sprFailed;

  // 들어오면 한 프레임 뒤에 끝 모습으로 — CSS transition 이 그 사이를 잇는다.
  // 옮겨 가는 쪽은 그림띠를 다 받은 뒤에 출발한다 — 첫 쪽은 그림띠를 받는 동안 이미 도착 자리(2/3)로 옮겨 가 버려,
  // 받고 나서는 그 자리에서 제자리 걸음만 했다 (11/10 사용자 「왜 처음에 중간에서 제자리 걷기를 하지」)
  const waitSprite = sprWaiting && plan.hero.move !== "none";
  useLayoutEffect(() => {
    if (REDUCE || mode === "end") { setPhase(1); return; }
    if (mode === "start" || !layout || waitSprite) { setPhase(0); return; }
    setPhase(0);
    const t = window.setTimeout(() => setPhase(1), 60);
    return () => clearTimeout(t);
  }, [mode, layout, plan, waitSprite]);

  useEffect(() => {
    if (!play || phase !== 1) return;
    // 함께 움직이는 인물이 있으면 주인공과 같이 다 옮겨 간 뒤 (followMs 는 그림을 그릴 때 정한다)
    const a = window.setTimeout(() => setArrivedFor(plan), REDUCE ? 0 : Math.max(ENTER_MS + lateMs.current, followMs.current));
    return () => clearTimeout(a);
  }, [plan, play, phase]);
  const arrived = mode === "end" || arrivedFor === plan;
  // 나레이션이 그 사람 말에 와서 늦게 걸어 들어온 사람 — 들어오기 시작한 뒤 ENTER_MS 가 지나면 「다 왔다」 (11/11)
  const [lateArrived, setLateArrived] = useState<{ plan: PagePlan | null; keys: Set<string> }>({ plan: null, keys: new Set() });
  const lateGoing = useRef<{ plan: PagePlan | null; keys: Set<string> }>({ plan: null, keys: new Set() });

  useEffect(() => {
    setLateGiveUp(false);
    if (!play || REDUCE) return;
    const t = window.setTimeout(() => setLateGiveUp(true), LATE_WAIT_MS);
    return () => clearTimeout(t);
  }, [plan, play]);  // eslint-disable-line react-hooks/exhaustive-deps

  // 「숨었어요」: 0.8초 뒤 1초에 걸쳐 사라지고 그대로 숨어 있다. 다음 쪽(같은 행동 단계)은 숨은 채로 시작
  // (11/3 사용자 「숨기 했으면 다시 나타나면 안되는데」 — pt_docs 05 S-09-05 는 2초 뒤 다시 나타남)
  useEffect(() => {
    setHidden(false);   // 끝 모습 · 이미 숨은 쪽은 아래 heroGone 이 정한다
    if (plan.hero.hide !== "out" || !play || REDUCE) return;
    const a = window.setTimeout(() => setHidden(true), 800);
    return () => clearTimeout(a);
  }, [plan, play, mode]);

  // 이미 숨은 쪽 · 끝 모습은 첫 그림부터 숨김 (효과가 돌기 전 한 번 보였다 사라지지 않게)
  const heroGone = hidden || plan.hero.hide === "gone" || (!!plan.hero.hide && (mode === "end" || REDUCE));

  // 거리는 맞춘 자리 전 값 — 아래 heroFrom 이 1/4 보다 짧은 걸음은 1/4 로 늘이니 시간도 그만큼 (걸음과 옮기는 빠르기가 맞게)
  const timing = moveTiming(plan.hero.move, Math.max(0.25, Math.abs(plan.hero.to - plan.hero.from)), layout?.hero.h ?? 0.45, aspect);

  useEffect(() => {
    if (!play || REDUCE || plan.hero.move === "none" || phase !== 1) { setLeaning(false); return; }
    setLeaning(true);
    const a = window.setTimeout(() => setLeaning(false), Math.max(400, timing.ms - 300));
    return () => clearTimeout(a);
  }, [plan, play, phase, timing.ms]);


  // 주인공 프레임: 옮겨 가는 동안은 계속, 제자리 동작은 loops 번, 그다음 첫 장에서 멈춘다.
  // 「애니메이션 줄이기」(Windows 애니메이션 효과 끔도 이것)에서도 돈다 — 그림이 움직이는 것이 이 책의 내용이라서.
  // 그때는 옮겨 가지 않고(위 phase · heroTransition) 그 자리에서 같은 시간만큼 걷는다
  // (11/4 사용자 PC 가 이 설정이라 모든 쪽이 첫 장에서 멈췄다. 학교 · 기관 기기도 흔하다)
  useEffect(() => {
    const c = canvas.current;
    if (!c || !spr) return;
    const g = c.getContext("2d")!;
    const moving = plan.hero.move !== "none";
    const fps = moving ? timing.fps : FPS;
    const total = !play ? 0
      : moving ? Math.ceil((timing.ms / 1000) * fps)
      : plan.hero.loops * spr.frames;
    let i = 0, last = 0, raf = 0;
    drawFrame(g, spr, 0);
    const tick = (t: number) => {
      if (t - last >= 1000 / fps) {
        last = t; i++;
        if (i >= total) { drawFrame(g, spr, 0); return; }
        drawFrame(g, spr, i % spr.frames);
      }
      raf = requestAnimationFrame(tick);
    };
    if (total > 0) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // layout: 장소 배치(layout)를 받기 전에는 캔버스가 없다 — 그림띠가 먼저 오면 그리지 못하고 끝나, 배치가 온 뒤 생긴 캔버스는
  // 끝까지 비어 주인공이 통째로 안 보였다 (11/10 형태별 점검, 처음 여는 장소 · 느린 망)
  }, [spr, plan, play, timing.ms, timing.fps, !!layout]);

  if (!layout) return <div className="scene" ref={root} />;

  const cueHeard = narration === undefined || envAt === undefined || envAt <= 0 || narration >= envAt;
  const env = (phase === 0 || !cueHeard) && prevEnv ? prevEnv : plan.env;
  // 불을 켠 실내(env.lightsOn): 나레이션이 불빛 말에 오면 밤 어둠도 걷힌다 — 다음 쪽부터는 plan 이 밤을 끈다
  const brightAt0 = plan.env.lightsOn ? sceneFx(text).bright : -1;
  const fx0Bright = brightAt0 >= 0 && (mode === "end" || (play && phase === 1 && (narration === undefined || narration >= brightAt0)));
  const night = env.night && !(plan.env.lightsOn && fx0Bright);
  // 해 · 달: 밤이면 달이 높이, 해가 뜬 쪽이면 해가 높이. 앞 쪽에서 바뀌면 동→서 곡선
  const sunPos = env.sun ? SKY.sunHigh : prevEnv?.sun && !plan.env.sun ? SKY.west : SKY.east;
  const moonPos = night ? SKY.moonHigh : prevEnv?.night && !plan.env.night ? SKY.west : SKY.east;
  const skyMove = (rising: boolean) => (REDUCE ? "none"
    : `left 2.8s linear, top 2.8s ${rising ? "cubic-bezier(.15,.75,.35,1)" : "cubic-bezier(.65,0,.85,.3)"}`);

  // 주인공 크기: 첫 장의 그림 키가 hero.h 가 되게 칸을 키우고, 발끝을 foot 에 맞춘다
  const H = layout.hero;
  // 프레임 칸 높이(화면 높이 대비). 칸은 정사각이라 그림 폭 w · 키 h(칸 대비)에 칸 높이를 곱하면 화면 높이 단위가 된다.
  // 키 기준이면 그림 키가 hero.h, 몸길이 기준이면 몸길이가 hero.h × WIDE_LEN (키는 hero.h × WIDE_MAX_H 까지)
  const scaleFor = (w: number, h: number) => size * (fit === "width"
    ? Math.min((H.h * WIDE_LEN) / Math.max(0.05, w), (H.h * WIDE_MAX_H) / Math.max(0.05, h))
    : H.h / Math.max(0.05, h));
  // 주인공 폭의 절반 (화면 너비 대비). 팔을 넓게 벌린 그림이면 옆 인물을 그만큼 바깥으로 민다 (겹치지 않게)
  const heroHalf = spr ? ((spr.box[2] - spr.box[0]) * scaleFor(spr.box[2] - spr.box[0], spr.box[3] - spr.box[1]) / aspect) / 2
    : stillAr ? ((fit === "width" ? Math.min(H.h * WIDE_LEN, H.h * WIDE_MAX_H * stillAr) : H.h * stillAr) / aspect) / 2 : 0.1;
  // 주인공 자리는 몸 전체가 화면 안에 들게 — 장면 자리(0.16 ~ 0.84)는 사람 폭 기준이라 옆으로 긴 4족형은
  // 몸 절반이 화면 밖으로 나갔다 (11/9 형태 버그 2). 폭이 화면보다 넓으면 가운데
  // 화면 안 맞춤은 정지 그림 폭으로 — 동작마다 렌더 칸 폭이 달라(걷기는 다리를 벌려 넓다) 쪽을 넘길 때 같은 자리가
  // 옆으로 튀었다 (11/9 걷기 0.57 → 다음 쪽 0.71). 정지 그림 비율을 모르면 지금 동작 폭
  const stillHalf = stillAr ? ((fit === "width" ? Math.min(H.h * WIDE_LEN, H.h * WIDE_MAX_H * stillAr) : H.h * stillAr) * size / aspect) / 2 : null;
  const edge = Math.min(0.5, (stillHalf ?? heroHalf) + 0.02);
  const inside = (x: number) => Math.min(1 - edge, Math.max(edge, x));
  // 쪽 글이 말하는데 배경 그림에 이미 있어 따로 놓지 않는 물건(표지판 · 모래성 · 북 · 장난감 상자 …)의 가로 범위.
  // 주인공 · 인물이 그 앞에 서서 가리지 않게 한다 (11/10 소품 점검 38쪽: 「표지판으로 달려갔어요」에 주인공이 표지판 바로 앞에
  // 멈춰 표지판이 몸 뒤로 사라졌다. 소품을 또 세우지 않게 되면서 글의 그 물건은 배경 것 하나뿐이다)
  // 이어 온 물건(kept)은 이 쪽 글이 말한 것이 아니다
  const saidKinds = new Set((plan.things ?? []).filter((t) => !t.kept).map((t) => kindOf(t.src)));
  // 카드 표지판 대신 배경 표지판, 글에 표지판이 나오기만 해도(「표지판아, 고마워」 같은 말은 소품 낱말로 잡히지 않는다)
  if (plan.props.some((p) => p.id === "sign") || /표지판|화살표/.test(text)) saidKinds.add("sign");
  const spanOf = (o: { src: string; x: number; h: number }): [number, number] => {
    const key = o.src.startsWith("../") ? o.src.slice(3) : `${plan.location}/${o.src}`;
    const half = (o.h * arOf(key, 1) / aspect) / 2;
    return [o.x - half, o.x + half];
  };
  const saidSpans = layout.objects.filter((o) => o.foot !== undefined && saidKinds.has(kindOf(o.src))).map(spanOf);
  // 앞 쪽에서 자리를 잡아 둔 붙박이 물건(이어 온 것 · 다시 나온 것)도 그 앞에 서지 않는다. 앉는 자리는 빼고 (그 옆에 붙어 선다).
  // 전에는 이어 온 의자 · 조개 · 돌 앞에 주인공 · 인물이 서서 1,253쪽에서 물건을 가렸다 (11/10 이어짐 검사)
  const seatKindNow = plan.hero.seat ? kindOf(`${plan.hero.seat}.webp`) : null;
  // 이어 남은 작은 물건(조개 · 화분 · 발자국 …): 사람 그림 칸(팔 여백까지)이 2할 넘게 덮지 않게 (발 위에 놓인 것처럼 보였다, 11/11)
  const smallPinned = new Set<[number, number]>();
  const pinnedSpans: [number, number][] = (plan.things ?? []).flatMap((t) => {
    const pin = t.keep && !t.pose && t.spot !== "air" && t.spot !== "wall" ? PINS.get(t.keep) : undefined;
    // 넓은 풍경 물건(텐트 · 우주선 · 로켓 · 배 · 다리 · 모래 언덕)은 사람이 앞에 서도 자연스럽다: 피하면 사람들이 좁은 데로 몰려 겹쳤다.
    // 깃발 · 우체통처럼 좁고 키 큰 것은 피한다 (앞에 서면 기둥이 몸을 뚫은 것처럼 보였다, 11/10)
    if (!pin || kindOf(t.src) === seatKindNow || WIDE_SCENERY.has(kindOf(t.src))) return [];
    const half = (pin.h * t.ar / aspect) / 2;
    const sp: [number, number] = [pin.x - half, pin.x + half];
    if (pin.h < 0.15) smallPinned.add(sp);
    return [sp];
  });
  // 이어 온 물건이 배경 그림에 이미 있으면(바다의 모래성) 소품은 안 그리고 배경 것이 그 물건이다: 그것도 이어 온 물건처럼 앞에 서지 않는다
  // (11/11 렌더 검사: 「내 모래성」 이야기에서 엄마 · 안전 요원이 배경 모래성 앞에 서서 쪽 내내 가렸다)
  const keptKinds = new Set((plan.things ?? []).filter((t) => t.kept && !t.pose).map((t) => kindOf(t.src)));
  for (const o of layout.objects) {
    const k = kindOf(o.src);
    if (o.foot !== undefined && keptKinds.has(k) && !saidKinds.has(k) && k !== seatKindNow && !WIDE_SCENERY.has(k)) pinnedSpans.push(spanOf(o));
  }
  const avoidSpans = [...saidSpans, ...pinnedSpans];
  /** 주인공 몸(가운데 6할)이 그 물건을 3할 넘게 가리면 옆에 선다: 옮겨 오면 다가온 쪽, 제자리면 가까운 쪽. 자리가 없으면 그대로 */
  const besideSaid = (x: number, dir: number) => {
    const core = heroHalf * 0.6;
    const hit = (c: number) => avoidSpans.some(([l, r]) => Math.min(c + core, r) - Math.max(c - core, l) > (r - l) * 0.3);
    if (!hit(x)) return x;
    // 물건 양옆 가운데 다른 물건도 가리지 않는 곳. 옮겨 오면 지나치지 않게 다가온 쪽 먼저, 제자리면 가까운 곳
    const cands = avoidSpans.flatMap(([l, r]) => [l - heroHalf * 0.75, r + heroHalf * 0.75])
      .filter((c) => Math.abs(inside(c) - c) < 1e-6 && !hit(c));
    const cost = (c: number) => Math.abs(c - x) + (dir && Math.sign(c - x) === Math.sign(dir) ? 0.5 : 0);
    return cands.length ? cands.sort((a, b) => cost(a) - cost(b))[0] : x;
  };
  // 앉는 자리 (「그루터기에 앉아」): 그 물건 앞에 선다. 쪽 소품이면 기억한 자리(처음 나온 쪽), 이 쪽에 처음 나오면 주인공이 서려던
  // 자리에 놓고 기억한다. 배경 물건이면 그 물건 자리. 없으면 그대로 (11/10 「그루터기에 앉아 쉰다고 하는데 위치는 그대로」)
  const seatKind = plan.hero.seat ? kindOf(`${plan.hero.seat}.webp`) : null;
  // 배경 그림에 같은 물건(벤치 · 바위)이 있으면 그 배경 물건 앞에 — 쪽 소품은 배경과 같으면 화면에서 빠져, 보이지 않는 소품 자리에
  // 앉아 주인공이 그 자리에 그대로 서 있었다 (11/11 장면 검사 「벤치에 앉아」)
  const seatInBg = !!seatKind && layout.objects.some((o) => o.foot !== undefined && kindOf(o.src) === seatKind);
  const seatThing = seatKind && !seatInBg ? (plan.things ?? []).find((t) => !t.pose && kindOf(t.src) === seatKind) : undefined;
  const seatBg = seatKind && !seatThing
    ? layout.objects.filter((o) => o.foot !== undefined && kindOf(o.src) === seatKind)
      .sort((a, b) => Math.abs(a.x - plan.hero.to) - Math.abs(b.x - plan.hero.to))[0] : undefined;
  // 제자리 쪽은 앞 쪽에서 실제로 선 자리부터 (앉은 자리 · 비켜 선 자리가 다음 쪽에서 원래대로 튀지 않게)
  const stayAt = plan.hero.stay ? HERO_AT.get(prevKey(plan.key) ?? "") : undefined;
  let seatX: number | undefined;
  if (seatThing) {
    const pin = seatThing.keep ? PINS.get(seatThing.keep) : undefined;
    seatX = pin?.x ?? inside(stayAt ?? plan.hero.to);
    if (!pin) {
      // 이 쪽에 처음 나오는 앉는 자리: 이미 자리를 잡은 물건(텐트 등 큰 것 포함)과 겹치지 않는 가장 가까운 곳 (11/10 바위가 텐트 위에 놓였다)
      const sHalf0 = (seatThing.h * seatThing.ar / aspect) / 2;
      const taken = (plan.things ?? []).flatMap((t) => {
        const q = t !== seatThing && t.keep ? PINS.get(t.keep) : undefined;
        return q ? [[q.x - (q.h * t.ar / aspect) / 2, q.x + (q.h * t.ar / aspect) / 2] as [number, number]] : [];
      });
      const clear = (c: number) => taken.every(([l, r]) => c + sHalf0 <= l || c - sHalf0 >= r);
      if (!clear(seatX)) {
        const cands = taken.flatMap(([l, r]) => [l - sHalf0 - 0.01, r + sHalf0 + 0.01]).filter((c) => Math.abs(inside(c) - c) < 1e-6 && clear(c));
        if (cands.length) seatX = cands.sort((a, b) => Math.abs(a - seatX!) - Math.abs(b - seatX!))[0];
      }
    }
    // 앉는 자리는 주인공 발보다 조금 뒤에 (발밑이 그 물건 앞으로 나오지 않게)
    if (!pin && seatThing.keep) PINS.set(seatThing.keep, { x: seatX, h: seatThing.h, footY: H.foot - 0.02 });
  } else if (seatBg) seatX = seatBg.x;
  const planTo = stayAt ?? plan.hero.to;
  // 앉는 그림이 없어 정가운데에 서면 그 물건 안에 선 것처럼 보였다: 주인공이 있던 쪽 가장자리에 붙어 서고 물건은 대부분 보이게
  if (seatX !== undefined) {
    const sKey = seatThing ? seatThing.src : seatBg ? (seatBg.src.startsWith("../") ? seatBg.src.slice(3) : `${plan.location}/${seatBg.src}`) : "";
    const sH = seatThing ? (seatThing.keep && PINS.get(seatThing.keep)?.h) || seatThing.h : seatBg?.h ?? 0.2;
    const sHalf = (sH * (seatThing ? seatThing.ar : arOf(sKey, 1)) / aspect) / 2;
    const side = (planTo >= seatX ? 1 : -1) || 1;
    const c = seatX + side * (sHalf * 0.55 + heroHalf * 0.25);
    seatX = Math.abs(inside(c) - c) < 1e-6 ? c : seatX - side * (sHalf * 0.55 + heroHalf * 0.25);
  }
  let heroTo = seatX !== undefined ? inside(seatX)
    : inside(besideSaid(inside(planTo), plan.hero.move === "none" ? 0 : plan.hero.to - plan.hero.from));
  // 걸어가는 쪽에 설 사람들 자리를 남기고 멈춘다: 끝까지 가면 그쪽에서 들어오는 친구가 설 데가 없어 뒤에 떠 있거나 할머니를 가렸다
  // (11/10 사용자 「6쪽에 친구 크기나 위치가 공중에 떠 있다」). 사람 폭은 키의 4~5할(PEOPLE.w), 사이 틈 0.015
  const walkDir = plan.hero.move === "none" ? 0 : Math.sign(plan.hero.to - plan.hero.from);
  if (walkDir && seatX === undefined) {
    const ahead = plan.props.filter((q) => isPerson(q.id) && (q.enter ? (q.enter === "right") === walkDir > 0 : (q.x ?? 0.78) * walkDir > heroTo * walkDir));
    const need = ahead.reduce((sum, q) => sum + ((layout.props[q.id]?.h ?? PEOPLE[q.id]?.h ?? 0.5) * (PEOPLE[q.id]?.w ?? 0.45)) / aspect + 0.015, 0);
    if (need > 0) {
      const room = walkDir > 0 ? 1 - 0.01 - need - heroHalf : 0.01 + need + heroHalf;
      const fromX = inside(plan.hero.from);
      if (walkDir > 0 ? heroTo > room : heroTo < room) heroTo = inside(walkDir > 0 ? Math.max(fromX + 0.12, room) : Math.min(fromX - 0.12, room));
    }
  }
  if (plan.key) HERO_AT.set(plan.key, heroTo);
  let heroFrom = plan.hero.move === "none" ? heroTo : inside(plan.hero.from);
  // 걷기 · 뛰기인데 화면 안으로 맞추고 나니 출발 · 도착이 거의 같으면(몸이 긴 4족형은 설 자리가 좁다) 제자리 걸음만 보였다
  // (11/9 테스트 2번) — 가던 쪽 그대로 화면 폭의 1/4 은 옮겨 가게 출발점을 뒤로 뺀다
  if (plan.hero.move !== "none" && Math.abs(heroTo - heroFrom) < 0.25) {
    const dir = Math.sign(plan.hero.to - plan.hero.from) || 1;
    heroFrom = inside(heroTo - dir * 0.25);
    // 몸이 커서(옆으로 긴 4족형) 화면 안에 옮겨 갈 자리가 없으면 화면 밖에서 걸어 들어온다 — 전에는 반대쪽으로 다시 맞춰
    // 출발 · 도착이 거의 같아 제자리에서 다리만 움직였다 (11/9 사용자 「제자리 총총총, > 방향으로 안 움직임」)
    if (Math.abs(heroTo - heroFrom) < 0.2) heroFrom = dir > 0 ? -heroHalf : 1 + heroHalf;
  }
  const hero = { ...plan.hero, from: heroFrom, to: heroTo };
  const heroX = phase === 0 ? hero.from : hero.to;
  let heroStyle: CSSProperties;
  /** 그려진 주인공의 폭 · 키 (화면 너비 · 높이 대비) — 입에 묾 · 등에 태움 자리를 잰다 */
  let drawn = { w: 0, h: 0 };
  if (spr) {
    const [l, t, r, b] = spr.box;
    const cellH = scaleFor(r - l, b - t);               // 칸 높이 (화면 높이 대비)
    const cellW = cellH / aspect;                        // 칸 너비 (화면 너비 대비)
    drawn = { w: (r - l) * cellW, h: (b - t) * cellH };
    heroStyle = {
      height: `${cellH * 100}%`, aspectRatio: "1",
      left: `${(heroX - ((l + r) / 2 - 0.5) * cellW) * 100}%`,
      bottom: `${((1 - H.foot) - (1 - b) * cellH + lift) * 100}%`,
    };
  } else {
    // 멈춘 그림: 몸길이 기준이면 가로세로 비율로 높이를 정한다 (비율을 모르면 키 기준)
    const stillH = size * (fit === "width" && stillAr ? Math.min((H.h * WIDE_LEN) / stillAr, H.h * WIDE_MAX_H) : H.h);
    heroStyle = { height: `${stillH * 100}%`, left: `${heroX * 100}%`, bottom: `${(1 - H.foot + lift) * 100}%` };
    drawn = { w: stillAr ? stillH * stillAr / aspect : 0, h: stillH };
  }
  // 같은 빠르기로 (속도가 바뀌면 걸음과 어긋나 발이 미끄러진다)
  const heroTransition = REDUCE || !play ? "none" : `left ${timing.ms}ms linear, bottom 1.4s cubic-bezier(.35,0,.25,1), opacity ${heroGone ? 1 : 0}s ease, filter 2.6s ease, rotate .35s ease`;
  if (leaning && facing === 0 && hero.move !== "none" && phase === 1) {
    heroStyle = { ...heroStyle, rotate: `${Math.sign(hero.to - hero.from) * (hero.move === "run" ? 7 : 4)}deg`, transformOrigin: "0 100%" };
  }

  const prop = (id: PropId): Spot | undefined => layout.props[id]
    ?? (PEOPLE[id] ? { src: `../props/${id}.webp`, x: 0.78, foot: PEOPLE[id].foot ?? 0.93, h: PEOPLE[id].h } : undefined);
  // 옆에 서는 것들(인물 · 표지판)의 자리: 주인공과 서로를 피해, 칸 안에서. 원하는 쪽이 꽉 차면 반대쪽으로
  // 글이 말하는 배경 물건 앞도 비워 둔다 (위 saidSpans): 인물 · 소품이 그 앞에 서지 않는다
  const placed: [number, number][] = [[hero.to - heroHalf, hero.to + heroHalf], ...avoidSpans];
  const free = (a: number, b: number) => placed.every(([l, r]) => b <= l || a >= r);
  // 사람 자리 (주인공 + 인물): 큰 소품이 배경 물건과 겹치느니 이 뒤에 선다 (아래 thingSpots)
  const figureSpans = new Set<[number, number]>([placed[0]]);
  /** 사람 몸 가운데가 이어 남은 작은 물건 · 글이 말하는 배경 물건을 4할 넘게 가리지 않는가 (사람끼리는 조금 겹쳐도 된다).
   *  11/10 이어짐 검사: 손잡고 오는 아빠가 화분 위에, 끝에서 들어온 선생님이 계단 소품 위에 섰다 */
  const clearOfThings = (c: number, half: number) => pinnedSpans.every((sp) => {
    const [l, r] = sp, k = smallPinned.has(sp) ? 1 : 0.5, lim = smallPinned.has(sp) ? 0.2 : 0.4;
    return Math.min(c + half * k, r) - Math.max(c - half * k, l) <= (r - l) * lim;
  })
    // 글이 말하는 배경 물건은 몸 가운데가 조금도 가리지 않게 (모래성 앞에 섰다)
    && saidSpans.every(([l, r]) => c + half * 0.5 <= l || c - half * 0.5 >= r);
  /** c 가 물건 위면 가장 가까운 물건 옆 (lo~hi 안), 없으면 그대로 */
  const besideThings = (c: number, half: number, lo: number, hi: number) => {
    if (clearOfThings(c, half)) return c;
    // 물건 옆으로 옮기다 주인공 · 인물 위로 가지 않게 (함께 걷는 선생님이 주인공과 9할 겹쳤다, 11/11 렌더 검사)
    const offFigures = (x: number) => [...figureSpans].every(([l, r]) => x + half * 0.5 <= l || x - half * 0.5 >= r);
    const cands = avoidSpans.flatMap(([l, r]) => [l - half * 0.6, r + half * 0.6]).filter((x) => x >= lo && x <= hi && clearOfThings(x, half) && offFigures(x));
    return cands.length ? cands.sort((a, b) => Math.abs(a - c) - Math.abs(b - c))[0] : c;
  };
  /** 자리 { x, back } — back 이면 설 자리가 없어 조금 뒤(작게 · 약간 위)에 선다. 그림책에서 뒤에 선 사람처럼 */
  // enterFrom: 걸어 들어오는 쪽 — 그쪽(주인공 기준)에만 선다. 오른쪽에서 들어온 친구가 주인공 뒤를 지나 왼쪽에 섰다 (11/9 사용자)
  const personX = (x: number, h: number, wRatio = 0.45, sameSide = false, enterFrom?: "left" | "right", pack = false): { x: number; back: boolean } => {
    const half = (h * wRatio / aspect) / 2;   // 친구 · 어른 그림은 키의 4~5할 폭
    const gap = 0.015, lo = half + 0.01, hi = 1 - half - 0.01;
    const want = Math.min(hi, Math.max(lo, x));
    if (enterFrom) sameSide = true;
    const right = enterFrom ? enterFrom === "right" : want >= hero.to;
    const tries = [want];
    for (let k = 1; k <= 40; k++) tries.push(want + (right ? 1 : -1) * k * 0.02, want - (right ? 1 : -1) * k * 0.02);
    // 같은 쪽에서 둘 이상 들어오면 화면 끝부터 차례로 붙여 선다 — 첫 사람이 제자리(0.78)에 서면 남은 틈이 둘로 쪼개져
    // 다음 사람이 설 곳이 없어 끝에 작게 · 떠서(뒤에 선 것처럼) 겹쳤다 (11/10 「등장인물이 여럿일 때 땅에 선 자리가 안 맞아」)
    if (pack && enterFrom) {
      tries.length = 0;
      for (let c = right ? hi : lo; right ? c >= lo : c <= hi; c += right ? -0.01 : 0.01) tries.push(c);
    }
    // 표지판은 주인공이 달려가는 쪽에만 — 반대쪽(지나온 길)으로 밀리면 표지판을 지나쳐 달려간 것처럼 보였다 (11/4)
    const side = (c: number) => !sameSide || (right ? c >= hero.to : c <= hero.to);
    // 틈이 없으면 뒤로 보내기 전에 양옆을 조금 겹쳐 앞줄에 — 사람 그림은 양옆이 팔 · 빈 여백이라 3할 겹쳐도 나란히 선 것으로 읽힌다
    // (11/10 — 0.01 모자라 뒤에 작게 · 떠서 섰다)
    const freeOfFigures = (a: number, b: number) => placed.every((sp) => !figureSpans.has(sp) || b <= sp[0] || a >= sp[1]);
    const at = tries.find((c) => c >= lo && c <= hi && side(c) && free(c - half - gap, c + half + gap))
      ?? tries.find((c) => c >= lo && c <= hi && side(c) && freeOfFigures(c - half * 0.7, c + half * 0.7) && clearOfThings(c, half)
        // 글이 말하는 배경 물건(모래성 · 벤치 …) 앞은 전처럼 비운다 (조금 겹치는 것도 안 됨)
        && saidSpans.every(([l, r]) => c + half * 0.7 <= l || c - half * 0.7 >= r))
      // 그래도 없으면 말한 물건 가장자리(빈 팔 여백만)는 닿아도 된다: 바로 뒤로 보내면 주인공과 9할 넘게 겹쳤다 (11/11 렌더 검사)
      ?? tries.find((c) => c >= lo && c <= hi && side(c) && freeOfFigures(c - half * 0.7, c + half * 0.7) && clearOfThings(c, half));
    const take = (c: number) => { const sp: [number, number] = [c - half, c + half]; placed.push(sp); figureSpans.add(sp); };
    if (at !== undefined) { take(at); return { x: at, back: false }; }
    // 들어오는 쪽에 틈이 없으면 반대쪽 빈자리 (표지판 말고 사람만) — 오른쪽에서 둘이 들어오는데 자리가 없어 둘 다 오른쪽 끝 같은 자리에
    // 서서 엄마 · 아빠가 완전히 겹쳤다 (11/11 장면 검사). 그 사람은 가까운 끝에서 들어온다(아래 enterSide)
    // 같은 쪽에서 반 사람 겹쳐 서기보다 먼저 본다: 왼쪽이 텅 비었는데 엄마 · 아빠가 오른쪽 끝에 46% 겹쳐 섰다 (11/11 렌더 검사)
    if (sameSide && wRatio !== 0.6) {
      const any = tries.find((c) => c >= lo && c <= hi && freeOfFigures(c - half * 0.7, c + half * 0.7) && clearOfThings(c, half));
      if (any !== undefined) { take(any); return { x: any, back: false }; }
    }
    const tight = tries.find((c) => c >= lo && c <= hi && side(c) && freeOfFigures(c - half * 0.5, c + half * 0.5) && clearOfThings(c, half));
    if (tight !== undefined) { take(tight); return { x: tight, back: false }; }
    // 표지판은 틈이 없어도 가는 쪽 끝에 (좁은 화면 · 팔 넓은 그림에서 손끝과 조금 닿는 정도) — 반대편 뒤로 가지 않게
    // 들어온 사람은 그쪽 끝 조금 뒤에 (작아져 주인공과 겹쳐도 앞뒤로 읽힌다)
    // 들어온 사람도 앞줄 끝에 (옆 사람과 조금 겹쳐도): 뒤로 보내면 작고 높게 서서 공중에 뜬 것처럼 보였다 (11/10 사용자 「6쪽에 친구가 공중에 떠 있다」)
    if (sameSide) {
      // 끝부터 안쪽으로 물건 위가 아니고 사람과 반 넘게 겹치지 않는 곳, 없으면 끝 그대로
      // (사람 겹침을 따지지 않고 안쪽으로 찾으면 주인공 자리까지 와서 9할 넘게 겹쳤다, 11/11 렌더 검사)
      let ex = right ? hi : lo, found = false;
      for (let c = ex; right ? c >= lo : c <= hi; c += right ? -0.01 : 0.01)
        if (side(c) && clearOfThings(c, half) && freeOfFigures(c - half * 0.5, c + half * 0.5)) { ex = c; found = true; break; }
      // 그런 자리가 없으면(주인공과 끝 사이가 좁은데 둘이 들어옴) 그쪽에서 사람과 가장 덜 겹치는 자리: 끝에 그대로 서면 앞 사람과 통째로 겹쳤다
      // (11/11 렌더 검사 「아저씨 뒤로 한 아이가 따라왔어요」 98%)
      if (!found) {
        const over = (c: number) => [...figureSpans].reduce((sum, [l, r]) => sum + Math.max(0, Math.min(c + half, r) - Math.max(c - half, l)), 0);
        let best = over(ex);
        for (let c = ex; right ? c >= lo : c <= hi; c += right ? -0.01 : 0.01)
          if (side(c) && clearOfThings(c, half) && over(c) < best - 0.005) { best = over(c); ex = c; }
      }
      take(ex);
      return { x: ex, back: false };
    }
    // 남는 공간이 많은 쪽 끝 — 뒤에 서서 작아지니 겹쳐도 앞뒤로 읽힌다
    const leftRoom = Math.min(...placed.map(([l]) => l)), rightRoom = 1 - Math.max(...placed.map(([, r]) => r));
    const bx = rightRoom >= leftRoom ? hi - 0.02 : lo + 0.02;
    return { x: bx, back: true };
  };
  // 배경 그림에 이미 표지판이 있으면(숲길) 카드 표지판을 또 세우지 않는다 — 표지판이 둘 · 셋 겹쳐 섰다 (11/10)
  const bgHasSign = layout.objects.some((o) => kindOf(o.src) === "sign") || (plan.things ?? []).some((t) => kindOf(t.src) === "sign");
  const behind = plan.props.filter((p) => isPerson(p.id) || (p.id === "sign" && !bgHasSign));
  // 인물 자리는 미리 잡는다 — 대본에서 그 사람이 든 · 쓴 소품을 손 · 머리에 놓으려면 자리를 알아야 한다 (11/4)
  // 다가가는 인물(hero.goal)은 주인공이 가는 쪽 바로 앞에 — 남는 자리에 서면 그 사람 반대쪽으로 달려갔다 (11/5)
  const travel = Math.sign(hero.to - hero.from);
  // 쪽마다 같은 쪽에서 걸어 들어오는 사람 수 (둘 이상이면 끝부터 붙여 세운다)
  const entering = { left: behind.filter((p) => p.enter === "left").length, right: behind.filter((p) => p.enter === "right").length };
  // 함께 움직이는 문장의 인물 이름 (없으면 "*" = 첫 인물)
  const followSen = hero.move !== "none" ? text.split(/(?<=[.!?”])/).find((sen) => FOLLOW_TEXT.test(sen)) : undefined;
  const followWho = followSen ? (behind.find((q) => q.name && followSen.includes(q.name))?.name ?? "*") : null;
  let followTaken = false;
  followMs.current = followWho && travel !== 0 ? timing.ms : 0;
  lateMs.current = 0;
  // 함께 움직이는 사람이 먼저 자리를 잡는다 (주인공 바로 옆 자리는 그 사람 것): 나중에 잡으면 먼저 선 엄마 위에
  // 손잡은 경찰관이 겹쳐 섰다 (11/11 렌더 검사 95%). 그리는 순서는 원래대로
  const followFirst = followWho && travel !== 0
    ? behind.findIndex((q) => q.id !== "sign" && !!prop(q.id) && (followWho === q.name || followWho === "*")) : -1;
  const placeOrder = followFirst > 0 ? [followFirst, ...behind.map((_, i) => i).filter((i) => i !== followFirst)] : behind.map((_, i) => i);
  const placedPeople = new Map<number, ReturnType<typeof placePerson>>();
  for (const i of placeOrder) placedPeople.set(i, placePerson(behind[i]));
  const people = behind.map((_, i) => placedPeople.get(i)!);
  function placePerson(p: (typeof behind)[number]) {
    const base0 = prop(p.id);
    if (!base0) return null;
    const wRatio = p.id === "sign" ? 0.6 : PEOPLE[p.id]?.w ?? 0.45;
    const ahead = hero.goal === p.id && hero.move !== "none" && travel !== 0
      ? hero.to + travel * (heroHalf + (base0.h * wRatio / aspect) / 2 + 0.015) : undefined;
    // 앞 쪽에도 같은 배경에 있던 사람(걸어 들어오지 않는 사람)은 그 자리에서: 대본이 쪽마다 자리(slot)를 달리 적어 제자리 쪽인데
    // 다람쥐가 오른쪽 · 왼쪽 · 오른쪽으로 옮겨 다녔다 (11/10 소품 이어짐 점검)
    const pk = prevKey(plan.key), who = p.name ?? p.id;
    const wasAt = pk && !p.enter && plan.hero.stay ? PEOPLE_AT.get(`${pk}:${who}`) : undefined;
    const s = ahead !== undefined && ahead > 0.05 && ahead < 0.95 ? { ...base0, x: ahead }
      : wasAt !== undefined ? { ...base0, x: wasAt }
      : p.x !== undefined ? { ...base0, x: p.x } : base0;
    // 주인공이 다가가는 사람은 주인공이 가는 쪽에서 들어온다 — 왼쪽에서 들어와 왼쪽에 서면 주인공이 그 사람에게서 멀어지는
    // 쪽으로 달려갔다 (11/9 「어른에게 달려갔어요」)
    const enter: "left" | "right" | undefined = p.enter && ahead !== undefined ? (travel > 0 ? "right" : "left") : p.enter;
    // 함께 움직임: 주인공이 옮겨 가는 쪽에 「따라왔어요 · 함께 달렸어요 · 나란히」가 있으면 그 사람(문장에 이름이 나온 인물, 없으면
    // 첫 인물)이 주인공 뒤에서 같은 빠르기로 같이 옮겨 간다. 주인공이 사람형이든 4족 · 새든 같다 (11/10)
    if (followWho && travel !== 0 && p.id !== "sign" && (followWho === p.name || (followWho === "*" && !followTaken))) {
      followTaken = true;
      const half = (s.h * wRatio / aspect) / 2;
      const off = heroHalf + half + 0.01;
      const clampX = (c: number) => Math.min(1 - half - 0.01, Math.max(half + 0.01, c));
      // 뒤에 설 자리가 물건 위뿐이면 주인공 앞쪽(가는 쪽)에 나란히: 손잡고 걷는 아빠 · 안내원이 이어 남은 화분 · 발자국 위에 섰다 (11/11 렌더 검사)
      let fx = besideThings(clampX(hero.to - travel * off), half, half + 0.01, 1 - half - 0.01);
      if (!clearOfThings(fx, half)) {
        const ahead2 = besideThings(clampX(hero.to + travel * off), half, half + 0.01, 1 - half - 0.01);
        if (clearOfThings(ahead2, half) && [...figureSpans].every(([l, r]) => ahead2 + half * 0.5 <= l || ahead2 - half * 0.5 >= r)) fx = ahead2;
      }
      const fsp: [number, number] = [fx - half, fx + half];
      placed.push(fsp); figureSpans.add(fsp);
      return { p: { ...p, enter: undefined }, s, spot: { x: fx, back: false }, sb: s,
        follow: { from: hero.from - travel * off } };
    }
    const spot = personX(s.x, s.h, wRatio, p.id === "sign", enter, !!enter && entering[enter] > 1);
    if (plan.key) PEOPLE_AT.set(`${plan.key}:${who}`, spot.x);
    // 뒤에 서는 사람: 조금만 작고 조금만 위 (0.8 배 · 0.07 위는 떠 보였다, 11/10)
    const sb = spot.back ? { ...s, h: s.h * 0.9, foot: (s.foot ?? 0.93) - 0.035 } : s;
    // 반대쪽 빈자리에 서게 된 사람은 가까운 쪽 끝에서 들어온다 (주인공을 가로질러 걷지 않게)
    const enterSide: "left" | "right" | undefined = enter === "right" && spot.x < hero.to - 0.05 ? "left"
      : enter === "left" && spot.x > hero.to + 0.05 ? "right" : enter;
    return { p: enterSide === p.enter ? p : { ...p, enter: enterSide }, s, spot, sb, follow: undefined as { from: number } | undefined };
  }
  // 옆모습(4족형 · 사슬형 · 지느러미형) 주인공이 보는 쪽 — 그림의 머리 쪽(facing)과 다르면 좌우로 뒤집는다.
  // 옮겨 가면 가는 쪽(렌더가 머리 쪽으로 걷는다, 11/4 「얼굴 방향에 따라 < 인지 > 인지」), 제자리면 가장 가까운 인물 · 동물 쪽,
  // 아무도 없으면 앞 쪽에서 보던 쪽 (hero.face). 옮겨 갈 때만 뒤집으면 다음 쪽에서 원래 방향으로 돌아가 옆 친구 · 박쥐에게
  // 등을 돌렸다 (11/5 사용자). 가운데 맞추기(translateX(-50%)) 뒤에 뒤집는다 — 개별 scale 속성은 transform 보다 먼저 적용돼
  // 가운데 맞추기까지 뒤집혀 주인공이 제 폭만큼 오른쪽으로 밀렸다 (11/5)
  const goes = Math.sign(hero.to - hero.from);
  const near = people.filter((v) => v && v.p.id !== "sign")
    .sort((a, b) => Math.abs(a!.spot.x - hero.to) - Math.abs(b!.spot.x - hero.to))[0];
  const look = hero.move !== "none" && goes !== 0 ? goes
    : near && Math.abs(near.spot.x - hero.to) > 0.02 ? Math.sign(near.spot.x - hero.to) : hero.face ?? 0;
  if (facing !== 0 && look !== 0 && look !== facing) {
    // 칸 가운데를 축으로 뒤집으니 칸 한쪽에 치우친 몸은 반대쪽으로 옮겨졌다 — 뒤집힌 몸 가운데가 heroX 에 오게 (11/9 형태 버그 2)
    if (spr) {
      const [l, , r] = spr.box;
      const cellW = scaleFor(r - l, spr.box[3] - spr.box[1]) / aspect;
      heroStyle = { ...heroStyle, left: `${(heroX + ((l + r) / 2 - 0.5) * cellW) * 100}%` };
    }
    heroStyle = { ...heroStyle, transform: hero.fallen
      ? "translateX(-50%) translateY(5%) rotate(-9deg) scaleX(-1)" : "translateX(-50%) scaleX(-1)" };
  }
  // 쪽 글에 나온 물건 · 내 소품: 주인공 옆 땅에 (인물 자리를 먼저 잡은 뒤 남는 곳). 쪽 안 움직임 없이 처음부터 놓여 있다
  // 배경 그림에 이미 같은 물건이 있으면 또 놓지 않는다 (pt_docs 18 — 동굴에서 「돌」이 나와도 동굴엔 바위가 있다)
  const bgKinds = new Set(layout.objects.map((o) => kindOf(o.src)));
  // 공중 소품(나비 · 새 · 행성 …)은 사람 머리 위 높이라 땅의 사람 · 물건과는 겹치지 않는다 — 공중 소품끼리만 피한다.
  // 전에는 땅과 같은 줄에서 자리를 다퉈 괜히 빠졌고, 머리 높이(0.45)라 사람 머리와 겹칠 수 있었다 (11/4 자리 검사)
  const airPlaced: [number, number][] = [];
  // 대본이 말한 자리 (pose): 물에 떠내려감 · 바람에 날아감 · 나무에 걸림 · 머리에 씀 · 손에 듦. 놓을 수 없으면 아래 보통 자리로
  // 주인공 머리 · 손 자리는 서 있는 사람 그림 기준 — 옆으로 긴 몸(4족형) · 띄운 몸(물고기)은 머리 · 손이 다른 데라 보통 자리로 (11/5)
  const upright = fit === "height" && size === 1 && !liftNow;
  // 4족형 주인공에 붙는 소품 (pt_docs 20 2-a, 11/6) — 손이 없으니 든 것은 입에 물고, 「등에 태우고」는 등 위에, 모자는 머리에.
  // 머리 쪽은 화면에 보이는 쪽(뒤집었으면 가는 쪽). 주인공과 같은 빠르기로 함께 옮겨 간다. 그림마다 머리 · 등 높이가 달라
  // 그려진 칸에서 어림한다 — 머리는 앞쪽 위, 등은 가운데 위 (강아지 · 고양이 · 공룡 시험 그림 기준). 셋 다 주인공 앞에 그린다
  const quad = form === "quadruped" && facing !== 0 && drawn.w > 0;
  const headSide = look !== 0 ? look : facing;
  const topY = H.foot - lift - drawn.h;
  const withHero: CSSProperties = REDUCE || !play ? {} : { transition: `left ${timing.ms}ms linear, filter 2.6s ease` };
  // 서버가 그림에서 잰 자리(still_body)가 있으면 그것, 머리가 큰 · 목이 긴 그림도 맞는다 (11/6). 그림 기준이라 화면에서
  // 뒤집었으면(머리 반대쪽으로 갈 때) 좌우를 바꾼다. 없으면(예전 이야기) 아래 어림
  const flipped = facing !== 0 && look !== 0 && look !== facing;
  // 몸짓 축 · 기울기 (11/10 옆모습 시험): 옆모습은 화면에서 머리 쪽 발끝을 축으로 숙인다. 가운데 발밑을 축으로 9도 돌렸더니
  // 몸이 긴 뱀 · 지렁이 · 물고기 · 4족형은 머리 쪽이 땅에 파묻히고 꼬리 쪽 다리가 떴다. 몸이 길수록 덜 기울여 꼬리 쪽이
  // 몸 키의 14% 넘게 뜨지 않게 (최대 9도). 앞모습은 기울지 않고 키만 줄어든다. 그림띠는 칸 안 몸 자리(box) 기준
  const [bx0, , bx1, by1] = spr ? spr.box : [0, 0, 1, 1];
  const [edgeL, edgeR] = flipped ? [1 - bx1, 1 - bx0] : [bx0, bx1];
  const sideView = facing !== 0 && headSide !== 0;
  const bodyRatio = drawn.h > 0 ? (drawn.w * aspect) / drawn.h : 0;
  const leanDeg = sideView ? headSide * Math.min(9, (Math.asin(Math.min(1, 0.14 / Math.max(bodyRatio, 0.01))) * 180) / Math.PI) : 0;
  const gestureVars = {
    "--lean": `${leanDeg.toFixed(1)}deg`,
    "--pivot": `${sideView ? (((headSide > 0 ? edgeR : edgeL) - 0.5) * 100).toFixed(1) : 0}%`,
    "--foot": `${(by1 * 100).toFixed(1)}%`,
    // 앞모습(사람 · 문어 …)은 옆으로 기울 수 없어 위쪽을 보는 사람 쪽으로 젖혀 숙인 것처럼 (원근, 키만 줄이면 거의 안 보였다)
    "--tip": sideView ? "0deg" : "-28deg",
  } as CSSProperties;
  const bodyAt = (p: number[]) => ({ x: heroX + ((flipped ? 1 - p[0] : p[0]) - 0.5) * drawn.w, y: topY + p[1] * drawn.h });
  const onQuad = (t: NonNullable<typeof plan.things>[number], where: "mouth" | "back" | "head") => {
    const thingW = (h: number) => h * t.ar / aspect;
    if (heroBody) {
      if (where === "mouth") {   // 입 앞에 물린 듯, 소품 가운데가 입 높이, 조금 앞으로
        const h = Math.min(t.h, drawn.h * 0.32);
        const m = bodyAt(heroBody.mouth);
        const x = m.x + headSide * thingW(h) * 0.25;
        return { x, cls: "", top: true, style: { ...spotStyle({ src: t.src, x, foot: m.y + h * 0.5, h }), ...withHero } };
      }
      if (where === "back") {    // 등 윗선에 얹힌 듯
        const h = Math.min(t.h, drawn.h * 0.5);
        const b = bodyAt(heroBody.back);
        return { x: b.x, cls: "", top: true, style: { ...spotStyle({ src: t.src, x: b.x, foot: b.y + h * 0.12, h }), ...withHero } };
      }
      const h = drawn.h * 0.26;  // 머리 꼭대기에 씀
      const hd = bodyAt(heroBody.head);
      return { x: hd.x, cls: "", top: true, style: { ...spotStyle({ src: t.src, x: hd.x, foot: hd.y + h * 0.3, h }), ...withHero } };
    }
    if (where === "mouth") {
      const h = Math.min(t.h, drawn.h * 0.32);
      const x = heroX + headSide * (drawn.w * 0.47 + thingW(h) * 0.25);
      return { x, cls: "", top: true, style: { ...spotStyle({ src: t.src, x, foot: topY + drawn.h * 0.34 + h * 0.8, h }), ...withHero } };
    }
    if (where === "back") {
      const h = Math.min(t.h, drawn.h * 0.5);
      const x = heroX - headSide * drawn.w * 0.08;
      return { x, cls: "", top: true, style: { ...spotStyle({ src: t.src, x, foot: topY + drawn.h * 0.3, h }), ...withHero } };
    }
    const h = drawn.h * 0.26;
    const x = heroX + headSide * drawn.w * 0.34;
    return { x, cls: "", top: true, style: { ...spotStyle({ src: t.src, x, foot: topY + h * 0.55, h }), ...withHero } };
  };
  // 창밖 소품 수와 몇 번째인지 (창 안에서 나란히 놓으려고)
  const winCount = (plan.things ?? []).filter((t) => t.pose === "window" || (indoor && !t.pose && TO_WINDOW.has(t.src))).length;
  let winAt = 0;
  const posed = (t: NonNullable<typeof plan.things>[number]): { x: number; style: CSSProperties; cls: string; top?: boolean } | null => {
    const thingW = (h: number) => h * t.ar / aspect;
    const holder = t.holder ? people.find((v) => v && (v.p.name === t.holder || v.p.id === t.holder)) : null;
    switch (t.pose) {
      case "water": {
        const foot = WATER[plan.location];
        if (foot === undefined) return null;
        // 물결 띠가 사람 가슴 높이라, 사람 몸과 겹치면 목에 두른 것처럼 보였다 — 주인공 · 인물 사이 가장 넓게 빈 틈의 물 위에
        const edges = [...placed].sort((a, b) => a[0] - b[0]);
        let gap: [number, number] = [0.06, 0.94], best = -1, from = 0.06;
        for (const [l, r] of [...edges, [0.94, 0.94] as [number, number]]) {
          if (l - from > best) { best = l - from; gap = [from, l]; }
          from = Math.max(from, r);
        }
        const x = (gap[0] + gap[1]) / 2, h = t.h;
        // 틈 안에서만 떠내려간다 (틈이 좁으면 조금만)
        const room = Math.max(0, (gap[1] - gap[0]) / 2 - thingW(h) / 2) / Math.max(0.01, thingW(h));
        return { x, cls: "m-drift-away", style: { ...spotStyle({ src: t.src, x, foot, h }), ["--drift" as string]: (x > 0.5 ? 1 : -1) * Math.min(1, room / 1.6) } };
      }
      case "blown": {   // 머리 높이에서 날아올라 화면 밖으로 (한 번)
        const x = Math.min(0.9, hero.to + heroHalf + thingW(t.h) / 2);
        return { x, cls: play ? "m-blow" : "m-gone", style: spotStyle({ src: t.src, x, foot: H.foot - H.h * 0.85, h: t.h }) };
      }
      case "high": {   // 배경 나무 꼭대기에 걸림
        const tree = layout.objects.find((o) => /tree|pine/.test(o.src));
        if (!tree || tree.foot === undefined) return null;
        const h = Math.min(t.h * 1.2, tree.h * 0.38), top = tree.foot - tree.h + tree.h * 0.08;
        return { x: tree.x, cls: "m-stuck", style: spotStyle({ src: t.src, x: tree.x + 0.03, top, h }) };
      }
      case "mouth":
      case "back":
        return t.holder === "hero" && quad ? onQuad(t, t.pose) : null;
      case "head": {   // 그 사람 머리 위
        if (t.holder === "hero" && quad) return onQuad(t, "head");
        if (t.holder === "hero") {
          if (!upright) return null;
          const h = H.h * 0.16;
          return { x: hero.to, cls: "", top: true, style: spotStyle({ src: t.src, x: heroX, foot: H.foot - H.h + h * 0.55, h }) };
        }
        if (!holder) return null;
        const h = holder.sb.h * 0.16, foot = (holder.sb.foot ?? 0.93) - holder.sb.h + h * 0.62;
        return { x: holder.spot.x, cls: "", style: spotStyle({ src: t.src, x: holder.spot.x, foot, h }) };
      }
      case "hand": {   // 그 사람 손끝에 소품 손잡이를 (인물은 그림마다 잰 값 hands.json, 주인공은 AI 손 관절 still_hands)
        let hx: number, hy: number, outer: "l" | "r", bodyH: number;
        if (t.holder === "hero" && quad) return onQuad(t, "mouth");   // 4족형은 입에 문다
        if (t.holder === "hero") {
          // 주인공은 가만히 있는 쪽만 — 걷거나 팔이 움직이면 손에서 떨어져 보인다
          const drawW = spr ? (spr.box[2] - spr.box[0]) * (H.h / Math.max(0.05, spr.box[3] - spr.box[1])) / aspect
            : stillAr ? H.h * stillAr / aspect : 0;
          if (!upright || !heroHands || !hero.calm || !drawW) return null;
          // 사람이 서 있지 않은 쪽 손 (둘 다 비었으면 그림 오른쪽 손)
          outer = people.some((v) => v && v.spot.x > hero.to) && !people.some((v) => v && v.spot.x < hero.to) ? "l" : "r";
          hx = heroX + (heroHands[outer][0] - 0.5) * drawW;
          hy = H.foot - H.h + heroHands[outer][1] * H.h;
          bodyH = H.h;
        } else {
          if (!holder) return null;
          const hand = (HANDS as Record<string, { l: number[]; r: number[] }>)[holder.p.id];
          if (!hand) return null;
          outer = holder.spot.x >= hero.to ? "r" : "l";   // 주인공과 먼 쪽 손
          const pw = holder.sb.h * arOf(`props/${holder.p.id}.webp`, 0.4) / aspect;
          hx = holder.spot.x + (hand[outer][0] - 0.5) * pw;
          hy = (holder.sb.foot ?? 0.93) - holder.sb.h + hand[outer][1] * holder.sb.h;   // 위에서부터
          bodyH = holder.sb.h;
        }
        // 풍선은 줄 끝을 쥐고 위로 크게 떠 있다 — 다른 소품처럼 손 크기로 줄이면 손에 작은 사탕을 쥔 것 같았다 (11/10)
        if (t.src === "props/balloons.webp") {
          const bh = bodyH * 0.6;
          return { x: hx, cls: "m-sway", style: spotStyle({ src: t.src, x: hx, foot: hy + bh * 0.04, h: bh }) };
        }
        const h = Math.min(t.h, bodyH * (SIDE_GRIP.has(t.src) ? 0.1 : 0.2)), w = thingW(h);
        if (SIDE_GRIP.has(t.src)) {   // 손전등처럼 옆으로 쥐는 것 — 손잡이를 손에, 빛은 바깥으로 (그림은 빛이 왼쪽)
          const x = hx + (outer === "r" ? 0.4 : -0.4) * w;
          return { x, cls: "", style: { ...spotStyle({ src: t.src, x, foot: hy + h / 2, h }), ...(outer === "r" ? { transform: "translateX(-50%) scaleX(-1)" } : {}) } };
        }
        return { x: hx, cls: "", style: spotStyle({ src: t.src, x: hx, foot: hy - h * 0.08 + h, h }) };   // 윗부분을 쥐고 매단 모양
      }
      case "window": {   // 창 안 하늘쪽에 작게 (창이 없는 방이면 놓지 않는다 — 아래에서 뺀다)
        const w = layout.objects.find((o) => /window/.test(o.src));
        const win = w && w.top !== undefined ? { x: w.x, y: w.top + w.h * 0.4, h: w.h } : layout.window;
        if (!win) return null;
        const h = Math.min(t.h, win.h * 0.3);
        // 창밖 소품이 둘이면 창 안에서 나란히 — 「지구 옆으로 별똥별이」에 둘이 한 자리에 겹쳤다 (11/9 배치 검사)
        const k = winAt++;
        const x = winCount < 2 ? win.x : win.x + (k === 0 ? -1 : 1) * (win.h * 0.22) / aspect;
        return { x, cls: t.motion ? `m-${t.motion}` : "", style: spotStyle({ src: t.src, x, foot: win.y + h / 2, h }) };
      }
      default: return null;
    }
  };
  // 받는 사람이 주인공인데 손에 들 수 없는 쪽(뛰기 · 춤)이면 함께 받은 옆 사람(주는 사람 말고) 손에: 「할머니가 사과를 하나씩 손에 쥐여
  // 주었어요」에 주인공이 폴짝 뛰는 쪽이라 사과가 땅에 떨어진 것처럼 놓였다 (11/10)
  const inScreen = <R extends { x: number; style: CSSProperties } | null>(t: ThingPlan, r: R): R => {
    if (!r || typeof r.style.left !== "string" || typeof r.style.height !== "string" || !r.style.left.endsWith("%")) return r;
    const half = (parseFloat(r.style.height) / 100) * t.ar / aspect / 2, x = parseFloat(r.style.left) / 100;
    const c = Math.min(1 - half - 0.005, Math.max(half + 0.005, x));
    return Math.abs(c - x) < 1e-4 ? r : { ...r, x: c, style: { ...r.style, left: `${c * 100}%` } };
  };
  const posedOrOther = (t: ThingPlan) => {
    const at = inScreen(t, posed(t));
    if (at || !t.give || t.holder !== "hero") return at;
    for (const v of people) {
      if (!v || v.p.id === "sign" || v.p.name === t.give.from || v.p.id === t.give.from) continue;
      const other = inScreen(t, posed({ ...t, holder: v.p.name ?? v.p.id }));
      if (other) return other;
    }
    return null;
  };
  // 실내에서 하늘에만 있는 것(별똥별 · 행성 · 지구)은 창 안에 — 우주선 방 안 공중에 별똥별이 떠서 창 속 지구를 가렸다 (11/9 배치 검사)
  const things = (plan.things ?? []).map((t) => (indoor && !t.pose && TO_WINDOW.has(t.src) ? { ...t, pose: "window" as const } : t));
  // 같은 종류는 하나만, 화분이 있으면 꽃은 화분 꽃이라 또 놓지 않는다 (「화분에 꽃이 피었어요」에 화분 · 꽃밭이 같이 섰다)
  const hasPot = things.some((t) => kindOf(t.src) === "flowerpot");
  const posedSpots = things.filter((t, i) => !bgKinds.has(kindOf(t.src)) && things.findIndex((o) => kindOf(o.src) === kindOf(t.src)) === i
      && !(hasPot && kindOf(t.src) === "flowers")).map((t) => ({ t, at: t.pose ? posedOrOther(t) : null,
        // 주기: 주는 사람 손 자리 (주는 말 전까지)
        from: t.give ? inScreen(t, posed({ ...t, holder: t.give.from })) : null }))
    .filter((v) => v.t.pose !== "window" || v.at);   // 창밖 소품은 창이 없으면 방 안에 놓지 않는다
  // 배경 물건(땅에 선 것)이 차지한 가로 범위, 큰 소품은 먼저 이것을 피해 본다 (11/9 소품 키를 실제 크기로 키우자 대문이 집 앞을,
  // 깃발 · 우체통이 벤치 · 가판대 앞을 가렸다). 배경 그림 주소는 장소 폴더 기준이라 props-ar.json 열쇠로 바꾼다
  const bgSpans: [number, number][] = layout.objects.filter((o) => o.foot !== undefined).map((o) => {
    const key = o.src.startsWith("../") ? o.src.slice(3) : `${plan.location}/${o.src}`;
    const half = (o.h * arOf(key, 1) / aspect) / 2;
    return [o.x - half, o.x + half];
  });
  // 둥지는 배경 나무 가지 사이에 — 「높은 나뭇가지에 새 둥지」가 늘 땅에 놓였다 (11/10). 나무가 없으면 보통 자리
  const trees = layout.objects.filter((o) => /pine|tree/.test(o.src) && o.foot !== undefined);
  // 이어 가는 물건(keep)은 처음 놓인 자리 · 크기 그대로: 그 자리를 먼저 잡아 다른 소품이 피한다
  const pinOf = (t: ThingPlan) => (t.keep ? PINS.get(t.keep) : undefined);
  const halfOf = (t: ThingPlan, h: number) => (h * t.ar / aspect) / 2;
  // 작은 소품(키 0.15 미만) 자리: 큰 소품은 배경 물건과 겹치느니 이것 뒤에 선다 (11/10 깃발이 파라솔 기둥에 겹쳤다, 양동이 · 조개가 빈자리를 차지)
  const smallSpans = new Set<[number, number]>();
  for (const v of posedSpots) {
    const pin = !v.at ? pinOf(v.t) : undefined;
    if (!pin) continue;
    const span: [number, number] = [pin.x - halfOf(v.t, pin.h), pin.x + halfOf(v.t, pin.h)];
    (v.t.spot === "air" || v.t.spot === "wall" ? airPlaced : placed).push(span);
    if (pin.h < 0.15) smallSpans.add(span);
  }
  const remember = <T extends { x: number; h: number; footY?: number }>(t: ThingPlan, at: T): T => {
    if (t.keep && !PINS.has(t.keep)) PINS.set(t.keep, { x: at.x, h: at.h, footY: at.footY });
    return at;
  };
  const lead = form && form !== "biped" ? (headSide !== 0 ? headSide : hero.face) : 0;
  // 벽에 거는 것은 창(배경 창 그림 · 장소 창 자리)을 피한다: 우주선 둥근 창 위에 벽시계가 걸려 창밖 지구를 가렸다 (11/11)
  const winObj = layout.objects.find((o) => /window/.test(o.src));
  const winSpan: [number, number] | undefined = winObj ? spanOf(winObj)
    : layout.window ? [layout.window.x - (layout.window.h * 0.6) / aspect, layout.window.x + (layout.window.h * 0.6) / aspect] : undefined;
  const thingSpots = posedSpots.filter((v) => !v.at).map((v) => v.t).map((t, k) => {
    const pin = pinOf(t);
    if (pin) return { ...t, h: pin.h, x: pin.x, footY: pin.footY };
    // 물고기는 물 위에서 헤엄친다 — 「공중」 소품이라 개울 숲에서 하늘(달 옆)에 떠 있었다 (11/10). 물 높이를 아는 장소만, 바닷속은 그대로
    if (kindOf(t.src) === "fish" && FISH_LINE[plan.location] !== undefined) {
      const h = Math.min(t.h, 0.07), half = (h * t.ar / aspect) / 2;
      const x = [0.82, 0.18, 0.7, 0.3].find((c) => placed.every(([l, r]) => c + half < l || c - half > r)) ?? (hero.to < 0.5 ? 0.82 : 0.18);
      return { ...t, h, x, footY: FISH_LINE[plan.location] };
    }
    if (kindOf(t.src) === "nest" && trees.length) {
      const tr = trees.reduce((a, b) => (Math.abs(b.x - hero.to) > Math.abs(a.x - hero.to) ? b : a));   // 주인공과 먼 나무
      return remember(t, { ...t, h: Math.min(t.h, tr.h * 0.16), x: tr.x, footY: tr.foot! - tr.h * 0.42 });
    }
    const air = t.spot === "air";
    // 벽에 거는 것(시계 · 그림)은 높이 걸리니 공중 소품과 자리를 나눈다: 땅 소품 자리로 셈해 창밖 지구가 벽시계 위에 겹쳤다 (11/11)
    const list = air || t.spot === "wall" ? airPlaced : placed;
    // 큰 땅 소품은 배경 물건과 겹치지 않는 자리를 먼저(원래 크기 · 0.75 배까지), 없으면 겹쳐도. 사람 · 소품끼리는 늘 피한다.
    // 넓은 물건(시소 · 다리 · 텐트 · 바위)은 자리가 없으면 조금 작게라도 놓는다 — 전에는 통째로 빠졌다(좁은 화면에서 11%)
    const tryList: [boolean, number, boolean?, boolean?][] = air ? [[false, 1]]
      // 이어 갈 물건(keep)은 여러 쪽에 그대로 남으니 배경 물건과 겹치지 않는 자리를 작게라도 먼저 (11/10 이어짐 검사: 파라솔 앞 깃발이 6쪽 내내)
      // 그래도 없으면 사람 뒤에 (사람이 그 물건을 조금 가리는 편이 배경 물건과 기둥끼리 겹치는 것보다 낫다, 11/10 깃발 · 파라솔)
      : t.h >= 0.28 ? (t.keep ? [[true, 1], [true, 0.75], [true, 0.55], [true, 1, true], [true, 0.75, true], [true, 1, true, true], [true, 0.75, true, true], [false, 1], [false, 0.75], [false, 0.55]]
        : [[true, 1], [true, 0.75], [true, 1, true], [true, 1, true, true], [false, 1], [false, 0.75], [false, 0.55]])
        : [[false, 1], [false, 0.75], [false, 0.55]];
    for (const [avoidBg, scale, overSmall, overPeople] of tryList) {
      const open = (a: number, b: number) => list.every((sp) => b <= sp[0] || a >= sp[1] || (overSmall && smallSpans.has(sp)) || (overPeople && figureSpans.has(sp)))
        && (t.spot !== "wall" || !winSpan || b <= winSpan[0] || a >= winSpan[1])
        && (!avoidBg || bgSpans.every(([l, r]) => b <= l || a >= r));
      const h = t.h * scale, half = (h * t.ar / aspect) / 2;
      const lo = half + 0.01, hi = 1 - half - 0.01, gap = 0.012;
      const tries: number[] = [];
      for (let d = 0; d <= 40; d++) {
        const off = (air ? 0 : heroHalf) + half + gap + d * 0.02;
        // 사람이 아닌 주인공(4족 · 사슬 · 날개 · 물고기 …)은 소품을 머리 쪽 — 가는 쪽 · 보는 쪽 앞에 먼저 둔다 (11/10 사용자
        // 「비휴머노이드는 머리 근처, 움직이는 종착 방향으로 — 도토리가 오른쪽에 있어야」). 사람 주인공은 전처럼 양옆을 번갈아
        if (lead) tries.push(hero.to + lead * off, hero.to - lead * off);
        else if (k % 2 === 0) tries.push(hero.to - off, hero.to + off); else tries.push(hero.to + off, hero.to - off);
      }
      const ok = tries.filter((c) => c >= lo && c <= hi && open(c - half - gap, c + half + gap));
      // 배경 물건과 겹칠 수밖에 없으면 가장 덜 겹치는 자리 (첫 자리를 그냥 쓰면 깃발 기둥이 파라솔 기둥에 붙었다, 11/11 렌더 검사)
      const bgOver = (c: number) => bgSpans.reduce((sum, [l, r]) => sum + Math.max(0, Math.min(c + half, r) - Math.max(c - half, l)), 0);
      const x = !avoidBg && !air && t.h >= 0.28 && ok.length
        ? ok.reduce((a, b) => (bgOver(b) < bgOver(a) - 0.005 ? b : a)) : ok[0];
      if (x === undefined) continue;
      const span: [number, number] = [x - half, x + half];
      list.push(span);
      if (h < 0.15) smallSpans.add(span);
      // 사람 뒤에 선 것은 사람 발 줄보다 조금 뒤에 (그리기도 사람 뒤 — behindPeople)
      const behind = !!overPeople && [...figureSpans].some(([l, r]) => !(span[1] <= l || span[0] >= r));
      return remember(t, { ...t, h, x, footY: behind ? H.foot - 0.03 : undefined as number | undefined });
    }
    return null;   // 줄여도 놓을 자리가 없으면 겹치지 않게 뺀다 (글에서 먼저 나온 것이 먼저 자리를 잡는다)
  }).filter((t): t is NonNullable<typeof t> => !!t)
    // 손에 듦 · 머리에 씀인데 그 자리에 놓지 못해 옆 땅에 놓인 내 소품은 등장 통통 (가만히 있으면 내 그림이 나온 줄 모른다)
    .map((t) => (t.name !== undefined && !t.motion && (t.pose === "hand" || t.pose === "head" || t.pose === "mouth" || t.pose === "back")
      ? { ...t, motion: "pop" as const } : t));
  const front = plan.props.filter((p) => p.id === "cover" && p.src);

  // 쪽 연출 (11/10): 환해짐 · 눈물. 나레이션이 그 말의 자리에 오면 보인다 (나레이션이 없으면 쪽에 들어올 때, 끝 모습이면 처음부터)
  const fx = sceneFx(text);
  // 나레이션이 없으면(소리 끔 · 읽기 전) 쪽에 들어와 자리를 잡은 뒤에. 끝 모습이면 처음부터
  // 시작 모습(넘기는 동안 기다리는 쪽)에서는 아무 연출도 없다 — 전에는 재생 전이면 다 보여 줘 사람이 오기 전에 눈물부터 떨어졌다
  const heard = (at: number) => mode === "end" || (play && phase === 1 && (narration === undefined || narration >= at));
  // 이 쪽에 새로 나온 땅 소품도 인물과 겹치면 인물 뒤에 — 화분 · 벤치 · 블록이 아빠 · 할아버지 다리를 가렸다 (11/11 장면 검사)
  const peopleSpans = people.flatMap((v) => {
    if (!v || v.p.id === "sign") return [];
    const half = (v.sb.h * (PEOPLE[v.p.id]?.w ?? 0.45) / aspect) / 2;
    return [[v.spot.x - half, v.spot.x + half] as [number, number]];
  });
  const overPerson = (t: ThingPlan & { x?: number }) => {
    if (t.spot === "air" || t.spot === "wall" || t.x === undefined) return false;
    const half = (t.h * t.ar / aspect) / 2;
    return peopleSpans.some(([l, r]) => Math.min(t.x! + half, r) - Math.max(t.x! - half, l) > half * 0.4);
  };
  // 넓은 풍경 · 둥지, 그리고 사람 뒤 자리(발 줄보다 위)에 놓인 땅 소품은 사람보다 먼저 그린다
  // 이어 남은 물건 자리에 사람이 설 수밖에 없었으면(자리가 없음) 물건을 사람 뒤에: 사람 앞을 물건이 가리면 그 위에 선 것처럼 보였다 (11/10 계단 · 선생님)
  const personSpans = [...figureSpans].filter((sp) => sp !== placed[0]);
  // 작은 것(화분 · 조개 · 발자국, 키 0.2 미만)은 조금만 겹쳐도(폭 1할) 사람 · 주인공 뒤에: 손잡고 걷는 아빠 · 주인공 다리 앞을 화분이 가렸다 (11/11 렌더 검사)
  const underPerson = (t: { x: number; h: number; ar: number; keep?: string }) => {
    if (!t.keep) return false;
    // 주인공 자리(placed[0])도 본다: 의자 옆 화분 · 호숫가 바위가 주인공 다리 앞에 그려졌다
    const half = (t.h * t.ar / aspect) / 2, small = t.h < 0.2;
    return [...personSpans, placed[0]].some(([l, r]) => Math.min(t.x + half, r) - Math.max(t.x - half, l) > half * (small ? 0.2 : 0.4));
  };
  const behindPeople = (t: ThingPlan & { footY?: number; x?: number }) => WIDE_SCENERY.has(kindOf(t.src)) || kindOf(t.src) === "nest"
    || (t.spot !== "air" && t.spot !== "wall" && t.footY !== undefined && t.footY < H.foot - 0.025)
    || (t.x !== undefined && t.spot !== "air" && t.spot !== "wall" && underPerson(t as { x: number; h: number; ar: number; keep?: string }))
    || overPerson(t);
  const renderThing = (t: (typeof thingSpots)[number], k: number) => (
        <img key={`thing-${k}-${t.src.slice(0, 40)}`} data-spot={t.spot ?? "ground"} data-behind={behindPeople(t) ? "1" : undefined}
             className={`scene-obj scene-thing ${t.pose === "fall" && play ? "m-drop" : ""} ${t.motion && (!ONCE.has(t.motion) || play) ? `m-${t.motion}` : ""} ${inBlink(t) ? "m-blink" : ""}`}
             alt={t.name ? `내가 그린 ${t.name}` : ""}
             src={thingSrc(t.src)}
             style={{ ...spotStyle(t.spot === "wall" ? { src: t.src, x: t.x, top: 0.16, h: t.h }
               : { src: t.src, x: t.x, foot: "footY" in t && t.footY !== undefined ? t.footY : t.spot === "air" ? 0.3 : 0.95, h: t.h }),
               // 공은 주인공 반대쪽으로 굴러간다 (주인공과 부딪치지 않게)
               ["--roll" as string]: t.x < hero.to ? -1 : 1, ...appear(t) }} />
  );
  // 소품은 대사에 맞춰 (11/10 사용자 「소품 애니메이션을 대사에 맞춰서」): 이 쪽에 처음 나오는 것은 나레이션이 그 말에 오면 나타나고,
  // 주는 것은 주는 사람 손에 있다가 주는 말에서 받는 사람 손으로 옮겨 간다. 끝 모습 · 소리 없음이면 처음부터 다 된 모습
  // 받는 사람이 손에 들 수 없으면(주인공이 뛰는 쪽 등) 주는 말에서 받는 사람 곁 땅에 나타난다
  const appearAt = (t: ThingPlan) => t.appearAt ?? t.give?.at;
  const appear = (t: ThingPlan): CSSProperties => (appearAt(t) === undefined ? {}
    : { opacity: heard(appearAt(t)!) ? 1 : 0, transition: "opacity .45s ease" });
  const handStyle = (v: { t: ThingPlan; at: { style: CSSProperties } | null; from: { style: CSSProperties } | null }): CSSProperties =>
    v.t.give && v.from && !heard(v.t.give.at) ? { ...v.from.style, transition: "left .9s ease, bottom .9s ease, opacity .45s ease" }
      : { ...v.at!.style, ...(v.t.give && v.from ? { transition: "left .9s ease, bottom .9s ease, opacity .45s ease" } : {}), ...appear(v.t) };
  const brightOn = fx.bright >= 0 && heard(fx.bright);
  // 누가 우나: 그 문장에 「나」가 있으면 주인공, 이름이 나온 인물이면 그 사람, 아니면 옆 인물(「친구가 울고 있었어요」), 없으면 주인공
  const visiblePeople = people.filter((v): v is NonNullable<typeof v> => !!v && v.p.id !== "sign");
  // 빛이 퍼지는 자리 (11/10 사용자 「불빛이 밝아졌다는 건 그 소품이랑 맞거나 화면 한 자리에서 — 화면 위 가운데 고정이 아니라」).
  // 등대 → 등대 꼭대기, 등불 · 손전등 → 그 소품이나 든 사람, 가로등 → 가로등, 창 → 창. 해 · 햇살 · 모르면 위 가운데(전과 같음)
  // 배경 그림 물건의 빛 나는 자리 (등대 꼭대기 · 가로등 · 등불)
  const layoutObj = (re: RegExp) => {
    const o = layout.objects.find((v) => re.test(v.src));
    return o ? { x: o.x, y: o.foot !== undefined ? o.foot - o.h * 0.85 : (o.top ?? 0.2) + o.h * 0.3 } : null;
  };
  // 깜빡이는 빛 (11/10 사용자 「깜빡이다 — 소품에 매핑되면 그 소품, 안 되면 전체」): 그 문장에 나온 소품이 화면에 있으면 그 소품이,
  // 없으면 등대 · 가로등 · 등불 · 창 자리, 그것도 없으면 장면 전체가 깜빡인다. 나레이션이 그 말에 오면 몇 번
  const blinkNow = play && !REDUCE ? fx.blinks.filter((b) => heard(b.at)) : [];
  const inBlink = (t: { at?: number }) => t.at !== undefined && t.at >= 0 && blinkNow.some((b) => t.at! >= b.start && t.at! < b.end);
  const shownThings = [...thingSpots, ...posedSpots.filter((v) => v.at).map((v) => v.t)];
  const blinkScene = blinkNow.filter((b) => b.light && !shownThings.some((t) => t.at !== undefined && t.at >= b.start && t.at < b.end)).map((b) => {
    const sen = b.sentence;
    const spot = /등대/.test(sen) ? layoutObj(/lighthouse/) : /가로등/.test(sen) ? layoutObj(/lamp/)
      : /등불|랜턴|초롱/.test(sen) ? layoutObj(/lantern/) : /창/.test(sen) && layout.window ? { x: layout.window.x, y: layout.window.y } : null;
    return { at: b.at, spot };
  }).pop();
  const glowAt = ((): { x: number; y: number } | null => {
    if (!(fx.bright >= 0 || plan.env.glow)) return null;
    const said = text.replace(/“[^”]*”/g, " ");
    const LIGHT_KIND = /lantern|flashlight|candle|lamp|torch/;
    const objAt = (re: RegExp) => {
      const o = layout.objects.find((v) => re.test(v.src));
      return o ? { x: o.x, y: o.foot !== undefined ? o.foot - o.h * 0.85 : (o.top ?? 0.2) + o.h * 0.3 } : null;
    };
    if (/해가|해님|햇살|햇빛|아침/.test(said) && !/등대|등불|손전등|랜턴|불빛|촛불|가로등/.test(said)) return null;
    if (/등대/.test(said)) { const o = objAt(/lighthouse/); if (o) return o; }
    if (/가로등/.test(said)) { const o = objAt(/lamp/); if (o) return o; }
    const held = (plan.things ?? []).find((t) => t.holder && LIGHT_KIND.test(t.src));
    if (held?.holder === "hero" && !heroGone) return { x: heroX, y: topY + drawn.h * 0.45 };
    if (held) {
      const v = visiblePeople.find((q) => q.p.id === held.holder || q.p.name === held.holder);
      if (v) return { x: v.spot.x, y: (v.sb.foot ?? 0.93) - v.sb.h * 0.5 };
    }
    const lamp = thingSpots.find((t) => LIGHT_KIND.test(t.src));
    if (lamp) return { x: lamp.x, y: ("footY" in lamp && lamp.footY !== undefined ? lamp.footY : lamp.spot === "air" ? 0.3 : 0.95) - lamp.h * 0.7 };
    // 사람이 든다고 적힌 등불(「아저씨가 등불을 들고」) — 그 사람
    if (/등불|손전등|랜턴|초롱/.test(said)) {
      const v = visiblePeople.find((q) => q.p.name && new RegExp(`${q.p.name}[^.!?]{0,12}(?:등불|손전등|랜턴|초롱)|(?:등불|손전등|랜턴|초롱)[^.!?]{0,8}든 ${q.p.name}`).test(said));
      if (v) return { x: v.spot.x, y: (v.sb.foot ?? 0.93) - v.sb.h * 0.5 };
    }
    if (/불빛|등불|촛불/.test(said)) { const o = objAt(/lighthouse|lantern|lamp/); if (o) return o; }
    if (/창/.test(said)) {
      if (layout.window) return { x: layout.window.x, y: layout.window.y };
      const o = objAt(/window/); if (o) return o;
    }
    return null;
  })();
  // 문장의 주인 (눈물 · 기쁨이 누구에게 나나): 「나」가 있으면 주인공, 이름이 나온 인물이면 그 사람, 「친구 · 아이 …」면 옆 인물.
  // 고마워(heart)는 도움을 받은 쪽이 하는 말이라 「나」가 없고 옆에 인물이 있으면 그 사람. 없으면 주인공
  // scale: 연출 크기 기준 (화면 높이 대비). 사람은 키, 옆으로 긴 그림(뱀 · 물고기 · 새 · 4족)은 키가 작아 눈물 · 별이 점처럼
  // 작았다 (11/10 형태별 점검) — 몸길이의 절반과 키 중 큰 쪽, 화면 높이 2할 아래로는 줄이지 않는다
  // cx · foot: 몸 가운데 · 발끝 (먼지 · 물보라 · 반짝이 자리), dir: 머리 쪽(옆모습) — 앞모습은 1
  type Who = { key: string; x: number; face: number; head: number; top: number; h: number; scale: number; side: boolean; follow: boolean; enter: boolean;
    cx: number; foot: number; dir: number };
  // other: 상대(등장인물)가 하는 것 — 「나는 친구를 웃게 했어요」 · 「왜 울어?」. 주어 「나」를 보지 않는다
  const whoOf = (sentence: string, thanks = false, other0 = false, pos?: number): Who | null => {
    // 문장의 주인 (subjectOf). 사람이 아닌 것이 주어면 아무도 아니다. 이름 없는 사람(친구 · 아저씨)은 옆 인물, 그 쪽에 인물이
    // 없으면 아무도 아니다 (주인공에게 대신 나지 않게). 고마워 · 묻는 말 · 웃게 했어요(other0)는 상대
    // pos: 연출 말(울었어요 · 웃었어요)의 자리 — 그 마디의 주어를 본다 (「가 보니 친구가 울고 있었어요」)
    const subj = subjectOf(sentence, visiblePeople.map((v) => v.p.name ?? ""), heroName, pos);
    if (subj === null && !other0) return null;
    const me = !other0 && subj === "hero" && !(thanks && /^\s*“/.test(sentence));
    const named = subj && subj !== "hero" && subj !== "other" ? visiblePeople.find((v) => v.p.name === subj) : undefined;
    const other = !me && (named ?? visiblePeople[0]);
    if (!me && !other) return null;
    if (other) {
      const h = other.sb.h, foot = other.sb.foot ?? 0.93;
      return { key: `p-${other.p.id}`, x: other.spot.x, face: foot - h * 0.8, head: foot - h, top: foot - h, h, scale: h, side: false, follow: false, enter: !!other.p.enter || !!other.follow,
        cx: other.spot.x, foot, dir: other.spot.x >= hero.to ? 1 : -1 };
    }
    if (heroGone || !drawn.h) return null;
    const hd = heroBody ? bodyAt(heroBody.head) : null;
    const side = facing !== 0 && !upright;
    const x = hd ? hd.x + (side ? headSide * drawn.w * 0.04 : 0) : heroX + (side ? headSide * drawn.w * 0.33 : 0);
    const face = hd ? hd.y + drawn.h * 0.14 : topY + drawn.h * (side ? 0.26 : 0.16);
    const scale = Math.max(drawn.h, drawn.w * aspect * 0.5, 0.2);
    // top: 그림 맨 윗선 — 옆모습의 머리 자리(hd)는 주둥이 높이라 거기에 별 아치를 걸면 얼굴을 덮었다
    return { key: "hero", x, face, head: hd ? hd.y : topY, top: topY, h: drawn.h, scale, side, follow: true, enter: false,
      cx: heroX, foot: topY + drawn.h, dir: side ? headSide : 1 };
  };
  // 걸어 들어오는 사람은 제자리에 다 온 뒤에 운다 · 기뻐한다 — 전에는 화면 밖에서 오는 중인데 설 자리에 눈물부터 떨어졌다 (11/10)
  // 늦게 들어오는 사람은 그 사람이 다 걸어 들어온 뒤에 운다 · 기뻐한다
  const ready = (w: Who | null): w is Who => {
    if (!w) return false;
    if (!w.enter) return true;
    const pp = plan.props.find((q) => `p-${q.id}` === w.key);
    if (pp?.enterAt !== undefined && mode !== "end") return lateArrived.plan === plan && lateArrived.keys.has(w.key);
    return arrived;
  };
  // 그친 자리: 같은 사람이 그 뒤에 눈물을 닦거나 기뻐하면 눈물이 멈춘다 (전에는 쪽 끝까지 계속 떨어졌다)
  const stopsAt = [...fx.calms.map((c) => ({ at: c.at, who: whoOf(c.sentence, false, false, c.pos) })),
    ...fx.joys.map((jy) => ({ at: jy.at, who: whoOf(jy.sentence, jy.kind === "heart", !!jy.other, jy.pos) }))].filter((c) => heard(c.at));
  const crying = fx.tears.filter((t) => heard(t.at)).map((t) => {
    // 주어를 뺀 우는 문장(「눈물이 뚝뚝 떨어졌어요」)은 앞 문장의 사람 — 앞 문장도 주어가 없으면 전처럼 주인공 (11/11)
    const bare = !t.other && t.before && subjectOf(t.sentence, visiblePeople.map((v) => v.p.name ?? ""), heroName, t.pos, "") === "";
    // 앞 문장이 사람이 아닌 것의 말(「무릎에 흙이 묻었어요」)이면 그 문장 그대로 (주인공)
    const w = (bare ? whoOf(t.before!, false, false) : null) ?? whoOf(t.sentence, false, !!t.other, t.pos);
    if (t.other && w?.key === "hero") return null;   // 상대가 울어야 하는데 옆에 인물이 없으면 아무도 울지 않는다
    if (!ready(w)) return null;
    if (stopsAt.some((c) => c.at > t.at && c.who?.key === w.key)) return null;
    return { key: w.key, x: w.x, y: w.face, size: Math.max(w.scale * (w.side ? 0.085 : 0.06), 0.028), gap: w.side ? 0 : (w.scale * (w.follow ? 0.04 : 0.032)) / aspect, follow: w.follow };
  }).filter((v, k, all): v is NonNullable<typeof v> => !!v && all.findIndex((w) => w?.key === v.key) === k);
  // 기쁨 · 고마움: 그 사람 머리 위로 하트 · 별 · 꽃이 피어오른다 (나레이션이 그 말에 오면 한 번)
  // 「우리는 · 우리 둘은 · 함께 · 서로」 — 둘이 같이 하는 것은 주인공과 옆 인물 모두 같은 연출 (11/10 「친해졌다는 둘이 같은 표현」)
  // 「엄마도, 토토도, 아저씨도 모두 기뻐했어요」 · 「친구가 웃자 토토도 따라 웃었어요」 · 「토토와 친구는 깔깔 웃었어요」도 같이 (11/11 전수 점검)
  const together = (sen: string) => /우리(?:는|가|도| 둘| 모두)|둘이|둘은|서로|다 같이|함께 (?:웃|기뻐|손)|친구가 (?:됐|되었|되어)|단짝/.test(sen)
    || /모두 (?:기뻐|웃|신이)/.test(sen) || /[가-힣]+도,? [^.!?]*[가-힣]+도[ ,]/.test(sen)
    || /(?:웃자|웃으니|웃고)[ ,][^.!?]*[가-힣]+도 (?:따라 |덩달아 |같이 )?(?:웃|깔깔|키득|기뻐|신)/.test(sen)
    || /[가-힣]+(?:와|과|랑|이랑) [가-힣]+(?:는|은|가|이) /.test(sen);
  const joyful = fx.joys.filter((jy) => play && heard(jy.at)).flatMap((jy) => {
    if (!together(jy.sentence)) return [{ jy, w: whoOf(jy.sentence, jy.kind === "heart", !!jy.other, jy.pos) }];
    return [{ jy, w: whoOf("나는", false) }, ...visiblePeople.slice(0, 2).map((v) => ({ jy, w: whoOf(v.p.name ?? "친구", false, true) }))];
  }).map(({ jy, w }, k) => {
    if (!ready(w)) return null;
    // 머리 둘레를 감싼다 — 칸 가운데가 얼굴 높이, 칸 크기는 그 사람 키 기준 (11/10 「별이 머리 주변에 가득 있어야」)
    // 옆모습(새 · 4족 …)은 머리가 그림 끝에 작게 있어 몸 키 기준이면 별이 얼굴 · 눈을 덮었다 — 작게 · 머리 위쪽으로 (11/10)
    // 옆모습은 머리가 그림 끝에 작게 있다 — 머리보다 조금 위에 걸어 얼굴을 덮지 않게
    const size = w.side ? w.scale * 0.75 : w.h;
    return { key: `${w.key}-${k}`, who: w.key, x: w.x, y: w.side ? w.top : (w.head + w.face) / 2, size, kind: jy.kind, follow: w.follow };
  }).filter((v, k, all): v is NonNullable<typeof v> => !!v && all.findIndex((o) => o?.who === v.who && o?.kind === v.kind) === k);   // 한 사람에 같은 연출 하나
  // 빙글 돌기: 주인공 그림을 좌우로 뒤집었다 돌아오기를 세 번 (2D 그림이라 도는 것처럼). 그 말 앞에 다른 사람(이름 · 친구)이
  // 있거나 그 말로 도는 소품(바람개비 …)이 있으면 주인공은 돌지 않는다. 나레이션이 그 말에 오면 한 번
  // 그 말 앞의 주어가 주인공이 아니면(친구 · 이름 · 박쥐들이 · 돌들이 …) 주인공은 돌지 않는다
  const otherSpins = (before: string) => subjectOf(before, visiblePeople.map((v) => v.p.name ?? ""), heroName, before.length) !== "hero";
  const canMove = play && !REDUCE && !hero.fallen && !heroGone;
  const spinAt = canMove && !(plan.things ?? []).some((t) => t.motion === "spin")
    ? Math.max(-1, ...fx.spins.filter((sp) => heard(sp.at) && !otherSpins(sp.before)).map((sp) => sp.at)) : -1;
  // 몸짓 (11/10): 꾸벅 · 끄덕 · 떨기 · 웅크리기, 빙글처럼 그림을 통째로 움직여 날개형 · 물고기도 된다. 다른 사람이 하는 말이면 넘어가고,
  // 나레이션이 그 말에 오면 한 번. 빙글 · 몸짓이 한 쪽에 여럿이면 가장 나중에 들린 것 하나 (애니메이션이 하나라 겹치면 서로 지운다)
  const gesture = canMove ? fx.gestures.filter((g) => heard(g.at) && !otherSpins(g.before)).pop() : undefined;
  const heroSpin = spinAt >= 0 && !(gesture && gesture.at > spinAt);
  const heroMove = heroSpin ? "spin" : gesture ? `g-${gesture.kind}` : "";
  // 어두운 곳: 「불을 켜니 환해졌어요」처럼 같은 쪽에서 밝아지면 그 말부터 어둑함이 걷힌다
  const dim = !!env.dim && !brightOn;
  // 만화 기호 연출 (11/10): 그 문장의 사람에게. 자리 · 크기는 연출마다 (화면 높이 · 너비 대비, 칸 가운데가 자리)
  const marks = fx.marks.filter((mk) => play && heard(mk.at)).map((mk) => {
    const w = whoOf(mk.sentence);
    if (!ready(w)) return null;
    const s = w.scale, side = (k: number) => (s * k) / aspect;
    const head = (dx: number, k: number, ar: number) => ({ x: w.x + w.dir * side(dx), y: w.top - s * 0.02, h: s * k, wd: side(k * ar) });
    const at = mk.kind === "surprise" || mk.kind === "question" ? head(0.22, 0.3, 0.55)
      : mk.kind === "anger" ? head(0.22, 0.22, 1)
      : mk.kind === "zzz" || mk.kind === "note" ? head(0.3, 0.5, 0.8)
      : mk.kind === "sweat" ? { x: w.x + w.dir * side(0.13), y: w.face - s * 0.06, h: s * 0.13, wd: side(0.1) }
      : mk.kind === "bubble" ? { x: w.x + w.dir * side(w.side ? 0.06 : 0.02), y: w.face - s * 0.36, h: s * 0.8, wd: side(0.4) }
      : mk.kind === "splash" || mk.kind === "dust" ? { x: w.cx, y: w.foot - s * 0.08, h: s * 0.34, wd: side(0.85) }
      : mk.kind === "steam" ? { x: w.x, y: w.top - s * 0.2, h: s * 0.45, wd: side(0.42) }
      : { x: w.cx, y: (w.top + w.foot) / 2, h: s * 1.05, wd: side(0.85) };   // sparkle: 몸 둘레
    return { key: `${w.key}-${mk.kind}`, kind: mk.kind, follow: w.follow, ...at };
  }).filter((v, k, all): v is NonNullable<typeof v> => !!v && all.findIndex((o) => o?.key === v.key) === k);
  // 등장인물도 기쁘거나(별 · 꽃 · 하트) 그 사람이 도는 말이면 좌우로 뒤집었다 돌아온다 (11/10 「손 인사 말고도 기쁜 상황에서 뒤집기」).
  // 손 인사 그림띠를 보이는 중이면 그때 멈춘 그림으로 바꿔 돈다
  // 등장인물은 글에 그 사람이 돈다고 적혔을 때만 돈다 (11/11 사용자 「등장인물이 빙글빙글 도는 기준이 너무 없다」 — 전에는 기쁨 연출
  // (빙그레 웃었어요 · 안아 주었어요 · 고마워)만 붙어도 돌아, 인물이 나오는 쪽의 23%에서 돌았다. 글에 도는 말은 36쪽뿐).
  // 기쁨은 꽃 · 하트 · 별 연출만. 물건이 도는 쪽(바람개비 …)은 사람이 돌지 않는다
  const thingSpins = (plan.things ?? []).some((t) => t.motion === "spin");
  const personSpin = new Set<string>(REDUCE || !play || thingSpins ? [] : [
    // 사람이 도는 말일 때만 — 「토성이 빙그르르 돌면서」처럼 사람이 아닌 것이 돌면 아무도 돌지 않는다 (11/11 전수 점검)
    ...fx.spins.filter((sp) => heard(sp.at) && otherSpins(sp.before)
      && subjectOf(sp.before, visiblePeople.map((v) => v.p.name ?? ""), heroName, sp.before.length) !== null).map((sp) => {
      const v = visiblePeople.find((q) => q.p.name && sp.before.includes(q.p.name)) ?? visiblePeople[0];
      return v && (!v.p.enter || arrived) ? `p-${v.p.id}` : "";
    }).filter(Boolean),
  ]);
  // 슬프거나 걱정하는 쪽 — 인물이 손을 흔들거나 만세하지 않는다
  const sadPage = SAD_TEXT.test(text);

  return (
    <div className={`scene ${night ? "night" : ""} ${dim ? "dim" : ""} ${plan.location.startsWith("space") ? "starry" : ""} ${weather === "rain" ? "gloomy" : ""} ${weather === "storm" ? "stormy" : ""}`} aria-hidden ref={root}>
      <img className="scene-plate scene-bg" src={base + layout.plate} alt="" />
      <div className="scene-tint" />
      {!indoor && (
        <div className="scene-sky" style={{ height: `${(layout.ground ?? 0.556) * 100}%` }}>
          {bodies && <>
            <img className={`scene-sun ${cloudy ? "hidden" : ""}`} src={`${sceneBase("props")}sun.webp`} alt=""
                 style={{ left: `${sunPos[0]}%`, top: `${sunPos[1]}%`, transition: REDUCE ? "none" : `${skyMove(env.sun)}, opacity 1.2s ease` }} />
            <img className="scene-moon" src={`${sceneBase("props")}moon.webp`} alt=""
                 style={{ left: `${moonPos[0]}%`, top: `${moonPos[1]}%`, transition: skyMove(night) }} />
          </>}
          {weather === "rainbow" && <div className="scene-rainbow" />}
          {/* 번개: 쪽에 들어올 때 하늘만 한 번 천천히 살짝 밝아진다 (번쩍임 · 되풀이 없음, 천둥 소리 없음) */}
          {weather === "storm" && <div className="scene-storm-clouds" />}
          {weather === "storm" && play && <div className="scene-flash" />}
          {STARS.map(([x, y, s], k) => (
            <svg key={k} className="scene-star" viewBox="0 0 20 20" style={{ left: `${x}%`, top: `${y}%`, width: `${s}%` }}>
              <path d="M10 1l2.4 6.2L19 8l-5 4.3L15.5 19 10 15.5 4.5 19 6 12.3 1 8l6.6-.8z" />
            </svg>
          ))}
        </div>
      )}
      {layout.objects.map((o, k) => (
        <img key={k} className="scene-obj scene-bg" src={base + o.src} alt="" style={spotStyle(o)} />
      ))}
      {/* 넓은 풍경 물건(텐트 · 배 · 모래 언덕 …)과 나무에 걸린 둥지는 사람 뒤에 (앞에 그리면 사람을 덮었다, 11/10) */}
      {thingSpots.filter(behindPeople).map(renderThing)}
      {people.map((v, k) => {
        if (!v) return null;
        const { p, s, spot, sb, follow } = v;
        // 걸어 들어오는 인물: 처음엔 화면 밖, 끝 모습에서 제자리. 함께 움직이는 인물은 주인공 뒤 출발점에서 주인공과 같은 빠르기로
        // 늦게 들어오는 사람(enterAt): 나레이션이 그 사람 말에 오기 전까지 화면 밖에서 기다린다
        const waitIn = !!p.enter && p.enterAt !== undefined && mode !== "end" && !heard(p.enterAt);
        if (p.enter && p.enterAt !== undefined && !waitIn && play) {
          const key = `p-${p.id}`;
          if (lateGoing.current.plan !== plan) lateGoing.current = { plan, keys: new Set() };
          if (!lateGoing.current.keys.has(key)) {
            lateGoing.current.keys.add(key);
            window.setTimeout(() => setLateArrived((a) => {
              const keys = new Set(a.plan === plan ? a.keys : []);
              keys.add(key);
              return { plan, keys };
            }), REDUCE ? 0 : ENTER_MS);
          }
        }
        const x = phase === 0 && follow ? follow.from : (phase === 0 || waitIn) && p.enter ? (p.enter === "left" ? -0.14 : 1.14) : spot.x;
        const move: CSSProperties = { transition: REDUCE || !play ? "none"
          : follow ? `left ${timing.ms}ms linear, filter 2.6s ease` : `left ${ENTER_MS}ms cubic-bezier(.3,.15,.45,1), filter 2.6s ease` };
        // 가만히 있는 동안 숨쉬기 · 깡충 (11/9 「등장인물이 다 가만히 있다」) — 사람마다 박자를 엇갈려 같이 들썩이지 않게
        // 슬프거나 걱정하는 쪽에서는 이름이 나와도 손을 흔들지 않는다 (우는 친구가 손을 흔들며 웃었다, 11/10)
        // 이름이 나온 인물은 말하는 사람 — 살짝 통통(p-talk). 손 흔들기는 인사하는 말이 있는 쪽에서만, 슬픈 쪽은 안 흔든다
        const talks = !!p.name && play && text.includes(p.name) && !sadPage;
        const greets = play && !sadPage && GREET_TEXT.test(text);
        const spinning = personSpin.has(`p-${p.id}`);
        const idle = p.id === "bird" || p.id === "bat" ? "m-float" : p.id === "rabbit" || p.id === "squirrel" ? "p-hop"
          : talks ? "p-talk" : "p-breathe";
        const beat = { animationDelay: `${-((k * 1.37) % 3.6).toFixed(2)}s` };
        // 관절로 렌더한 동작 그림띠 (11/9 「등장인물도 관절 애니메이션」, tools/people-moves) — 들어오면 걷기, 기쁜 쪽이거나
        // 쪽 글에 이름이 나오면(말하는 사람) 손 흔들기. 그림띠를 멈춘 그림과 같은 키 · 발끝에 두고, 끝나면 멈춘 그림(숨쉬기)으로
        // 시작 모습(phase 0)부터 같은 요소로 둔다 — 끝 모습에서 새로 붙이면 left 가 옮겨 가지 않고 제자리에 나타났다
        const moves = play && !REDUCE ? (MOVES as Record<string, PersonMoves>)[p.id] : undefined;
        const ready = (name: keyof PersonMoves, atStart = false) => {
          const url = stripUrl(p.id, name);
          if ((atStart ? readyAtPlay.current : stripReady)?.has(url)) return true;
          if (!stripReady.has(url)) void preloadStrip(url).then(() => setStripTick((n) => n + 1));
          return false;
        };
        // 늦게 받은 걷기: 쪽 시작 때는 없었는데 지금은 받았다 → 화면 밖에서 지금부터 걸어 들어온다. 아직 못 받았으면 밖에서 기다린다
        const lateKey = `${p.id}-${p.name ?? k}`;
        if (lateStarted.current.ids.has(lateKey) && lateGiveUp) {
          return <img key={lateKey} className={`scene-obj scene-person ${idle}`} src={base + s.src} alt=""
                      style={{ ...spotStyle({ ...sb, x: spot.x }), transition: "none" }} />;
        }
        const lateWalk = !!moves?.walk && !!p.enter && !follow && !spinning && phase === 1 && !ready("walk", true) && !lateGiveUp;
        const lateReady = lateWalk && stripReady.has(stripUrl(p.id, "walk"));
        if (lateWalk) lateMs.current = LATE_WAIT_MS;
        const offX = p.enter === "left" ? -0.14 : 1.14;
        // 늦게 들어오는 사람: 기다리는 동안은 화면 밖 멈춘 그림, 그 말에 오면 그때부터 걸어 들어온다(아래 늦은 걷기와 같은 길)
        if (waitIn) {
          return <img key={`${p.id}-${p.name ?? k}`} className="scene-obj scene-person" src={base + s.src} alt=""
                      style={{ ...spotStyle({ ...sb, x: offX }), transition: "none" }} />;
        }
        const delayedGo = !!p.enter && p.enterAt !== undefined && mode !== "end" && !!moves?.walk && !follow && !spinning
          && stripReady.has(stripUrl(p.id, "walk"));
        if (lateWalk && !lateReady && !delayedGo) {
          return <img key={`${p.id}-${p.name ?? k}`} className="scene-obj scene-person" src={base + s.src} alt=""
                      style={{ ...spotStyle({ ...sb, x: offX }), transition: "none" }} />;
        }
        if (lateReady || delayedGo) {
          if (lateReady) lateStarted.current.ids.add(lateKey);
          const m = moves!.walk!;
          const tall = sb.h * (1 + m.pad_top + m.pad_bottom);
          const vars = { ["--until" as string]: `${ENTER_MS}ms`, ["--lag" as string]: "0ms", ["--dur" as string]: `${m.sec}s`,
            ["--from" as string]: `${offX * 100}%`, ["--enter-ms" as string]: `${ENTER_MS}ms`, ["--lean" as string]: p.enter === "left" ? "5deg" : "-5deg" };
          return [
            <div key={`${p.id}-${p.name ?? k}-walk-late`} className="scene-obj scene-person-strip s-walk late"
                 style={{ ...spotStyle({ ...sb, x: spot.x, h: tall, foot: (sb.foot ?? 0.93) + sb.h * m.pad_bottom }), aspectRatio: `${m.ar}`, ...vars }}>
              <img src={stripUrl(p.id, "walk")} alt="" style={{ width: `${m.frames * 100}%`, animationTimingFunction: `steps(${m.frames})` }} />
            </div>,
            <img key={`${p.id}-${p.name ?? k}`} className={`scene-obj scene-person after-strip ${idle === "p-talk" ? "p-breathe" : idle}`}
                 src={base + s.src} alt="" style={{ ...spotStyle({ ...sb, x: spot.x }), transition: "none", ...vars }} />,
          ];
        }
        const pick: [keyof PersonMoves, number] | null = !moves || spinning ? null
          : follow && moves.walk ? (ready("walk", true) ? ["walk", timing.ms] : null)
          : p.enter && moves.walk ? (ready("walk", true) ? ["walk", ENTER_MS] : null)
          // 그림띠를 다 받기 전에 바꿔 끼우면 멈춘 그림은 숨고 그림띠는 비어 있어 깜빡였다 — 받은 뒤에만 (11/9)
          : CHEER_ACTIONS.has(pageAction) && !sadPage && moves.hooray && ready("hooray") ? ["hooray", moves.hooray.sec * 2000]
          // 만세 그림띠는 몸통이 불룩해져 뺐다(11/9). 기쁜 쪽도 손 흔들기로. 인사는 손을 든 채 쪽이 바뀔 때까지 흔든다
          // (사용자 「손 들고 계속 흔드는 거 무한 유지」, loop_from)
          : (greets || (CHEER_ACTIONS.has(pageAction) && !sadPage)) && moves.wave && ready("wave") ? ["wave", moves.wave.loop_from != null ? Infinity : moves.wave.sec * 1000]
          : null;
        if (moves && pick) {
          const [name, until] = pick;
          const m = moves[name]!;
          const tall = sb.h * (1 + m.pad_top + m.pad_bottom);
          // 같은 쪽 인물끼리 박자를 엇갈린다 (들어오기는 함께)
          const walking = name === "walk";
          const lag = walking ? 0 : 300 + k * 450;
          const vars = { ["--until" as string]: Number.isFinite(until) ? `${until + lag}ms` : "86400s", ["--lag" as string]: `${lag}ms`, ["--dur" as string]: `${m.sec}s` };
          // 되풀이 그림띠: loop_from 장까지 한 번(strip-in) → 그 장부터 끝까지 끝없이(strip-loop)
          const k0 = m.loop_from;
          const run: CSSProperties = k0 == null ? { animationTimingFunction: `steps(${m.frames})` } : {
            ["--a" as string]: `${(-100 * k0) / m.frames}%`,
            animation: `strip-in ${(m.sec * k0) / m.frames}s steps(${k0}) ${lag}ms forwards, `
              + `strip-loop ${(m.sec * (m.frames - k0)) / m.frames}s steps(${m.frames - k0}) ${lag + (m.sec * 1000 * k0) / m.frames}ms infinite`,
          };
          return [
            <div key={`${p.id}-${p.name ?? k}-${name}`} className={`scene-obj scene-person-strip s-${walking ? "walk" : name}`}
                 style={{ ...spotStyle({ ...sb, x, h: tall, foot: (sb.foot ?? 0.93) + sb.h * m.pad_bottom }), aspectRatio: `${m.ar}`, ...move, ...vars,
                   // 걸어 들어올 때 가는 쪽으로 몸을 살짝 기울인다 (정면 그림이 제자리 걸음으로 옆으로 미끄러지면 어색했다)
                   ...(walking ? { ["--lean" as string]: (follow ? travel > 0 : p.enter === "left") ? "5deg" : "-5deg" } : {}) }}>
              <img src={stripUrl(p.id, name)} alt=""
                   style={{ width: `${m.frames * 100}%`, ...run }} />
            </div>,
            <img key={`${p.id}-${p.name ?? k}`} className={`scene-obj scene-person after-strip ${idle === "p-talk" ? "p-breathe" : idle}`}
                 src={base + s.src} alt="" style={{ ...spotStyle({ ...sb, x }), ...move, ...vars }} />,
          ];
        }
        return (
          <img key={`${p.id}-${p.name ?? k}`}
               className={`scene-obj scene-person ${spinning ? "p-spin" : phase === 0 || !(p.enter || follow) ? idle : "walking-in"}`}
               src={base + s.src} alt="" style={{ ...spotStyle({ ...sb, x }), ...move, ...(phase === 0 || !p.enter ? (idle === "p-talk" ? { animationDelay: `${0.5 + k * 0.3}s, ${1.8 + k * 0.45}s` } : beat) : {}) }} />
        );
      })}
      {posedSpots.filter((v) => v.at && !v.at.top).map((v, k) => (
        <img key={`posed-${k}-${v.t.src.slice(0, 40)}`} className={`scene-obj scene-thing ${v.at!.cls} ${inBlink(v.t) ? "m-blink" : ""}`} alt="" data-pose={v.t.pose}
             data-give={v.t.give && v.from ? (heard(v.t.give.at) ? "to" : "from") : undefined}
             src={thingSrc(v.t.src)} style={handStyle(v)} />
      ))}
      {posedSpots.filter((v) => !v.at && v.from && v.t.give).map((v, k) => (
        <img key={`give-from-${k}`} className="scene-obj scene-thing" alt="" data-pose="hand" data-give="from"
             src={thingSrc(v.t.src)} style={{ ...v.from!.style, opacity: heard(v.t.give!.at) ? 0 : 1, transition: "opacity .45s ease" }} />
      ))}
      {thingSpots.filter((t) => !behindPeople(t)).map(renderThing)}
      {spr
        // 캔버스는 렌더 칸 크기 그대로 — 384 로 줄여 그린 뒤 화면에서 2~3배로 키워 선이 뭉개지고 계단처럼 보였다 (11/9 사용자 「렌더링이 깨지고 울퉁불퉁」)
        ? <canvas ref={canvas} width={spr.cell} height={spr.cell} data-hero-x={heroX.toFixed(3)} className={`scene-hero ${hero.fallen ? "fallen" : ""} ${heroMove}`}
                  style={{ ...heroStyle, ["--flip" as string]: flipped ? -1 : 1, ...gestureVars, transition: heroTransition, opacity: heroGone ? 0 : 1 }} />
        : still
          ? <img className={`scene-hero ${hero.fallen ? "fallen" : ""} ${hero.move !== "none" && phase === 1 && play ? "stepping" : ""} ${heroMove}`}
                 src={still} alt="" style={{ ...heroStyle, ["--flip" as string]: flipped ? -1 : 1, ...gestureVars, transition: heroTransition, opacity: heroGone ? 0 : 1 }}
                 onLoad={(e) => setStillAr(e.currentTarget.naturalWidth / Math.max(1, e.currentTarget.naturalHeight))} />
          : null}
      {weather && weather !== "rainbow" && (
        <div className={`scene-weather w-${weather}`}>
          {weather === "wind" && LEAVES.map(([top, delay, color], k) => (
            <span key={k} className="scene-leaf" style={{ top: `${top}%`, animationDelay: `${delay}s`, background: color }} />
          ))}
        </div>
      )}
      {/* 장면이 환해짐: 위에서 따뜻한 빛이 번진다 (화면 섞기 — 그림 위에 흰 막을 덮지 않는다) */}
      {(fx.bright >= 0 || plan.env.glow) && <div className={`scene-bright ${brightOn || plan.env.glow ? "on" : ""} ${glowAt ? "spot" : ""}`}
        style={glowAt ? { ["--gx" as string]: `${(glowAt.x * 100).toFixed(1)}%`, ["--gy" as string]: `${(glowAt.y * 100).toFixed(1)}%` } : undefined} />}
      {blinkScene && <div key={`blink-${blinkScene.at}`} className={`scene-flicker ${blinkScene.spot ? "spot" : ""}`}
        style={blinkScene.spot ? { ["--gx" as string]: `${(blinkScene.spot.x * 100).toFixed(1)}%`, ["--gy" as string]: `${(blinkScene.spot.y * 100).toFixed(1)}%` } : undefined} />}
      {fx.drip >= 0 && heard(fx.drip) && (
        <div className="scene-drip">{DRIPS.map(([x, d, h], k) => <i key={k} style={{ left: `${x}%`, animationDelay: `${d}s`, ["--fall" as string]: `${h}%` }} />)}</div>
      )}
      {/* 눈물: 우는 사람 눈 아래로 방울이 두 줄 떨어진다 */}
      {crying.map((c) => (
        <div key={c.key} className="scene-tears"
             style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, height: `${c.size * 100}%`, width: `${Math.max(c.gap * 2, (c.size * 0.4) / aspect) * 100}%`,
               ...(c.follow ? withHero : {}) }}>
          <i /><i />
        </div>
      ))}
      {joyful.map((jy) => (
        <div key={jy.key} className={`scene-joy j-${jy.kind}`}
             style={{ left: `${jy.x * 100}%`, top: `${jy.y * 100}%`, height: `${jy.size * 0.62 * 100}%`, width: `${((jy.size * 0.9) / aspect) * 100}%`,
               ...(jy.follow ? withHero : {}) }}>
          {JOY_RING.map(([x, y, delay, sz], k) => (
            <svg key={k} viewBox="0 0 24 24" style={{ left: `${x}%`, top: `${y}%`, height: `${sz}%`, animationDelay: `${delay}s` }}>
              <path d={JOY_PATH[jy.kind]} />
            </svg>
          ))}
        </div>
      ))}
      {marks.map((mk) => (
        <div key={mk.key} className={`scene-mark k-${mk.kind}`}
             style={{ left: `${mk.x * 100}%`, top: `${mk.y * 100}%`, height: `${mk.h * 100}%`, width: `${mk.wd * 100}%`, ...(mk.follow ? withHero : {}) }}>
          {MARK_BITS[mk.kind]}
        </div>
      ))}
      {/* 주인공 머리에 쓴 것은 주인공 위에 */}
      {posedSpots.filter((v) => v.at?.top).map((v, k) => (
        <img key={`posed-top-${k}`} className="scene-obj scene-thing" alt="" data-pose={v.t.pose}
             src={thingSrc(v.t.src)} style={handStyle(v)} />
      ))}
      {front.map((p) => (
        <img key={p.src} className="scene-obj scene-cover" src={`${sceneBase(p.src!.split("/")[0])}${p.src!.split("/")[1]}`} alt=""
             style={spotStyle({ src: p.src!, x: 0.52, foot: 0.96, h: p.h ?? 0.36 })} />
      ))}
    </div>
  );
}

/** 물에 뜨는 소품의 발끝 높이 — 바다 물결 띠(배경판에서 잰 55~60%). 물이 뚜렷한 배경만 */
const WATER: Record<string, number> = { sea: 0.6 };
/** 물고기가 헤엄치는 물 높이 (발끝, 화면 높이 대비) — 개울 · 호수 · 바다 배경판의 물결 띠 */
const FISH_LINE: Record<string, number> = { "forest-stream": 0.67, "cave-lake": 0.6, sea: 0.6, "sea-pier": 0.6 };
/** 기쁨 연출 조각 [가로 자리 %, 늦게 시작(초), 칸 폭 대비 크기] — 머리 위에서 엇갈려 피어오른다 */
const JOY_RING: [number, number, number, number][] = (() => {
  // 머리 둘레 [가로 %, 세로 %, 늦게 시작(초), 칸 높이 대비 크기 %] — 위쪽 반원 열두 개 + 머리 위 안쪽 셋.
  // 왼쪽 아래부터 시계 방향으로 차례로 피어난다
  const ring = Array.from({ length: 12 }, (_, k): [number, number, number, number] => {
    const a = ((200 - k * (220 / 11)) * Math.PI) / 180;
    return [50 + 47 * Math.cos(a), 52 - 50 * Math.sin(a), k * 0.12, [22, 30, 18][k % 3]];
  });
  return [...ring, [36, 14, 0.5, 16], [64, 10, 0.8, 20], [50, -6, 1.1, 24]];
})();
const JOY_PATH: Record<"heart" | "star" | "flower", string> = {
  heart: "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.2 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.1-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z",
  star: "M12 1.5l2.9 7.1 7.6.6-5.8 5 1.8 7.4L12 17.6l-6.5 4 1.8-7.4-5.8-5 7.6-.6z",
  flower: "M12 9.2a3.3 3.3 0 1 1 0-6.4 3.3 3.3 0 0 1 0 6.4zm0 12a3.3 3.3 0 1 1 0-6.4 3.3 3.3 0 0 1 0 6.4zM6 15.2a3.3 3.3 0 1 1 0-6.4 3.3 3.3 0 0 1 0 6.4zm12 0a3.3 3.3 0 1 1 0-6.4 3.3 3.3 0 0 1 0 6.4zM12 14.6a2.6 2.6 0 1 1 0-5.2 2.6 2.6 0 0 1 0 5.2z",
};
/** 나는 말 — 새 주인공을 띄운다 */
/** 떨어지는 물방울 [가로 %, 늦게 시작(초), 떨어지는 깊이 %] */
const DRIPS: [number, number, number][] = [[18, 0, 72], [34, 0.9, 64], [52, 0.4, 70], [66, 1.5, 60], [81, 0.7, 74], [9, 1.9, 58], [92, 1.2, 66]];
/** 기호 연출 조각 — 모양은 CSS(.scene-mark.k-*)가 그린다 */
const SPARK = "M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z";
const MARK_BITS: Record<MarkKind, JSX.Element> = {
  surprise: <b>!</b>,
  question: <b>?</b>,
  zzz: <><b>Z</b><b>z</b><b>z</b></>,
  note: <><b>♪</b><b>♫</b><b>♪</b></>,
  anger: <svg viewBox="0 0 24 24"><path d="M9 2v5.5Q9 9 7.5 9H2M15 2v5.5Q15 9 16.5 9H22M9 22v-5.5Q9 15 7.5 15H2M15 22v-5.5Q15 15 16.5 15H22" /></svg>,
  sweat: <i />,
  bubble: <><i /><i /><i /><i /><i /><i /></>,
  splash: <><i /><i /><i /><i /><i /><i /></>,
  dust: <><i /><i /><i /><i /><i /></>,
  steam: <svg viewBox="0 0 30 30"><path d="M8 28c-4-5 4-7 0-12s4-7 0-12" /><path d="M15 28c-4-5 4-7 0-12s4-7 0-12" /><path d="M22 28c-4-5 4-7 0-12s4-7 0-12" /></svg>,
  sparkle: <>{[0, 1, 2, 3, 4, 5].map((k) => <svg key={k} viewBox="0 0 24 24"><path d={SPARK} /></svg>)}</>,
};
/** 쪽에 들어올 때 한 번만 하는 움직임 — 끝 모습(떠나는 쪽 · 뒤로 넘긴 쪽)에서는 하지 않는다 */
const ONCE = new Set(["roll", "pop", "spin", "grow", "shrink", "shake"]);
/** 옆으로 쥐는 소품 (손잡이를 손에) — 나머지는 윗부분을 쥐고 매단다 */
const SIDE_GRIP = new Set(["props/flashlight.webp"]);
/** 그림 이름으로 본 물건 종류 — 꽃밭 그림이 둘(flowers · flowerbed)이라 하나로 */
const kindOf = (src: string) => {
  const name = src.split("/").pop()?.replace(/\.webp$/, "") ?? src;
  return SAME_KIND[name] ?? name;
};
/** 바깥 하늘 · 공중에 있는 것 — 실내면 창 안에만 놓는다 (창 없는 방이면 안 놓음). 거실 공중에 나비가 날았다 (11/9 배치 검사).
 *  박쥐는 동굴(실내)에 사니 빼고 */
const TO_WINDOW = new Set(["props/shootingstar.webp", "props/planet.webp", "props/earth.webp",
  "props/butterfly.webp", "props/bird.webp", "props/seagull.webp", "props/balloons.webp"]);
/** 이름이 달라도 같은 물건 — 바다 배경에 모래성(castle) · 바위(rock)가 있는데 쪽 글의 「모래성」 · 「바위」로 하나 더 섰다 (11/9 배치 검사) */
// 화살표 그림은 표지판, 벤치는 의자, 장난감 상자는 상자, 북은 북들 (저장 이야기 점검 11/10 — 배경에 있는데 또 놓였다)
// 돌 하나(pebble)도 돌 무더기와 같은 종류: 동굴 · 시냇가처럼 배경에 돌이 있으면 또 놓지 않는다 (11/10)
const SAME_KIND: Record<string, string> = { flowerbed: "flowers", sandcastle: "castle", rock: "rocks", arrow: "sign", bench: "chair", toybox: "box", drum: "drums", pebble: "rocks" };
/** 바람 쪽에 날아가는 잎 [높이 %, 늦게 시작(초), 색] */
const LEAVES: [number, number, string][] = [[20, 0, "#E8A33C"], [46, 1.1, "#8DBA5A"], [34, 2.2, "#D9663B"], [60, 3.3, "#B9C94A"],
  [28, 4.4, "#E2B04A"], [54, 5.5, "#7FAE4E"]];
const STARS: [number, number, number][] = [[14, 14, 2.2], [30, 30, 1.6], [82, 18, 2.2], [92, 44, 1.5], [48, 8, 1.7], [64, 34, 1.4]];
