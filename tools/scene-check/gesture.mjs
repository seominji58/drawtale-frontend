// 몸짓 연출 확인 (2026-11-10): out/gestures.json 의 쪽마다 주인공 그림의 transform 을 0.1초마다 재서 움직였는지 · 어떤 연출인지 보고,
// 한가운데 순간을 찍는다. 개발 서버(5174)를 켜 둔 채로: node tools/scene-check/gesture.mjs [facing=0|1]
// 시험 쪽은 여기서 out/gestures.json 으로 쓴다. 주인공 그림은 out/_bird.png 가 있으면 그것(사람 아닌 그림), 없으면 사람 서 있는 그림
import { webkit } from "playwright";
import fs from "node:fs";
const facing = process.argv[2] ?? "0";
const OUT = "tools/scene-check/out";
const TEXTS = ["나는 아주머니에게 꾸벅 인사했어요.", "나는 고개를 끄덕끄덕했어요.", "나는 무서워서 덜덜 떨었어요.",
  "나는 날개를 꼭 오므리고 웅크렸어요.", "나는 빙글빙글 돌았어요.", "친구가 덜덜 떨었어요.",
  "나는 햇볕 아래에서 꾸벅꾸벅 졸았어요.", "나는 꾸벅 인사하고 빙글 돌았어요."];
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/gestures.json`, JSON.stringify([{ id: "gestures", place: "바다", problem: "친구가 울고 있었어요",
  action: "옆에서 기다려 줬어요", result: "모두 기뻐했어요", book: { title: "몸짓", pages: TEXTS.map((text, i) => ({
    page: i + 1, stage: "place", action: "idle", text, child_words: "", lines: [{ speaker: "나레이션", text, emotion: "" }],
    scene: { hero_on_page: true, characters: [], background: "A sunny sandy beach with gentle waves.", location: "" } })) } }]));
const still = fs.existsSync(`${OUT}/_bird.png`) ? "&still=out/_bird.png" : "";
const url = `http://localhost:5174/tools/scene-check/harness.html?f=gestures.json&n=1&play=idle&flip=600&w=360&h=240${still}&facing=${facing}`;
const browser = await webkit.launch();   // layout.mjs 와 같이 WebKit (이 PC 에 깔린 것)
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url);
await page.waitForSelector(".scene-hero");
const seen = {};
const t0 = Date.now();
while (Date.now() - t0 < 4500) {
  const now = await page.$$eval("[data-page]", (ws) => ws.map((w) => {
    const h = w.querySelector(".scene-hero");
    return h ? { key: w.dataset.page, cls: h.className.replace("scene-hero", "").trim(), tf: getComputedStyle(h).transform } : null;
  }));
  for (const r of now) if (r) {
    const s = (seen[r.key] ??= { text: "", cls: new Set(), tf: new Set() });
    s.cls.add(r.cls); s.tf.add(r.tf);
  }
  if (Date.now() - t0 > 900 && Date.now() - t0 < 1000) await page.screenshot({ path: `${OUT}/_gesture-${facing}.png` });
  await page.waitForTimeout(100);
}
const texts = await page.$$eval("[data-page]", (ws) => Object.fromEntries(ws.map((w) => [w.dataset.page, w.dataset.text])));
for (const [k, s] of Object.entries(seen)) console.log(k, [...s.cls].filter(Boolean).join(",") || "-", `transform ${s.tf.size}가지`, "|", texts[k]);
await browser.close();
