import type { CSSProperties } from "react";
import { propById, propsForStage, useProps } from "@/features/props/props";
import type { PropSlot } from "@/features/props/props";
import type { StepKind } from "@/types/story";

/** S-09 쪽 그림 위에 아이가 그린 소품을 얹는다 (open-decisions 0-13, 로컬 시험).
 *  무대(주인공 영상 칸) 기준 정해진 자리에 가만히 놓는다 — 주인공 손에 쥐지 않고, 움직이지 않는다.
 *  아이가 그려 둔 소품만 나온다. 부모(.stage)는 position: relative 다. */
const SLOT: Record<PropSlot, CSSProperties> = {
  // 우산처럼 머리 위에 펼치는 것
  above: { top: "3%", left: "50%", width: "46%", transform: "translateX(-50%)" },
  // 손전등 · 도시락처럼 곁에 두는 것
  side: { right: "6%", bottom: "8%", width: "26%" },
  // 구름 · 해 · 달 · 별
  sky: { top: "4%", left: "5%", width: "22%" },
  // 꽃 · 나무 · 집
  ground: { left: "5%", bottom: "4%", width: "24%" },
};

export default function PropLayer({ stage, picks }: {
  stage: StepKind;
  picks: Partial<Record<StepKind, string>> | undefined;
}) {
  const drawn = useProps((s) => s.drawn);
  if (!picks) return null;
  const ids = propsForStage(stage, picks).filter((id) => drawn[id]);
  // 같은 자리에 둘 이상이면 옆으로 조금씩 민다 (예: 달 · 별)
  const seen: Partial<Record<PropSlot, number>> = {};
  return (
    <>
      {ids.map((id) => {
        const slot = propById(id)!.slot;
        const k = (seen[slot] = (seen[slot] ?? -1) + 1);
        const style: CSSProperties = { ...SLOT[slot] };
        if (k > 0 && (slot === "sky" || slot === "ground")) style.left = `${5 + 24 * k}%`;
        return (
          <img key={id} src={drawn[id]} alt="" aria-hidden="true"
            style={{ position: "absolute", height: "auto", maxHeight: "40%", objectFit: "contain", pointerEvents: "none", ...style }} />
        );
      })}
    </>
  );
}
