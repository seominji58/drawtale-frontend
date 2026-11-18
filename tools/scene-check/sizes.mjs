// 소품 크기가 쪽마다 다른 까닭 찾기 (2026-11-10): layout.mjs 가 남긴 {묶음}-things.json 에서 그 소품이 놓인 쪽만 다시 그려
// 주인공 키 · 소품 키 · 장소를 적는다. 가장 작게 나온 쪽은 사진도 찍는다.
//   node tools/scene-check/sizes.mjs [묶음 파일=all-long.json] [소품 이름,…=mailbox,bench,seesaw,bridge,chair,teddy,gate,flag]
import { webkit } from "playwright";
import fs from "node:fs";

const FILE = process.argv[2] ?? "all-long.json", TAG = FILE.replace(/\.json$/, "");
const NAMES = (process.argv[3] ?? "mailbox,bench,seesaw,bridge,chair,teddy,gate,flag").split(",");
const BASE = `http://localhost:5174/tools/scene-check/harness.html`;
const where = JSON.parse(fs.readFileSync(`tools/scene-check/out/${TAG}-things.json`, "utf8")).where;
const HELD = new Set(["hand", "head", "mouth", "back", "window", "high", "water", "blown"]);

// 이야기(ci)마다 한 번만 연다
const byCase = new Map();
// 장소마다 6쪽까지 (다 열면 수백 번이라 느리다)
for (const n of NAMES) for (const keys of Object.values(where[n] ?? {})) for (const k of keys.filter((_, i, a) => i % Math.max(1, Math.ceil(a.length / 6)) === 0)) {
  const ci = Number(k.split(":")[0]);
  byCase.set(ci, new Set([...(byCase.get(ci) ?? []), k]));
}
const b = await webkit.launch();
const page = await b.newPage({ viewport: { width: 1450, height: 1000 } });
const rows = [];
for (const [ci, keys] of byCase) {
  await page.goto(`${BASE}?f=${FILE}&i=${ci}&n=1`);
  await page.waitForFunction(() => window.__audit, null, { timeout: 60000 });
  for (const s of await page.evaluate(() => window.__audit)) {
    if (!keys.has(s.key) || !s.hero) continue;
    const heroH = s.hero.y1 - s.hero.y0;
    for (const t of s.things) if (NAMES.includes(t.name) && !HELD.has(t.pose))
      rows.push({ key: s.key, loc: s.location, name: t.name, pose: t.pose, spot: t.spot, heroH: +heroH.toFixed(3), h: +(t.y1 - t.y0).toFixed(3), r: +((t.y1 - t.y0) / heroH).toFixed(2), text: s.text.slice(0, 50) });
  }
}
fs.writeFileSync(`tools/scene-check/out/${TAG}-sizes-detail.json`, JSON.stringify(rows, null, 1));
for (const n of NAMES) {
  const v = rows.filter((r) => r.name === n).sort((a, c) => a.r - c.r);
  if (!v.length) continue;
  console.log(`\n■ ${n} ${v.length}쪽: 주인공 대비 ${v[0].r} ~ ${v.at(-1).r}`);
  const byLoc = new Map();
  for (const r of v) byLoc.set(r.loc, [...(byLoc.get(r.loc) ?? []), r]);
  for (const [loc, rs] of byLoc) console.log(`  ${loc}: ${rs.length}쪽 · 소품 ${[...new Set(rs.map((r) => r.h))].join("/")} · 주인공 ${[...new Set(rs.map((r) => r.heroH))].join("/")} · 비율 ${[...new Set(rs.map((r) => r.r))].join("/")}`);
  // 가장 작게 나온 쪽 사진
  const [ci, pi] = v[0].key.split(":").map(Number);
  await page.goto(`${BASE}?f=${FILE}&i=${ci}&n=1`);
  await page.waitForFunction(() => window.__audit, null, { timeout: 60000 });
  await page.locator(`[data-page="${v[0].key}"]`).screenshot({ path: `tools/scene-check/out/${TAG}-small-${n}-${ci}-${pi}.png` });
}
await b.close();
