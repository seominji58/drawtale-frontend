// 미리 받기 방식 비교 (prefetch.tsx). 장면 그림 요청을 한 줄 관으로 늦춘다: 대역 KBPS 를 동시에 받는 요청이 나눠 쓴다(처리량 나눔),
// 요청마다 왕복 지연 RTT ms. 이야기마다 새 브라우저 맥락(캐시 없음)으로 세 방식을 번갈아 잰다.
//   node tools/scene-check/prefetch.mjs [kbps=400] [rtt=80] [이야기 번호들 …]
import { webkit } from "playwright";
import fs from "node:fs";
const KBPS = Number(process.argv[2] ?? 400), RTT = Number(process.argv[3] ?? 80);
const ids = process.argv.slice(4).map(Number);
const STORIES = ids.length ? ids : [40, 994, 580, 60, 714, 200, 300, 500];
const b = await webkit.launch();
const rows = [];
for (const ci of STORIES) for (const mode of ["three", "next"]) {
  const ctx = await b.newContext();
  const page = await ctx.newPage();
  // 처리량 나눔 관: 지금 받는 요청들이 대역을 똑같이 나눈다
  const active = new Set();
  let last = Date.now();
  const tick = () => {
    const now = Date.now(), dt = (now - last) / 1000; last = now;
    if (!active.size) return;
    const share = (KBPS * 1024 * dt) / active.size;
    for (const r of [...active]) { r.left -= share; if (r.left <= 0) { active.delete(r); r.done(); } }
  };
  const timer = setInterval(tick, 10);
  await page.route("**/scenes/**", async (route) => {
    const url = new URL(route.request().url());
    const file = "public" + decodeURIComponent(url.pathname);
    if (!fs.existsSync(file) || !/\.(webp|png)$/.test(file)) return route.continue();
    const body = fs.readFileSync(file);
    await new Promise((ok) => setTimeout(ok, RTT));
    await new Promise((ok) => { tick(); active.add({ left: body.length, done: ok }); });
    await route.fulfill({ status: 200, contentType: file.endsWith(".png") ? "image/png" : "image/webp", body });
  });
  await page.goto(`http://localhost:5174/tools/scene-check/prefetch.html?i=${ci}&mode=${mode}`);
  await page.waitForFunction(() => window.__result, null, { timeout: 300000 });
  const r = await page.evaluate(() => window.__result);
  clearInterval(timer);
  rows.push({ ci, mode, ...r });
  console.log(ci, mode, `다음 쪽 ${r.next}ms · 그다음 쪽 ${r.after}ms · 전부 ${r.all}ms`);
  await ctx.close();
}
const avg = (m, k) => Math.round(rows.filter((r) => r.mode === m).reduce((s, r) => s + (r[k] ?? 0), 0) / rows.filter((r) => r.mode === m).length);
console.log(`\n평균 (${KBPS}KB/s, 왕복 ${RTT}ms): 지금 방식 다음 쪽 ${avg("three", "next")}ms · 그다음 ${avg("three", "after")}ms · 전부 ${avg("three", "all")}ms`);
console.log(`                     다음 쪽 먼저   다음 쪽 ${avg("next", "next")}ms · 그다음 ${avg("next", "after")}ms · 전부 ${avg("next", "all")}ms`);
await b.close();
