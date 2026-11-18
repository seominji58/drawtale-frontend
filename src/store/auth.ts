import { create } from "zustand";

/** 가입 없이는 쓸 수 없다 (pt_docs 03 F-ACC-03 · 04, 2026-10-12 결정 · 11-03 코드 반영).
 *  비회원 시작 · 체험 2편(F-ACC-02)은 뺐다 — 동의 없이 아이 자료가 들어오는 경로를 남기지 않는다 */
export type AuthMode = "member" | "unset";

const TOKEN_KEY = "storyblanks.token";
const ACCOUNT_KEY = "storyblanks.account";
// 예전 비회원 표시 · 체험 수. 남아 있으면 지운다
const OLD_KEYS = ["storyblanks.mode", "storyblanks.trial"];

/** 회원은 localStorage 에 두어 다음 실행에도 유지된다. (설계서 11.1) */
function loadMode(): AuthMode {
  sessionStorage.removeItem(OLD_KEYS[0]);
  localStorage.removeItem(OLD_KEYS[1]);
  return localStorage.getItem(TOKEN_KEY) ? "member" : "unset";
}

interface AuthState {
  mode: AuthMode;
  /** 설정 화면에 보일 계정 이름 (「카카오 계정」 등) */
  account: string | null;
  login: (account: string, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  mode: loadMode(),
  account: localStorage.getItem(ACCOUNT_KEY),

  login: (account, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ACCOUNT_KEY, account);
    set({ mode: "member", account });
  },
  logout: () => {
    // 서버에서도 이 토큰을 지운다 (2026-11-02 보안 — 전에는 기기에서만 지워 30일 동안 살아 있었다).
    // 실패해도 기기에서는 로그아웃한다. 목 엔진은 서버가 없다
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && (import.meta.env.VITE_ENGINE ?? "mock") !== "mock") {
      const base = import.meta.env.VITE_API_BASE || "/api/v1";
      void fetch(`${base}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, keepalive: true })
        .catch(() => undefined);
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
    sessionStorage.clear();
    set({ mode: "unset", account: null });
  },
}));

export const authToken = () => localStorage.getItem(TOKEN_KEY);
