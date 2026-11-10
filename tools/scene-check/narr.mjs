// 나레이션 자리별 장면 찍기 (2026-11-10): 소품이 대사에 맞춰 나타나는지 · 주는 사람 손 → 받는 사람 손으로 옮겨 가는지 눈으로 본다.
//   node tools/scene-check/narr.mjs all-long.json 458:8 0.05 0.6   → out/_narr-458-8-0.05.png …  (목 엔진 개발 서버 5174, 검사 페이지 ?narr=)
import { webkit } from "playwright";
const [file, key, ...narrs] = process.argv.slice(2);
const [ci] = key.split(":");
const b = await webkit.launch();
const page = await b.newPage({ viewport: { width: 1450, height: 1000 } });
for (const n of narrs) {
  await page.goto(`http://localhost:5174/tools/scene-check/harness.html?f=${file}&i=${ci}&n=1&narr=${n}`);
  await page.waitForFunction(() => window.__audit, null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.locator(`[data-page="${key}"]`).screenshot({ path: `tools/scene-check/out/_narr-${key.replace(":", "-")}-${n}.png` });
}
await b.close();
