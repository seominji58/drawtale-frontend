import { useEffect, useState, type ReactNode } from "react";
import KeyedClip from "./KeyedClip";
import type { Box } from "./key";
import type { Story } from "@/types/story";

/** 이야기 장면 칸에 고른 장소를 깐다 (2026-11-03 사용자 「깔아주세요」).
 *  장소 그림은 장소 카드와 같은 것 — 배경판 + 물건(`public/scenes/{장소}/layout.json`, tools/art/).
 *  layout 의 hero 자리(가로 x, 발 높이 foot, 키 h — 모두 칸에 대한 비율)에 캐릭터를 세운다 */

interface Placed { src: string; x: number; foot?: number; top?: number; h: number; layer?: "back" | "front" }
export interface PlaceLayout {
  place: string;
  size: [number, number];
  plate: string;
  hero: { x: number; foot: number; h: number };
  objects: Placed[];
}

const PLACES = ["home", "playground", "school", "town", "forest", "sea", "space", "cave"];
/** 말로 정한 장소(보호자 모드 · 「베란다」)는 낱말로 가장 가까운 장소를 고른다. 못 찾으면 집 */
const WORDS: [string, string[]][] = [
  ["playground", ["놀이터", "미끄럼", "그네", "공원"]],
  ["school", ["학교", "교실", "유치원", "어린이집", "운동장"]],
  ["town", ["마을", "동네", "거리", "시장", "가게", "길"]],
  ["forest", ["숲", "산", "나무", "들판"]],
  ["sea", ["바다", "해변", "모래", "강", "호수"]],
  ["space", ["우주", "별", "달", "행성", "하늘"]],
  ["cave", ["동굴", "굴", "터널"]],
  ["home", ["집", "방", "베란다", "거실", "부엌", "마당"]],
];

/** 이 이야기의 장소 id. 고른 카드가 있으면 그것, 없으면 서버가 돌려준 장소 낱말로 */
export function placeOf(story: Pick<Story, "picks" | "place">): string {
  const picked = story.picks?.place;
  if (picked && PLACES.includes(picked)) return picked;
  const said = story.place ?? "";
  return WORDS.find(([, words]) => words.some((w) => said.includes(w)))?.[0] ?? "home";
}

const base = (place: string) => `${import.meta.env.BASE_URL}scenes/${place}/`;
const cache = new Map<string, Promise<PlaceLayout | null>>();

function loadLayout(place: string): Promise<PlaceLayout | null> {
  if (!cache.has(place)) {
    cache.set(place, fetch(`${base(place)}layout.json`)
      .then((r) => (r.ok ? r.json() as Promise<PlaceLayout> : null))
      .catch(() => null));
  }
  return cache.get(place)!;
}

/** 장소 배치. 읽기 전 · 없으면 null — 부르는 쪽은 예전처럼 빈 무대를 쓴다 */
export function usePlaceLayout(place: string | null): PlaceLayout | null {
  const [layout, setLayout] = useState<PlaceLayout | null>(null);
  useEffect(() => {
    if (!place) { setLayout(null); return; }
    let alive = true;
    void loadLayout(place).then((l) => { if (alive) setLayout(l); });
    return () => { alive = false; };
  }, [place]);
  return layout;
}

const pct = (v: number) => `${v * 100}%`;

function Thing({ o, dir }: { o: Placed; dir: string }) {
  return (
    <img src={new URL(o.src, new URL(dir, window.location.href)).href} alt="" aria-hidden draggable={false}
      style={{
        position: "absolute", height: pct(o.h), left: pct(o.x), width: "auto",
        top: o.top !== undefined ? pct(o.top) : pct(o.foot ?? 1),
        transform: o.top !== undefined ? "translateX(-50%)" : "translate(-50%, -100%)",
        pointerEvents: "none",
      }} />
  );
}

/** 배경판 · 뒤 물건 · children(캐릭터) · 앞 물건 순으로 쌓는다. 칸을 꽉 채운다 (칸 비율은 layout.size) */
export default function PlaceScene({ layout, children }: { layout: PlaceLayout; children?: ReactNode }) {
  const dir = base(layout.place);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <img src={`${dir}${layout.plate}`} alt="" aria-hidden draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      {layout.objects.filter((o) => o.layer !== "front").map((o, i) => <Thing key={`b${i}`} o={o} dir={dir} />)}
      {children}
      {layout.objects.filter((o) => o.layer === "front").map((o, i) => <Thing key={`f${i}`} o={o} dir={dir} />)}
    </div>
  );
}

/** 캐릭터를 hero 자리에 세운다. 영상 · 그림마다 캐릭터가 차지한 크기가 달라서, 첫 장면의 캐릭터 상자로
 *  키(h)와 발 위치(foot)를 맞춘다 — 쪽마다 같은 크기로 같은 자리에 선다 */
export function Hero({ src, paused, layout }: { src: string; paused?: boolean; layout: PlaceLayout }) {
  const [fit, setFit] = useState<{ box: Box; ratio: number } | null>(null);
  useEffect(() => setFit(null), [src]);
  const stageAr = layout.size[0] / layout.size[1];
  const { x, foot, h } = layout.hero;
  let style: React.CSSProperties = { position: "absolute", visibility: "hidden", height: "50%" };
  if (fit) {
    const { box, ratio } = fit;
    // 칸 높이에 대한 캔버스 높이 · 칸 너비에 대한 캔버스 너비
    const dispH = Math.min(3, h / Math.max(0.05, box.y1 - box.y0));
    const dispW = dispH * ratio / stageAr;
    style = {
      position: "absolute", height: pct(dispH), width: pct(dispW),
      top: pct(foot - box.y1 * dispH), left: pct(x - ((box.x0 + box.x1) / 2) * dispW),
    };
  }
  return (
    <KeyedClip src={src} paused={paused} style={style}
      onBox={(box, ratio) => setFit(box ? { box, ratio } : { box: { x0: 0, y0: 0, x1: 1, y1: 1 }, ratio })} />
  );
}
