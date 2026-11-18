import { create } from "zustand";
import type { Story } from "@/types/story";
import { useAuth } from "./auth";
import { deleteStory, listChildStories, saveStoryTitle } from "@/api";
import { useChildren } from "./children";
import { CHOICES } from "@/features/story/choices";
import { makeCover } from "@/features/story/cover";

const KEY = "storyblanks.stories";
/** 책장을 마지막으로 맞춘 아이 (아이를 바꾸면 이 기기 책장을 그 아이 것으로 갈아 끼운다) */
const SYNC_KEY = "storyblanks.libraryChild";

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

/** 서버 이야기(다른 기기에서 만든 것)는 고른 카드 id 가 없다 — 서버에 남은 카드 이름으로 장소 id 를 찾아 붙인다 (표지 · 장면 배경) */
const placeId = (label: string | undefined) => CHOICES.place.find((c) => c.label === label)?.id;

interface LibraryState {
  stories: Story[];
  load: () => void;
  /** 회원: 서버의 아이별 이야기 목록으로 책장을 맞춘다 (보호자 · 교사 계정 2단계, 2026-11-17). 다른 기기에서 만든 것도 꽂힌다 */
  sync: () => Promise<void>;
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
  sync: async () => {
    if (useAuth.getState().mode !== "member") return;
    let server: Story[];
    let child: { id: string } | null;
    try {
      // 「지금 아이」(설정 어른 칸에서 고름, 3단계). 고른 게 없으면 내 아이(보호자) · 첫 아이
      await useChildren.getState().load();
      child = useChildren.getState().active();
      if (!child) return;
      server = await listChildStories(child.id);
    } catch {
      return;   // 서버를 못 보면 기기 저장본 그대로
    }
    const local = new Map(get().stories.map((s) => [s.storyId, s]));
    const ids = new Set(server.map((s) => s.storyId));
    // 서버 것이 기준. 이 기기에만 있는 것(표지 · 고른 카드 · 보호자 모드 · 고친 제목)은 붙여 둔다
    const merged = server.map((s) => {
      const mine = local.get(s.storyId);
      return mine
        ? { ...s, title: s.title || mine.title, createdAt: mine.createdAt, cover: mine.cover, picks: mine.picks, guardian: mine.guardian, form: s.form ?? mine.form }
        : { ...s, picks: { place: placeId(s.place) } };
    });
    // 서버 목록(최근 것)보다 오래된 이 기기 것은 남긴다. 서버 목록 기간 안인데 서버에 없으면 다른 곳에서 지운 것이라 뺀다.
    // 다른 아이로 바꿨으면 이 기기 것을 남기지 않는다 — 앞 아이의 이야기가 섞였다 (3단계 아이 고르기)
    let sameChild = true;
    try { sameChild = localStorage.getItem(SYNC_KEY) === child.id; localStorage.setItem(SYNC_KEY, child.id); } catch { /* 저장 실패는 무시 */ }
    const oldest = server.length ? server[server.length - 1].createdAt : "";
    const keep = sameChild ? get().stories.filter((s) => !ids.has(s.storyId) && (!oldest || s.createdAt < oldest)) : [];
    const next = [...merged, ...keep];
    write(next);
    set({ stories: next });
    // 다른 기기에서 만든 이야기는 표지가 없다 — 정지 그림으로 만들어 붙인다
    for (const s of merged) {
      if (s.cover || !s.stillUrl) continue;
      void makeCover(null, s.stillUrl).then((cover) => {
        if (!cover) return;
        const list = get().stories.map((x) => (x.storyId === s.storyId ? { ...x, cover } : x));
        write(list);
        set({ stories: list });
      });
    }
  },
  add: (s) => {
    const next = [s, ...get().stories.filter((x) => x.storyId !== s.storyId)];
    write(next);
    set({ stories: next });
  },
  remove: (id) => {
    // 회원은 서버에서도 지운다 — 안 그러면 다른 기기 책장 · 다음 맞추기(sync)에서 다시 나온다 (2026-11-17)
    if (useAuth.getState().mode === "member") void deleteStory(id);
    const next = get().stories.filter((x) => x.storyId !== id);
    write(next);
    set({ stories: next });
  },
  removeAll: () => {
    if (useAuth.getState().mode === "member") for (const s of get().stories) void deleteStory(s.storyId);
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
