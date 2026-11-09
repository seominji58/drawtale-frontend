// 장면 배치 검사 (2026-11-09): 카드 이야기 쪽마다 S-09 장면을 그려 소품 · 인물 · 주인공이 이상한 자리에 있는지 찾는다.
//
// 준비: 목 엔진 개발 서버(VITE_ENGINE=mock npx vite --port 5174) + playwright(webkit), 이야기 묶음 tools/scene-check/out/cases.json
//   (로컬 DB card_stories 에서 꺼낸다: 긴 이야기 · 나레이션 판, book 과 카드 네 칸)
//   node tools/scene-check/layout.mjs [이야기 수=160] [한 번에=10] [묶음 파일=cases.json]
//   (짧은 이야기는 text 만 있는 묶음, 화면 shortBook 처럼 네 쪽으로 나눈다)
// 결과: 종류별 개수와 예, tools/scene-check/out/layout.json, 걸린 쪽 사진 out/flag-*.png
import { webkit } from "playwright";
import fs from "node:fs";

const TOTAL = Number(process.argv[2] ?? 160), STEP = Number(process.argv[3] ?? 10);
// 이야기 묶음 파일 (tools/scene-check/out/ 안) 과 결과 이름 앞말
const FILE = process.argv[4] ?? "cases.json", TAG = FILE.replace(/\.json$/, "");
const BASE = `http://localhost:5174/tools/scene-check/harness.html`;
const url = (i, n) => `${BASE}?f=${FILE}&i=${i}&n=${n}`;

const area = (r) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
const inter = (a, b) => area({ x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), y0: Math.max(a.y0, b.y0), y1: Math.min(a.y1, b.y1) });
const outside = (r) => 1 - inter(r, { x0: 0, x1: 1, y0: 0, y1: 1 }) / Math.max(1e-6, area(r));
const BIG_THINGS = new Set(["gate", "tent", "spaceship", "rocket"]);
const HELD = new Set(["hand", "head", "mouth", "back", "window", "high", "water", "blown"]);
// 배경 그림의 물건 · 쪽 글 소품 중 같은 것 (이름이 달라 bgKinds 가 못 거른다)
const SAME = [["castle", "sandcastle", "sea-castle"], ["tree", "pine"], ["flowers", "flowerbed", "flower"], ["rock", "rocks", "stone"]];
const kin = (a, b) => a === b || SAME.some((g) => g.includes(a) && g.includes(b));

function issuesOf(s) {
  const out = [];
  const figs = [...(s.hero ? [{ name: "주인공", ...s.hero }] : []), ...s.people];
  for (const f of figs) {
    if (outside(f) > 0.12) out.push(["화면 밖 인물", `${f.name} ${Math.round(outside(f) * 100)}%`]);
    // 배경 물건은 뒤쪽(발끝이 위)이라 앞줄 인물과 겹쳐도 앞뒤로 읽힌다. 인물 발끝이 그 물건 발끝보다 위면(뒤에 서야 하는데 앞에 그림) 어색하다
    for (const b of s.bg) {
      const o = inter(f, b) / Math.max(1e-6, Math.min(area(b), area(f)));
      // 공중 인물(새 · 박쥐)은 날고 있어 배경 앞이 맞다
      if (o > 0.25 && f.y1 < b.y1 + 0.02 && f.name !== "bird" && f.name !== "bat") out.push(["인물이 배경 물건과 겹침", `${f.name} ↔ ${b.name} ${Math.round(o * 100)}%`]);
    }
  }
  for (let i = 0; i < figs.length; i++) for (let j = i + 1; j < figs.length; j++) {
    const o = inter(figs[i], figs[j]) / Math.max(1e-6, Math.min(area(figs[i]), area(figs[j])));
    if (o > 0.2) out.push(["인물끼리 겹침", `${figs[i].name} ↔ ${figs[j].name} ${Math.round(o * 100)}%`]);
  }
  const heroH = s.hero ? s.hero.y1 - s.hero.y0 : 0.5;
  s.things.forEach((t, i) => {
    const held = HELD.has(t.pose);
    if (outside(t) > 0.15) out.push(["화면 밖 소품", `${t.name} ${Math.round(outside(t) * 100)}%`]);
    if (!held) for (const f of figs) {
      const o = inter(t, f) / Math.max(1e-6, area(t));
      if (o > 0.2) out.push(["소품이 인물을 가림", `${t.name} ↔ ${f.name} ${Math.round(o * 100)}%`]);
    }
    for (const b of s.bg) {
      if (kin(t.name, b.name)) out.push(["배경에 이미 있는 물건을 또 놓음", `${t.name} (배경 ${b.name})`]);
      else if (!held && t.spot !== "air" && t.spot !== "wall") {
        const o = inter(t, b) / Math.max(1e-6, area(t));
        if (o > 0.3) out.push(["소품이 배경 물건과 겹침", `${t.name} ↔ ${b.name} ${Math.round(o * 100)}%`]);
      }
    }
    for (const u of s.things.slice(i + 1)) {
      const o = inter(t, u) / Math.max(1e-6, Math.min(area(t), area(u)));
      if (o > 0.3 && !(HELD.has(t.pose) && HELD.has(u.pose))) out.push(["소품끼리 겹침", `${t.name} ↔ ${u.name} ${Math.round(o * 100)}%`]);
    }
    const h = t.y1 - t.y0;
    // 대문 · 텐트 · 우주선 · 로켓은 실제로 아이보다 크다 (11/9 소품 키를 실제 크기 기준으로), 1.25 배까지
    const big = BIG_THINGS.has(t.name);
    if (!held && h > heroH * (big ? 1.25 : 1.05)) out.push(["소품이 주인공보다 큼", `${t.name} ${(h / heroH).toFixed(2)}배`]);
    if (!held && t.spot === "ground" && t.y1 < 0.86) out.push(["땅 소품이 떠 있음", `${t.name} 발끝 ${t.y1.toFixed(2)}`]);
  });
  return out;
}

const b = await webkit.launch();
const page = await b.newPage({ viewport: { width: 1450, height: 1000 } });
const all = [];
for (let i = 0; i < TOTAL; i += STEP) {
  await page.goto(url(i, Math.min(STEP, TOTAL - i)));
  await page.waitForFunction(() => window.__audit, null, { timeout: 60000 });
  const a = await page.evaluate(() => window.__audit);
  for (const s of a) all.push({ ...s, issues: issuesOf(s) });
  process.stdout.write(`${Math.min(i + STEP, TOTAL)}/${TOTAL} `);
}
console.log();

const byKind = new Map();
for (const s of all) for (const [k, d] of s.issues) {
  if (!byKind.has(k)) byKind.set(k, []);
  byKind.get(k).push({ key: s.key, loc: s.location, d, text: s.text });
}
console.log(`쪽 ${all.length}, 문제 있는 쪽 ${all.filter((s) => s.issues.length).length}`);
for (const [k, v] of [...byKind].sort((x, y) => y[1].length - x[1].length)) {
  const top = new Map();
  for (const x of v) { const n = x.d.replace(/ \d+%$| [\d.]+배$| 발끝 [\d.]+$/, ""); top.set(n, (top.get(n) ?? 0) + 1); }
  console.log(`\n■ ${k}: ${v.length}쪽`);
  console.log("  " + [...top].sort((x, y) => y[1] - x[1]).slice(0, 10).map(([n, c]) => `${n} ×${c}`).join(" · "));
}
// 장소마다 놓인 소품 (엉뚱한 물건 찾기용) — 소품 이름 → 장소 → [쪽]
const where = {};
for (const s of all) for (const t of s.things) ((where[t.name] ??= {})[s.location] ??= []).push(s.key);
fs.writeFileSync(`tools/scene-check/out/${TAG}-things.json`, JSON.stringify({ where, text: Object.fromEntries(all.map((s) => [s.key, s.text])) }, null, 1));
fs.writeFileSync(`tools/scene-check/out/${TAG}-layout.json`, JSON.stringify({ pages: all.length, byKind: Object.fromEntries(byKind) }, null, 1));

// 종류마다 걸린 쪽 몇 장을 찍어 둔다 (눈으로 확인)
for (const [k, v] of byKind) {
  const keys = [...new Set(v.map((x) => x.key))].slice(0, 4);
  for (const key of keys) {
    const [ci, pi] = key.split(":").map(Number);
    await page.goto(url(ci, 1));
    await page.waitForFunction(() => window.__audit, null, { timeout: 60000 });
    const el = page.locator(`[data-page="${key}"]`);
    await el.screenshot({ path: `tools/scene-check/out/${TAG}-flag-${k.replace(/\s+/g, "_")}-${ci}-${pi}.png` });
  }
}
await b.close();
