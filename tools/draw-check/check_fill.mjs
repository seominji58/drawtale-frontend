// 페인트 통 칸 찾기 검사 (pt_docs 20 4-3, 2026-11-06). node tools/draw-check/check_fill.mjs
// 아이가 선을 끝까지 잇지 못한 그림 — 작은 틈(6px 까지)은 막힌 것으로, 넓은 구멍은 열린 것으로 봐야 한다.
// 경우마다 [이름, 그리기, 누를 곳, 칠해져야 할 곳들, 칠해지면 안 될 곳들 | null(칠해지면 안 됨)]. 「예전」 은 틈을 보지 않던 방식(gap 0)
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = join(mkdtempSync(join(tmpdir(), "draw-check-")), "fill.mjs");
await build({ entryPoints: ["src/features/draw/fill.ts"], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "error" });
const { fillMask } = await import(pathToFileURL(out).href);

const W = 800, H = 1000;

/** 둥근 끝 선 (캔버스 lineCap round 와 같은 모양) */
function stroke(a, pts, width) {
  const r = width / 2;
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
    for (let s = 0; s <= n; s++) disk(a, x1 + ((x2 - x1) * s) / n, y1 + ((y2 - y1) * s) / n, r);
  }
}
function disk(a, cx, cy, r) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if (x >= 0 && y >= 0 && x < W && y < H && (x - cx) ** 2 + (y - cy) ** 2 <= r * r) a[y * W + x] = 255;
}
/** 동그라미. gap = 두 선 끝(둥근 끝 포함) 사이의 빈 폭(px), 0 이면 닫힘. 틈은 오른쪽(0°)에 */
function circle(a, cx, cy, R, width, gap = 0) {
  let a0 = 0, a1 = 2 * Math.PI;
  if (gap > 0) { const half = Math.asin(Math.min(1, (gap + width) / 2 / R)); a0 = half; a1 = 2 * Math.PI - half; }
  const pts = [];
  for (let t = a0; t <= a1 + 1e-9; t += (a1 - a0) / 720) pts.push([cx + R * Math.cos(t), cy + R * Math.sin(t)]);
  stroke(a, pts, width);
}
/** 오른쪽 이웃 칸 — 왼쪽 벽은 왼쪽 칸과 함께 쓴다(그리지 않는다) */
function rightCell(a, x0, y0, x1, y1, width) { stroke(a, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], width); }
/** 네모 테두리. hole = 오른쪽 변 가운데의 빈 폭(px) */
function box(a, x0, y0, x1, y1, width, holeRight = 0) {
  stroke(a, [[x1, y0], [x0, y0], [x0, y1], [x1, y1]], width);
  if (!holeRight) return stroke(a, [[x1, y0], [x1, y1]], width);
  const my = (y0 + y1) / 2, h = (holeRight + width) / 2;
  stroke(a, [[x1, y0], [x1, my - h]], width);
  stroke(a, [[x1, my + h], [x1, y1]], width);
}

const C = (fn) => () => { const a = new Uint8Array(W * H); fn(a); return a; };
const CASES = [
  ["닫힌 동그라미 (보통 펜)", C((a) => circle(a, 400, 500, 150, 12)), [400, 500], [[400, 380], [300, 500]], [[400, 300], [100, 100]]],
  ["틈 2px 동그라미", C((a) => circle(a, 400, 500, 150, 12, 2)), [400, 500], [[400, 380], [520, 500]], [[600, 500]]],
  ["틈 5px 동그라미", C((a) => circle(a, 400, 500, 150, 12, 5)), [400, 500], [[400, 380], [520, 500]], [[600, 500]]],
  ["틈 12px 동그라미 (정말 열림)", C((a) => circle(a, 400, 500, 150, 12, 12)), [400, 500], null],
  ["가는 펜 닫힌 동그라미", C((a) => circle(a, 400, 500, 150, 6)), [400, 500], [[400, 360]], [[400, 300]]],
  ["굵은 펜 틈 4px 동그라미", C((a) => circle(a, 400, 500, 150, 24, 4)), [400, 500], [[400, 380]], [[600, 500]]],
  ["가는 펜 틈 4px 동그라미", C((a) => circle(a, 400, 500, 150, 6, 4)), [400, 500], [[400, 360], [530, 500]], [[600, 500]]],
  ["이웃 칸 벽에 틈 3px — 옆 칸이 칠해지면 안 됨",
    C((a) => { box(a, 150, 300, 400, 700, 12, 3); rightCell(a, 400, 300, 650, 700, 12); }), [275, 500], [[200, 350], [380, 500]], [[525, 500], [450, 350]]],
  ["이웃 칸 벽에 틈 6px",
    C((a) => { box(a, 150, 300, 400, 700, 12, 6); rightCell(a, 400, 300, 650, 700, 12); }), [275, 500], [[200, 350]], [[525, 500]]],
  ["이웃 칸 벽에 구멍 30px (정말 이어짐 — 둘 다)",
    C((a) => { box(a, 150, 300, 400, 700, 12, 30); rightCell(a, 400, 300, 650, 700, 12); }), [275, 500], [[200, 350], [525, 500]], []],
  ["몸통 + 좁은 다리 칸(안쪽 12px) — 다리 끝까지",
    C((a) => { stroke(a, [[250, 300], [550, 300], [550, 600], [418, 600], [418, 800], [394, 800], [394, 600], [250, 600], [250, 300]], 12); }),
    [400, 450], [[406, 790], [406, 650], [300, 350]], [[100, 100]]],
  ["몸통 + 아주 좁은 다리 칸(안쪽 6px) — 몸통은 칠함",
    C((a) => { stroke(a, [[250, 300], [550, 300], [550, 600], [412, 600], [412, 800], [400, 800], [400, 600], [250, 600], [250, 300]], 6); }),
    [400, 450], [[300, 350]], [[100, 100]]],
  ["작은 눈 (반지름 10, 가는 펜)", C((a) => circle(a, 400, 500, 10, 6)), [400, 500], [[400, 500]], [[400, 530]]],
  ["아주 작은 눈 (반지름 7, 가는 펜)", C((a) => circle(a, 400, 500, 7, 6)), [400, 500], [[400, 500]], [[400, 520]]],
  ["선 위를 누름", C((a) => circle(a, 400, 500, 150, 12)), [550, 500], null],
  ["바깥(바탕)을 누름", C((a) => circle(a, 400, 500, 150, 12)), [100, 100], null],
];

const at = (m, [x, y]) => m[Math.round(y) * W + Math.round(x)] === 1;
let fail = 0;
const t0 = Date.now();
for (const [name, draw, pt, yes, no] of CASES) {
  const a = draw();
  const res = (gap) => {
    const m = fillMask(a, W, H, pt[0], pt[1], gap);
    if (yes === null) return m === null ? "맞음(안 칠함)" : "틀림(칠함)";
    if (!m) return "틀림(안 칠해짐)";
    const missing = yes.filter((p) => !at(m, p)), leaked = no.filter((p) => at(m, p));
    return missing.length || leaked.length ? `틀림(${missing.length ? "덜 칠함 " + JSON.stringify(missing) : ""}${leaked.length ? " 샘 " + JSON.stringify(leaked) : ""})` : "맞음";
  };
  const now = res(undefined), before = res(0);
  if (!now.startsWith("맞음")) fail++;
  console.log(`${now.startsWith("맞음") ? "통과" : "실패"}  ${name.padEnd(30)} 지금: ${now}   예전: ${before}`);
}
console.log(`\n${CASES.length - fail} / ${CASES.length} 통과 (${Date.now() - t0}ms)`);
process.exit(fail ? 1 : 0);
