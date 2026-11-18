import { useLayoutEffect, useRef } from "react";

/** 카드 묶음(.choices)을 남은 칸에 맞춰 몇 줄 몇 칸으로 놓을지 정한다 (2026-11-09 기기 점검).
 *  전에는 화면 폭만 보고 칸 수를 정해(1024 · 768 기준) 높이가 낮은 화면에서 카드가 넘쳤다:
 *  갤럭시를 가로로 돌리면 높이 256px, 아이패드 미니 세로(744px)는 폰 배치를 받아 장소 8장이 화면 아래로 700px 넘쳤다.
 *  그래서 칸 수마다 카드가 얼마나 커지는지 재서 가장 큰 것을 고른다. 카드 비율은 CSS(aspect-ratio)를 그대로 읽는다.
 *  카드 폭은 --card-w, 칸 수는 grid-template-columns 로 넣는다 (.choices.fit) */
export function useFitGrid<T extends HTMLElement>(count: number) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const card = el.firstElementChild as HTMLElement | null;
      const W = el.clientWidth, H = el.clientHeight;
      if (!card || !W || !H || !count) return;
      const cs = getComputedStyle(el);
      const gx = parseFloat(cs.columnGap) || 0, gy = parseFloat(cs.rowGap) || 0;
      const [a, b] = getComputedStyle(card).aspectRatio.split("/").map((v) => parseFloat(v));
      const ratio = a && b ? a / b : a || 0.75;   // 폭 ÷ 높이
      // 고른 카드는 조금 커지고(1.05) 압정이 위로 나온다, 그만큼 남긴다
      const room = 0.94;
      let best = { cols: 1, w: 0 };
      for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const w = Math.min((W - gx * (cols - 1)) / cols, ((H - gy * (rows - 1)) / rows) * ratio) * room;
        if (w > best.w + 0.5) best = { cols, w };
      }
      el.style.setProperty("--card-w", `${Math.floor(best.w)}px`);
      el.style.gridTemplateColumns = `repeat(${best.cols}, auto)`;
      el.classList.add("fit");
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [count]);
  return ref;
}
