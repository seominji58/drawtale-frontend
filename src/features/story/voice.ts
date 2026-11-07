/** 아이 목소리 → 글자 (STT). S-07 「말로 덧붙이기」에서 쓴다.
 *
 * 지금은 **브라우저 내장 음성 인식**(Web Speech API)을 쓴다 (2026-09-29 사용자 결정).
 * 목소리는 브라우저 회사의 인식 서버로 가고, 우리는 녹음 파일을 저장하지 않는다.
 * 그래서 어른 설정의 「목소리로 덧붙이기」를 켜야만 쓴다 (기본 꺼짐, S-13).
 *
 * 백엔드 STT 로 바꿀 때는 이 파일의 `listen()` 만 바꾼다 — 녹음해서 우리 /api 로 보내는 식으로.
 * 화면 코드는 어느 쪽인지 모른다 (AGENTS.md 3.2). */

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 이 기기 브라우저가 음성 인식을 지원하는지 */
export const voiceSupported = () => ctor() !== null;

/** 왜 못 받았는지. 화면이 아이 말로 바꿔 보여 준다 */
export type ListenError = "no-speech" | "denied" | "unsupported" | "failed";

/** 한 번 듣고 글자로 돌려준다. 아무 말이 없으면 no-speech, 마이크 권한이 없으면 denied */
export function listen(signal?: AbortSignal): Promise<string> {
  const C = ctor();
  if (!C) return Promise.reject(new Error("unsupported" satisfies ListenError));
  return new Promise((resolve, reject) => {
    const r = new C();
    r.lang = "ko-KR";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.continuous = false;
    let text = "";
    r.onresult = (e) => { text = e.results[0]?.[0]?.transcript?.trim() ?? ""; };
    r.onerror = (e) => {
      const code: ListenError =
        e.error === "no-speech" ? "no-speech" :
        e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "failed";
      if (e.error !== "aborted") reject(new Error(code));
    };
    r.onend = () => (text ? resolve(text) : reject(new Error("no-speech" satisfies ListenError)));
    signal?.addEventListener("abort", () => r.abort(), { once: true });
    r.start();
  });
}
