/** 페인트 통 칸 찾기 — 화면(캔버스) 없이 도는 부분. drawing.fillAt 이 쓰고, tools/draw-check/check_fill.mjs 가 검사한다.
 *
 *  아이는 선을 끝까지 잇지 못하고 1 ~ 몇 px 틈을 남긴다 (pt_docs 20 4-3, 11/6). 그냥 퍼뜨리면
 *  - 틈이 그림판 가장자리로 이어지면 「선이 끊긴 곳은 이어 그려 주세요」만 뜨고 칠해지지 않았고
 *  - 틈이 옆의 닫힌 칸으로 이어지면 그 칸까지 칠해졌다 (머리를 칠했는데 몸통까지).
 *  그래서 선을 GAP 만큼 두껍게 본 판에서 칸을 찾고(틈 폭 2 × GAP 까지 막힌 것으로), 찾은 칸을 원래 선까지 다시 넓힌다.
 *  다시 넓히는 폭은 GAP + 1 — 가장 가는 펜(6px)의 선 두께보다 작아 틈을 지나 옆 칸으로 넘어가지 않는다.
 *  누른 곳이 두껍게 본 선 안(선 바로 옆 · 아주 좁은 칸)이면 예전처럼 그냥 퍼뜨린다. */

/** 이 알파 값보다 진하면 선 */
export const INK = 100;
/** 이 반지름 안의 틈은 막힌 것으로 본다 — 틈 폭 6px 까지 */
export const GAP = 3;

/** alpha: 그림판 W × H 의 알파 값(0 ~ 255). (x, y) 를 둘러싼 닫힌 칸 = 1 인 판. 칸이 아니면(선 위 · 바깥과 이어짐) null */
export function fillMask(alpha: ArrayLike<number>, W: number, H: number, x: number, y: number, gap = GAP): Uint8Array | null {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const ink = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) ink[i] = alpha[i] > INK ? 1 : 0;
  const seed = y * W + x;
  if (ink[seed]) return null;
  if (gap <= 0) return flood(ink, W, H, seed);
  const thick = dilate(ink, W, H, gap);
  if (thick[seed]) return flood(ink, W, H, seed);
  const inner = flood(thick, W, H, seed);
  if (!inner) return null;          // 두껍게 봐도 바깥과 이어진다 — 정말 열린 칸
  return regrow(inner, ink, W, H, gap + 1);
}

/** 막힌 칸(block = 1)이 아닌 곳으로 seed 에서 4방향 퍼뜨리기. 그림판 가장자리에 닿으면 null */
function flood(block: Uint8Array, W: number, H: number, seed: number): Uint8Array | null {
  const seen = new Uint8Array(W * H);
  const stack = [seed];
  seen[seed] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W, y = (i - x) / W;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return null;
    for (const j of [i - 1, i + 1, i - W, i + W]) {
      if (!seen[j] && !block[j]) { seen[j] = 1; stack.push(j); }
    }
  }
  return seen;
}

/** 선을 반지름 r(원 모양)만큼 두껍게 */
function dilate(ink: Uint8Array, W: number, H: number, r: number): Uint8Array {
  const out = new Uint8Array(W * H);
  const offs: number[][] = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) offs.push([dx, dy]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!ink[y * W + x]) continue;
      for (const [dx, dy] of offs) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) out[yy * W + xx] = 1;
      }
    }
  }
  return out;
}

/** 칸을 선이 아닌 곳으로 steps 걸음 넓힌다 (두껍게 봤을 때 줄어든 선 가장자리를 되찾기) */
function regrow(region: Uint8Array, ink: Uint8Array, W: number, H: number, steps: number): Uint8Array {
  const out = region.slice();
  let front: number[] = [];
  for (let i = 0; i < W * H; i++) if (region[i]) front.push(i);
  for (let s = 0; s < steps && front.length; s++) {
    const next: number[] = [];
    for (const i of front) {
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H || out[j] || ink[j]) continue;
        out[j] = 1; next.push(j);
      }
    }
    front = next;
  }
  return out;
}
