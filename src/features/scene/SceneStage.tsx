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
import { isIndoor, isPerson } from "./plan";
import { sceneBase } from "./locations";
import { drawFrame, loadSprite, type Sprite } from "./sprite";

interface Spot { src: string; x: number; foot?: number; top?: number; h: number; layer?: string }
interface Layout {
  ground?: number;
  plate: string;
  hero: { x: number; foot: number; h: number };
  objects: Spot[];
  props: Record<string, Spot>;
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
const PEOPLE: Record<string, { h: number; w: number }> = {
  friend: { h: 0.46, w: 0.45 }, adult: { h: 0.58, w: 0.42 }, friend2: { h: 0.46, w: 0.45 },
  grandma: { h: 0.54, w: 0.4 }, grandpa: { h: 0.57, w: 0.4 }, mom: { h: 0.58, w: 0.38 }, dad: { h: 0.6, w: 0.38 },
  teacher: { h: 0.58, w: 0.42 }, baby: { h: 0.28, w: 0.62 }, dog: { h: 0.24, w: 0.9 }, cat: { h: 0.24, w: 0.72 },
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
  mode: "play" | "start" | "end";
}

export default function SceneStage({ plan, prevEnv, sprite, still, mode }: Props) {
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

  // 주인공 프레임: 옮겨 가는 동안은 계속, 제자리 동작은 loops 번, 그다음 첫 장에서 멈춘다
  useEffect(() => {
    const c = canvas.current;
    if (!c || !spr) return;
    const g = c.getContext("2d")!;
    const moving = plan.hero.move !== "none";
    const fps = moving ? timing.fps : FPS;
    const total = !play || REDUCE ? 0
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
  if (spr) {
    const [l, t, r, b] = spr.box;
    const cellH = H.h / Math.max(0.05, b - t);          // 칸 높이 (화면 높이 대비)
    const cellW = cellH / aspect;                        // 칸 너비 (화면 너비 대비)
    heroStyle = {
      height: `${cellH * 100}%`, aspectRatio: "1",
      left: `${(heroX - ((l + r) / 2 - 0.5) * cellW) * 100}%`,
      bottom: `${((1 - H.foot) - (1 - b) * cellH) * 100}%`,
    };
  } else {
    heroStyle = { height: `${H.h * 100}%`, left: `${heroX * 100}%`, bottom: `${(1 - H.foot) * 100}%` };
  }
  // 같은 빠르기로 (속도가 바뀌면 걸음과 어긋나 발이 미끄러진다)
  const heroTransition = REDUCE || !play ? "none" : `left ${timing.ms}ms linear, opacity ${heroGone ? 1 : 0}s ease, filter 2.6s ease`;

  const prop = (id: PropId): Spot | undefined => layout.props[id]
    ?? (PEOPLE[id] ? { src: `../props/${id}.webp`, x: 0.78, foot: 0.93, h: PEOPLE[id].h } : undefined);
  // 주인공 폭의 절반 (화면 너비 대비). 팔을 넓게 벌린 그림이면 옆 인물을 그만큼 바깥으로 민다 (겹치지 않게)
  const heroHalf = spr ? ((spr.box[2] - spr.box[0]) * (H.h / Math.max(0.05, spr.box[3] - spr.box[1])) / aspect) / 2
    : stillAr ? (H.h * stillAr / aspect) / 2 : 0.1;
  // 옆에 서는 것들(인물 · 표지판)의 자리: 주인공과 서로를 피해, 칸 안에서. 원하는 쪽이 꽉 차면 반대쪽으로
  const placed: [number, number][] = [[hero.to - heroHalf, hero.to + heroHalf]];
  const free = (a: number, b: number) => placed.every(([l, r]) => b <= l || a >= r);
  /** 자리 { x, back } — back 이면 설 자리가 없어 조금 뒤(작게 · 약간 위)에 선다. 그림책에서 뒤에 선 사람처럼 */
  const personX = (x: number, h: number, wRatio = 0.45): { x: number; back: boolean } => {
    const half = (h * wRatio / aspect) / 2;   // 친구 · 어른 그림은 키의 4~5할 폭
    const gap = 0.015, lo = half + 0.01, hi = 1 - half - 0.01;
    const want = Math.min(hi, Math.max(lo, x));
    const right = want >= hero.to;
    const tries = [want];
    for (let k = 1; k <= 40; k++) tries.push(want + (right ? 1 : -1) * k * 0.02, want - (right ? 1 : -1) * k * 0.02);
    const at = tries.find((c) => c >= lo && c <= hi && free(c - half - gap, c + half + gap));
    if (at !== undefined) { placed.push([at - half, at + half]); return { x: at, back: false }; }
    // 남는 공간이 많은 쪽 끝 — 뒤에 서서 작아지니 겹쳐도 앞뒤로 읽힌다
    const leftRoom = Math.min(...placed.map(([l]) => l)), rightRoom = 1 - Math.max(...placed.map(([, r]) => r));
    const bx = rightRoom >= leftRoom ? hi - 0.02 : lo + 0.02;
    return { x: bx, back: true };
  };
  const behind = plan.props.filter((p) => isPerson(p.id) || p.id === "sign");
  const front = plan.props.filter((p) => p.id === "box" || p.id === "bush");

  return (
    <div className={`scene ${night ? "night" : ""}`} aria-hidden ref={root}>
      <img className="scene-plate scene-bg" src={base + layout.plate} alt="" />
      <div className="scene-tint" />
      {!indoor && (
        <div className="scene-sky" style={{ height: `${(layout.ground ?? 0.556) * 100}%` }}>
          <img className="scene-sun" src={`${sceneBase("props")}sun.webp`} alt=""
               style={{ left: `${sunPos[0]}%`, top: `${sunPos[1]}%`, transition: skyMove(env.sun) }} />
          <img className="scene-moon" src={`${sceneBase("props")}moon.webp`} alt=""
               style={{ left: `${moonPos[0]}%`, top: `${moonPos[1]}%`, transition: skyMove(night) }} />
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
      {behind.map((p, k) => {
        const base0 = prop(p.id);
        if (!base0) return null;
        const s = p.x !== undefined ? { ...base0, x: p.x } : base0;
        // 걸어 들어오는 인물: 처음엔 화면 밖, 끝 모습에서 제자리
        const spot = personX(s.x, s.h, p.id === "sign" ? 0.6 : PEOPLE[p.id]?.w ?? 0.45);
        const x = phase === 0 && p.enter ? (p.enter === "left" ? -0.14 : 1.14) : spot.x;
        const sb = spot.back ? { ...s, h: s.h * 0.8, foot: (s.foot ?? 0.93) - 0.07 } : s;
        return (
          <img key={`${p.id}-${p.name ?? k}`} className={`scene-obj scene-person ${phase === 0 || !p.enter ? "" : "walking-in"}`}
               src={base + s.src} alt=""
               style={{ ...spotStyle({ ...sb, x }), transition: REDUCE || !play ? "none" : "left 2.4s cubic-bezier(.35,.1,.35,1), filter 2.6s ease" }} />
        );
      })}
      {spr
        ? <canvas ref={canvas} width={384} height={384} className={`scene-hero ${hero.fallen ? "fallen" : ""}`}
                  style={{ ...heroStyle, transition: heroTransition, opacity: heroGone ? 0 : 1 }} />
        : still
          ? <img className={`scene-hero ${hero.fallen ? "fallen" : ""} ${hero.move !== "none" && phase === 1 && play ? "stepping" : ""}`}
                 src={still} alt="" style={{ ...heroStyle, transition: heroTransition, opacity: heroGone ? 0 : 1 }}
                 onLoad={(e) => setStillAr(e.currentTarget.naturalWidth / Math.max(1, e.currentTarget.naturalHeight))} />
          : null}
      {front.map((p) => {
        const s = prop(p.id);
        return s ? <img key={p.id} className="scene-obj scene-cover" src={base + s.src} alt="" style={spotStyle(s)} /> : null;
      })}
    </div>
  );
}

const STARS: [number, number, number][] = [[14, 14, 2.2], [30, 30, 1.6], [82, 18, 2.2], [92, 44, 1.5], [48, 8, 1.7], [64, 34, 1.4]];
