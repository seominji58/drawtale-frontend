// 기기 점검 (2026-11-09): 목 엔진 앱을 처음부터 끝까지 넘기며 화면마다 찍고, 화면 밖으로 나간 것 · 아래(옆) 단추 줄과 겹친 것을 잰다.
//
// 준비 (playwright 는 저장소 의존성에 넣지 않는다):
//   npm i --no-save playwright && npx playwright install webkit
//   VITE_ENGINE=mock npx vite --host 0.0.0.0 --port 5174 --strictPort
// 안드로이드 (에뮬레이터 Chrome, 실제 화면은 adb 로 찍는다):
//   emulator -avd Medium_Phone_API_37.0 → Chrome 으로 http://10.0.2.2:5174 열기 → adb forward tcp:9222 localabstract:chrome_devtools_remote
//   adb shell wm size 1080x2340 && adb shell wm density 480     # 갤럭시 S23 (CSS 360 × 780). 탭은 1600x2560 · 320
//   node tools/device-check/walk.mjs android galaxy_s23 rotate     # 화면마다 세로 → 가로 → 세로
//   node tools/device-check/walk.mjs android g_land land           # 가로로 둔 채 한 바퀴
// iOS 대신 WebKit (Safari 엔진, Windows 에서는 iOS 시뮬레이터를 못 띄운다):
//   node tools/device-check/walk.mjs webkit ipad_l 1180 746 touch  # 아이패드 10세대 가로, Safari 막대를 뺀 높이
// 결과: tools/device-check/shots/<이름>/ (git 에 넣지 않는다), 걸린 것은 줄마다 「넘침: …」
import { chromium, webkit } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [, , kind, name, a3, a4, a5] = process.argv;
const OUT = new URL(`./shots/${name}/`, import.meta.url);
fs.mkdirSync(OUT, { recursive: true });
const ADB = `${process.env.LOCALAPPDATA}/Android/Sdk/platform-tools/adb.exe`;
const adb = (...a) => execFileSync(ADB, a, { encoding: "utf8" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rotateTest = kind === "android" && a3 === "rotate";

let browser, page, base;
if (kind === "android") {
  browser = await chromium.connectOverCDP("http://localhost:9222");
  const ctx = browser.contexts()[0];
  page = ctx.pages().find((p) => p.url().includes("5174")) ?? (await ctx.newPage());
  base = "http://10.0.2.2:5174";
} else {
  browser = await webkit.launch();
  const touch = a5 === "touch";
  const ctx = await browser.newContext({
    viewport: { width: +a3, height: +a4 }, deviceScaleFactor: 2, hasTouch: touch,
    userAgent: touch
      ? "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15"
      : undefined,
  });
  page = await ctx.newPage();
  base = "http://localhost:5174";
}
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

/** 화면 밖 · 넘침 검사: 스크롤 칸(.scroll 등 overflow auto) 안은 뺀다 */
const audit = () => page.evaluate(() => {
  const W = innerWidth, H = innerHeight, out = [];
  const scrollable = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll|hidden)/.test(s.overflowY + s.overflowX) && e !== document.body && e !== document.documentElement && e.id !== "root") return true; } return false; };
  for (const el of document.querySelectorAll(".screen *")) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.opacity === "0" || s.position === "fixed") continue;
    if (el.closest(".scene, svg, .paper-wash, [aria-hidden=true]")) continue;
    const over = Math.max(-r.left, r.right - W, -r.top, r.bottom - H);
    if (over > 4 && !scrollable(el)) out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${Math.round(over)}px "${(el.textContent || "").trim().slice(0, 14)}"`);
  }
  // 가운데 칸의 단추 · 그림이 아래(옆) 단추 줄과 겹치는지
  const acts = document.querySelector(".screen > .acts");
  if (acts) {
    const A = acts.getBoundingClientRect();
    for (const el of document.querySelectorAll(".screen > .main :is(button, canvas, img, input, .choice)")) {
      const b0 = el.getBoundingClientRect();
      // 스크롤 · 숨김 칸 밖으로 잘린 부분은 보이지 않는다
      const r = { left: b0.left, right: b0.right, top: b0.top, bottom: b0.bottom, width: b0.width };
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.overflowX !== "visible" || cs.overflowY !== "visible") {
          const c = e.getBoundingClientRect();
          r.left = Math.max(r.left, c.left); r.right = Math.min(r.right, c.right); r.top = Math.max(r.top, c.top); r.bottom = Math.min(r.bottom, c.bottom);
        }
      }
      if (r.right <= r.left || r.bottom <= r.top) continue;
      const w = Math.min(r.right, A.right) - Math.max(r.left, A.left), h = Math.min(r.bottom, A.bottom) - Math.max(r.top, A.top);
      if (w > 4 && h > 4 && r.width && getComputedStyle(el).visibility !== "hidden") out.push(`겹침 ${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} ${Math.round(w)}x${Math.round(h)} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 10)}"`);
    }
  }
  const de = document.documentElement;
  return { W, H, docScroll: [de.scrollWidth - W, de.scrollHeight - H], over: out.slice(0, 8) };
});

const report = [];
async function shot(label) {
  await sleep(700);
  const one = async (tag) => {
    const a = await audit();
    const file = new URL(`${label}${tag}.png`, OUT).pathname.slice(1);
    // 안드로이드는 adb 로 실제 화면을 찍는다 (CDP 캡처는 주소창만큼 어긋나게 찍혔다)
    if (kind === "android") fs.writeFileSync(file, execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 << 20 }));
    else await page.screenshot({ path: file });
    report.push({ label: label + tag, ...a });
  };
  await one("");
  if (rotateTest) {   // 세로에서 가로로 돌린 뒤 · 다시 세로로
    adb("shell", "settings", "put", "system", "user_rotation", "1"); await sleep(1800); await one("_land");
    adb("shell", "settings", "put", "system", "user_rotation", "0"); await sleep(1800); await one("_back");
  }
}
/** 주소가 바뀔 때까지 (화면 안 이동은 load 가 없어 waitForURL 이 안드로이드에서 놓쳤다) */
const urlIs = async (re, ms) => { for (let t = 0; t < ms; t += 250) { if (re.test(await page.evaluate(() => location.pathname))) return true; await sleep(250); } return false; };
const click = async (text, opt = {}) => {
  const b = page.getByRole("button", { name: text, exact: opt.exact ?? false }).first();
  await b.waitFor({ timeout: 8000 });
  await b.click({ force: true });
};

if (kind === "android") { adb("shell", "settings", "put", "system", "accelerometer_rotation", "0"); adb("shell", "settings", "put", "system", "user_rotation", a3 === "land" ? "1" : "0"); await sleep(1500); }
await page.goto(base + "/welcome");
await page.evaluate(() => {
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("storyblanks.token", "mock-token");
  localStorage.setItem("storyblanks.account", "test@example.com");
  localStorage.setItem("storyblanks.mock.onboarded", "1");
  localStorage.setItem("storyblanks.mock.pin", "2580");
  localStorage.setItem("storyblanks.introSeen", "1");
  localStorage.setItem("storyblanks.coach", JSON.stringify(["draw", "form", "confirm", "story"]));
});
await page.goto(base + "/");
await shot("01_start");
await click("이야기 만들기"); await shot("02_guide");
await click("그림 그리기"); await shot("03_upload");
await click("화면에 그리기");
await sleep(1200);
if ((await page.evaluate(() => location.pathname)).includes("/form")) { await shot("03f_form"); await click("두 발로 서는 친구"); }
await shot("03d_draw");
// 사람 모양으로 선 몇 개
const paper = page.locator(".draw-paper canvas").first();
await sleep(1200);   // 돌린 뒤 종이 크기가 다시 맞춰질 때까지
const box = await paper.boundingBox();
const line = async (pts) => {
  await page.mouse.move(box.x + pts[0][0] * box.width, box.y + pts[0][1] * box.height); await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(box.x + x * box.width, box.y + y * box.height, { steps: 6 });
  await page.mouse.up();
};
const circle = []; for (let k = 0; k <= 24; k++) circle.push([0.5 + 0.1 * Math.cos(k / 24 * 6.283), 0.2 + 0.1 * Math.sin(k / 24 * 6.283)]);
await line(circle); await line([[0.5, 0.3], [0.5, 0.62]]); await line([[0.3, 0.42], [0.5, 0.36], [0.7, 0.42]]);
await line([[0.5, 0.62], [0.38, 0.88]]); await line([[0.5, 0.62], [0.62, 0.88]]);
await click("다 그렸어요");
await sleep(800);
if (await page.getByRole("button", { name: "이대로 할래요" }).count()) await click("이대로 할래요");
await urlIs(/upload|form|analyzing|confirm/, 10000);
await sleep(800);
if ((await page.evaluate(() => location.pathname)).includes("upload")) { await shot("03u_picked"); await click("이 그림으로"); }
await sleep(1000);
if ((await page.evaluate(() => location.pathname)).includes("/form")) { await click("두 발로 서는 친구").catch(() => {}); }
await urlIs(/confirm|name|steps|error/, 30000);
await shot("05_confirm");
if ((await page.evaluate(() => location.pathname)).includes("confirm")) await click("이 친구로 할래요");
await sleep(800);
if ((await page.evaluate(() => location.pathname)).includes("name")) { await shot("05n_name"); await click("이름 없이 할래요"); }
for (let k = 0; k < 4; k++) {
  await sleep(900);
  if (!(await page.evaluate(() => location.pathname)).includes("steps")) break;
  await shot(`07_steps${k + 1}`);
  await page.locator(".choice").first().click({ force: true });
  await sleep(500);
  if (await page.getByRole("button", { name: "예", exact: true }).count()) await click("예", { exact: true });
}
await sleep(1500);
if ((await page.evaluate(() => location.pathname)).includes("generating")) await shot("08_generating");
await urlIs(/story/, 60000);
await sleep(2500);
await shot("09_story");
for (let k = 0; k < 2; k++) {
  if (!(await page.getByRole("button", { name: "다음 쪽" }).count())) break;
  await click("다음 쪽"); await sleep(1800);
}
await shot("09_story_p3");
const done = page.getByRole("button", { name: "다 봤어요" });
for (let k = 0; k < 12 && !(await done.count()); k++) { await click("다음 쪽").catch(() => {}); await sleep(900); }
if (await done.count()) { await done.first().click({ force: true }); await sleep(1200); await shot("11_done"); }
await page.goto(base + "/stories"); await shot("12_stories");
await page.goto(base + "/settings"); await shot("13_settings");

fs.writeFileSync(new URL("report.json", OUT), JSON.stringify({ errors, report }, null, 1));
for (const r of report) console.log(`${r.label.padEnd(22)} ${r.W}x${r.H} scroll ${r.docScroll} ${r.over.length ? "넘침: " + r.over.join(" | ") : ""}`);
if (errors.length) console.log("오류:", errors.slice(0, 5));
if (kind === "android") { adb("shell", "settings", "put", "system", "user_rotation", "0"); await browser.close().catch(() => {}); }
else await browser.close();
