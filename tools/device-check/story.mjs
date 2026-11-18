// 장면 층 이야기 기기 점검 (2026-11-09): 실서버 모드(5173)에서 서버 이야기를 책장에 넣고 S-09 를 열어
// 앞으로 두 번 · 뒤로 두 번 넘기며 화면 밖 · 아래 단추와 겹침을 재고 찍는다.
//   TOK=<토큰 파일> SID=<이야기 id> node tools/device-check/story.mjs <이름> <w> <h>
import { webkit } from "playwright";
import fs from "node:fs";
const [, , name, w, h] = process.argv;
const T = fs.readFileSync(process.env.TOK, "utf8").trim();
const SID = process.env.SID;
const OUT = `tools/device-check/shots/story-${name}`;
fs.mkdirSync(OUT, { recursive: true });
const b = await webkit.launch();
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, hasTouch: true });
const errs = []; p.on("pageerror", (e) => errs.push(String(e)));
await p.goto("http://localhost:5173/welcome");
await p.evaluate((t) => { localStorage.clear(); localStorage.setItem("storyblanks.token", t); localStorage.setItem("storyblanks.account", "시험"); localStorage.setItem("storyblanks.introSeen", "1"); localStorage.setItem("storyblanks.coach", JSON.stringify(["draw", "form", "confirm", "story"])); }, T);
await p.goto("http://localhost:5173/"); await p.waitForTimeout(1500);
await p.evaluate(async (id) => {
  const api = await import("/src/api/index.ts");
  const { useLibrary } = await import("/src/store/library.ts");
  const picks = { place: "school", problem: "crying", action: "wave_smile", result: "thanked" };
  const st = await api.refreshStory({ storyId: id, picks });
  useLibrary.getState().add({ ...st, picks, createdAt: Date.now() });
}, SID);
await p.goto("http://localhost:5173/stories"); await p.waitForTimeout(2000);
await p.locator(".book").first().click({ force: true });
await p.waitForFunction(() => location.pathname === "/story", null, { timeout: 20000 }); await p.waitForTimeout(3500);
const audit = () => p.evaluate(() => {
  const W = innerWidth, H = innerHeight, out = [];
  const clipped = (el) => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.overflowX !== "visible" || s.overflowY !== "visible") return e; } return null; };
  for (const el of document.querySelectorAll(".screen *")) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.opacity === "0" || cs.position === "fixed") continue;
    if (el.closest(".scene, .turn-wedge, .turn-ear-fold, [aria-hidden=true]")) continue;
    const over = Math.max(-r.left, r.right - W, -r.top, r.bottom - H);
    if (over > 4 && !clipped(el)) out.push(`밖 ${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${Math.round(over)}px`);
  }
  // 장면 칸 · 글 칸 · 조작 칸이 서로 겹치지 않는지
  const box = (s) => document.querySelector(s)?.getBoundingClientRect();
  const st = box(".spread:not(.top) .stage, .spread:not(.top) .scene"), tx = box(".spread:not(.top) .spread-text"), ct = box(".book-ctl");
  const ov = (a, c) => a && c && Math.min(a.right, c.right) - Math.max(a.left, c.left) > 4 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 4;
  if (ov(st, ct)) out.push("겹침 장면 ↔ 조작"); if (ov(tx, ct)) out.push("겹침 글 ↔ 조작");
  if (tx && tx.height < 40) out.push(`글 칸 너무 낮음 ${Math.round(tx.height)}px`);
  if (st && st.height < 120) out.push(`장면 칸 너무 낮음 ${Math.round(st.height)}px`);
  return out;
});
const log = [];
const step = async (tag) => { await p.waitForTimeout(1600); const a = await audit(); log.push(`${tag}: ${a.length ? a.slice(0, 5).join(" | ") : "ok"}`); await p.screenshot({ path: `${OUT}/${tag}.png` }); };
await step("1쪽");
await p.getByRole("button", { name: "다음 쪽" }).click(); await step("2쪽");
await p.getByRole("button", { name: "다음 쪽" }).click(); await step("3쪽");
await p.getByRole("button", { name: "앞 쪽" }).click(); await step("2쪽-뒤로");
await p.getByRole("button", { name: "앞 쪽" }).click(); await step("1쪽-뒤로");
console.log(`${name} ${w}x${h}\n  ` + log.join("\n  ") + (errs.length ? `\n  오류 ${errs.slice(0, 2)}` : ""));
await b.close();
