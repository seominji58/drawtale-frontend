import { REST_KEYPOINTS } from "./fixtures";

const W = 700, H = 900;

/** 확인용 샘플 그림.
 *  목 엔진이 돌려주는 키포인트와 같은 자리에 사람 하나를 그린다.
 *  그래서 업로드할 그림이 없어도 캐릭터가 움직이는 것까지 볼 수 있다. */
export function makeSampleDrawing(): Promise<File> {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  const P = (n: keyof typeof REST_KEYPOINTS) => ({
    x: REST_KEYPOINTS[n].x * W, y: REST_KEYPOINTS[n].y * H,
  });

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const ink = "#3A3733";
  const limb = (pts: { x: number; y: number }[], color: string, w: number) => {
    const draw = (cc: string, ww: number) => {
      ctx.strokeStyle = cc; ctx.lineWidth = ww;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    };
    draw(ink, w + 8);
    draw(color, w);
  };
  const blob = (p: { x: number; y: number }, rx: number, ry: number, color: string) => {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();
  };

  // 다리
  limb([P("right_hip"), P("right_knee"), P("right_foot")], "#5B7FC4", 40);
  limb([P("left_hip"), P("left_knee"), P("left_foot")], "#5B7FC4", 40);
  blob({ x: P("right_foot").x - 6, y: P("right_foot").y + 14 }, 32, 18, "#3B4657");
  blob({ x: P("left_foot").x + 6, y: P("left_foot").y + 14 }, 32, 18, "#3B4657");

  // 몸통
  const rs = P("right_shoulder"), ls = P("left_shoulder"), hip = P("hip");
  ctx.beginPath();
  ctx.moveTo(rs.x - 10, rs.y - 14);
  ctx.quadraticCurveTo(W / 2, P("torso").y - 47, ls.x + 10, ls.y - 14);
  ctx.quadraticCurveTo(ls.x + 28, hip.y - 40, P("left_hip").x + 18, hip.y + 26);
  ctx.quadraticCurveTo(W / 2, hip.y + 46, P("right_hip").x - 18, hip.y + 26);
  ctx.quadraticCurveTo(rs.x - 28, hip.y - 40, rs.x - 10, rs.y - 14);
  ctx.closePath();
  ctx.fillStyle = "#E4695C"; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 6; ctx.stroke();

  // 팔과 손
  limb([P("right_shoulder"), P("right_elbow"), P("right_hand")], "#F6C9A4", 28);
  limb([P("left_shoulder"), P("left_elbow"), P("left_hand")], "#F6C9A4", 28);
  blob(P("right_hand"), 20, 20, "#F6C9A4");
  blob(P("left_hand"), 20, 20, "#F6C9A4");

  // 목과 머리. Meta 모델처럼 neck 이 얼굴 가운데라서 머리를 neck 자리에 그린다
  const head = P("neck");
  limb([{ x: head.x, y: P("torso").y }, { x: head.x, y: head.y + 40 }], "#F6C9A4", 30);
  blob(head, 66, 70, "#F6C9A4");

  ctx.beginPath();
  ctx.moveTo(head.x - 64, head.y - 14);
  ctx.quadraticCurveTo(head.x, head.y - 104, head.x + 64, head.y - 14);
  ctx.quadraticCurveTo(head.x + 34, head.y - 52, head.x, head.y - 48);
  ctx.quadraticCurveTo(head.x - 34, head.y - 52, head.x - 64, head.y - 14);
  ctx.closePath();
  ctx.fillStyle = "#6B5548"; ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.stroke();

  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(head.x - 22, head.y + 2, 6, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(head.x + 22, head.y + 2, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(head.x, head.y + 16, 24, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();

  return new Promise((resolve) => {
    c.toBlob((b) => {
      resolve(new File([b!], "sample.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.92);
  });
}
