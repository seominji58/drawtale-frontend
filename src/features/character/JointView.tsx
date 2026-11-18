import { useLayoutEffect, useRef, useState } from "react";
import { bonesOf, orderOf, useForm } from "@/features/character/forms";
import { lowJoints } from "@/types/character";
import type { Character, Keypoints } from "@/types/character";

/** 관절이 찍힌 그림 — 보기만 한다 (S-05, 2026-11-02 사용자 「관절도 사전에 볼 수 있게」).
 *  고치는 것은 S-06(어른). AI 가 자신 없어 한 관절(score < 0.4)은 S-06 처럼 빨간 점 */
export default function JointView({ imageUrl, character, keypoints, tags, busy }: {
  imageUrl: string; character: Character; keypoints: Keypoints;
  /** 점 위에 붙이는 이름표 (관절 이름 → 글). 옆모습 형태에서 AI 가 얼굴 · 꼬리로 본 자리를 보여 준다 (11/5 사용자) */
  tags?: Record<string, string>;
  /** 다시 분석하는 동안 그림 위에 띄울 글 */
  busy?: string | null;
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

  // 관절 · 뼈는 캐릭터 형태의 정의로 (2족형 · 4족형 — pt_docs 19). 점은 그 형태에 있는 것만
  const form = useForm(character.form);
  const low = new Set(lowJoints(character));
  const names = orderOf(form).filter((n) => keypoints[n]);
  const at = (n: string) => ({ x: box.l + keypoints[n].x * box.w, y: box.t + keypoints[n].y * box.h });

  return (
    <div ref={wrap} className="joint-stage view" aria-label="관절 자리">
      <img src={imageUrl} alt="" draggable={false} />
      <svg className="joint-bones" aria-hidden="true">
        {bonesOf(form).filter(([a, b]) => keypoints[a] && keypoints[b]).map(([a, b]) => {
          const p = at(a), q = at(b);
          return <line key={b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
        })}
      </svg>
      {names.map((name) => {
        const p = at(name);
        return <span key={name} className={`joint ${low.has(name) ? "low" : ""}`} style={{ left: p.x, top: p.y }} aria-hidden="true" />;
      })}
      {Object.entries(tags ?? {}).filter(([n]) => keypoints[n]).map(([n, text]) => {
        const p = at(n);
        return <span key={`tag-${n}`} className="joint-tag" style={{ left: p.x, top: p.y }}>{text}</span>;
      })}
      {busy && <div className="joint-busy" role="status">{busy}</div>}
    </div>
  );
}
