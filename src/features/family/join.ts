/** 선생님이 보낸 보호자 연결 링크 (`/join/:code`, 설계 「보호자-교사-계정」 3-1 · 4-4, 2026-11-18).
 *  링크를 연 사람이 아직 로그인하지 않았으면 코드를 이 탭에 맡겨 두고 로그인 · 가입을 거친다(카카오 · 구글로 나갔다 와도
 *  같은 탭이라 sessionStorage 가 남는다). 로그인한 뒤 JoinDialog 가 이어서 연결한다 */
const KEY = "storyblanks.join";

export function pendingJoin(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

export function setPendingJoin(code: string): void {
  try { sessionStorage.setItem(KEY, code); } catch { /* 저장 못 하면 링크를 다시 열면 된다 */ }
}

export function clearPendingJoin(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* 없어도 된다 */ }
}
