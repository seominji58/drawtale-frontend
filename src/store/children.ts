import { create } from "zustand";
import { listChildren, type ChildSummary } from "@/api";
import { useAuth } from "./auth";

/** 「지금 아이」 (보호자 · 교사 계정 3단계, 2026-11-17). 자료의 주인이 아이라, 그림을 올리고 책장을 볼 때 어느 아이인지 정한다.
 *  보호자는 보통 자기 아이 하나, 교사는 연결 코드로 이어진 아이 여럿. 고른 아이는 이 기기에 기억한다(회원만).
 *  아이가 고르는 화면(「오늘은 누구예요?」)은 4단계 — 지금은 설정의 어른 칸에서 고른다 */
const KEY = "storyblanks.activeChild";

interface ChildrenState {
  list: ChildSummary[];
  activeId: string | null;
  load: () => Promise<ChildSummary[]>;
  setActive: (id: string) => void;
  /** 지금 아이 — 고른 것이 목록에 없으면 내 아이(보호자) · 첫 아이 */
  active: () => ChildSummary | null;
}

const readActive = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

export const useChildren = create<ChildrenState>((set, get) => ({
  list: [],
  activeId: readActive(),
  load: async () => {
    if (useAuth.getState().mode !== "member") { set({ list: [] }); return []; }
    try {
      const list = await listChildren();
      set({ list });
      return list;
    } catch {
      return get().list;
    }
  },
  setActive: (id) => {
    try { localStorage.setItem(KEY, id); } catch { /* 저장 실패는 무시 */ }
    set({ activeId: id });
  },
  active: () => {
    const { list, activeId } = get();
    return list.find((k) => k.id === activeId) ?? list.find((k) => k.relation === "guardian") ?? list[0] ?? null;
  },
}));
