// 장면 배치 검사 페이지 (2026-11-09). 카드 이야기(tools/scene-check/out/cases.json)의 쪽마다 S-09 장면 층을 「끝 모습」으로 그리고
// 소품 · 인물 · 주인공 자리를 재서 window.__audit 에 둔다. tools/scene-check/layout.mjs 가 열고 읽는다. 앱 코드는 바꾸지 않는다
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import SceneStage from "@/features/scene/SceneStage";
import { planPages } from "@/features/scene/plan";
import type { PagePlan } from "@/features/scene/plan";
import { CHOICES, choicesFor } from "@/features/story/choices";
import type { BookPage } from "@/types/story";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/ui.css";

interface Case { id: string; place: string; problem: string; action: string; result: string;
  book: { title: string; pages: (Omit<BookPage, "childWords"> & { child_words?: string })[]; character_sheet?: Record<string, string> } }

const q = new URLSearchParams(location.search);
const FROM = Number(q.get("i") ?? 0), N = Number(q.get("n") ?? 10);
const W = Number(q.get("w") ?? 700), H = Number(q.get("h") ?? 470);
const NAME = "토토";
// 백엔드가 채우는 이름 자리 (`{이름}{조사:는}`) — 받침 없는 이름이라 조사는 적힌 그대로
const fill = (t: string) => t.replace(/\{이름\}/g, NAME).replace(/\{조사:([^}]+)\}/g, "$1");
const idOf = (kind: "place" | "problem", label: string) => CHOICES[kind].find((c) => c.label === label)?.id;
const idIn = (kind: "action" | "result", label: string, problem?: string) => choicesFor(kind, problem).find((c) => c.label === label)?.id;

function plansOf(c: Case): PagePlan[] {
  const problem = idOf("problem", c.problem);
  const picks = { place: idOf("place", c.place), problem, action: idIn("action", c.action, problem), result: idIn("result", c.result, problem) };
  const pages = c.book.pages.map((p) => ({ ...p, text: fill(p.text), childWords: p.child_words ?? "" })) as BookPage[];
  return planPages(pages, picks, c.book.character_sheet ?? {});
}

/** 한 장면의 자리 재기. 화면 대비 0~1 사각형 */
function measure(el: HTMLElement) {
  const S = el.getBoundingClientRect();
  const box = (e: Element) => { const r = e.getBoundingClientRect(); return { x0: (r.left - S.left) / S.width, x1: (r.right - S.left) / S.width, y0: (r.top - S.top) / S.height, y1: (r.bottom - S.top) / S.height }; };
  const name = (e: Element) => (e.getAttribute("src") ?? "").split("/").pop()?.replace(/\.webp.*/, "") ?? "?";
  const vis = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.opacity !== "0" && cs.visibility !== "hidden"; };
  const pick = (sel: string) => [...el.querySelectorAll(sel)].filter(vis);
  return {
    hero: pick(".scene-hero").map((e) => box(e))[0] ?? null,
    people: pick(".scene-person, .scene-person-walk").map((e) => ({ name: name(e.querySelector("img") ?? e), ...box(e) })),
    things: pick(".scene-thing").map((e) => ({ name: name(e), pose: e.getAttribute("data-pose"), spot: e.getAttribute("data-spot"), cls: e.className, ...box(e) })),
    bg: pick(".scene-obj.scene-bg").map((e) => ({ name: name(e), ...box(e) })),
    cover: pick(".scene-cover").map((e) => ({ name: name(e), ...box(e) })),
  };
}

function App() {
  const [cases, setCases] = useState<Case[] | null>(null);
  useEffect(() => { void fetch("./out/cases.json").then((r) => r.json()).then((all: Case[]) => setCases(all.slice(FROM, FROM + N))); }, []);
  useEffect(() => {
    if (!cases) return;
    // 그림이 다 읽히고 자리가 잡힐 때까지
    const t = window.setTimeout(() => {
      const out = [...document.querySelectorAll<HTMLElement>("[data-page]")].map((wrap) => ({
        key: wrap.dataset.page!, text: wrap.dataset.text!, location: wrap.dataset.loc!, ...measure(wrap.querySelector(".scene") as HTMLElement),
      }));
      (window as unknown as { __audit: unknown }).__audit = out;
    }, 4000);
    return () => clearTimeout(t);
  }, [cases]);
  if (!cases) return <p>읽는 중</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8 }}>
      {cases.flatMap((c, ci) => plansOf(c).map((plan, pi) => (
        <div key={`${ci}-${pi}`} data-page={`${FROM + ci}:${pi + 1}`} data-text={fill(c.book.pages[pi].text)} data-loc={plan.location}
             style={{ width: W, height: H, position: "relative", overflow: "hidden", background: "#fff" }}>
          <SceneStage plan={plan} prevEnv={null} still={`${import.meta.env.BASE_URL}illust/hero-stand.webp`} mode="end" />
          <span style={{ position: "absolute", left: 4, top: 2, zIndex: 9, font: "12px sans-serif", background: "#ffffffcc" }}>{FROM + ci}:{pi + 1} {plan.location}</span>
        </div>
      )))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
