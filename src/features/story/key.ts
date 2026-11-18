/** 동작 영상의 바탕을 투명하게 지운다 (2026-11-03 장소 배경 위에 캐릭터를 세우려고).
 *
 *  렌더 엔진은 투명 바탕으로 그리지만 MP4 는 투명을 담지 못해 단색 바탕이 깔린다
 *  (예전 영상은 흰색, 이후는 자홍 #FF00FF — drawtale-ai renderer.py).
 *  네 귀퉁이 색을 바탕색으로 보고, **테두리에서 이어진** 그 색만 지운다.
 *  캐릭터 안의 흰 곳(색칠하지 않은 몸 · 눈)은 윤곽선에 막혀 남는다. */

/** 바탕색에서 이만큼(RGB 거리) 안이면 바탕으로 본다. 영상 압축으로 바탕이 조금씩 얼룩진다 */
const NEAR = 110;
/** 선에 갇힌 바탕(자홍일 때만)은 이만큼 안이어야 지운다 — 아이가 칠한 진분홍은 남게 */
const NEAR_ENCLOSED = 70;

/** 자홍 바탕이 번진 테두리에서 자홍 기운(빨강 · 파랑이 초록보다 높은 만큼)을 뺀다. 흰 바탕은 번져도 티가 안 나 그대로 둔다 */
function despill(d: Uint8ClampedArray, i: number, r: number, g: number, b: number) {
  if (!(r > 200 && b > 200 && g < 80)) return;
  const m = Math.min(d[i], d[i + 2]) - d[i + 1];
  if (m > 0) { d[i] -= m; d[i + 2] -= m; }
}

export interface Box { x0: number; y0: number; x1: number; y1: number }

/** data 를 제자리에서 바꾼다. 캐릭터가 차지한 상자(0~1 비율)를 돌려준다. 캐릭터가 없으면 null */
export function keyOut(img: ImageData): Box | null {
  const { width: w, height: h, data: d } = img;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  // 이미 투명한 그림(잘라 낸 정지 그림)은 지울 것이 없다
  const keyed = corners.every((p) => d[p * 4 + 3] > 0);
  if (keyed) {
    const [r, g, b] = [0, 1, 2].map((c) => corners.reduce((s, p) => s + d[p * 4 + c], 0) / 4);
    const near = (p: number) => {
      const i = p * 4;
      const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
      return dr * dr + dg * dg + db * db < NEAR * NEAR;
    };
    const seen = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    let top = 0;
    const push = (p: number) => { if (!seen[p] && near(p)) { seen[p] = 1; stack[top++] = p; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (top > 0) {
      const p = stack[--top];
      const x = p % w;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (p >= w) push(p - w);
      if (p < (h - 1) * w) push(p + w);
    }
    // 자홍 바탕은 아이 그림에 거의 없는 색이라, 테두리와 떨어진 곳(다리 사이처럼 선에 갇힌 바탕)도 지운다.
    // 진분홍 그림이 지워지지 않게 이때는 더 가까운 색만 (2026-11-03 다리 사이에 자홍이 남았다)
    if (r > 200 && b > 200 && g < 80) {
      for (let p = 0; p < w * h; p++) {
        if (seen[p]) continue;
        const i = p * 4;
        const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
        if (dr * dr + dg * dg + db * db < NEAR_ENCLOSED * NEAR_ENCLOSED) seen[p] = 1;
      }
    }
    for (let p = 0; p < w * h; p++) if (seen[p]) d[p * 4 + 3] = 0;
    // 바탕과 맞닿은 두 줄: 압축으로 바탕색이 번져 테두리에 색 띠가 남는다. 바탕색 기운을 빼고, 첫 줄은 반투명으로
    let ring = seen;
    for (let band = 1; band <= 2; band++) {
      const next = new Uint8Array(w * h);
      for (let p = 0; p < w * h; p++) {
        if (seen[p]) continue;
        const x = p % w;
        if (!((x > 0 && ring[p - 1]) || (x < w - 1 && ring[p + 1]) || (p >= w && ring[p - w]) || (p < (h - 1) * w && ring[p + w]))) continue;
        next[p] = 1;
        despill(d, p * 4, r, g, b);
        if (band === 1) d[p * 4 + 3] = 128;
      }
      for (let p = 0; p < w * h; p++) if (next[p]) seen[p] = 2;
      ring = next;
    }
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 127) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
}
