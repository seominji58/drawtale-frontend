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
// 11/10 서민지 님 SceneStage SAME_KIND 에 더한 것: 화살표 = 표지판, 벤치 = 의자, 장난감 상자 = 상자, 북 = 북들
const SAME = [["castle", "sandcastle", "sea-castle"], ["tree", "pine"], ["flowers", "flowerbed", "flower"], ["rock", "rocks", "stone", "pebble"],
  ["sign", "arrow"], ["bench", "chair"], ["toybox", "box"], ["drum", "drums"]];
const kin = (a, b) => a === b || SAME.some((g) => g.includes(a) && g.includes(b));

// 쪽 글이 말하는 배경 물건 (11/10: 배경에 있으면 소품을 또 놓지 않게 되자, 글의 그 물건이 배경 것뿐인데 인물에 가려졌다)
const SAID = { sign: /표지판|화살표/, bench: /벤치/, chair: /의자/, toybox: /장난감 상자/, box: /상자/, drums: /(?<![가-힣])북(?:을|이|소리|채)/,
  castle: /모래성|성(?:을|이|에)/, fountain: /분수/, slide: /미끄럼틀/, swing: /그네/, seesaw: /시소/, bed: /침대/, sofa: /소파/, stall: /가게|가판대/,
  bus: /버스/, mailbox: /우체통/, log: /통나무/, well: /우물/, tent: /텐트/ };
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
  // 글이 말하는 배경 물건이 주인공 · 인물에 절반 넘게 가림 (주인공 상자는 그림 칸이라 넉넉하니 가운데 60% 폭만 본다)
  const body = (f) => { const w = f.x1 - f.x0; return { ...f, x0: f.x0 + w * 0.2, x1: f.x1 - w * 0.2 }; };
  for (const b of s.bg) {
    const rx = Object.entries(SAID).find(([k]) => b.name === k || b.name.startsWith(k))?.[1];
    if (!rx || !rx.test(s.text)) continue;
    const covered = Math.max(0, ...figs.map((f) => inter(body(f), b) / Math.max(1e-6, area(b))));
    if (covered > 0.4) out.push(["글이 말하는 배경 물건이 가림", `${b.name} ${Math.round(covered * 100)}%`]);
  }
  // 11/10 소품 겹침 고침 확인: 카드 표지판(인물 줄에 선다)이 배경 표지판 · 쪽 글 화살표와 함께 섬
  for (const f of s.people.filter((f) => f.name === "sign")) {
    const dup = [...s.bg, ...s.things].find((b) => kin("sign", b.name));
    if (dup) out.push(["표지판이 둘", `카드 표지판 + ${dup.name}`]);
  }
  // 화분이 있으면 꽃은 따로 놓지 않는다
  if (s.things.some((t) => t.name === "flowerpot") && s.things.some((t) => kin("flowers", t.name))) out.push(["화분과 꽃이 따로", "flowerpot + flowers"]);
  // 둥지는 배경 나무 가지 사이에 (나무가 있을 때)
  const trees = s.bg.filter((b) => /pine|tree/.test(b.name));
  for (const t of s.things.filter((t) => t.name === "nest")) {
    const cx = (t.x0 + t.x1) / 2, cy = (t.y0 + t.y1) / 2;
    if (trees.length && !trees.some((b) => cx > b.x0 && cx < b.x1 && cy > b.y0 && cy < b.y1)) out.push(["둥지가 나무 밖", `nest (${cx.toFixed(2)}, ${cy.toFixed(2)})`]);
  }
  s.things.forEach((t, i) => {
    const held = HELD.has(t.pose);
    if (outside(t) > 0.15) out.push(["화면 밖 소품", `${t.name} ${Math.round(outside(t) * 100)}%`]);
    if (!held) for (const f of figs) {
      const o = inter(t, f) / Math.max(1e-6, area(t));
      if (o > 0.2) out.push(["소품이 인물을 가림", `${t.name} ↔ ${f.name} ${Math.round(o * 100)}%`]);
    }
    for (const b of s.bg) {
      if (kin(t.name, b.name)) out.push(["배경에 이미 있는 물건을 또 놓음", `${t.name} (배경 ${b.name})`]);
      else if (!held && t.spot !== "air" && t.spot !== "wall" && t.name !== "nest") {
        const o = inter(t, b) / Math.max(1e-6, area(t));
        if (o > 0.3) out.push(["소품이 배경 물건과 겹침", `${t.name} ↔ ${b.name} ${Math.round(o * 100)}%`]);
      }
    }
    for (const u of s.things.slice(i + 1)) {
      if (kin(t.name, u.name)) out.push(["같은 종류 소품 둘", `${t.name} + ${u.name}`]);
      const o = inter(t, u) / Math.max(1e-6, Math.min(area(t), area(u)));
      if (o > 0.3 && !(HELD.has(t.pose) && HELD.has(u.pose))) out.push(["소품끼리 겹침", `${t.name} ↔ ${u.name} ${Math.round(o * 100)}%`]);
    }
    const h = t.y1 - t.y0;
    // 대문 · 텐트 · 우주선 · 로켓은 실제로 아이보다 크다 (11/9 소품 키를 실제 크기 기준으로), 1.25 배까지
    const big = BIG_THINGS.has(t.name);
    if (!held && h > heroH * (big ? 1.25 : 1.05)) out.push(["소품이 주인공보다 큼", `${t.name} ${(h / heroH).toFixed(2)}배`]);
    if (!held && t.spot === "ground" && t.y1 < 0.86 && t.name !== "nest") out.push(["땅 소품이 떠 있음", `${t.name} 발끝 ${t.y1.toFixed(2)}`]);
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
// 소품 크기: 주인공 키 대비 (손 · 머리 · 창 등에 든 것은 빼고). 같은 소품이 쪽마다 크기가 크게 다르면 자리가 없어 줄인 것
const sizes = new Map();
for (const s of all) {
  const heroH = s.hero ? s.hero.y1 - s.hero.y0 : null;
  if (!heroH) continue;
  for (const t of s.things) if (!HELD.has(t.pose)) (sizes.get(t.name) ?? sizes.set(t.name, []).get(t.name)).push((t.y1 - t.y0) / heroH);
}
const q = (v, f) => v[Math.min(v.length - 1, Math.floor(f * v.length))];
const sizeRows = [...sizes].map(([n, v]) => { v.sort((a, b) => a - b); return { n, c: v.length, min: q(v, 0), med: q(v, 0.5), max: q(v, 1) }; })
  .sort((a, b) => b.med - a.med);
console.log("\n■ 소품 크기 (주인공 키 대비, 쪽 수 · 가장 작게 · 가운데 · 가장 크게)");
console.log(sizeRows.map((r) => `${r.n} ${r.c} · ${r.min.toFixed(2)} / ${r.med.toFixed(2)} / ${r.max.toFixed(2)}`).join("\n"));
fs.writeFileSync(`tools/scene-check/out/${TAG}-sizes.json`, JSON.stringify(sizeRows, null, 1));
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
