// 장면 배치 검사 페이지 (2026-11-09). 카드 이야기(tools/scene-check/out/cases.json)의 쪽마다 S-09 장면 층을 「끝 모습」으로 그리고
// 소품 · 인물 · 주인공 자리를 재서 window.__audit 에 둔다. tools/scene-check/layout.mjs 가 열고 읽는다. 앱 코드는 바꾸지 않는다
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import SceneStage from "@/features/scene/SceneStage";
import { planPages } from "@/features/scene/plan";
import type { PagePlan } from "@/features/scene/plan";
import { CHOICES, choicesFor } from "@/features/story/choices";
import { sentences } from "@/lib";
import type { BookPage } from "@/types/story";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/ui.css";

interface Case { id: string; place: string; problem: string; action: string; result: string; length?: string; voice_mode?: string;
  /** 긴 이야기 */
  book?: { title: string; pages: (Omit<BookPage, "childWords"> & { child_words?: string })[]; character_sheet?: Record<string, string> };
  /** 짧은 이야기 (네 문장) */
  text?: string;
  /** 짧은 이야기 캐릭터 목소리 판: 문장마다 [말하는 이, 글, 감정] 조각 */
  sentences?: [string, string, string][][] }

/** 캐릭터 목소리 판 짧은 이야기를 한 덩어리 글로 — 대사는 “ ” 안에 (백엔드가 화면에 주는 글과 같은 모양) */
const textOf = (c: Case) => c.text ?? (c.sentences ?? []).map((s) => s.map(([who, t]) => (who === "나레이션" ? t : `“${t}”`)).join(" ")).join(" ");

const q = new URLSearchParams(location.search);
const FROM = Number(q.get("i") ?? 0), N = Number(q.get("n") ?? 10);
const FILE = q.get("f") ?? "cases.json";
const W = Number(q.get("w") ?? 700), H = Number(q.get("h") ?? 470);
// 재생 모드(11/9): ?play=hooray 처럼 쪽 동작 이름을 주면 끝 모습 대신 쪽에 들어온 재생으로 그린다 (등장인물 그림띠 확인)
const PLAY = q.get("play") ?? "";
// ?flip=800: 책 화면처럼 쪽을 넘기는 동안(이 ms) 시작 모습으로 기다렸다가 재생으로 바꾼다 (등장인물 그림띠 시작 확인, 11/9)
const FLIP = Number(q.get("flip") ?? 0);
const MINE = (q.get("mine") ?? "").split(",").filter(Boolean).map((name) => ({ name, png: `${import.meta.env.BASE_URL}scenes/props/drum.webp`, height: 0.28 }));
// ?still=out/_bird.png&facing=1: 주인공 그림 · 머리 쪽을 바꿔 본다 (몸짓 연출 확인, 11/10). 없으면 사람 서 있는 그림 · 앞모습
const STILL = q.get("still") ?? `${import.meta.env.BASE_URL}illust/hero-stand.webp`;
const FACING = Number(q.get("facing") ?? 0) as -1 | 0 | 1;
// ?sprite=out/real/dog_side.webp&frames=48&box=0.35,0.36,0.8,0.7&fit=width: AI 가 렌더한 그림띠를 주인공으로 (실제 이야기와 같은 캔버스 길, 11/10)
const SPRITE = q.get("sprite") ? { url: q.get("sprite")!, frames: Number(q.get("frames") ?? 1),
  box: (q.get("box") ?? "0,0,1,1").split(",").map(Number) as [number, number, number, number] } : null;
const FIT = (q.get("fit") ?? "height") as "height" | "width";
// ?label=1: 칸 위에 쪽 글도 적는다 (사람이 눈으로 볼 때)
const LABEL = q.get("label") === "1";
// ?narr=0.4: 나레이션이 쪽 글의 그 자리(0~1)까지 읽은 재생 모습 (소품이 대사에 맞춰 나타나는지 · 주기, 11/10)
const NARR = q.get("narr") === null ? undefined : Number(q.get("narr"));
const NAME = "토토";
// 백엔드가 채우는 이름 자리 (`{이름}{조사:는}`) — 받침 없는 이름이라 조사는 적힌 그대로
const fill = (t: string) => t.replace(/\{이름\}/g, NAME).replace(/\{조사:([^}]+)\}/g, "$1");
const idOf = (kind: "place" | "problem", label: string) => CHOICES[kind].find((c) => c.label === label)?.id;
const idIn = (kind: "action" | "result", label: string, problem?: string) => choicesFor(kind, problem).find((c) => c.label === label)?.id;

function plansOf(c: Case): PagePlan[] {
  const problem = idOf("problem", c.problem);
  const picks = { place: idOf("place", c.place), problem, action: idIn("action", c.action, problem), result: idIn("result", c.result, problem) };
  const pages = c.book ? c.book.pages.map((p) => ({ ...p, text: fill(p.text), childWords: p.child_words ?? "" })) as BookPage[]
    : shortPages(fill(textOf(c)));
  // ?mine=노란 우산,공룡 인형: 보호자 「내 소품」을 넣어 본다 (그림은 기본 소품 그림을 빌려 쓴다, 크기 보통)
  return planPages(pages, picks, c.book?.character_sheet ?? {}, MINE);
}

/** 짧은 이야기를 네 쪽으로 — S09Story shortBook 과 같은 나눔 (행동 쪽만 움직임, 장면 계획 없음) */
function shortPages(text: string): BookPage[] {
  const lines = sentences(text);
  const STAGES = ["place", "problem", "action", "result"] as const;
  const n = Math.min(4, lines.length);
  const groups: string[][] = Array.from({ length: n }, () => []);
  lines.forEach((l, i) => groups[Math.min(n - 1, Math.floor((i * n) / lines.length))].push(l));
  return groups.map((g, i) => {
    const stage = n === 4 ? STAGES[i] : STAGES[Math.min(3, Math.round((i * 3) / Math.max(1, n - 1)))];
    return { page: i + 1, stage, action: stage === "action" ? "wave" : "idle", text: g.join(" "), childWords: "", scene: null } as BookPage;
  });
}
const pageText = (c: Case, plans: PagePlan[], i: number) => (c.book ? fill(c.book.pages[i].text) : shortPages(fill(textOf(c)))[i]?.text ?? "");

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
  const [flipped, setFlipped] = useState(!FLIP);
  useEffect(() => { if (FLIP && cases) { const t = window.setTimeout(() => setFlipped(true), FLIP); return () => clearTimeout(t); } }, [cases]);
  useEffect(() => { void fetch(`./out/${FILE}`).then((r) => r.json()).then((all: Case[]) => setCases(all.slice(FROM, FROM + N))); }, []);
  useEffect(() => {
    if (!cases) return;
    // 그림이 다 읽히고 자리가 잡힐 때까지
    const t = window.setTimeout(() => {
      const out = [...document.querySelectorAll<HTMLElement>("[data-page]")].map((wrap) => ({
        key: wrap.dataset.page!, text: wrap.dataset.text!, location: wrap.dataset.loc!, seat: wrap.dataset.seat ?? "", ...measure(wrap.querySelector(".scene") as HTMLElement),
      }));
      (window as unknown as { __audit: unknown }).__audit = out;
    }, 4000);
    return () => clearTimeout(t);
  }, [cases]);
  if (!cases) return <p>읽는 중</p>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8 }}>
      {cases.flatMap((c, ci) => plansOf(c).map((plan, pi, plans) => (
        <div key={`${ci}-${pi}`} data-page={`${FROM + ci}:${pi + 1}`} data-text={pageText(c, plans, pi)} data-loc={plan.location} data-seat={plan.hero.seat ?? ""}
             style={{ width: W, height: H, position: "relative", overflow: "hidden", background: "#fff" }}>
          <SceneStage plan={plan} prevEnv={null} still={STILL} sprite={SPRITE} fit={FIT} facing={FACING} mode={PLAY || NARR !== undefined ? (flipped ? "play" : "start") : "end"} narration={NARR} pageAction={PLAY} text={pageText(c, plans, pi)} />
          <span style={{ position: "absolute", left: 4, top: 2, zIndex: 9, font: "12px sans-serif", background: "#ffffffcc" }}>{FROM + ci}:{pi + 1} {LABEL ? pageText(c, plans, pi) : plan.location}</span>
        </div>
      )))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
