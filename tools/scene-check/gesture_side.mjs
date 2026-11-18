// 옆모습 그림으로 몸짓 연출 확인 (2026-11-10 사용자 「옆모습 기준으로 가능한지 테스트」). gesture.mjs 가 쓴 out/gestures.json 쪽으로
// out/side/*.png (바탕을 오린 옆모습 그림, 이름 끝이 _left 면 머리가 왼쪽, _front 면 앞모습으로 다룸) 를 하나씩 주인공으로 열어
// 꾸벅 · 웅크리기가 가장 큰 순간을 찍는다. 개발 서버(5174)를 켜 둔 채로, gesture.mjs 를 한 번 돌린 뒤:
// node tools/scene-check/gesture_side.mjs [이름 …] → out/side/_shot-<이름>-<순간>.png (이름을 주면 그 그림만)
import { webkit } from "playwright";
import fs from "node:fs";
const DIR = "tools/scene-check/out/side";
const browser = await webkit.launch();
// --real: out/real/*.json (실제 그림을 AI 로 렌더한 그림띠 · 자리 · 머리 쪽 · 형태) 로. 이야기와 같은 캔버스 길이다
const REAL = process.argv.includes("--real");
const only = process.argv.slice(2).filter((a) => a !== "--real");
if (REAL) {
  const RD = "tools/scene-check/out/real";
  for (const f of fs.readdirSync(RD).filter((n) => n.endsWith(".json") && (!only.length || only.includes(n.replace(/\.json$/, ""))))) {
    const name = f.replace(/\.json$/, ""), m = JSON.parse(fs.readFileSync(`${RD}/${f}`, "utf8"));
    // 앱처럼: 사람(biped) · 문어(radial)는 형태 정의가 앞모습(facing front)이라 늘 0
    const facing = ["biped", "radial"].includes(m.form) ? 0 : m.facing === "left" ? -1 : m.facing === "right" ? 1 : 0;
    const fit = ["quadruped", "chain", "finned", "winged"].includes(m.form) ? "width" : "height";
    const page = await browser.newPage({ viewport: { width: 1600, height: 460 } });
    await page.goto(`http://localhost:5174/tools/scene-check/harness.html?f=gestures.json&n=1&play=idle&flip=600&w=300&h=200&sprite=out/real/${name}.webp&frames=${m.frames}&box=${m.box.join(",")}&fit=${fit}&facing=${facing}`);
    await page.waitForSelector("canvas.scene-hero");
    const t0 = Date.now();
    for (const [at, tag] of [[1150, "bow"], [1750, "crouch"]]) {
      await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
      await page.screenshot({ path: `${RD}/_shot-${name}-${tag}.png` });
    }
    const v = await page.$eval("canvas.scene-hero", (h) => ["--lean", "--pivot", "--tip"].map((k) => h.style.getPropertyValue(k)).join(" "));
    console.log(name, m.form, "머리", m.facing ?? "앞모습", v);
    await page.close();
  }
  await browser.close();
  process.exit(0);
}
for (const f of fs.readdirSync(DIR).filter((n) => n.endsWith(".png") && !n.startsWith("_") && (!only.length || only.includes(n.replace(/\.png$/, ""))))) {
  const name = f.replace(/\.png$/, ""), facing = name.endsWith("_left") ? -1 : name.endsWith("_front") ? 0 : 1;
  const page = await browser.newPage({ viewport: { width: 1600, height: 460 } });
  await page.goto(`http://localhost:5174/tools/scene-check/harness.html?f=gestures.json&n=1&play=idle&flip=600&w=300&h=200&still=out/side/${f}&facing=${facing}`);
  await page.waitForSelector(".scene-hero");
  const t0 = Date.now();
  for (const [at, tag] of [[1150, "bow"], [1750, "crouch"]]) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    await page.screenshot({ path: `${DIR}/_shot-${name}-${tag}.png` });
  }
  const lean = await page.$eval(".scene-hero", (h) => h.style.getPropertyValue("--lean"));
  console.log(name, "머리", facing > 0 ? "오른쪽" : facing < 0 ? "왼쪽" : "앞모습", "기울기", lean);
  await page.close();
}
await browser.close();
