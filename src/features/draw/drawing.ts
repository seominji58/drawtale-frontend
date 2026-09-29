/** S-03D 화면에 그리기 — 부위별 안내 모양, 도장, 획 그리기, 연결 확인, PNG 내보내기.
 *
 * 좌표는 800×1000 논리 좌표 하나로 다룬다. 화면에 그릴 때와 PNG 로 내보낼 때 배율만 다르다.
 *
 * 모양과 자리는 실측으로 정했다 (docs/open-decisions.md 0-4, 2026-09-29).
 * - 선만 있는 도형도 **조각끼리 닿아 있으면** 검출·관절·마스크가 모두 된다. 틈이 있으면 머리·팔이 빠진다
 *   → 도장은 항상 몸에 겹치는 자리에 찍고, 올리기 전에 `countPieces` 로 이어졌는지 확인한다
 * - 팔을 몸통에 붙여 그리면 움직일 때 팔이 몸통에 눌려 뭉개진다 → 팔 자리를 옆으로 벌려 둔다
 * - 다리가 길면 검출 상자가 발끝을 자른다 → 아이 그림 비율로 짧게 둔다
 */

export const W = 800;
export const H = 1000;

export interface Pt { x: number; y: number }

export type Part = "head" | "body" | "arms" | "legs";
export const PARTS: Part[] = ["head", "body", "arms", "legs"];

export type StampId = "head" | "body" | "arm_r" | "arm_l" | "leg_r" | "leg_l";

export type Item =
  | { kind: "stroke"; pts: Pt[] }
  | { kind: "stamp"; id: StampId };

export type Drawing = Record<Part, Item[]>;
export const emptyDrawing = (): Drawing => ({ head: [], body: [], arms: [], legs: [] });

const INK = "#3A3733";
const LINE = 10;      // 도장 선 굵기
const PEN = 12;       // 손 그리기 선 굵기

type Shape =
  | { type: "circle"; c: Pt; r: number }
  | { type: "ellipse"; c: Pt; rx: number; ry: number }
  | { type: "capsule"; a: Pt; b: Pt; w: number };

/** 도장 모양이자 안내 점선 모양. 팔·다리의 어깨·엉덩이 쪽 끝은 몸 타원 안에 들어가 있다 */
const SHAPES: Record<StampId, Shape> = {
  head:  { type: "circle", c: { x: 400, y: 215 }, r: 115 },
  body:  { type: "ellipse", c: { x: 400, y: 475 }, rx: 135, ry: 175 },
  // 캐릭터의 오른팔은 화면 왼쪽에 있다 (백엔드 계약 1-1)
  arm_r: { type: "capsule", a: { x: 300, y: 400 }, b: { x: 150, y: 540 }, w: 64 },
  arm_l: { type: "capsule", a: { x: 500, y: 400 }, b: { x: 650, y: 540 }, w: 64 },
  leg_r: { type: "capsule", a: { x: 355, y: 600 }, b: { x: 345, y: 820 }, w: 74 },
  leg_l: { type: "capsule", a: { x: 445, y: 600 }, b: { x: 455, y: 820 }, w: 74 },
};

/** 부위마다 안내하는 모양 */
export const GUIDE: Record<Part, StampId[]> = {
  head: ["head"], body: ["body"], arms: ["arm_r", "arm_l"], legs: ["leg_r", "leg_l"],
};

/** 도장 모드에서 누른 자리에 맞는 도장. 팔·다리는 화면 왼쪽을 누르면 캐릭터의 오른쪽이다 */
export function stampFor(part: Part, p: Pt): StampId {
  const [first, second] = GUIDE[part];
  if (!second) return first;
  return p.x < W / 2 ? first : second;
}

function shapePath(ctx: CanvasRenderingContext2D, s: Shape) {
  ctx.beginPath();
  if (s.type === "circle") {
    ctx.arc(s.c.x, s.c.y, s.r, 0, Math.PI * 2);
  } else if (s.type === "ellipse") {
    ctx.ellipse(s.c.x, s.c.y, s.rx, s.ry, 0, 0, Math.PI * 2);
  } else {
    // 양 끝이 둥근 길쭉이
    const ang = Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x);
    const r = s.w / 2;
    ctx.arc(s.a.x, s.a.y, r, ang + Math.PI / 2, ang - Math.PI / 2);
    ctx.arc(s.b.x, s.b.y, r, ang - Math.PI / 2, ang + Math.PI / 2);
    ctx.closePath();
  }
}

function drawStamp(ctx: CanvasRenderingContext2D, id: StampId) {
  shapePath(ctx, SHAPES[id]);
  ctx.stroke();
  if (id === "head") {
    // 도장 머리에는 얼굴을 넣어 둔다. 손으로 그릴 때는 아이가 그린다
    const { c } = SHAPES.head as { c: Pt };
    ctx.beginPath();
    ctx.arc(c.x - 38, c.y - 10, 11, 0, Math.PI * 2);
    ctx.arc(c.x + 38, c.y - 10, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c.x, c.y + 18, 40, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  if (pts.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 1) {
    ctx.lineTo(pts[0].x + 0.1, pts[0].y);   // 점 하나도 보이게
  } else {
    // 중점을 잇는 2차 곡선으로 매끈하게
    for (let i = 1; i < pts.length - 1; i++) {
      const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x, last.y);
  }
  ctx.stroke();
}

function inkStyle(ctx: CanvasRenderingContext2D, color = INK) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash([]);
}

/** 그림 전체를 그린다. ctx 는 이미 논리 좌표(800×1000) 배율이 걸려 있어야 한다 */
export function drawItems(ctx: CanvasRenderingContext2D, drawing: Drawing, live?: Pt[], color?: string) {
  inkStyle(ctx, color);
  for (const part of PARTS) {
    for (const it of drawing[part]) {
      if (it.kind === "stamp") { ctx.lineWidth = LINE; drawStamp(ctx, it.id); }
      else { ctx.lineWidth = PEN; drawStroke(ctx, it.pts); }
    }
  }
  if (live) { ctx.lineWidth = PEN; drawStroke(ctx, live); }
}

/** 지금 부위의 안내 점선. 이미 찍은 도장 자리는 그리지 않는다 */
export function drawGuide(ctx: CanvasRenderingContext2D, part: Part, drawing: Drawing) {
  const placed = new Set(drawing[part].flatMap((it) => (it.kind === "stamp" ? [it.id] : [])));
  ctx.save();
  ctx.strokeStyle = "rgba(115, 134, 245, 0.55)";
  ctx.lineWidth = 6;
  ctx.setLineDash([18, 14]);
  for (const id of GUIDE[part]) {
    if (placed.has(id)) continue;
    shapePath(ctx, SHAPES[id]);
    ctx.stroke();
  }
  ctx.restore();
}

/** 떨어진 조각이 몇 개인지 센다. 1 이면 모두 이어졌다.
 *
 * AI 서버는 가장 큰 덩어리 하나만 캐릭터로 쓴다. 그래서 둘 이상이면 작은 쪽이 통째로 빠진다.
 * 1/4 크기로 그려서 선이 없는 바깥을 가장자리부터 채우고, 채워지지 않은 곳(선 + 선 안쪽)을
 * 덩어리로 나눈다. 눈·입처럼 머리 안에 든 것은 머리 덩어리에 포함된다.
 * 8px(원래 크기) 이하의 틈은 이어진 것으로 본다 — AI 쪽 마스크도 그 정도 틈은 메운다. */
export function countPieces(drawing: Drawing): number {
  const s = 0.25, w = W * s, h = H * s;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.scale(s, s);
  drawItems(ctx, drawing);
  const alpha = ctx.getImageData(0, 0, w, h).data;

  // 선 한 겹 부풀리기 (3×3)
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alpha[(y * w + x) * 4 + 3] < 40) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) ink[yy * w + xx] = 1;
    }
  }

  // 바깥 채우기
  const outside = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (i: number) => { if (!ink[i] && !outside[i]) { outside[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }

  // 남은 곳을 덩어리로
  const seen = new Uint8Array(w * h);
  const sizes: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (outside[start] || seen[start]) continue;
    let size = 0;
    seen[start] = 1; stack.push(start);
    while (stack.length) {
      const i = stack.pop()!, x = i % w, y = (i / w) | 0;
      size++;
      const next = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const n of next) if (n >= 0 && !outside[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
    }
    sizes.push(size);
  }
  const total = sizes.reduce((a, b) => a + b, 0);
  // 전체의 2% 도 안 되는 점은 세지 않는다 (실수로 찍은 점)
  return sizes.filter((n) => n >= total * 0.02).length;
}

/** 흰 바탕 PNG 로 만든다. 백엔드는 PNG·JPG 만 받는다 (계약 1-4) */
export function toPngFile(drawing: Drawing): Promise<File> {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  drawItems(ctx, drawing);
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(new File([b], "drawing.png", { type: "image/png" })) : reject(new Error("toBlob"))), "image/png");
  });
}
