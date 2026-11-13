// 쪽을 빠르게 넘길 때 소리가 겹치는지 (2026-11-10, 목 엔진 5174): 쪽마다 음성 파일이 붙은 시험 책으로 「다음 쪽」을 연달아 누르며 동시에 나는 소리 수를 센다
// node tools/device-check/overlap.mjs chrome|webkit <간격ms> [next|alt|swipe] [slow]   (slow: 책을 연 뒤 네트워크 지연 1.5초, Chrome 만)
import { chromium, webkit } from "playwright";
const which = process.argv[2] || "chrome", gap = +(process.argv[3] || 150);
const b = which === "chrome" ? await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] }) : await webkit.launch();
const p = await b.newPage({ viewport: { width: 1180, height: 820 } });
await p.addInitScript(() => {
  window.__max = 0; window.__log = [];
  const playing = new Set();
  const note = (why, a) => { window.__max = Math.max(window.__max, playing.size); window.__log.push([Math.round(performance.now()), why, playing.size, (a.src || "").split("/").pop()]); };
  const P = HTMLMediaElement.prototype;
  const play = P.play;
  P.play = function () {
    if (!this.__watched) {
      this.__watched = true;
      this.addEventListener("playing", () => { playing.add(this); note("playing", this); });
      for (const ev of ["pause", "ended", "emptied"]) this.addEventListener(ev, () => { if (playing.delete(this)) note(ev, this); });
    }
    return play.call(this);
  };
});
await p.goto("http://localhost:5174/welcome");
await p.evaluate(() => { localStorage.setItem("storyblanks.token", "mock-token"); localStorage.setItem("storyblanks.account", "시험"); localStorage.setItem("storyblanks.introSeen", "1"); localStorage.setItem("storyblanks.coach", JSON.stringify(["draw", "form", "confirm", "story"])); });
await p.goto("http://localhost:5174/"); await p.waitForTimeout(1200);
await p.evaluate(async () => {
  const files = ["02cd7c9035c9.mp3", "03c22603e0db.mp3", "07ba891159e5.mp3"];
  const stages = ["place", "place", "problem", "problem", "action", "action", "result", "result"];
  const pages = stages.map((stage, i) => ({ page: i + 1, stage, action: "idle", text: `${i + 1}쪽 글입니다. 천천히 읽어요.`, childWords: "",
    audioUrl: `/voice/guide/${files[i % 3]}` }));
  const story = { storyId: "overlap-test", characterId: "c", title: "소리 겹침 시험", createdAt: new Date().toISOString(), text: "", audioUrl: null, animationUrl: null,
    book: { title: "소리 겹침 시험", pages, orderPages: [1, 3, 5, 7] }, picks: { place: "school", problem: "crying", action: "wave_smile", result: "thanked" } };
  const { useLibrary } = await import("/src/store/library.ts");
  useLibrary.getState().add(story);
});
await p.goto("http://localhost:5174/stories"); await p.waitForTimeout(1500);
await p.locator(".book").first().click({ force: true });
await p.waitForFunction(() => location.pathname === "/story", null, { timeout: 15000 }); await p.waitForTimeout(1500);
await p.evaluate(() => { window.__max = 0; window.__log = []; });
if (process.argv[5] === "slow" && which === "chrome") {
  const c = await p.context().newCDPSession(p);
  await c.send("Network.enable"); await c.send("Network.setCacheDisabled", { cacheDisabled: true });
  await c.send("Network.emulateNetworkConditions", { offline: false, latency: 1500, downloadThroughput: 200000, uploadThroughput: 100000 });
}
const next = p.locator("button", { hasText: "다음 쪽" }), prev = p.locator("button", { hasText: "앞 쪽" });
const mode = process.argv[4] || "next";
const stage = p.locator(".spread").first();
for (let k = 0; k < 6; k++) {
  if (mode === "alt") await (k % 2 ? prev : next).click({ force: true, noWaitAfter: true }).catch(() => {});
  else if (mode === "swipe") {
    const box = await stage.boundingBox();
    await p.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2); await p.mouse.down();
    for (let s = 1; s <= 6; s++) await p.mouse.move(box.x + box.width * (0.8 - s * 0.08), box.y + box.height / 2);
    await p.mouse.up();
  } else await next.click({ force: true, noWaitAfter: true }).catch(() => {});
  await p.waitForTimeout(gap);
}
await p.waitForTimeout(3500);
const r = await p.evaluate(() => ({ max: window.__max, log: window.__log.slice(0, 30) }));
console.log(which, mode, `간격 ${gap}ms`, "동시에 난 소리 최대", r.max);
console.log(r.log.map((x) => x.join(" ")).join("\n"));
await b.close();
