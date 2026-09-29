import { useEffect, useRef } from "react";
import type { Keypoints } from "@/types/character";
import type { MotionId } from "@/types/story";
import { BONES, MOTIONS, bonePath, boneScale, computePose, toPixels } from "./skeleton";
import type { Pose } from "./skeleton";

interface Props {
  imageUrl: string;
  keypoints: Keypoints;
  motion: MotionId;
  playing?: boolean;
  showBones?: boolean;
}

/** 키포인트를 받아 그림을 관절 단위로 잘라 움직인다.
 *  PixiJS 없이 Canvas 2D 만 쓴다. 조각마다 clip + drawImage 한 번씩이다. */
export default function CharacterCanvas({
  imageUrl, keypoints, motion, playing = true, showBones = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stateRef = useRef({ keypoints, motion, playing, showBones });
  stateRef.current = { keypoints, motion, playing, showBones };

  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.src = imageUrl;
    return () => { imgRef.current = null; };
  }, [imageUrl]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let clock = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const canvas = canvasRef.current, wrap = wrapRef.current, img = imgRef.current;
      if (!canvas || !wrap || !img) return;

      const s = stateRef.current;
      const dt = now - last; last = now;
      const m = MOTIONS.find((x) => x.id === s.motion) ?? MOTIONS[0];
      if (s.playing) clock += dt;

      const box = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(box.width), H = Math.round(box.height);
      if (!W || !H) return;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
      }

      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pad = Math.max(img.width, img.height) * 0.24;
      const vw = img.width + pad * 2, vh = img.height + pad * 2;
      const fit = Math.min(W / vw, H / vh);
      const ox = (W - vw * fit) / 2 + pad * fit;
      const oy = (H - vh * fit) / 2 + pad * fit;
      ctx.setTransform(dpr * fit, 0, 0, dpr * fit, dpr * ox, dpr * oy);

      const rest: Pose = toPixels(s.keypoints, img.width, img.height);
      const t = (clock % m.period) / m.period;
      const out = m.fn(t);
      const pose = computePose(rest, out.rot, out.dy);
      const k = boneScale(rest);

      for (const [from, to, w, ea, eb] of BONES) {
        const A = pose[from], B = pose[to], Ar = rest[from], Br = rest[to];
        const delta =
          Math.atan2(B.y - A.y, B.x - A.x) - Math.atan2(Br.y - Ar.y, Br.x - Ar.x);
        ctx.save();
        ctx.translate(A.x, A.y);
        ctx.rotate(delta);
        ctx.translate(-Ar.x, -Ar.y);
        bonePath(ctx, Ar, Br, w * k, ea * k, eb * k);
        ctx.clip();
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      }

      if (s.showBones) {
        ctx.lineWidth = 3 / fit;
        ctx.strokeStyle = "#00A9C7";
        for (const [from, to] of BONES) {
          if (from === "neck" && to === "head") continue;
          ctx.beginPath();
          ctx.moveTo(pose[from].x, pose[from].y);
          ctx.lineTo(pose[to].x, pose[to].y);
          ctx.stroke();
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={wrapRef} className="fillbox">
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
