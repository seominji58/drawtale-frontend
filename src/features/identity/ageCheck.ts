import { ENGINE } from "@/api";

/** 보호자 나이 확인: 포트원 V2 본인인증(KG이니시스) 창을 연다 (2026-11-09).
 *
 *  상점 아이디 · 채널 키는 공개해도 되는 값이라 프론트 .env 에 둔다. 결과(이름 · 생년월일)는 화면이 받지 않는다,
 *  인증 건 번호만 서버에 넘기면 서버가 포트원에 직접 물어 만 14세 이상인지 본다 (백엔드 app/services/identity.py).
 *
 *  SDK 는 npm 으로 들이지 않고(AGENTS 2절 「라이브러리를 새로 추가하지 않는다」) 쓸 때만 포트원 CDN 에서 불러온다.
 *  배포 보안 헤더(CSP)에 cdn.portone.io · *.portone.io · *.inicis.com 을 열어 두었다.
 *
 *  PC 는 팝업으로 열리고 끝나면 약속이 풀린다. 폰은 KG이니시스 화면으로 이동했다가 `redirectUrl` 로
 *  `?identityVerificationId=…&code=…` 를 달고 돌아온다 (`returnedVerification`). */

const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string | undefined;
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_IDV_CHANNEL_KEY as string | undefined;
const SDK = "https://cdn.portone.io/v2/browser-sdk.js";
const useMock = ENGINE === "mock";

/** 이 빌드가 본인인증을 묻는지. 목 엔진은 창 없이 흉내 낸다, 실서버 모드에서 키가 없으면 묻지 않는다
 *  (그때 서버가 요구하면 가입에서 AGE_CHECK_REQUIRED 가 난다) */
export const ageCheckEnabled = useMock || (!!STORE_ID && !!CHANNEL_KEY);

interface PortOneResult { identityVerificationId?: string; code?: string; message?: string }
interface PortOneSdk {
  requestIdentityVerification(req: {
    storeId: string; identityVerificationId: string; channelKey: string; redirectUrl?: string;
  }): Promise<PortOneResult | undefined>;
}
declare global { interface Window { PortOne?: PortOneSdk } }

let loading: Promise<PortOneSdk> | null = null;
function loadSdk(): Promise<PortOneSdk> {
  if (window.PortOne) return Promise.resolve(window.PortOne);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK;
    s.async = true;
    s.onload = () => (window.PortOne ? resolve(window.PortOne) : reject(new Error("SDK")));
    s.onerror = () => { loading = null; s.remove(); reject(new Error("SDK")); };
    document.head.appendChild(s);
  });
  return loading;
}

/** 인증 화면이 열릴 때 미리 불러 둔다. 단추를 누른 뒤에 내려받으면 그 사이 「사용자가 누른 것」이 끊겨
 *  브라우저(특히 Safari)가 인증 팝업을 막을 수 있다 */
export function preloadAgeCheck() {
  if (!useMock && STORE_ID && CHANNEL_KEY) void loadSdk().catch(() => {});
}

export type AgeCheckOutcome =
  | { ok: true; id: string }
  | { ok: false; reason: "cancelled" | "failed" | "unavailable"; message?: string };

/** 인증 창을 연다. back 은 폰에서 KG이니시스 화면을 다녀온 뒤 돌아올 경로(검색어 없이) */
export async function openAgeCheck(back: string): Promise<AgeCheckOutcome> {
  const id = `idv-${crypto.randomUUID()}`;
  if (useMock) return { ok: true, id };
  if (!STORE_ID || !CHANNEL_KEY) return { ok: false, reason: "unavailable" };
  let sdk: PortOneSdk;
  try { sdk = await loadSdk(); } catch { return { ok: false, reason: "unavailable" }; }
  const r = await sdk.requestIdentityVerification({
    storeId: STORE_ID, identityVerificationId: id, channelKey: CHANNEL_KEY,
    redirectUrl: `${location.origin}${back}`,
  }).catch(() => undefined);
  if (!r) return { ok: false, reason: "failed" };
  if (r.code !== undefined) return { ok: false, reason: /cancel|취소/i.test(`${r.code} ${r.message ?? ""}`) ? "cancelled" : "failed", message: r.message };
  return { ok: true, id: r.identityVerificationId ?? id };
}

/** 폰에서 KG이니시스 화면을 다녀와 돌아왔으면 그 결과. 주소의 검색어는 지운다 (새로고침에 다시 보내지 않게) */
export function returnedVerification(): AgeCheckOutcome | null {
  const q = new URLSearchParams(location.search);
  const id = q.get("identityVerificationId");
  if (!id) return null;
  const code = q.get("code"), message = q.get("message") ?? undefined;
  history.replaceState(history.state, "", location.pathname);
  if (code) return { ok: false, reason: /cancel|취소/i.test(`${code} ${message ?? ""}`) ? "cancelled" : "failed", message };
  return { ok: true, id };
}

// ─── 가입 전 나이 확인증 (서버가 준 10분짜리, 가입 요청에 함께 보낸다) ───
const TICKET_KEY = "storyblanks.ageTicket";
const TICKET_MS = 9 * 60_000;   // 서버는 10분, 조금 먼저 버린다

export function saveAgeTicket(ticket: string) {
  try { sessionStorage.setItem(TICKET_KEY, JSON.stringify({ ticket, at: Date.now() })); } catch { /* 저장 못 하면 다시 인증 */ }
}

export function ageTicket(): string | undefined {
  try {
    const v = JSON.parse(sessionStorage.getItem(TICKET_KEY) ?? "null") as { ticket: string; at: number } | null;
    return v && Date.now() - v.at < TICKET_MS ? v.ticket : undefined;
  } catch { return undefined; }
}

export function clearAgeTicket() {
  try { sessionStorage.removeItem(TICKET_KEY); } catch { /* 없어도 된다 */ }
}

/** 서버 오류 code → 보호자에게 보일 말 */
export const AGE_CHECK_TEXT: Record<string, string> = {
  AGE_TOO_YOUNG: "만 14세 이상의 보호자 또는 교사만 가입할 수 있어요.",
  AGE_CHECK_FAILED: "본인인증이 끝나지 않았어요. 다시 해 주세요.",
  AGE_CHECK_EXPIRED: "본인인증 시간이 지났어요. 다시 해 주세요.",
  AGE_CHECK_USED: "이미 다른 계정에 쓴 본인인증이에요. 다시 해 주세요.",
  AGE_CHECK_REQUIRED: "가입하려면 먼저 본인인증을 해 주세요.",
  AGE_CHECK_NOT_CONFIGURED: "지금은 본인인증을 할 수 없어요. 잠시 뒤에 다시 해 주세요.",
  AGE_CHECK_UNAVAILABLE: "본인인증 결과를 받지 못했어요. 다시 해 주세요.",
  cancelled: "본인인증을 취소했어요.",
  failed: "본인인증이 끝나지 않았어요. 다시 해 주세요.",
  unavailable: "지금은 본인인증 창을 열 수 없어요. 잠시 뒤에 다시 해 주세요.",
};
