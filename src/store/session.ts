import { create } from "zustand";
import type { Character, Keypoints } from "@/types/character";
import type { StepKind, Story } from "@/types/story";

interface SessionState {
  /** S-03 에서 고른 원본 파일과 표시용 URL */
  file: File | null;
  imageUrl: string | null;
  /** S-04 결과. S-06 에서 보정을 저장하면 서버가 돌려준 값으로 바뀐다 */
  character: Character | null;
  /** 화면에 펴는 관절. S-06 에서 끄는 동안은 저장 전 값이다 */
  keypoints: Keypoints | null;
  /** S-07 단계별 선택 */
  picks: Partial<Record<StepKind, string>>;
  /** S-07 말로 덧붙인 아이 말 (단계별). 카드 글자 대신 이야기에 들어간다 */
  said: Partial<Record<StepKind, string>>;
  /** S-08 결과 */
  story: Story | null;
  /** E-01 로 넘길 오류 코드 */
  errorCode: string | null;

  setFile: (f: File | null) => void;
  setCharacter: (c: Character | null) => void;
  setKeypoints: (k: Keypoints | null) => void;
  pick: (kind: StepKind, id: string) => void;
  say: (kind: StepKind, text: string | null) => void;
  setStory: (s: Story | null) => void;
  setError: (code: string | null) => void;
  resetStory: () => void;
  resetAll: () => void;
}

export const useSession = create<SessionState>((set, get) => ({
  file: null,
  imageUrl: null,
  character: null,
  keypoints: null,
  picks: {},
  said: {},
  story: null,
  errorCode: null,

  setFile: (f) => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file: f, imageUrl: f ? URL.createObjectURL(f) : null });
  },
  setCharacter: (c) => set({ character: c, keypoints: c ? c.keypoints : null }),
  setKeypoints: (k) => set({ keypoints: k }),
  /** 앞 단계를 바꾸면 이후 단계 선택은 초기화한다 (설계서 S-07 되돌리기) */
  pick: (kind, id) => {
    if (get().picks[kind] === id) return; // 동일한 카드를 다시 고른 경우 초기화하지 않음
    const order: StepKind[] = ["place", "problem", "action", "result"];
    const at = order.indexOf(kind);
    const next: Partial<Record<StepKind, string>> = {};
    const said: Partial<Record<StepKind, string>> = {};
    order.slice(0, at).forEach((k) => {
      const v = get().picks[k]; if (v) next[k] = v;
      const w = get().said[k]; if (w) said[k] = w;
    });
    next[kind] = id;
    // 카드를 바꾸면 그 단계에 덧붙인 말도 지운다 (다른 카드에 대한 말이었으니까)
    set({ picks: next, said });
  },
  say: (kind, text) => {
    const said = { ...get().said };
    if (text) said[kind] = text; else delete said[kind];
    set({ said });
  },
  setStory: (s) => set({ story: s }),
  setError: (code) => set({ errorCode: code }),
  resetStory: () => set({ picks: {}, said: {}, story: null }),
  resetAll: () => {
    const prev = get().imageUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ file: null, imageUrl: null, character: null, keypoints: null,
          picks: {}, said: {}, story: null, errorCode: null });
  },
}));
