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
// 앉는 자리(plan.seatOf) → 그 그림 이름들
const SEAT_NAMES = { stump: ["stump"], chair: ["bench", "chair"], rocks: ["rocks", "rock", "pebble"], log: ["log"], sofa: ["sofa"], bed: ["bed"],
  swing: ["swing"], seesaw: ["seesaw"], stairs: ["stairs"], cushion: ["cushion"] };
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
  // 땅에 서는 사람이 땅 줄보다 위에 (뒤에 세워 작게 · 높게 → 떠 보임, 11/10 사용자 「친구가 공중에 떠 있다」). 새 · 박쥐 · 우주는 뺀다
  for (const f of s.people) if (f.name !== "bird" && f.name !== "bat" && !/^space|astronaut|alien/.test(f.name) && s.location !== "sea-underwater" && f.y1 < 0.9)
    out.push(["인물이 땅보다 떠 있음", `${f.name} 발끝 ${f.y1.toFixed(2)}`]);
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
    // 앉는 자리 물건은 주인공이 일부러 그 앞에 붙어 선다 (주인공만 빼고 잰다)
    const seatHere = s.seat && (SEAT_NAMES[s.seat] ?? [s.seat]).includes(b.name);
    const covered = Math.max(0, ...figs.filter((f) => !(seatHere && f.name === "주인공")).map((f) => inter(body(f), b) / Math.max(1e-6, area(b))));
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
    // 앉는 자리 물건은 주인공이 일부러 붙어 선다. 주인공은 그림 칸이 팔까지 넓어 몸 가운데 6할만 본다 (11/10)
    const seatThing = (s.seat && (SEAT_NAMES[s.seat] ?? [s.seat]).includes(t.name))
      // 사람 뒤에 그리는 넓은 풍경 · 나무에 걸린 둥지는 사람을 가리지 않는다 (SceneStage behindPeople)
      || ["tent", "spaceship", "rocket", "boat", "bridge", "dune", "nest"].includes(t.name)
      // 사람 뒤 자리(발 줄보다 위)에 놓인 땅 소품도 사람보다 먼저 그린다 (11/10)
      || (t.spot === "ground" && t.y1 < 0.915)
      // 장면이 사람보다 먼저(뒤에) 그린 소품 (SceneStage behindPeople: 사람 자리에 어쩔 수 없이 겹친 이어 남은 물건 · 넓은 풍경)
      || t.behind;
    // 카드 표지판은 사람이 아니다: 표지판 기둥 밑 화분 · 조개는 가림이 아니다 (표지판끼리 · 소품과는 아래 소품 검사가 본다)
    if (!held && !seatThing) for (const f of figs.filter((g) => g.name !== "sign")) {
      // 인물 그림도 양옆이 팔 · 투명 여백이라 주인공처럼 가운데 6할만 본다 (11/11: 아빠 옆 화분이 그림 칸 여백에만 걸렸는데 가림으로 셌다)
      const fb = { ...f, x0: f.x0 + (f.x1 - f.x0) * 0.2, x1: f.x1 - (f.x1 - f.x0) * 0.2 };
      const o = inter(t, fb) / Math.max(1e-6, area(t));
      if (o > 0.2) out.push(["소품이 인물을 가림", `${t.name} ↔ ${f.name} ${Math.round(o * 100)}%`]);
    }
    for (const b of s.bg) {
      if (kin(t.name, b.name)) out.push(["배경에 이미 있는 물건을 또 놓음", `${t.name} (배경 ${b.name})`]);
      // 학교 건물 · 마을 집은 맨 뒤 풍경 (SceneStage BACKDROP)
      else if (!held && t.spot !== "air" && t.spot !== "wall" && t.name !== "nest" && !["building", "houses", "house"].includes(b.name)) {
        const o = inter(t, b) / Math.max(1e-6, area(t));
        if (o > 0.3) out.push(["소품이 배경 물건과 겹침", `${t.name} ↔ ${b.name} ${Math.round(o * 100)}%`]);
      }
    }
    for (const u of s.things.slice(i + 1)) {
      if (kin(t.name, u.name)) out.push(["같은 종류 소품 둘", `${t.name} + ${u.name}`]);
      const o = inter(t, u) / Math.max(1e-6, Math.min(area(t), area(u)));
      // 사람 손에 든 것이 사람 뒤에 그리는 넓은 풍경(텐트 · 난간 · 표지판 …) 앞에 오는 것은 겹침이 아니다 (「랜턴을 든 엄마」 앞 텐트, 11/12 난간 · 표지판 앞 손전등)
      const wideBack = (HELD.has(t.pose) || HELD.has(u.pose)) && [t.name, u.name].some((n) => ["tent", "spaceship", "rocket", "boat", "bridge", "dune", "railing", "arrow", "sign", "sign-green"].includes(n));
      if (o > 0.3 && !(HELD.has(t.pose) && HELD.has(u.pose)) && !wideBack) out.push(["소품끼리 겹침", `${t.name} ↔ ${u.name} ${Math.round(o * 100)}%`]);
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

// 쪽 사이 이어짐 (11/10 사용자 「사라지는 타이밍, 위치, 크기 다 중요해」): 같은 배경이 이어지는 쪽끼리 붙박이 물건 · 앉는 자리
const KEEP = new Set(["nest", "tent", "arrow", "bench", "chair", "table", "flag", "mailbox", "gate", "fence", "bridge", "stairs", "seesaw",
  "boat", "sandcastle", "flowerpot", "flowers", "mushroom", "puddle", "rocks", "pebble", "dune", "rocket", "spaceship", "rug", "clock", "log",
  "cushion", "footprints", "stump", "shells"]);
const GONE = /무너|부서|사라졌|사라지|치웠|치우|떠내려|날아가|날아갔|가져갔|가져가|주워|주웠|집어|들고 갔|넣었|넣어|쓸려|녹아|터졌|떠났|떠나/;
const SEAT = [[/그루터기/, ["stump"]], [/벤치|의자/, ["bench", "chair"]], [/바위|돌(?:멩이)?(?=에|위)/, ["rocks", "rock", "pebble"]], [/통나무/, ["log"]],
  [/소파/, ["sofa"]], [/침대/, ["bed"]], [/그네/, ["swing"]], [/시소/, ["seesaw"]], [/계단/, ["stairs"]], [/방석/, ["cushion"]]];
const cx = (r) => (r.x0 + r.x1) / 2;
const free = (s) => s.things.filter((t) => !HELD.has(t.pose));
const byStory = new Map();
for (const s of all) { const [ci, pi] = s.key.split(":").map(Number); (byStory.get(ci) ?? byStory.set(ci, []).get(ci)).push({ ...s, pi }); }
for (const ps of byStory.values()) {
  ps.sort((a, b) => a.pi - b.pi);
  ps.forEach((s, i) => {
    const prev = ps[i - 1];
    // 꿈 쪽(현실 물건을 잠시 뺌)과 작은 물건 2개 제한은 사라짐으로 세지 않는다 (plan DREAM_TEXT · SMALL_KEEP)
    const dreamy = (t) => /꿈\s?속|꿈에서|꿈나라|꿈을 꾸|꿈을 꿨/.test(t);
    const SMALLK = new Set(["flowers", "pebble", "shells", "mushroom", "puddle", "footprints", "cushion", "flowerpot"]);
    if (prev && prev.location === s.location && !dreamy(prev.text) && !dreamy(s.text)) {
      for (const t of free(prev).filter((t) => KEEP.has(t.name))) {
        const u = free(s).find((v) => v.name === t.name);
        // 같은 종류(작은 돌 → 바위 · 벤치 → 의자)가 대신 섰으면 사라진 것이 아니다
        if (!u) { if (!SMALLK.has(t.name) && !GONE.test(prev.text) && !free(s).some((v) => kin(v.name, t.name)) && !s.bg.some((v) => kin(v.name, t.name))) s.issues.push(["같은 배경인데 물건이 사라짐", t.name]); continue; }
        // 처음 나온 쪽의 등장 움직임(통통 · 흔들 · 반짝) 중에 잰 크기는 비교하지 않는다
        if (/\bm-/.test(t.cls ?? "") || /\bm-/.test(u.cls ?? "")) continue;
        const dx = Math.abs(cx(u) - cx(t)), dh = Math.abs((u.y1 - u.y0) - (t.y1 - t.y0)), dy = Math.abs(u.y1 - t.y1);
        if (dx > 0.004 || dh > 0.004 || dy > 0.004) s.issues.push(["이어진 물건 자리 · 크기 바뀜", `${t.name} 가로 ${dx.toFixed(3)} 키 ${dh.toFixed(3)}`]);
      }
    }
    // 앉는 자리: 그 물건이 있으면 주인공이 그 앞에 (가운데 차이가 화면 폭 6% 안)
    // 앉는 자리는 장면 계획이 정한 것(주인공이 앉는 문장만, plan.seatOf): 그 그림 이름들
    const seat = s.seat ? [null, SEAT_NAMES[s.seat] ?? [s.seat]] : null;
    if (seat && s.hero) {
      const objs = [...free(s), ...s.bg].filter((o) => seat[1].includes(o.name));
      if (!objs.length) s.issues.push(["앉는 자리가 장면에 없음", seat[1][0]]);
      // 앉는 그림이 없어 주인공은 그 물건 가장자리에 붙어 선다 (11/10): 주인공 몸 가운데 6할이 물건 가로 범위에 닿으면 됨
      else if (!objs.some((o) => { const w = s.hero.x1 - s.hero.x0, c = cx(s.hero); return c + w * 0.3 > o.x0 && c - w * 0.3 < o.x1; }))
        s.issues.push(["앉는 자리와 주인공이 떨어짐", seat[1][0]]);
    }
  });
}

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
