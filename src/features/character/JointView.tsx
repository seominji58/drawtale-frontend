import { useLayoutEffect, useRef, useState } from "react";
import { PARENT } from "@/features/character/skeleton";
import { JOINT_ORDER, lowJoints } from "@/types/character";
import type { Character, JointName, Keypoints } from "@/types/character";

/** 점을 잇는 뼈 (S-06 과 같다) */
const BONES = JOINT_ORDER.flatMap((n) => {
  const p = PARENT[n];
  return p && p !== "root" ? [[p as JointName, n] as const] : [];
});

/** 관절이 찍힌 그림 — 보기만 한다 (S-05, 2026-11-02 사용자 「관절도 사전에 볼 수 있게」).
 *  고치는 것은 S-06(어른). AI 가 자신 없어 한 관절(score < 0.4)은 S-06 처럼 빨간 점 */
export default function JointView({ imageUrl, character, keypoints }: {
  imageUrl: string; character: Character; keypoints: Keypoints;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  // 그림은 object-fit: contain 으로 여백을 두고 그려진다. 점은 그림이 실제로 그려진 칸 기준 (S-06 과 같음)
  const [box, setBox] = useState({ l: 0, t: 0, w: 1, h: 1 });

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const { width: W, height: H } = el.getBoundingClientRect();
      const s = Math.min(W / character.width, H / character.height);
      const w = character.width * s, h = character.height * s;
      setBox({ l: (W - w) / 2, t: (H - h) / 2, w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [character]);

  const low = new Set(lowJoints(character));
  const at = (n: JointName) => ({ x: box.l + keypoints[n].x * box.w, y: box.t + keypoints[n].y * box.h });

  return (
    <div ref={wrap} className="joint-stage view" aria-label="관절 자리">
      <img src={imageUrl} alt="" draggable={false} />
      <svg className="joint-bones" aria-hidden="true">
        {BONES.map(([a, b]) => {
          const p = at(a), q = at(b);
          return <line key={b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
        })}
      </svg>
      {JOINT_ORDER.map((name) => {
        const p = at(name);
        return <span key={name} className={`joint ${low.has(name) ? "low" : ""}`} style={{ left: p.x, top: p.y }} aria-hidden="true" />;
      })}
    </div>
  );
}
