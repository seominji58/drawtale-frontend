import { create } from "zustand";
import { getGuardianStatus, markOnboarded } from "@/api";
import type { GuardianStatus } from "@/api";

/** 보호자 비밀번호로 여는 것들 (pt_docs 20 3장 「기능 드러내기」, 2026-11-06).
 *
 *  - 설정은 누구나 톱니로 연다. 「보호자 칸」은 비밀번호를 넣어야 열리고, **설정을 닫을 때까지** 열려 있다 (`unlocked`).
 *  - 아이 화면의 잠긴 보호자 기능(🔒 사진으로 그림 올리기 …)은 누를 때마다 비밀번호를 묻는다 (`ask(…, { keep: false })`).
 *  - 비밀번호를 아직 안 만든 보호자는 처음 열 때 만든다 (건너뛰기 없음, 결정 ④).
 *  - 비밀번호 창은 components/GuardianGate.tsx 하나가 App 에 떠 있고, 여기 `request` 를 보고 연다 */

/** 「비밀번호를 잊었어요」 → 다시 로그인한 뒤 10분 안에는 지금 비밀번호 없이 새로 정한다 (서버도 같은 10분) */
const RESET_KEY = "storyblanks.pinReset";
const RESET_MS = 10 * 60_000;
/** 보호자 소개 카드를 이 기기에서 봤는지 (서버 onboarded 를 못 받아도 다시 띄우지 않게) */
const INTRO_KEY = "storyblanks.introSeen";

export type PinMode = "check" | "create" | "reset" | "change";

interface Request {
  /** 비밀번호 창 위에 보일 한 줄 — 무엇을 열려는지 */
  title: string;
  mode: PinMode;
  keep: boolean;
  onOk: () => void;
}

interface GuardianState {
  status: GuardianStatus | null;
  unlocked: boolean;
  request: Request | null;
  /** 보호자 소개 카드를 지금 보이는지 */
  intro: boolean;
  load: () => Promise<void>;
  /** 보호자만 할 수 있는 일 앞에서 부른다. 이미 열려 있으면 바로 onOk */
  ask: (title: string, onOk: () => void, opts?: { keep?: boolean }) => void;
  /** 설정의 「비밀번호 바꾸기」 */
  change: () => void;
  /** 비밀번호 창이 끝났다 (ok 면 request.onOk) */
  finish: (ok: boolean) => void;
  lock: () => void;
  pinCreated: () => void;
  openIntro: () => void;
  closeIntro: () => void;
  /** 「비밀번호를 잊었어요」 — 다시 로그인하러 가기 전에 */
  startReset: () => void;
}

export function resetPending(): boolean {
  try {
    const at = Number(localStorage.getItem(RESET_KEY));
    return !!at && Date.now() - at < RESET_MS;
  } catch { return false; }
}

function introSeen(): boolean {
  try { return !!localStorage.getItem(INTRO_KEY); } catch { return false; }
}

export const useGuardian = create<GuardianState>((set, get) => ({
  status: null,
  unlocked: false,
  request: null,
  intro: false,
  load: async () => {
    try {
      const status = await getGuardianStatus();
      set({ status });
      // 처음 가입 · 로그인한 보호자에게 한 번 (다른 기기에서 이미 봤으면 띄우지 않는다)
      if (!status.onboarded && !introSeen()) set({ intro: true });
    } catch { /* 못 받으면 비밀번호 창이 처음에 다시 묻는다 */ }
  },
  ask: (title, onOk, opts) => {
    const keep = opts?.keep ?? false;
    if (get().unlocked) { onOk(); return; }
    const pinSet = get().status?.pinSet;
    const mode: PinMode = pinSet === false ? "create" : resetPending() ? "reset" : "check";
    set({ request: { title, mode, keep, onOk } });
  },
  change: () => set({ request: { title: "보호자 비밀번호 바꾸기", mode: "change", keep: true, onOk: () => undefined } }),
  finish: (ok) => {
    const req = get().request;
    set({ request: null, ...(ok && req?.keep ? { unlocked: true } : {}) });
    if (ok && req) {
      if (req.mode === "create" || req.mode === "reset") get().pinCreated();
      req.onOk();
    }
  },
  lock: () => set({ unlocked: false }),
  pinCreated: () => {
    try { localStorage.removeItem(RESET_KEY); } catch { /* 없어도 된다 */ }
    set((s) => ({ status: { onboarded: s.status?.onboarded ?? false, pinSet: true } }));
  },
  openIntro: () => set({ intro: true }),
  closeIntro: () => {
    try { localStorage.setItem(INTRO_KEY, "1"); } catch { /* 저장 못 해도 서버가 기억한다 */ }
    set((s) => ({ intro: false, status: s.status ? { ...s.status, onboarded: true } : s.status }));
    void markOnboarded();
  },
  startReset: () => {
    try { localStorage.setItem(RESET_KEY, String(Date.now())); } catch { /* 저장 못 하면 지금 비밀번호를 물을 뿐 */ }
    set({ request: null, unlocked: false });
  },
}));
