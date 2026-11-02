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
  /** 제목 고치기 (S-13, 로그인한 보호자). 책장 · S-09 쪽 머리에 함께 보인다 */
  rename: (id: string, title: string) => void;
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
  rename: (id, title) => {
    const next = get().stories.map((x) =>
      x.storyId === id ? { ...x, title, ...(x.book ? { book: { ...x.book, title } } : {}) } : x);
    write(next);
    set({ stories: next });
  },
  clearGuest: () => {
    sessionStorage.removeItem(KEY);
    set({ stories: [] });
  },
}));
