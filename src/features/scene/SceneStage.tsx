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
import { hasSkyBodies, isIndoor, isPerson } from "./plan";
import { sceneBase } from "./locations";
import AR from "./props-ar.json";
import HANDS from "./hands.json";

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
  /** 배경을 잘라 낸 주인공 정지 그림 */
  still?: string | null;
  /** 정지 그림 안 주인공 손 위치 (서버 still_hands) — 대본에서 주인공이 든 소품을 손에 */
  heroHands?: { l: number[]; r: number[] } | null;
  mode: "play" | "start" | "end";
  /** 주인공 크기 기준 — 키(height, 사람) / 몸길이(width, 4족형처럼 옆으로 긴 몸). 형태 정의의 hero.fit (pt_docs 19) */
  fit?: "height" | "width";
  /** 주인공을 바닥선에서 띄우는 높이 (화면 높이 대비, 형태 정의 hero.float). 헤엄치는 친구 */
  lift?: number;
  /** 주인공 크기 배율 (형태 정의 hero.size). 통통한 물고기는 몸길이 기준이면 사람보다 훨씬 컸다 (11/5) */
  size?: number;
  /** 옆모습 그림의 머리 방향 (-1 왼쪽 · 1 오른쪽 · 0 모름/정면). 머리 반대쪽으로 옮겨 갈 때 좌우로 뒤집는다 */
  facing?: -1 | 0 | 1;
}

/** 몸길이 기준일 때 몸길이 = 장소 주인공 키(hero.h)의 이만큼. 키는 이 배를 넘지 않는다 (옆으로 긴 그림이 너무 커지지 않게) */
const WIDE_LEN = 1.25, WIDE_MAX_H = 0.85;

export default function SceneStage({ plan, prevEnv, sprite, still, mode, heroHands, fit = "height", facing = 0, lift = 0, size = 1 }: Props) {
  const play = mode === "play";
  const [layout, setLayout] = useState<Layout | null>(null);
  const [spr, setSpr] = useState<Sprite | null>(null);
  // 0 = 시작 모습, 1 = 끝 모습. play 가 아니면 처음부터 끝 모습
  const [phase, setPhase] = useState<0 | 1>(mode !== "end" && !REDUCE ? 0 : 1);
  const [hidden, setHidden] = useState(false);
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
  useEffect(() => {
    let live = true;
    setSpr(null);
    if (sprite?.url) loadSprite(sprite.url, sprite).then((s) => live && setSpr(s)).catch(() => {});
    return () => { live = false; };
  }, [sprite?.url]);  // eslint-disable-line react-hooks/exhaustive-deps

  // 들어오면 한 프레임 뒤에 끝 모습으로 — CSS transition 이 그 사이를 잇는다
  useLayoutEffect(() => {
    if (REDUCE || mode === "end") { setPhase(1); return; }
    if (mode === "start" || !layout) { setPhase(0); return; }
    setPhase(0);
    const t = window.setTimeout(() => setPhase(1), 60);
    return () => clearTimeout(t);
  }, [mode, layout, plan]);

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

  const timing = moveTiming(plan.hero.move, Math.abs(plan.hero.to - plan.hero.from), layout?.hero.h ?? 0.45, aspect);

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
  }, [spr, plan, play, timing.ms, timing.fps]);

  if (!layout) return <div className="scene" ref={root} />;

  const env = phase === 0 && prevEnv ? prevEnv : plan.env;
  const night = env.night;
  // 해 · 달: 밤이면 달이 높이, 해가 뜬 쪽이면 해가 높이. 앞 쪽에서 바뀌면 동→서 곡선
  const sunPos = env.sun ? SKY.sunHigh : prevEnv?.sun && !plan.env.sun ? SKY.west : SKY.east;
  const moonPos = night ? SKY.moonHigh : prevEnv?.night && !plan.env.night ? SKY.west : SKY.east;
  const skyMove = (rising: boolean) => (REDUCE ? "none"
    : `left 2.8s linear, top 2.8s ${rising ? "cubic-bezier(.15,.75,.35,1)" : "cubic-bezier(.65,0,.85,.3)"}`);

  const hero = plan.hero;
  const heroX = phase === 0 ? hero.from : hero.to;
  // 주인공 크기: 첫 장의 그림 키가 hero.h 가 되게 칸을 키우고, 발끝을 foot 에 맞춘다
  const H = layout.hero;
  let heroStyle: CSSProperties;
  // 프레임 칸 높이(화면 높이 대비). 칸은 정사각이라 그림 폭 w · 키 h(칸 대비)에 칸 높이를 곱하면 화면 높이 단위가 된다.
  // 키 기준이면 그림 키가 hero.h, 몸길이 기준이면 몸길이가 hero.h × WIDE_LEN (키는 hero.h × WIDE_MAX_H 까지)
  const scaleFor = (w: number, h: number) => size * (fit === "width"
    ? Math.min((H.h * WIDE_LEN) / Math.max(0.05, w), (H.h * WIDE_MAX_H) / Math.max(0.05, h))
    : H.h / Math.max(0.05, h));
  if (spr) {
    const [l, t, r, b] = spr.box;
    const cellH = scaleFor(r - l, b - t);               // 칸 높이 (화면 높이 대비)
    const cellW = cellH / aspect;                        // 칸 너비 (화면 너비 대비)
    heroStyle = {
      height: `${cellH * 100}%`, aspectRatio: "1",
      left: `${(heroX - ((l + r) / 2 - 0.5) * cellW) * 100}%`,
      bottom: `${((1 - H.foot) - (1 - b) * cellH + lift) * 100}%`,
    };
  } else {
    // 멈춘 그림: 몸길이 기준이면 가로세로 비율로 높이를 정한다 (비율을 모르면 키 기준)
    const stillH = size * (fit === "width" && stillAr ? Math.min((H.h * WIDE_LEN) / stillAr, H.h * WIDE_MAX_H) : H.h);
    heroStyle = { height: `${stillH * 100}%`, left: `${heroX * 100}%`, bottom: `${(1 - H.foot + lift) * 100}%` };
  }
  // 옆모습(4족형)은 렌더가 머리 쪽으로 걷는다 — 머리 반대쪽으로 옮겨 가면 뒤로 걷는 것처럼 보여 좌우로 뒤집는다
  // (11/4 사용자 「얼굴 방향에 따라 < 인지 > 인지」). 가운데 맞추기(translateX(-50%)) 뒤에 뒤집는다 — 개별 scale 속성은
  // transform 보다 먼저 적용돼 가운데 맞추기까지 뒤집혀 주인공이 제 폭만큼 오른쪽으로 밀렸다 (11/5, 장면 밖으로 나감)
  const goes = Math.sign(hero.to - hero.from);
  const flip = facing !== 0 && hero.move !== "none" && goes !== 0 && goes !== facing;
  if (flip) {
    heroStyle = { ...heroStyle, transform: hero.fallen
      ? "translateX(-50%) translateY(5%) rotate(-9deg) scaleX(-1)" : "translateX(-50%) scaleX(-1)" };
  }
  // 같은 빠르기로 (속도가 바뀌면 걸음과 어긋나 발이 미끄러진다)
  const heroTransition = REDUCE || !play ? "none" : `left ${timing.ms}ms linear, opacity ${heroGone ? 1 : 0}s ease, filter 2.6s ease`;

  const prop = (id: PropId): Spot | undefined => layout.props[id]
    ?? (PEOPLE[id] ? { src: `../props/${id}.webp`, x: 0.78, foot: PEOPLE[id].foot ?? 0.93, h: PEOPLE[id].h } : undefined);
  // 주인공 폭의 절반 (화면 너비 대비). 팔을 넓게 벌린 그림이면 옆 인물을 그만큼 바깥으로 민다 (겹치지 않게)
  const heroHalf = spr ? ((spr.box[2] - spr.box[0]) * scaleFor(spr.box[2] - spr.box[0], spr.box[3] - spr.box[1]) / aspect) / 2
    : stillAr ? ((fit === "width" ? Math.min(H.h * WIDE_LEN, H.h * WIDE_MAX_H * stillAr) : H.h * stillAr) / aspect) / 2 : 0.1;
  // 옆에 서는 것들(인물 · 표지판)의 자리: 주인공과 서로를 피해, 칸 안에서. 원하는 쪽이 꽉 차면 반대쪽으로
  const placed: [number, number][] = [[hero.to - heroHalf, hero.to + heroHalf]];
  const free = (a: number, b: number) => placed.every(([l, r]) => b <= l || a >= r);
  /** 자리 { x, back } — back 이면 설 자리가 없어 조금 뒤(작게 · 약간 위)에 선다. 그림책에서 뒤에 선 사람처럼 */
  const personX = (x: number, h: number, wRatio = 0.45, sameSide = false): { x: number; back: boolean } => {
    const half = (h * wRatio / aspect) / 2;   // 친구 · 어른 그림은 키의 4~5할 폭
    const gap = 0.015, lo = half + 0.01, hi = 1 - half - 0.01;
    const want = Math.min(hi, Math.max(lo, x));
    const right = want >= hero.to;
    const tries = [want];
    for (let k = 1; k <= 40; k++) tries.push(want + (right ? 1 : -1) * k * 0.02, want - (right ? 1 : -1) * k * 0.02);
    // 표지판은 주인공이 달려가는 쪽에만 — 반대쪽(지나온 길)으로 밀리면 표지판을 지나쳐 달려간 것처럼 보였다 (11/4)
    const side = (c: number) => !sameSide || (right ? c >= hero.to : c <= hero.to);
    const at = tries.find((c) => c >= lo && c <= hi && side(c) && free(c - half - gap, c + half + gap));
    if (at !== undefined) { placed.push([at - half, at + half]); return { x: at, back: false }; }
    // 표지판은 틈이 없어도 가는 쪽 끝에 (좁은 화면 · 팔 넓은 그림에서 손끝과 조금 닿는 정도) — 반대편 뒤로 가지 않게
    if (sameSide) { const ex = right ? hi : lo; placed.push([ex - half, ex + half]); return { x: ex, back: false }; }
    // 남는 공간이 많은 쪽 끝 — 뒤에 서서 작아지니 겹쳐도 앞뒤로 읽힌다
    const leftRoom = Math.min(...placed.map(([l]) => l)), rightRoom = 1 - Math.max(...placed.map(([, r]) => r));
    const bx = rightRoom >= leftRoom ? hi - 0.02 : lo + 0.02;
    return { x: bx, back: true };
  };
  const behind = plan.props.filter((p) => isPerson(p.id) || p.id === "sign");
  // 인물 자리는 미리 잡는다 — 대본에서 그 사람이 든 · 쓴 소품을 손 · 머리에 놓으려면 자리를 알아야 한다 (11/4)
  const people = behind.map((p) => {
    const base0 = prop(p.id);
    if (!base0) return null;
    const s = p.x !== undefined ? { ...base0, x: p.x } : base0;
    const spot = personX(s.x, s.h, p.id === "sign" ? 0.6 : PEOPLE[p.id]?.w ?? 0.45, p.id === "sign");
    const sb = spot.back ? { ...s, h: s.h * 0.8, foot: (s.foot ?? 0.93) - 0.07 } : s;
    return { p, s, spot, sb };
  });
  // 쪽 글에 나온 물건 · 내 소품: 주인공 옆 땅에 (인물 자리를 먼저 잡은 뒤 남는 곳). 쪽 안 움직임 없이 처음부터 놓여 있다
  // 배경 그림에 이미 같은 물건이 있으면 또 놓지 않는다 (pt_docs 18 — 동굴에서 「돌」이 나와도 동굴엔 바위가 있다)
  const bgKinds = new Set(layout.objects.map((o) => kindOf(o.src)));
  // 공중 소품(나비 · 새 · 행성 …)은 사람 머리 위 높이라 땅의 사람 · 물건과는 겹치지 않는다 — 공중 소품끼리만 피한다.
  // 전에는 땅과 같은 줄에서 자리를 다퉈 괜히 빠졌고, 머리 높이(0.45)라 사람 머리와 겹칠 수 있었다 (11/4 자리 검사)
  const airPlaced: [number, number][] = [];
  // 대본이 말한 자리 (pose): 물에 떠내려감 · 바람에 날아감 · 나무에 걸림 · 머리에 씀 · 손에 듦. 놓을 수 없으면 아래 보통 자리로
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
      case "head": {   // 그 사람 머리 위
        if (t.holder === "hero") {
          const h = H.h * 0.16;
          return { x: hero.to, cls: "", top: true, style: spotStyle({ src: t.src, x: heroX, foot: H.foot - H.h + h * 0.55, h }) };
        }
        if (!holder) return null;
        const h = holder.sb.h * 0.16, foot = (holder.sb.foot ?? 0.93) - holder.sb.h + h * 0.62;
        return { x: holder.spot.x, cls: "", style: spotStyle({ src: t.src, x: holder.spot.x, foot, h }) };
      }
      case "hand": {   // 그 사람 손끝에 소품 손잡이를 (인물은 그림마다 잰 값 hands.json, 주인공은 AI 손 관절 still_hands)
        let hx: number, hy: number, outer: "l" | "r", bodyH: number;
        if (t.holder === "hero") {
          // 주인공은 가만히 있는 쪽만 — 걷거나 팔이 움직이면 손에서 떨어져 보인다
          const drawW = spr ? (spr.box[2] - spr.box[0]) * (H.h / Math.max(0.05, spr.box[3] - spr.box[1])) / aspect
            : stillAr ? H.h * stillAr / aspect : 0;
          if (!heroHands || !hero.calm || !drawW) return null;
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
        return { x: win.x, cls: t.motion ? `m-${t.motion}` : "", style: spotStyle({ src: t.src, x: win.x, foot: win.y + h / 2, h }) };
      }
      default: return null;
    }
  };
  const posedSpots = (plan.things ?? []).filter((t) => !bgKinds.has(kindOf(t.src))).map((t) => ({ t, at: t.pose ? posed(t) : null }))
    .filter((v) => v.t.pose !== "window" || v.at);   // 창밖 소품은 창이 없으면 방 안에 놓지 않는다
  const thingSpots = posedSpots.filter((v) => !v.at).map((v) => v.t).map((t, k) => {
    const air = t.spot === "air";
    const list = air ? airPlaced : placed;
    const open = (a: number, b: number) => list.every(([l, r]) => b <= l || a >= r);
    // 넓은 물건(시소 · 다리 · 텐트 · 바위)은 자리가 없으면 조금 작게라도 놓는다 — 전에는 통째로 빠졌다(좁은 화면에서 11%)
    for (const scale of air ? [1] : [1, 0.75, 0.55]) {
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
  }).filter((t): t is NonNullable<typeof t> => !!t);
  const front = plan.props.filter((p) => p.id === "cover" && p.src);

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
        return (
          <img key={`${p.id}-${p.name ?? k}`} className={`scene-obj scene-person ${phase === 0 || !p.enter ? "" : "walking-in"} ${p.id === "bird" || p.id === "bat" ? "m-float" : ""}`}
               src={base + s.src} alt=""
               style={{ ...spotStyle({ ...sb, x }), transition: REDUCE || !play ? "none" : "left 2.4s cubic-bezier(.35,.1,.35,1), filter 2.6s ease" }} />
        );
      })}
      {posedSpots.filter((v) => v.at && !v.at.top).map(({ t, at }, k) => (
        <img key={`posed-${k}-${t.src.slice(0, 40)}`} className={`scene-obj scene-thing ${at!.cls}`} alt=""
             src={`${sceneBase(t.src.split("/")[0])}${t.src.split("/")[1]}`} style={at!.style} />
      ))}
      {thingSpots.map((t, k) => (
        <img key={`thing-${k}-${t.src.slice(0, 40)}`}
             className={`scene-obj scene-thing ${t.pose === "fall" && play ? "m-drop" : ""} ${t.motion && (t.motion !== "roll" || play) ? `m-${t.motion}` : ""}`}
             alt={t.name ? `내가 그린 ${t.name}` : ""}
             src={t.src.startsWith("data:") ? t.src : `${sceneBase(t.src.split("/")[0])}${t.src.split("/")[1]}`}
             style={{ ...spotStyle(t.spot === "wall" ? { src: t.src, x: t.x, top: 0.16, h: t.h }
               : { src: t.src, x: t.x, foot: t.spot === "air" ? 0.3 : 0.95, h: t.h }),
               // 공은 주인공 반대쪽으로 굴러간다 (주인공과 부딪치지 않게)
               ["--roll" as string]: t.x < hero.to ? -1 : 1 }} />
      ))}
      {spr
        ? <canvas ref={canvas} width={384} height={384} className={`scene-hero ${hero.fallen ? "fallen" : ""}`}
                  style={{ ...heroStyle, transition: heroTransition, opacity: heroGone ? 0 : 1 }} />
        : still
          ? <img className={`scene-hero ${hero.fallen ? "fallen" : ""} ${hero.move !== "none" && phase === 1 && play ? "stepping" : ""}`}
                 src={still} alt="" style={{ ...heroStyle, transition: heroTransition, opacity: heroGone ? 0 : 1 }}
                 onLoad={(e) => setStillAr(e.currentTarget.naturalWidth / Math.max(1, e.currentTarget.naturalHeight))} />
          : null}
      {weather && weather !== "rainbow" && (
        <div className={`scene-weather w-${weather}`}>
          {weather === "wind" && LEAVES.map(([top, delay, color], k) => (
            <span key={k} className="scene-leaf" style={{ top: `${top}%`, animationDelay: `${delay}s`, background: color }} />
          ))}
        </div>
      )}
      {/* 주인공 머리에 쓴 것은 주인공 위에 */}
      {posedSpots.filter((v) => v.at?.top).map(({ t, at }, k) => (
        <img key={`posed-top-${k}`} className="scene-obj scene-thing" alt=""
             src={`${sceneBase(t.src.split("/")[0])}${t.src.split("/")[1]}`} style={at!.style} />
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
/** 옆으로 쥐는 소품 (손잡이를 손에) — 나머지는 윗부분을 쥐고 매단다 */
const SIDE_GRIP = new Set(["props/flashlight.webp"]);
/** 그림 이름으로 본 물건 종류 — 꽃밭 그림이 둘(flowers · flowerbed)이라 하나로 */
const kindOf = (src: string) => {
  const name = src.split("/").pop()?.replace(/\.webp$/, "") ?? src;
  return name === "flowerbed" ? "flowers" : name;
};
/** 바람 쪽에 날아가는 잎 [높이 %, 늦게 시작(초), 색] */
const LEAVES: [number, number, string][] = [[20, 0, "#E8A33C"], [46, 1.1, "#8DBA5A"], [34, 2.2, "#D9663B"], [60, 3.3, "#B9C94A"],
  [28, 4.4, "#E2B04A"], [54, 5.5, "#7FAE4E"]];
const STARS: [number, number, number][] = [[14, 14, 2.2], [30, 30, 1.6], [82, 18, 2.2], [92, 44, 1.5], [48, 8, 1.7], [64, 34, 1.4]];
