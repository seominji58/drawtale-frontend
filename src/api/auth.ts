import { ENGINE } from "./index";

/* 로그인은 백엔드 계약에 아직 없다 (백엔드 계약 4절 9번 「로그인/세션 없음」).
   아래 경로와 모양은 프론트가 제안한 것이다 — docs/api-contract.md 4절.
   목 엔진에서는 서버 없이 끝까지 돈다. */

export interface AuthResult {
  token: string;
  /** 설정 화면에 보일 계정 이름. 소셜 로그인은 이름을 받지 않으므로 제공자 이름이 온다 */
  account: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const useMock = ENGINE === "mock";

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`/api/v1${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error((data as { error?: { code?: string } } | null)?.error?.code ?? `HTTP_${r.status}`);
  return data as T;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  if (useMock) {
    await wait(500);
    if (!password || password.length < 4) throw new Error("INVALID");
    return { token: "mock-token", account: email };
  }
  return post<AuthResult>("/auth/login", { email, password });
}

export async function signup(email: string, password: string): Promise<AuthResult> {
  if (useMock) {
    await wait(600);
    return { token: "mock-token", account: email };
  }
  return post<AuthResult>("/auth/signup", { email, password });
}

// ─── 소셜 로그인 ───
// 인가 코드 방식이다. 프론트는 카카오 화면으로 보내고 돌아온 code 를 백엔드에 넘길 뿐이고,
// 토큰 교환(클라이언트 시크릿)은 백엔드가 한다 — AGENTS.md 3.2 「API 키를 프론트에 두지 않는다」.
// SDK 를 쓰지 않는다. 주소 하나로 충분하다.

export type SocialProvider = "kakao";

export const PROVIDER_NAME: Record<SocialProvider, string> = { kakao: "카카오" };

/** 로그인할 때(login)와 약관에 동의하고 가입할 때(signup)를 가른다.
 *  처음 온 사람이 login 으로 들어오면 서버가 SIGNUP_REQUIRED 를 돌려주고 S-16 으로 보낸다 */
export type SocialIntent = "login" | "signup";

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID;
const PENDING_KEY = "storyblanks.oauth";

/** 실서버 모드에서 카카오 앱 키가 없으면 버튼을 숨긴다 */
export const socialAvailable = (p: SocialProvider) =>
  useMock || (p === "kakao" && !!KAKAO_CLIENT_ID);

/** 카카오 개발자 콘솔의 Redirect URI 에 이 주소를 그대로 등록해야 한다 */
export const redirectUri = (p: SocialProvider) => `${location.origin}/auth/${p}/callback`;

interface Pending { state: string; provider: SocialProvider; intent: SocialIntent }

/** 카카오 인가 화면으로 떠난다. 돌아오는 곳은 `/auth/kakao/callback` */
export function startSocialLogin(p: SocialProvider, intent: SocialIntent) {
  const state = crypto.randomUUID();   // 돌아왔을 때 우리가 보낸 요청인지 확인한다 (CSRF)
  const pending: Pending = { state, provider: p, intent };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  if (useMock) {
    location.assign(`${redirectUri(p)}?code=mock-code&state=${state}`);
    return;
  }
  // scope 를 넣지 않는다. 동의 항목도 콘솔에서 전부 꺼 둔다 → 회원번호만 받는다
  const q = new URLSearchParams({
    client_id: KAKAO_CLIENT_ID ?? "",
    redirect_uri: redirectUri(p),
    response_type: "code",
    state,
  });
  location.assign(`https://kauth.kakao.com/oauth/authorize?${q}`);
}

/** 콜백 화면에서 부른다. 개발 모드 StrictMode 가 effect 를 두 번 돌려도
 *  인가 코드는 한 번만 쓸 수 있으므로 같은 code 는 같은 약속을 돌려준다 */
const inflight = new Map<string, Promise<AuthResult>>();

export function finishSocialLogin(p: SocialProvider, params: URLSearchParams): Promise<AuthResult> {
  const code = params.get("code") ?? "";
  const hit = inflight.get(code);
  if (hit) return hit;
  const job = exchange(p, params, code);
  inflight.set(code, job);
  return job;
}

async function exchange(p: SocialProvider, params: URLSearchParams, code: string): Promise<AuthResult> {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  const pending = raw ? (JSON.parse(raw) as Pending) : null;

  // 사용자가 카카오 화면에서 「취소」를 누르면 error=access_denied 로 돌아온다
  if (params.get("error")) {
    throw new Error(params.get("error") === "access_denied" ? "CANCELLED" : "PROVIDER_ERROR");
  }
  if (!code || !pending || pending.state !== params.get("state") || pending.provider !== p) {
    throw new Error("STATE_MISMATCH");
  }
  const agreed = pending.intent === "signup";

  if (useMock) {
    await wait(600);
    // 목에서도 「처음 온 사람은 가입부터」 흐름을 볼 수 있게, 가입한 적이 있는지만 기억한다
    const KNOWN = "storyblanks.mock.kakao";
    if (!agreed && !localStorage.getItem(KNOWN)) throw new Error("SIGNUP_REQUIRED");
    localStorage.setItem(KNOWN, "1");
    return { token: "mock-kakao-token", account: `${PROVIDER_NAME[p]} 계정` };
  }
  return post<AuthResult>(`/auth/${p}`, { code, redirect_uri: redirectUri(p), agreed });
}
