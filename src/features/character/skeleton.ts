import type { JointName, Keypoints } from "@/types/character";
import type { MotionId } from "@/types/story";

const TAU = Math.PI * 2;

export const PARENT: Record<JointName, JointName | null> = {
  root: null, hip: "root", torso: "hip", neck: "torso", head: "neck",
  right_shoulder: "torso", right_elbow: "right_shoulder", right_hand: "right_elbow",
  left_shoulder: "torso", left_elbow: "left_shoulder", left_hand: "left_elbow",
  right_hip: "hip", right_knee: "right_hip", right_foot: "right_knee",
  left_hip: "hip", left_knee: "left_hip", left_foot: "left_knee",
};

const CHILDREN: Partial<Record<JointName, JointName[]>> = {};
(Object.keys(PARENT) as JointName[]).forEach((n) => {
  const p = PARENT[n];
  if (p) (CHILDREN[p] ??= []).push(n);
});

export interface Pt { x: number; y: number }
export type Pose = Record<JointName, Pt>;

/** [시작, 끝, 두께, 시작쪽 여유, 끝쪽 여유] — 뒤에서 앞으로 그린다 */
export const BONES: [JointName, JointName, number, number, number][] = [
  ["left_hip", "left_knee", 54, 24, 12],
  ["left_knee", "left_foot", 50, 12, 32],
  ["left_shoulder", "left_elbow", 46, 26, 12],
  ["left_elbow", "left_hand", 42, 12, 28],
  ["hip", "torso", 116, 36, 28],
  ["right_hip", "right_knee", 54, 24, 12],
  ["right_knee", "right_foot", 50, 12, 32],
  ["torso", "neck", 92, 0, 10],
  ["neck", "head", 132, 6, 78],
  ["right_shoulder", "right_elbow", 46, 26, 12],
  ["right_elbow", "right_hand", 42, 12, 28],
];

/** 정규화 키포인트를 이미지 픽셀 좌표로 편다. root 는 hip 과 같은 자리 */
export function toPixels(k: Keypoints, w: number, h: number): Pose {
  const out = {} as Pose;
  (Object.keys(k) as (keyof Keypoints)[]).forEach((name) => {
    out[name] = { x: k[name].x * w, y: k[name].y * h };
  });
  out.root = { ...out.hip };
  return out;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** 순방향 운동학. 부모의 누적 회전만큼 오프셋을 돌려 위치를 얻는다 */
export function computePose(
  rest: Pose, rot: Partial<Record<JointName, number>>, dy = 0, dx = 0
): Pose {
  const out = {} as Pose;
  const walk = (name: JointName, parent: JointName | null, acc: number, pp: Pt | null) => {
    let pos: Pt;
    if (!parent || !pp) {
      pos = { x: rest[name].x + dx, y: rest[name].y + dy };
    } else {
      const ox = rest[name].x - rest[parent].x;
      const oy = rest[name].y - rest[parent].y;
      const c = Math.cos(acc), s = Math.sin(acc);
      pos = { x: pp.x + ox * c - oy * s, y: pp.y + ox * s + oy * c };
    }
    out[name] = pos;
    const next = acc + (rot[name] ?? 0);
    (CHILDREN[name] ?? []).forEach((ch) => walk(ch, name, next, pos));
  };
  walk("root", null, rot.root ?? 0, null);
  return out;
}

/** 그림마다 인물 크기가 달라서 조각 두께를 보정한다 */
export function boneScale(rest: Pose) {
  const base = 0.229; // 기본 자세의 hip→neck 비율
  const cur = dist(rest.hip, rest.neck);
  const ref = base * (rest.left_foot.y - rest.head.y) / 0.675;
  return ref > 4 ? cur / ref : 1;
}

export interface MotionOut { rot: Partial<Record<JointName, number>>; dy: number }
export interface Motion { id: MotionId; label: string; period: number; fn: (t: number) => MotionOut }

export const MOTIONS: Motion[] = [
  { id: "idle", label: "가만히", period: 3200, fn: (t) => {
    const p = t * TAU;
    return { rot: {
      torso: Math.sin(p) * 0.025, neck: Math.sin(p + 0.8) * 0.03,
      right_shoulder: Math.sin(p) * 0.06, left_shoulder: -Math.sin(p) * 0.06,
    }, dy: Math.sin(p) * 3 };
  }},
  { id: "walk", label: "걷기", period: 1050, fn: (t) => {
    const s = Math.sin(t * TAU);
    return { rot: {
      right_hip: s * 0.38, left_hip: -s * 0.38,
      right_knee: -s * 0.16, left_knee: s * 0.16,
      right_shoulder: -s * 0.44, left_shoulder: s * 0.44,
      torso: s * 0.05, neck: -s * 0.03,
    }, dy: -Math.abs(s) * 9 };
  }},
  { id: "jump", label: "점프", period: 1500, fn: (t) => {
    const air = Math.max(0, Math.sin(Math.PI * clamp01((t - 0.22) / 0.56)));
    const raw = t < 0.22 ? t / 0.22 : t > 0.78 ? (1 - t) / 0.22 : 0;
    const c = raw * (1 - air);
    return { rot: {
      right_hip: c * 0.3, left_hip: -c * 0.3,
      right_knee: -c * 0.5, left_knee: c * 0.5,
      right_shoulder: -air * 1.75 - c * 0.25, left_shoulder: air * 1.75 + c * 0.25,
      neck: -air * 0.05,
    }, dy: -air * 128 + c * 26 };
  }},
  { id: "wave", label: "손 흔들기", period: 1800, fn: (t) => {
    const p = t * TAU;
    return { rot: {
      right_shoulder: -1.85 + Math.sin(p * 2) * 0.12,
      right_elbow: Math.sin(p * 4) * 0.45,
      left_shoulder: Math.sin(p) * 0.05,
      neck: 0.05 + Math.sin(p * 2) * 0.03, torso: 0.02,
    }, dy: Math.sin(p * 2) * 2 };
  }},
  { id: "look", label: "둘러보기", period: 3000, fn: (t) => {
    const s = Math.sin(t * TAU);
    return { rot: {
      neck: s * 0.26, torso: s * 0.06,
      right_shoulder: -s * 0.08, left_shoulder: -s * 0.08,
    }, dy: 0 };
  }},
];

export function bonePath(
  ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number, ea: number, eb: number
) {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
  const px = -uy * (w / 2), py = ux * (w / 2);
  const ax = a.x - ux * ea, ay = a.y - uy * ea;
  const bx = b.x + ux * eb, by = b.y + uy * eb;
  ctx.beginPath();
  ctx.moveTo(ax + px, ay + py);
  ctx.lineTo(bx + px, by + py);
  ctx.lineTo(bx - px, by - py);
  ctx.lineTo(ax - px, ay - py);
  ctx.closePath();
}
