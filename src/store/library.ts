import { create } from "zustand";
import type { Story } from "@/types/story";
import { useAuth } from "./auth";

const KEY = "storyblanks.stories";

/** 회원은 서버(그리고 캐시로 localStorage), 비회원은 메모리와 sessionStorage 만 쓴다.
 *  비회원이 탭을 닫으면 sessionStorage 가 사라지므로 이야기도 함께 사라진다. */
function read(): Story[] {
  const mode = useAuth.getState().mode;
  const store = mode === "member" ? localStorage : sessionStorage;
  try { return JSON.parse(store.getItem(KEY) ?? "[]") as Story[]; } catch { return []; }
}
function write(list: Story[]) {
  const mode = useAuth.getState().mode;
  const store = mode === "member" ? localStorage : sessionStorage;
  try { store.setItem(KEY, JSON.stringify(list)); } catch { /* 저장 실패는 무시 */ }
}

interface LibraryState {
  stories: Story[];
  load: () => void;
  add: (s: Story) => void;
  remove: (id: string) => void;
  clearGuest: () => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  stories: read(),
  load: () => set({ stories: read() }),
  add: (s) => {
    const next = [s, ...get().stories.filter((x) => x.storyId !== s.storyId)];
    write(next);
    set({ stories: next });
  },
  remove: (id) => {
    const next = get().stories.filter((x) => x.storyId !== id);
    write(next);
    set({ stories: next });
  },
  clearGuest: () => {
    sessionStorage.removeItem(KEY);
    set({ stories: [] });
  },
}));
