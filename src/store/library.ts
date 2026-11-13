import { create } from "zustand";
import type { Story } from "@/types/story";
import { useAuth } from "./auth";
import { saveStoryTitle } from "@/api";

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

/** 만들기 시작했는데 화면이 결과를 받지 못한 이야기 (2026-11-04). S-08 이 시간 초과로 떠났거나 탭을 닫았다.
 *  서버는 계속 만들므로 책장(S-12)을 열 때 끝났는지 보고 꽂는다 — 전에는 늦게 끝난 이야기가 그대로 사라졌다 */
export interface PendingStory {
  storyId: string;
  jobId: string;
  picks?: Story["picks"];
  guardian?: boolean;
  form?: string;
  /** 만들기 시작한 때 (ms). 하루가 지나면 더 찾지 않는다 */
  at: number;
}
const PENDING_KEY = "storyblanks.pending";
const PENDING_MS = 24 * 3600_000;

function readPending(): PendingStory[] {
  const store = useAuth.getState().mode === "member" ? localStorage : sessionStorage;
  try {
    return (JSON.parse(store.getItem(PENDING_KEY) ?? "[]") as PendingStory[]).filter((p) => Date.now() - p.at < PENDING_MS);
  } catch { return []; }
}
function writePending(list: PendingStory[]) {
  const store = useAuth.getState().mode === "member" ? localStorage : sessionStorage;
  try { store.setItem(PENDING_KEY, JSON.stringify(list)); } catch { /* 저장 실패는 무시 */ }
}

/** 이야기 제목 글자 수 상한 (S-12 · S-13 제목 바꾸기) */
export const TITLE_MAX = 20;

interface LibraryState {
  stories: Story[];
  load: () => void;
  add: (s: Story) => void;
  remove: (id: string) => void;
  /** 제목 고치기 (S-11 · 보호자 S-12 책장 · S-13). 책장 · S-09 쪽 머리에 함께 보인다. 서버에도 보낸다 (계약 2-15) */
  /** 책장의 이야기를 모두 지운다 (만들고 있는 것은 그대로) */
  removeAll: () => void;
  rename: (id: string, title: string) => void;
  clearGuest: () => void;
  pending: PendingStory[];
  addPending: (p: PendingStory) => void;
  removePending: (storyId: string) => void;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  stories: read(),
  load: () => set({ stories: read(), pending: readPending() }),
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
  removeAll: () => {
    write([]);
    set({ stories: [] });
  },
  rename: (id, title) => {
    const next = get().stories.map((x) =>
      x.storyId === id ? { ...x, title, ...(x.book ? { book: { ...x.book, title } } : {}) } : x);
    write(next);
    set({ stories: next });
    void saveStoryTitle(id, title);
  },
  clearGuest: () => {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(PENDING_KEY);
    set({ stories: [], pending: [] });
  },
  pending: readPending(),
  addPending: (p) => {
    const next = [p, ...get().pending.filter((x) => x.storyId !== p.storyId)];
    writePending(next);
    set({ pending: next });
  },
  removePending: (storyId) => {
    const next = get().pending.filter((x) => x.storyId !== storyId);
    writePending(next);
    set({ pending: next });
  },
}));
