// 다음 쪽 미리 받기 방식 재기 (2026-11-12, 사용자 「두 쪽씩 미리 받는 게 더 빠를려나」): S09Story 가 쓰는 것과 같은 preloadScene 으로
// 이야기 한 편의 쪽 장면 그림을 받으며, 다음 쪽(1쪽을 보는 동안 2쪽)이 다 받아지기까지 걸린 시간을 잰다.
//   mode=three: 지금 방식, 받기 세 줄이 다음 쪽부터 차례로 / mode=next: 다음 쪽 하나를 먼저 혼자 다 받고 나머지를 세 줄로
// 망 속도는 prefetch.mjs 가 요청마다 한 줄 관(대역 나눔)으로 늦춘다. 결과는 window.__result
import { preloadScene } from "@/features/scene/SceneStage";
import { planPages } from "@/features/scene/plan";
import { CHOICES, choicesFor } from "@/features/story/choices";
import type { BookPage } from "@/types/story";

const q = new URLSearchParams(location.search);
const CI = Number(q.get("i") ?? 0), MODE = q.get("mode") ?? "three", PG = Number(q.get("pg") ?? 0);
const fill = (t: string) => t.replace(/\{이름\}/g, "토토").replace(/\{조사:([^}]+)\}/g, "$1");
const idOf = (k: "place" | "problem", l: string) => CHOICES[k].find((c) => c.label === l)?.id;
const idIn = (k: "action" | "result", l: string, pr?: string) => choicesFor(k, pr).find((c) => c.label === l)?.id;

(async () => {
  const c = (await (await fetch("./out/all-long.json")).json())[CI];
  const pr = idOf("problem", c.problem);
  const pages = c.book.pages.map((p: any) => ({ ...p, text: fill(p.text), childWords: "" })) as BookPage[];
  const plans = planPages(pages, { place: idOf("place", c.place), problem: pr, action: idIn("action", c.action, pr), result: idIn("result", c.result, pr) } as any, c.book.character_sheet ?? {}, [], "토토");
  const t0 = performance.now();
  const ready: Record<number, number> = {};
  const one = async (i: number) => { await preloadScene(plans[i], null, null); ready[i] = Math.round(performance.now() - t0); };
  // 지금 쪽(PG)은 이미 받아 둔 것으로 본다
  await one(PG);
  const s0 = performance.now();
  const order = plans.map((_, i) => i).filter((i) => i > PG);
  if (MODE === "next" && order.length) await one(order.shift()!);
  let next = 0;
  const worker = async () => { while (next < order.length) await one(order[next++]); };
  await Promise.all([worker(), worker(), worker()]);
  (window as unknown as { __result: unknown }).__result = { next: ready[PG + 1] - Math.round(s0 - t0), after: ready[PG + 2] !== undefined ? ready[PG + 2] - Math.round(s0 - t0) : null,
    all: Math.max(...Object.values(ready)) - Math.round(s0 - t0) };
})();
