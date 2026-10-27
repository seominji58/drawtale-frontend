import { create } from "zustand";
import { useAuth } from "@/store/auth";
import type { StepKind } from "@/types/story";

/* 내 소품 — 아이가 그린 물건이 이야기에 나온다 (2026-10-27 회의에서 긍정 검토, 로컬 시험).
   설계서에 없는 화면이다 (open-decisions 0-13). 그림 생성 API 를 쓰지 않는다.
   소품은 움직이지 않는다 — 주인공 손에 쥐게 하지 않고, 주인공 그림이 놓인 무대 기준 자리에 얹는다.
   (손에 쥐고 따라 움직이기는 AI 서버가 프레임마다 손목 좌표를 내보내야 해서 대회 뒤로 미룬다) */

/** 소품이 놓이는 자리. 무대(주인공 영상이 있는 칸) 기준 */
export type PropSlot = "above" | "side" | "sky" | "ground";

export interface PropDef {
  id: string;
  name: string;
  /** 「○○을 그려 볼까요?」의 조사까지 */
  object: string;
  slot: PropSlot;
  /** 아직 안 그렸을 때 목록에 보이는 임시 그림 */
  emoji: string;
}

/** 지금 카드(목업)에서 쓰는 소품. 카드 내용이 정해지면 같이 고친다 */
export const PROPS: PropDef[] = [
  { id: "umbrella", name: "우산", object: "우산을", slot: "above", emoji: "☂️" },
  { id: "flashlight", name: "손전등", object: "손전등을", slot: "side", emoji: "🔦" },
  { id: "lunchbox", name: "도시락", object: "도시락을", slot: "side", emoji: "🍱" },
  { id: "map", name: "지도", object: "지도를", slot: "side", emoji: "🗺" },
  { id: "flower", name: "꽃", object: "꽃을", slot: "ground", emoji: "🌷" },
  { id: "tree", name: "나무", object: "나무를", slot: "ground", emoji: "🌳" },
  { id: "house", name: "집", object: "집을", slot: "ground", emoji: "🏠" },
  { id: "cloud", name: "구름", object: "구름을", slot: "sky", emoji: "☁️" },
  { id: "sun", name: "해", object: "해를", slot: "sky", emoji: "☀️" },
  { id: "moon", name: "달", object: "달을", slot: "sky", emoji: "🌙" },
  { id: "star", name: "별", object: "별을", slot: "sky", emoji: "⭐" },
];
export const propById = (id: string) => PROPS.find((p) => p.id === id);

/** 카드(id) → 그 단계 쪽에 나오는 소품. 장소 · 문제 · 결과는 배경 쪽(하늘 · 땅), 행동은 주인공 곁.
 *  행동 id 는 문제마다 따로라(choices.ts ACTIONS_BY_PROBLEM) 문제 id 와 함께 찾는다 */
const BY_CARD: Partial<Record<StepKind, Record<string, string[]>>> = {
  place: { forest: ["tree"], town: ["house"] },
  problem: { rain: ["cloud"], dark: ["moon", "star"] },
  action: { umbrella: ["umbrella"], light: ["flashlight"], lunchbox: ["lunchbox"], map: ["map"], star: ["star"] },
  result: { sun: ["sun"], home: ["house"] },
};

/** 그 단계 쪽에 얹을 소품 id 들 (아이가 그린 것만 쓰는 것은 부르는 쪽에서 거른다) */
export function propsForStage(stage: StepKind, picks: Partial<Record<StepKind, string>>): string[] {
  const id = picks[stage];
  return (id && BY_CARD[stage]?.[id]) || [];
}

/* 저장 — 회원은 이 기기(localStorage), 비회원은 이 탭에만(sessionStorage). 원본 그림 보관 원칙과 같다 (AGENTS.md 5장).
   서버에는 보내지 않는다 (소품을 화면에서 얹으므로 서버가 알 필요가 없다) */
const KEY = "storyblanks.props";

function store(): Storage | null {
  try {
    return useAuth.getState().mode === "member" ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

function load(): Record<string, string> {
  try {
    return JSON.parse(store()?.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

interface PropState {
  /** 소품 id → 아이가 그린 그림(투명 PNG data URL) */
  drawn: Record<string, string>;
  save: (id: string, png: string) => void;
  remove: (id: string) => void;
  reload: () => void;
}

export const useProps = create<PropState>((set, get) => ({
  drawn: load(),
  save: (id, png) => {
    const drawn = { ...get().drawn, [id]: png };
    set({ drawn });
    try { store()?.setItem(KEY, JSON.stringify(drawn)); } catch { /* 저장 공간이 모자라면 이번 탭에서만 */ }
  },
  remove: (id) => {
    const drawn = { ...get().drawn };
    delete drawn[id];
    set({ drawn });
    try { store()?.setItem(KEY, JSON.stringify(drawn)); } catch { /* 무시 */ }
  },
  reload: () => set({ drawn: load() }),
}));
