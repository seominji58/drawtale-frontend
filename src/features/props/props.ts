import { create } from "zustand";
import { useAuth } from "@/store/auth";
import type { StepKind } from "@/types/story";

/* 내 소품 — 아이가 그린 물건이 이야기에 나온다 (2026-10-27 회의에서 긍정 검토, 로컬 시험, open-decisions 0-13).
   정해진 물건을 그리는 것이 아니라, 아이가 화면에 그리거나 종이에 그린 그림을 올리고 **이름을 붙여** 등록한다
   (아이 · 보호자가 적음). 그림 생성 API 를 쓰지 않는다.
   이야기에서는 주인공과 겹치지 않게 **소품만 나오는 장면**으로 따로 보여 준다 (팀원 의견: 합성 리스크를 지지 말자). */

export interface MyProp {
  id: string;
  /** 아이 · 보호자가 적은 이름 (예: 「노란 우산」) */
  name: string;
  /** 투명 바탕 PNG data URL (그린 곳만 잘라 긴 변 512px 이하) */
  png: string;
  /** "draw" 화면에 그림 · "photo" 종이 그림을 찍어 올림 */
  from: "draw" | "photo";
  /** 장면에서 보일 크기. 없으면 보통 (10/27 사용자 「비율 작게 넣을 수 있도록」) */
  size?: PropSize;
  createdAt: string;
}

export const MAX_PROPS = 30;

/** 소품 크기 — 장면 높이에 대한 최대 비율. 그린 곳만 잘라 두었으니 크게 그렸든 작게 그렸든, 사진이든 그림이든
 *  이 상자 안에 비율을 지켜 맞춰 들어간다 */
export type PropSize = "s" | "m" | "l";
export const PROP_SIZES: { id: PropSize; name: string; height: number }[] = [
  { id: "s", name: "작게", height: 0.3 },
  { id: "m", name: "보통", height: 0.45 },
  { id: "l", name: "크게", height: 0.6 },
];
export const propHeight = (size: PropSize | undefined) =>
  (PROP_SIZES.find((x) => x.id === size) ?? PROP_SIZES[1]).height;
export const MAX_PROP_NAME = 12;

/** 카드 → 그 단계 쪽에 나올 수 있는 물건 낱말. 내 소품 이름이 이 낱말로 끝나면 그 쪽에 소품 장면이 생긴다
 *  (「노란 우산」 → 우산). 카드 내용(목업)이 정해지면 같이 고친다. 행동 id 는 문제마다 따로다 (choices.ts) */
const WORDS_BY_CARD: Partial<Record<StepKind, Record<string, string[]>>> = {
  place: { forest: ["나무", "꽃"], town: ["집"], sea: ["조개", "물고기"], space: ["별", "로켓"] },
  problem: { rain: ["구름"], dark: ["달", "별"], hungry: ["빵", "사과"] },
  action: {
    umbrella: ["우산"], light: ["손전등", "랜턴"], lunchbox: ["도시락"], map: ["지도"],
    star: ["별"], fruit: ["열매", "사과"], share: ["도시락", "빵"],
  },
  result: { sun: ["해", "태양"], home: ["집"], gift: ["선물"], friend: ["꽃"] },
};

/** 이름이 낱말과 맞나 — 같거나 그 낱말로 끝난다 (「해바라기」는 「해」가 아니다) */
const matches = (name: string, word: string) => {
  const n = name.replace(/\s+/g, "");
  return n === word || n.endsWith(word);
};

/** 한 쪽에 함께 보여 줄 소품은 이만큼까지 */
export const MAX_PROPS_PER_PAGE = 3;

/** 그 단계 쪽에 보여 줄 내 소품들 (없으면 빈 목록). 한 문장에 소품이 여럿이어도 같은 쪽에 함께 나온다.
 *  지금은 카드 낱말로 고른다 — 보호자 모드 실시간 대본이 생기면 대본이 쪽마다 적는 소품 목록으로 바꾼다 */
export function propsForStage(
  stage: StepKind, picks: Partial<Record<StepKind, string>> | undefined, mine: MyProp[],
): MyProp[] {
  const id = picks?.[stage];
  const words = (id && WORDS_BY_CARD[stage]?.[id]) || [];
  const out: MyProp[] = [];
  for (const w of words) {
    const hit = mine.find((p) => matches(p.name, w) && !out.includes(p));
    if (hit) out.push(hit);
  }
  return out.slice(0, MAX_PROPS_PER_PAGE);
}

/* 저장 — 회원은 이 기기(localStorage), 비회원은 이 탭에만(sessionStorage). 원본 그림 보관 원칙과 같다 (AGENTS.md 5장).
   서버에는 보내지 않는다 (소품 장면은 화면에서 만든다) */
const KEY = "storyblanks.myprops";

function store(): Storage | null {
  try {
    return useAuth.getState().mode === "member" ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

function load(): MyProp[] {
  try {
    const v = JSON.parse(store()?.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function persist(list: MyProp[]) {
  try { store()?.setItem(KEY, JSON.stringify(list)); } catch { /* 저장 공간이 모자라면 이번 탭에서만 */ }
}

interface PropState {
  mine: MyProp[];
  add: (p: Omit<MyProp, "id" | "createdAt">) => MyProp;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<Pick<MyProp, "name" | "size">>) => void;
  reload: () => void;
}

export const useProps = create<PropState>((set, get) => ({
  mine: load(),
  add: (p) => {
    const item: MyProp = { ...p, id: `p-${Date.now().toString(36)}`, createdAt: new Date().toISOString().slice(0, 10) };
    const mine = [item, ...get().mine].slice(0, MAX_PROPS);
    set({ mine });
    persist(mine);
    return item;
  },
  remove: (id) => {
    const mine = get().mine.filter((p) => p.id !== id);
    set({ mine });
    persist(mine);
  },
  update: (id, patch) => {
    const mine = get().mine.map((p) => (p.id === id ? { ...p, ...patch } : p));
    set({ mine });
    persist(mine);
  },
  reload: () => set({ mine: load() }),
}));

/** 종이에 그린 그림 사진 → 투명 바탕 그림. 종이(밝은 바탕)를 지우고 그린 곳만 자른다.
 *  흰 종이 위 그림을 가정한다 — 그림자 · 색종이는 잘 안 지워진다 (로컬 시험) */
export async function paperToSticker(file: File): Promise<string | null> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lum = (i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  // 종이 밝기 = 가장자리 픽셀 밝기의 가운데 값
  const edge: number[] = [];
  for (let x = 0; x < w; x += 4) { edge.push(lum(x * 4), lum(((h - 1) * w + x) * 4)); }
  for (let y = 0; y < h; y += 4) { edge.push(lum(y * w * 4), lum((y * w + w - 1) * 4)); }
  edge.sort((a, b) => a - b);
  const paper = edge[edge.length >> 1];
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const sat = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
    // 종이보다 충분히 어둡거나 색이 있으면 그림
    if (lum(i) < paper - 45 || sat > 60) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    } else {
      d[i + 3] = 0;
    }
  }
  if (x1 < 0) return null;
  ctx.putImageData(img, 0, 0);
  const pad = 8;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const k = Math.min(1, 512 / Math.max(cw, ch));
  const out = document.createElement("canvas");
  out.width = Math.round(cw * k); out.height = Math.round(ch * k);
  out.getContext("2d")!.drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
