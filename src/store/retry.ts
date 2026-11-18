/** E-01 「반복해서 걸러질 때」 (pt_docs 05 E-01, 06 4-3). 그림 분석(S-04)이 연속으로 걸러진 횟수.
 *  한 번 성공하면 0 으로 돌린다. ENGINE_ERROR · CONTENT_BLOCKED 는 그림 문제가 아니라 세지 않는다.
 *  메모리에만 둔다 — 새로고침하면 처음부터 센다 */
let fails = 0;

/** 반복 셈에 넣는 오류인지 */
// 시간 초과(ENGINE_TIMEOUT)도 그림 탓이 아니다 — 세면 두 번째에 「화면에 그리기」로 보내 그린 그림을 다시 그려야 했다 (11/9 사용자)
export const isPictureError = (code: string | null) =>
  !!code && code !== "ENGINE_ERROR" && code !== "CONTENT_BLOCKED" && code !== "BUSY" && code !== "ENGINE_TIMEOUT";

/** S-04 분석 결과를 센다. 성공이면 null */
export function countAnalysis(code: string | null) {
  if (code === null) fails = 0;
  else if (isPictureError(code)) fails += 1;
}

export const pictureFails = () => fails;
