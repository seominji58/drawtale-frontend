import { create } from "zustand";

export type AuthMode = "guest" | "member" | "unset";

const TOKEN_KEY = "storyblanks.token";
const MODE_KEY = "storyblanks.mode";
const TRIAL_KEY = "storyblanks.trial";
const ACCOUNT_KEY = "storyblanks.account";

/** 비회원 체험 한도. 설계서 11.2
 *  정수 하나만 localStorage 에 센다. 이야기 내용과 그림은 남기지 않으므로
 *  비회원 데이터 규칙(11.1)과 어긋나지 않는다. */
export const TRIAL_LIMIT = 2;
export const trialUsed = () => Number(localStorage.getItem(TRIAL_KEY) ?? 0);
export const trialLeft = () => Math.max(0, TRIAL_LIMIT - trialUsed());
export const consumeTrial = () => localStorage.setItem(TRIAL_KEY, String(trialUsed() + 1));

/** 비회원은 토큰을 sessionStorage 에만 둔다. 탭을 닫으면 함께 사라진다.
 *  회원은 localStorage 에 두어 다음 실행에도 유지된다. (설계서 11.1) */
function loadMode(): AuthMode {
  if (localStorage.getItem(TOKEN_KEY)) return "member";
  if (sessionStorage.getItem(MODE_KEY) === "guest") return "guest";
  return "unset";
}

interface AuthState {
  mode: AuthMode;
  /** 설정 화면에 보일 계정 이름 (이메일, 또는 「카카오 계정」) */
  account: string | null;
  /** 비회원 안내를 이미 한 번 띄웠는지. 반복해서 띄우지 않는다 */
  guestNoticeShown: boolean;
  startGuest: () => void;
  login: (account: string, token: string) => void;
  logout: () => void;
  markGuestNotice: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  mode: loadMode(),
  account: localStorage.getItem(ACCOUNT_KEY),
  guestNoticeShown: false,

  startGuest: () => {
    sessionStorage.setItem(MODE_KEY, "guest");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    set({ mode: "guest", account: null });
  },
  login: (account, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ACCOUNT_KEY, account);
    sessionStorage.removeItem(MODE_KEY);
    set({ mode: "member", account });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    sessionStorage.clear();
    localStorage.removeItem(TRIAL_KEY);
    set({ mode: "unset", account: null, guestNoticeShown: false });
  },
  markGuestNotice: () => set({ guestNoticeShown: true }),
}));

export const authToken = () => localStorage.getItem(TOKEN_KEY);
