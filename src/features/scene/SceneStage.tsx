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
import type { Env, PagePlan, PropId } from "./plan";
import { SAD_TEXT, hasSkyBodies, isIndoor, isPerson, sceneFx } from "./plan";
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
  /** 주인공 형태 (forms/*.json id). 4족형이면 든 소품을 입에 물고 · 등에 태운다 (pt_docs 20 2-a) */
  form?: string;
}

/** 몸길이 기준일 때 몸길이 = 장소 주인공 키(hero.h)의 이만큼. 키는 이 배를 넘지 않는다 (옆으로 긴 그림이 너무 커지지 않게) */
const WIDE_LEN = 1.25, WIDE_MAX_H = 0.85;

export default function SceneStage({ plan, prevEnv, sprite: spriteRight, spriteLeft, still, mode, heroHands, heroBody, fit = "height", facing = 0, lift: formLift = 0, size = 1, form, narration, envAt, text = "", pageAction = "" }: Props) {
  // 새(날개형)는 나는 쪽에서만 띄운다 — 늘 화면 높이 4할 위에 떠 있어 「옆에서 지켜봤어요」에도 공중에 있었고
  // 땅에 선 인물들과 높이가 맞지 않았다 (11/10). 헤엄치는 친구(지느러미형)는 그대로 뜬다
  const lift = form === "winged" && !FLY_TEXT.test(text) ? 0 : formLift;
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
  const [hidden, setHidden] = useState(false);
  // 정면 그림(사람형) 주인공이 옮겨 가는 동안 가는 쪽으로 기울인다 (11/9 사용자 — 정면 제자리 걸음으로 옆으로 미끄러져 어색)
  const [leaning, setLeaning] = useState(false);
  // 걸어 들어오는 인물이 제자리에 다 온 쪽 (눈물 · 연출은 그 뒤에). 쪽(plan)으로 기억한다 — 참/거짓 하나면 쪽이 바뀐 첫 그림에
  // 앞 쪽 값이 남아 눈물이 한 번 보였다 사라졌다 (11/10 「눈물 한 방울 떨어지고 사람 등장하고 또 떨어져」)
  const [arrivedFor, setArrivedFor] = useState<PagePlan | null>(null);
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
    const a = window.setTimeout(() => setArrivedFor(plan), REDUCE ? 0 : ENTER_MS);
    return () => clearTimeout(a);
  }, [plan, play, phase]);
  const arrived = mode === "end" || arrivedFor === plan;

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
  const night = env.night;
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
  const heroTo = inside(plan.hero.to);
  let heroFrom = inside(plan.hero.from);
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
  const heroTransition = REDUCE || !play ? "none" : `left ${timing.ms}ms linear, opacity ${heroGone ? 1 : 0}s ease, filter 2.6s ease, rotate .35s ease`;
  if (leaning && facing === 0 && hero.move !== "none" && phase === 1) {
    heroStyle = { ...heroStyle, rotate: `${Math.sign(hero.to - hero.from) * (hero.move === "run" ? 7 : 4)}deg`, transformOrigin: "0 100%" };
  }

  const prop = (id: PropId): Spot | undefined => layout.props[id]
    ?? (PEOPLE[id] ? { src: `../props/${id}.webp`, x: 0.78, foot: PEOPLE[id].foot ?? 0.93, h: PEOPLE[id].h } : undefined);
  // 옆에 서는 것들(인물 · 표지판)의 자리: 주인공과 서로를 피해, 칸 안에서. 원하는 쪽이 꽉 차면 반대쪽으로
  const placed: [number, number][] = [[hero.to - heroHalf, hero.to + heroHalf]];
  const free = (a: number, b: number) => placed.every(([l, r]) => b <= l || a >= r);
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
    const at = tries.find((c) => c >= lo && c <= hi && side(c) && free(c - half - gap, c + half + gap))
      ?? tries.find((c) => c >= lo && c <= hi && side(c) && free(c - half * 0.7, c + half * 0.7));
    if (at !== undefined) { placed.push([at - half, at + half]); return { x: at, back: false }; }
    // 표지판은 틈이 없어도 가는 쪽 끝에 (좁은 화면 · 팔 넓은 그림에서 손끝과 조금 닿는 정도) — 반대편 뒤로 가지 않게
    // 들어온 사람은 그쪽 끝 조금 뒤에 (작아져 주인공과 겹쳐도 앞뒤로 읽힌다)
    if (sameSide) { const ex = right ? hi : lo; placed.push([ex - half, ex + half]); return { x: ex, back: !!enterFrom }; }
    // 남는 공간이 많은 쪽 끝 — 뒤에 서서 작아지니 겹쳐도 앞뒤로 읽힌다
    const leftRoom = Math.min(...placed.map(([l]) => l)), rightRoom = 1 - Math.max(...placed.map(([, r]) => r));
    const bx = rightRoom >= leftRoom ? hi - 0.02 : lo + 0.02;
    return { x: bx, back: true };
  };
  const behind = plan.props.filter((p) => isPerson(p.id) || p.id === "sign");
  // 인물 자리는 미리 잡는다 — 대본에서 그 사람이 든 · 쓴 소품을 손 · 머리에 놓으려면 자리를 알아야 한다 (11/4)
  // 다가가는 인물(hero.goal)은 주인공이 가는 쪽 바로 앞에 — 남는 자리에 서면 그 사람 반대쪽으로 달려갔다 (11/5)
  const travel = Math.sign(hero.to - hero.from);
  // 쪽마다 같은 쪽에서 걸어 들어오는 사람 수 (둘 이상이면 끝부터 붙여 세운다)
  const entering = { left: behind.filter((p) => p.enter === "left").length, right: behind.filter((p) => p.enter === "right").length };
  const people = behind.map((p) => {
    const base0 = prop(p.id);
    if (!base0) return null;
    const wRatio = p.id === "sign" ? 0.6 : PEOPLE[p.id]?.w ?? 0.45;
    const ahead = hero.goal === p.id && hero.move !== "none" && travel !== 0
      ? hero.to + travel * (heroHalf + (base0.h * wRatio / aspect) / 2 + 0.015) : undefined;
    const s = ahead !== undefined && ahead > 0.05 && ahead < 0.95 ? { ...base0, x: ahead }
      : p.x !== undefined ? { ...base0, x: p.x } : base0;
    // 주인공이 다가가는 사람은 주인공이 가는 쪽에서 들어온다 — 왼쪽에서 들어와 왼쪽에 서면 주인공이 그 사람에게서 멀어지는
    // 쪽으로 달려갔다 (11/9 「어른에게 달려갔어요」)
    const enter: "left" | "right" | undefined = p.enter && ahead !== undefined ? (travel > 0 ? "right" : "left") : p.enter;
    const spot = personX(s.x, s.h, wRatio, p.id === "sign", enter, !!enter && entering[enter] > 1);
    const sb = spot.back ? { ...s, h: s.h * 0.8, foot: (s.foot ?? 0.93) - 0.07 } : s;
    return { p: enter === p.enter ? p : { ...p, enter }, s, spot, sb };
  });
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
  const upright = fit === "height" && size === 1 && !lift;
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
  // 실내에서 하늘에만 있는 것(별똥별 · 행성 · 지구)은 창 안에 — 우주선 방 안 공중에 별똥별이 떠서 창 속 지구를 가렸다 (11/9 배치 검사)
  const things = (plan.things ?? []).map((t) => (indoor && !t.pose && TO_WINDOW.has(t.src) ? { ...t, pose: "window" as const } : t));
  const posedSpots = things.filter((t) => !bgKinds.has(kindOf(t.src))).map((t) => ({ t, at: t.pose ? posed(t) : null }))
    .filter((v) => v.t.pose !== "window" || v.at);   // 창밖 소품은 창이 없으면 방 안에 놓지 않는다
  // 배경 물건(땅에 선 것)이 차지한 가로 범위, 큰 소품은 먼저 이것을 피해 본다 (11/9 소품 키를 실제 크기로 키우자 대문이 집 앞을,
  // 깃발 · 우체통이 벤치 · 가판대 앞을 가렸다). 배경 그림 주소는 장소 폴더 기준이라 props-ar.json 열쇠로 바꾼다
  const bgSpans: [number, number][] = layout.objects.filter((o) => o.foot !== undefined).map((o) => {
    const key = o.src.startsWith("../") ? o.src.slice(3) : `${plan.location}/${o.src}`;
    const half = (o.h * arOf(key, 1) / aspect) / 2;
    return [o.x - half, o.x + half];
  });
  const thingSpots = posedSpots.filter((v) => !v.at).map((v) => v.t).map((t, k) => {
    const air = t.spot === "air";
    const list = air ? airPlaced : placed;
    // 큰 땅 소품은 배경 물건과 겹치지 않는 자리를 먼저(원래 크기 · 0.75 배까지), 없으면 겹쳐도. 사람 · 소품끼리는 늘 피한다.
    // 넓은 물건(시소 · 다리 · 텐트 · 바위)은 자리가 없으면 조금 작게라도 놓는다 — 전에는 통째로 빠졌다(좁은 화면에서 11%)
    const tryList: [boolean, number][] = air ? [[false, 1]]
      : t.h >= 0.28 ? [[true, 1], [true, 0.75], [false, 1], [false, 0.75], [false, 0.55]] : [[false, 1], [false, 0.75], [false, 0.55]];
    for (const [avoidBg, scale] of tryList) {
      const open = (a: number, b: number) => list.every(([l, r]) => b <= l || a >= r) && (!avoidBg || bgSpans.every(([l, r]) => b <= l || a >= r));
      const h = t.h * scale, half = (h * t.ar / aspect) / 2;
      const lo = half + 0.01, hi = 1 - half - 0.01, gap = 0.012;
      const tries: number[] = [];
      for (let d = 0; d <= 40; d++) {
        const off = (air ? 0 : heroHalf) + half + gap + d * 0.02;
        if (k % 2 === 0) tries.push(hero.to - off, hero.to + off); else tries.push(hero.to + off, hero.to - off);
      }
      const x = tries.find((c) => c >= lo && c <= hi && open(c - half - gap, c + half + gap));
      if (x === undefined) continue;
      list.push([x - half, x + half]);
      return { ...t, h, x };
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
  const brightOn = fx.bright >= 0 && heard(fx.bright);
  // 누가 우나: 그 문장에 「나」가 있으면 주인공, 이름이 나온 인물이면 그 사람, 아니면 옆 인물(「친구가 울고 있었어요」), 없으면 주인공
  const visiblePeople = people.filter((v): v is NonNullable<typeof v> => !!v && v.p.id !== "sign");
  // 문장의 주인 (눈물 · 기쁨이 누구에게 나나): 「나」가 있으면 주인공, 이름이 나온 인물이면 그 사람, 「친구 · 아이 …」면 옆 인물.
  // 고마워(heart)는 도움을 받은 쪽이 하는 말이라 「나」가 없고 옆에 인물이 있으면 그 사람. 없으면 주인공
  // scale: 연출 크기 기준 (화면 높이 대비). 사람은 키, 옆으로 긴 그림(뱀 · 물고기 · 새 · 4족)은 키가 작아 눈물 · 별이 점처럼
  // 작았다 (11/10 형태별 점검) — 몸길이의 절반과 키 중 큰 쪽, 화면 높이 2할 아래로는 줄이지 않는다
  type Who = { key: string; x: number; face: number; head: number; top: number; h: number; scale: number; side: boolean; follow: boolean; enter: boolean };
  const whoOf = (sentence: string, thanks = false): Who | null => {
    const me = /(?:^|[^가-힣])(?:나는|내가|나도|나를|내 눈|내 마음)/.test(sentence);
    const named = visiblePeople.find((v) => v.p.name && sentence.includes(v.p.name));
    const other = !me && (named ?? (/친구|아이|동생|언니|오빠|형|누나|아기/.test(sentence) || thanks ? visiblePeople[0] : undefined));
    if (other) {
      const h = other.sb.h, foot = other.sb.foot ?? 0.93;
      return { key: `p-${other.p.id}`, x: other.spot.x, face: foot - h * 0.8, head: foot - h, top: foot - h, h, scale: h, side: false, follow: false, enter: !!other.p.enter };
    }
    if (heroGone || !drawn.h) return null;
    const hd = heroBody ? bodyAt(heroBody.head) : null;
    const side = facing !== 0 && !upright;
    const x = hd ? hd.x + (side ? headSide * drawn.w * 0.04 : 0) : heroX + (side ? headSide * drawn.w * 0.33 : 0);
    const face = hd ? hd.y + drawn.h * 0.14 : topY + drawn.h * (side ? 0.26 : 0.16);
    const scale = Math.max(drawn.h, drawn.w * aspect * 0.5, 0.2);
    // top: 그림 맨 윗선 — 옆모습의 머리 자리(hd)는 주둥이 높이라 거기에 별 아치를 걸면 얼굴을 덮었다
    return { key: "hero", x, face, head: hd ? hd.y : topY, top: topY, h: drawn.h, scale, side, follow: true, enter: false };
  };
  // 걸어 들어오는 사람은 제자리에 다 온 뒤에 운다 · 기뻐한다 — 전에는 화면 밖에서 오는 중인데 설 자리에 눈물부터 떨어졌다 (11/10)
  const ready = (w: Who | null): w is Who => !!w && (!w.enter || arrived);
  // 그친 자리: 같은 사람이 그 뒤에 눈물을 닦거나 기뻐하면 눈물이 멈춘다 (전에는 쪽 끝까지 계속 떨어졌다)
  const stopsAt = [...fx.calms.map((c) => ({ at: c.at, who: whoOf(c.sentence) })),
    ...fx.joys.map((jy) => ({ at: jy.at, who: whoOf(jy.sentence, jy.kind === "heart") }))].filter((c) => heard(c.at));
  const crying = fx.tears.filter((t) => heard(t.at)).map((t) => {
    const w = whoOf(t.sentence);
    if (!ready(w)) return null;
    if (stopsAt.some((c) => c.at > t.at && c.who?.key === w.key)) return null;
    return { key: w.key, x: w.x, y: w.face, size: Math.max(w.scale * (w.side ? 0.085 : 0.06), 0.028), gap: w.side ? 0 : (w.scale * (w.follow ? 0.04 : 0.032)) / aspect, follow: w.follow };
  }).filter((v, k, all): v is NonNullable<typeof v> => !!v && all.findIndex((w) => w?.key === v.key) === k);
  // 기쁨 · 고마움: 그 사람 머리 위로 하트 · 별 · 꽃이 피어오른다 (나레이션이 그 말에 오면 한 번)
  const joyful = fx.joys.filter((jy) => play && heard(jy.at)).map((jy, k) => {
    const w = whoOf(jy.sentence, jy.kind === "heart");
    if (!ready(w)) return null;
    // 머리 둘레를 감싼다 — 칸 가운데가 얼굴 높이, 칸 크기는 그 사람 키 기준 (11/10 「별이 머리 주변에 가득 있어야」)
    // 옆모습(새 · 4족 …)은 머리가 그림 끝에 작게 있어 몸 키 기준이면 별이 얼굴 · 눈을 덮었다 — 작게 · 머리 위쪽으로 (11/10)
    // 옆모습은 머리가 그림 끝에 작게 있다 — 머리보다 조금 위에 걸어 얼굴을 덮지 않게
    const size = w.side ? w.scale * 0.75 : w.h;
    return { key: `${w.key}-${k}`, who: w.key, x: w.x, y: w.side ? w.top : (w.head + w.face) / 2, size, kind: jy.kind, follow: w.follow };
  }).filter((v): v is NonNullable<typeof v> => !!v);
  // 빙글 돌기: 주인공 그림을 좌우로 뒤집었다 돌아오기를 세 번 (2D 그림이라 도는 것처럼). 그 말 앞에 다른 사람(이름 · 친구)이
  // 있거나 그 말로 도는 소품(바람개비 …)이 있으면 주인공은 돌지 않는다. 나레이션이 그 말에 오면 한 번
  const otherSpins = (before: string) => visiblePeople.some((v) => v.p.name && before.includes(v.p.name))
    || /친구(?:가|는|도|랑)|아이(?:가|는)|동생(?:이|은)|언니(?:가|는)|오빠(?:가|는)|형(?:이|은)|누나(?:가|는)|아기(?:가|는)/.test(before);
  const canMove = play && !REDUCE && !hero.fallen && !heroGone;
  const spinAt = canMove && !(plan.things ?? []).some((t) => t.motion === "spin")
    ? Math.max(-1, ...fx.spins.filter((sp) => heard(sp.at) && !otherSpins(sp.before)).map((sp) => sp.at)) : -1;
  // 몸짓 (11/10): 꾸벅 · 끄덕 · 떨기 · 웅크리기, 빙글처럼 그림을 통째로 움직여 날개형 · 물고기도 된다. 다른 사람이 하는 말이면 넘어가고,
  // 나레이션이 그 말에 오면 한 번. 빙글 · 몸짓이 한 쪽에 여럿이면 가장 나중에 들린 것 하나 (애니메이션이 하나라 겹치면 서로 지운다)
  const gesture = canMove ? fx.gestures.filter((g) => heard(g.at) && !otherSpins(g.before)).pop() : undefined;
  const heroSpin = spinAt >= 0 && !(gesture && gesture.at > spinAt);
  const heroMove = heroSpin ? "spin" : gesture ? `g-${gesture.kind}` : "";
  // 등장인물도 기쁘거나(별 · 꽃 · 하트) 그 사람이 도는 말이면 좌우로 뒤집었다 돌아온다 (11/10 「손 인사 말고도 기쁜 상황에서 뒤집기」).
  // 손 인사 그림띠를 보이는 중이면 그때 멈춘 그림으로 바꿔 돈다
  const personSpin = new Set<string>(REDUCE || !play ? [] : [
    ...joyful.filter((jy) => jy.who.startsWith("p-")).map((jy) => jy.who),
    ...fx.spins.filter((sp) => heard(sp.at) && otherSpins(sp.before)).map((sp) => {
      const v = visiblePeople.find((q) => q.p.name && sp.before.includes(q.p.name)) ?? visiblePeople[0];
      return v && (!v.p.enter || arrived) ? `p-${v.p.id}` : "";
    }).filter(Boolean),
  ]);
  // 슬프거나 걱정하는 쪽 — 인물이 손을 흔들거나 만세하지 않는다
  const sadPage = SAD_TEXT.test(text);

  return (
    <div className={`scene ${night ? "night" : ""} ${plan.location.startsWith("space") ? "starry" : ""} ${weather === "rain" ? "gloomy" : ""} ${weather === "storm" ? "stormy" : ""}`} aria-hidden ref={root}>
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
      {people.map((v, k) => {
        if (!v) return null;
        const { p, s, spot, sb } = v;
        // 걸어 들어오는 인물: 처음엔 화면 밖, 끝 모습에서 제자리
        const x = phase === 0 && p.enter ? (p.enter === "left" ? -0.14 : 1.14) : spot.x;
        const move: CSSProperties = { transition: REDUCE || !play ? "none" : `left ${ENTER_MS}ms cubic-bezier(.3,.15,.45,1), filter 2.6s ease` };
        // 가만히 있는 동안 숨쉬기 · 깡충 (11/9 「등장인물이 다 가만히 있다」) — 사람마다 박자를 엇갈려 같이 들썩이지 않게
        // 슬프거나 걱정하는 쪽에서는 이름이 나와도 손을 흔들지 않는다 (우는 친구가 손을 흔들며 웃었다, 11/10)
        const talks = !!p.name && play && text.includes(p.name) && !sadPage;
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
        const pick: [keyof PersonMoves, number] | null = !moves || spinning ? null
          : p.enter && moves.walk ? (ready("walk", true) ? ["walk", ENTER_MS] : null)
          // 그림띠를 다 받기 전에 바꿔 끼우면 멈춘 그림은 숨고 그림띠는 비어 있어 깜빡였다 — 받은 뒤에만 (11/9)
          : CHEER_ACTIONS.has(pageAction) && !sadPage && moves.hooray && ready("hooray") ? ["hooray", moves.hooray.sec * 2000]
          // 만세 그림띠는 몸통이 불룩해져 뺐다(11/9). 기쁜 쪽도 손 흔들기로. 인사는 손을 든 채 쪽이 바뀔 때까지 흔든다
          // (사용자 「손 들고 계속 흔드는 거 무한 유지」, loop_from)
          : (talks || (CHEER_ACTIONS.has(pageAction) && !sadPage)) && moves.wave && ready("wave") ? ["wave", moves.wave.loop_from != null ? Infinity : moves.wave.sec * 1000]
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
                   ...(walking ? { ["--lean" as string]: p.enter === "left" ? "5deg" : "-5deg" } : {}) }}>
              <img src={stripUrl(p.id, name)} alt=""
                   style={{ width: `${m.frames * 100}%`, ...run }} />
            </div>,
            <img key={`${p.id}-${p.name ?? k}`} className={`scene-obj scene-person after-strip ${idle === "p-talk" ? "p-breathe" : idle}`}
                 src={base + s.src} alt="" style={{ ...spotStyle({ ...sb, x }), ...move, ...vars }} />,
          ];
        }
        return (
          <img key={`${p.id}-${p.name ?? k}`}
               className={`scene-obj scene-person ${spinning ? "p-spin" : phase === 0 || !p.enter ? idle : "walking-in"}`}
               src={base + s.src} alt="" style={{ ...spotStyle({ ...sb, x }), ...move, ...(phase === 0 || !p.enter ? (idle === "p-talk" ? { animationDelay: `${0.5 + k * 0.3}s, ${1.8 + k * 0.45}s` } : beat) : {}) }} />
        );
      })}
      {posedSpots.filter((v) => v.at && !v.at.top).map(({ t, at }, k) => (
        <img key={`posed-${k}-${t.src.slice(0, 40)}`} className={`scene-obj scene-thing ${at!.cls}`} alt="" data-pose={t.pose}
             src={thingSrc(t.src)} style={at!.style} />
      ))}
      {thingSpots.map((t, k) => (
        <img key={`thing-${k}-${t.src.slice(0, 40)}`} data-spot={t.spot ?? "ground"}
             className={`scene-obj scene-thing ${t.pose === "fall" && play ? "m-drop" : ""} ${t.motion && (!ONCE.has(t.motion) || play) ? `m-${t.motion}` : ""}`}
             alt={t.name ? `내가 그린 ${t.name}` : ""}
             src={thingSrc(t.src)}
             style={{ ...spotStyle(t.spot === "wall" ? { src: t.src, x: t.x, top: 0.16, h: t.h }
               : { src: t.src, x: t.x, foot: t.spot === "air" ? 0.3 : 0.95, h: t.h }),
               // 공은 주인공 반대쪽으로 굴러간다 (주인공과 부딪치지 않게)
               ["--roll" as string]: t.x < hero.to ? -1 : 1 }} />
      ))}
      {spr
        // 캔버스는 렌더 칸 크기 그대로 — 384 로 줄여 그린 뒤 화면에서 2~3배로 키워 선이 뭉개지고 계단처럼 보였다 (11/9 사용자 「렌더링이 깨지고 울퉁불퉁」)
        ? <canvas ref={canvas} width={spr.cell} height={spr.cell} data-hero-x={heroX.toFixed(3)} className={`scene-hero ${hero.fallen ? "fallen" : ""} ${heroMove}`}
                  style={{ ...heroStyle, ["--flip" as string]: flipped ? -1 : 1, ["--lean" as string]: `${facing !== 0 ? headSide * 9 : 0}deg`, transition: heroTransition, opacity: heroGone ? 0 : 1 }} />
        : still
          ? <img className={`scene-hero ${hero.fallen ? "fallen" : ""} ${hero.move !== "none" && phase === 1 && play ? "stepping" : ""} ${heroMove}`}
                 src={still} alt="" style={{ ...heroStyle, ["--flip" as string]: flipped ? -1 : 1, ["--lean" as string]: `${facing !== 0 ? headSide * 9 : 0}deg`, transition: heroTransition, opacity: heroGone ? 0 : 1 }}
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
      {fx.bright >= 0 && <div className={`scene-bright ${brightOn ? "on" : ""}`} />}
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
      {/* 주인공 머리에 쓴 것은 주인공 위에 */}
      {posedSpots.filter((v) => v.at?.top).map(({ t, at }, k) => (
        <img key={`posed-top-${k}`} className="scene-obj scene-thing" alt="" data-pose={t.pose}
             src={thingSrc(t.src)} style={at!.style} />
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
const FLY_TEXT = /날아|날았|날고|날며|날면서|날개를 (?:활짝 )?(?:펴|펼|펄럭|파닥)|훨훨|하늘(?:로|을|에서|높이)|높이 (?:올라|떠)|파닥파닥 (?:날|올)/;
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
const SAME_KIND: Record<string, string> = { flowerbed: "flowers", sandcastle: "castle", rock: "rocks" };
/** 바람 쪽에 날아가는 잎 [높이 %, 늦게 시작(초), 색] */
const LEAVES: [number, number, string][] = [[20, 0, "#E8A33C"], [46, 1.1, "#8DBA5A"], [34, 2.2, "#D9663B"], [60, 3.3, "#B9C94A"],
  [28, 4.4, "#E2B04A"], [54, 5.5, "#7FAE4E"]];
const STARS: [number, number, number][] = [[14, 14, 2.2], [30, 30, 1.6], [82, 18, 2.2], [92, 44, 1.5], [48, 8, 1.7], [64, 34, 1.4]];
