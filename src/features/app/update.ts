/** 새 버전이 배포되면 열려 있던 탭도 새 화면 코드를 받게 한다 (2026-11-03).
 *  한 화면 앱이라 탭을 새로고침하기 전까지 옛 코드가 그대로 돈다. 배포 전에 열어 둔 탭이
 *  고친 뒤에도 사진 원본을 띄웠다 (사용자 「바뀐 게 없는데」, 서버에 정지 그림 요청이 한 번도 없었다).
 *
 *  5분마다 · 탭으로 돌아올 때 첫 화면(index.html)의 화면 코드 이름을 본다. 바뀌었으면
 *  만들던 것이 없는 화면(처음 · 안내 · 책장 · 설정 · 로그인)에 들어설 때 새로고침한다 —
 *  그림을 올리거나 이야기를 보는 도중에는 끊지 않는다 */
const SAFE = ["/", "/guide", "/stories", "/settings", "/welcome", "/login"];
const EVERY_MS = 5 * 60 * 1000;
const BUNDLE = /\/assets\/index-[\w-]+\.js/;

let stale = false;
let current: string | null = null;

async function check(): Promise<void> {
  if (!current || stale) return;
  try {
    const res = await fetch("/", { cache: "no-store" });
    const name = (await res.text()).match(BUNDLE)?.[0];
    if (name && name !== current) stale = true;
  } catch {
    // 오프라인이면 다음 확인 때 본다
  }
}

const reloadIfSafe = () => {
  if (stale && SAFE.includes(window.location.pathname)) window.location.reload();
};

/** App 이 한 번 부른다. 개발 서버(번들 이름 없음)에서는 아무것도 하지 않는다 */
export function watchUpdates(): () => void {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/index-"]');
  current = script ? new URL(script.src).pathname : null;
  if (!current) return () => {};
  const timer = setInterval(() => void check(), EVERY_MS);
  const onVisible = () => { if (document.visibilityState === "visible") void check().then(reloadIfSafe); };
  document.addEventListener("visibilitychange", onVisible);
  return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
}

/** 화면을 옮길 때마다 부른다. 안전한 화면이면 바로 확인하고, 바뀌었으면 새로고침한다 */
export function onRouteChange(): void {
  if (!current || !SAFE.includes(window.location.pathname)) return;
  if (stale) { window.location.reload(); return; }
  void check().then(reloadIfSafe);
}
