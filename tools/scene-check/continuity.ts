// 장면 이어짐 검사 (2026-11-10): 화면 없이 장면 계획(planPages)만으로 쪽 사이 어긋남을 센다.
//   1) 같은 장소인데 앞 쪽에 있던 붙박이 물건(둥지 · 텐트 · 표지판 …)이 다음 쪽에서 사라짐 — 그 쪽 글에 낱말이 없을 뿐
//   2) 「그루터기에 앉아」처럼 앉는 · 올라가는 자리를 말하는데 그 물건이 장면에 없음 (주인공이 그리로 가는지는 화면을 그려 layout.mjs 가 잰다)
// 묶기 · 실행 (개발 서버 없이):
//   npx esbuild tools/scene-check/continuity.ts --bundle --platform=node --format=esm --alias:@=./src \
//     --define:import.meta.env='{"BASE_URL":"/","MODE":"production"}' --outfile=tools/scene-check/out/continuity.mjs
//   node tools/scene-check/out/continuity.mjs [묶음 파일=all-long.json]
import fs from "node:fs";
import { envAfter, planPages } from "@/features/scene/plan";
import { CHOICES, choicesFor } from "@/features/story/choices";
import type { BookPage } from "@/types/story";

const FILE = process.argv[2] ?? "all-long.json";
const cases = JSON.parse(fs.readFileSync(`tools/scene-check/out/${FILE}`, "utf8"));
const fill = (t: string) => t.replace(/\{이름\}/g, "토토").replace(/\{조사:([^}]+)\}/g, "$1");
const idOf = (kind: "place" | "problem", label: string) => CHOICES[kind].find((c) => c.label === label)?.id;
const idIn = (kind: "action" | "result", label: string, problem?: string) => choicesFor(kind, problem).find((c) => c.label === label)?.id;
const nameOf = (src: string) => src.split("/").pop()!.replace(/\.webp$/, "");
const bgOf = (loc: string): string[] => {
  try { return JSON.parse(fs.readFileSync(`public/scenes/${loc}/layout.json`, "utf8")).objects.map((o: { src: string }) => nameOf(o.src)); }
  catch { return []; }
};

// 붙박이: 놓인 곳에 그대로 있는 물건 (들고 다니는 공 · 손전등 · 책 · 편지 같은 것은 뺀다)
const FIXED = new Set(["nest", "tent", "sign", "arrow", "bench", "chair", "table", "flag", "mailbox", "gate", "fence", "bridge", "stairs",
  "seesaw", "boat", "sandcastle", "flowerpot", "flowers", "mushroom", "puddle", "rocks", "pebble", "dune", "rocket", "spaceship", "rug",
  "clock", "log", "cushion", "footprints", "stump", "shells", "monkeybars", "tunnel", "booth", "parkgate", "slide", "lamp", "flowerbed", "fountain", "pavilion", "bed", "junglegym", "pond", "desk", "railing"]);   // plan.ts KEEP_THINGS 와 같게 (담요는 들고 다닌다)
// 배경 계획(영어)에 그 물건이 아직 있다고 적혀 있나
const EN: Record<string, RegExp> = { nest: /nest/i, tent: /tent/i, sign: /sign/i, arrow: /arrow|sign/i, bench: /bench/i, chair: /chair/i,
  table: /table/i, flag: /flag/i, mailbox: /mailbox|post ?box/i, gate: /gate/i, fence: /fence/i, bridge: /bridge/i, stairs: /stair|step/i,
  seesaw: /seesaw/i, boat: /boat/i, sandcastle: /sand ?castle/i, flowerpot: /pot/i, flowers: /flower/i, mushroom: /mushroom/i,
  puddle: /puddle/i, rocks: /rock|stone/i, pebble: /stone|pebble/i, rocket: /rocket/i, spaceship: /ship/i, rug: /rug|mat/i,
  clock: /clock/i, log: /log/i, cushion: /cushion/i, blanket: /blanket/i, footprints: /footprint/i, dune: /dune/i };
// 앉는 · 올라가는 · 기대는 자리: 낱말 → 그 그림 이름들 (배경 물건 · 쪽 소품). 비었으면 그릴 그림이 없다
const SEATS: [RegExp, string[]][] = [
  [/그루터기/, ["stump"]], [/벤치/, ["bench"]], [/의자/, ["chair", "seat"]], [/바위/, ["rocks", "rock"]], [/통나무/, ["log"]],
  [/계단/, ["stairs"]], [/소파/, ["sofa"]], [/침대/, ["bed"]], [/그네/, ["swing"]], [/시소/, ["seesaw"]], [/방석/, ["cushion"]],
  [/돌(?:멩이)?(?=에|위)/, ["pebble", "rocks", "rock"]], [/평상|정자/, []], [/나뭇가지|나무 위/, []],
];
const SIT = /(앉|올라앉|올라가|누워|누웠|기대)/;
// 5) 글이 말하는 물건이 장면(배경 그림 · 쪽 소품)에 있나 (11/11 사용자 994번 「터널이라는데 내용도 이상하고」 · 「다른 대본에서도 찾으라고 시켰는데」).
// 앞의 글 · 배경 점검(whereHeroIs)은 장소 말만 봐서 「구름다리 · 터널 · 안내소 · 정문」처럼 그림이 아예 없는 물건 말을 놓쳤다.
// 낱말 → 그 그림 이름들 (비었으면 그릴 그림이 없다). 대사 · 없다는 말 · 창밖 · 지난 일(아까) · 꿈 문장은 뺀다
const SAID: [RegExp, string[]][] = [
  [/미끄럼틀/, ["slide"]], [/그네/, ["swing"]], [/시소/, ["seesaw"]], [/정글짐/, ["junglegym"]], [/구름다리/, ["monkeybars", "bars"]],
  [/(?<!모래 )터널/, ["tunnel"]], [/안내소/, ["booth"]], [/정문|교문/, ["parkgate", "gate"]], [/대문/, ["gate", "house"]],
  [/벤치/, ["bench"]], [/표지판/, ["sign", "arrow", "sign-green"]], [/파라솔/, ["parasol"]], [/모래성/, ["castle", "sandcastle"]],
  [/등대/, ["lighthouse", "stairs"]], [/등대[^.!?]{0,10}계단/, ["lighthouse", "stairs"]], [/버스(?!\s?정류장)/, ["bus"]], [/정류장/, ["shelter", "bus"]], [/가로등/, ["lamp"]], [/분수/, ["fountain"]],
  [/소파/, ["sofa"]], [/침대/, ["bed"]], [/책상/, ["desks", "table", "desk"]], [/책꽂이|책장(?!(?:이|을)?\s?(?:[가-힣]+\s)?(?:넘|사락|팔락))/, ["shelf"]], [/피아노/, ["piano"]], [/칠판/, ["board"]],
  [/사물함/, ["lockers"]], [/식탁/, ["table"]], [/텐트/, ["tent"]], [/로켓/, ["rocket"]], [/우주선/, ["spaceship", "rocket", "@space-ship"]],
  [/화단|꽃밭/, ["flowerbed", "flowers", "butterflybush"]], [/울타리/, ["fence"]], [/(?<!(?:등대|구령대)[^.!?]{0,10})계단/, ["stairs"]], [/구령대[^.!?]{0,6}계단/, ["podium", "stairs"]], [/연못/, ["pond", "@cave-lake"]], [/가판대/, ["stall"]],
  [/돌기둥/, ["stalactite", "crystal"]], [/난간/, ["railing"]], [/쉼터/, ["pavilion"]], [/방파제/, ["@sea-pier"]], [/철문/, ["parkgate", "gate"]], [/그물/, ["net"]], [/밧줄/, ["rope"]],
];
// 그림 · 꿈 · 소리 · 냄새 · 지난 일 · 갈 곳(「정문까지 데려다 줬어요」) · 책 쪽(「책장이 넘어가는 소리」)도 장면에 없어도 된다 (11/12)
const NOT_SEEN = /없었|없어|없는|않았|않아|안 보|어디에도|아까|꿈\s?속|꿈에서|꿈을|창\s?밖|창문 (?:밖|너머)|문 너머|생각|떠올|이야기를|가고 싶|가 보고 싶|타고 싶|놀고 싶|그림|소리가 (?:[가-힣]+ )?들|냄새|잡던|까지 데려다|책장(?:이|을) (?:[가-힣]+ )?(?:넘|한 장)|뚫고 싶|터널 (?:끝|속)|버스를 타고|버스 창문|별 그물|그물을 휙/;
const said: { key: string; word: string; loc: string; shown: boolean; text: string }[] = [];

// 주기 문장 (11/10 사용자 「할머니가 사과를 손에 쥐여 줬다고 했는데 사과도 없고」): 「…을/를 … 건네 · 쥐여 주 · 나눠 주 · 주었」
const GIVE_SEN = /([가-힣]+)(?:을|를)\s(?:(?:하나|한 개|두 개|하나씩|한 개씩|한 송이|한 알|조금)\s)?(?:[가-힣]+(?:에게|한테|께)\s)?(?:손에\s|품에\s)?(?:꼭\s|살짝\s|쏙\s)?(?:건네|건넸|쥐여 ?주|쥐여 ?줬|쥐어 ?주|쥐어 ?줬|나눠 ?주|나눠 ?줬|나누어 ?주|선물했|선물로 주|주었|줬|주셨|드렸)/;
const NOT_THING = /^(?:손|등|머리|고개|얼굴|무릎|어깨|볼|발|팔|이마|눈|마음|용기|힘|길|노래|박수|손뼉|하나|우리|나|너|저|토토|친구|엄마|아빠|할머니|할아버지|선생님|이름|인사|말|대답|웃음|미소|약속|칭찬|도움|자리|물|모래)$/;
const gives: { key: string; word: string; shown: boolean; from?: string; to?: string; text: string }[] = [];
// 밤낮 · 어둑함 이어짐 (11/10 사용자 「6쪽에서 해 뜨면서 밝아졌는데 7쪽에서 다시 어두웠다가 밝아지는」)
const DARK_WORDS = /밤|어두|어둠|어둑|캄캄|깜깜|컴컴|껌껌|꺼졌|꺼지|꺼져|껐|잠이 들|잠들|해가 (?:지|졌|저)|노을|저녁|정전|별이|달이|달빛|별빛/;
const BRIGHT_WORDS = /해가 (?:떴|뜨|떠)|해님이|아침|밝아|밝게|밝은|환해|환하|환히|켰|켜졌|켜지|켜져|빛|햇살|햇빛|불이 들어|맑|파란 하늘|해가 반짝/;
const darkOf = (e: { night: boolean; dim?: boolean }) => e.night || !!e.dim;
const flick: { key: string; text: string; old: boolean; now: boolean }[] = [];
const noWhy: { key: string; kind: string; text: string }[] = [];
const gone: { key: string; title: string; loc: string; thing: string; text: string; stillInBg: boolean; back: boolean }[] = [];
const seats: { key: string; title: string; loc: string; word: string; drawn: string | null; text: string; heroTo: number }[] = [];
let pages = 0;
cases.forEach((c: any, ci: number) => {
  if (!c.book) return;
  const problem = idOf("problem", c.problem);
  const picks = { place: idOf("place", c.place), problem, action: idIn("action", c.action, problem), result: idIn("result", c.result, problem) };
  const bp = c.book.pages.map((p: any) => ({ ...p, text: fill(p.text), childWords: p.child_words ?? "" })) as BookPage[];
  const plans = planPages(bp, picks as any, c.book.character_sheet ?? {}, [], "토토");
  pages += plans.length;
  // ONE=18 이면 그 이야기 쪽마다 장소 · 물건을 찍는다
  if (process.env.ONE === String(ci)) plans.forEach((pl, i) => console.log(i + 1, pl.location, (pl.things ?? []).map((t) => nameOf(t.src) + (t.pose ? `[${t.pose}${t.holder ? ":" + t.holder : ""}${t.give ? " ←" + t.give.from + "@" + t.give.at.toFixed(2) : ""}]` : "") + (t.appearAt !== undefined ? `@${t.appearAt.toFixed(2)}` : "")).join(","), "| hero", pl.hero.from.toFixed(2), "→", pl.hero.to.toFixed(2), "| env", JSON.stringify(pl.env), bp[i].stage));
  plans.forEach((pl, i) => {
    const loc = pl.location ?? "";
    const here = new Set((pl.things ?? []).filter((t) => !t.pose || t.pose === "high").map((t) => nameOf(t.src)));
    // 1) 다음 쪽에서 사라짐
    const nx = plans[i + 1];
    // 꿈 쪽(현실 물건을 잠시 뺌 · 꿈 물건은 잇지 않음)과 작은 물건 2개 제한으로 뺀 것은 사라짐이 아니다 (plan DREAM_TEXT · SMALL_KEEP)
    const DREAM = /꿈\s?속|꿈에서|꿈나라|꿈을 꾸|꿈을 꿨/;
    const SMALL = new Set(["flowers", "pebble", "shells", "mushroom", "puddle", "footprints", "cushion", "flowerpot"]);
    if (nx && nx.location === pl.location && !DREAM.test(bp[i].text) && !DREAM.test(bp[i + 1].text)) {
      const there = new Set((nx.things ?? []).map((t) => nameOf(t.src)));
      for (const n of here) if (FIXED.has(n) && !SMALL.has(n) && !there.has(n) && !bgOf(loc).includes(n)) {
        const back = plans.slice(i + 2).some((q) => q.location === pl.location && (q.things ?? []).some((t) => nameOf(t.src) === n));
        gone.push({ key: `${ci}:${i + 2}`, title: c.book.title, loc, thing: n, text: bp[i + 1].text.slice(0, 60),
          stillInBg: !!EN[n]?.test(bp[i + 1].scene?.background ?? ""), back });
      }
    }
    // 4) 밤낮 이어짐: 앞 쪽이 밝게 끝났는데 이 쪽이 어둡게 시작해 밝아짐(깜빡): 예전처럼 앞 쪽 시작 모습(env)을 넘기면 / 지금(앞 쪽 끝 모습, envAfter)
    if (i > 0) {
      const prev = plans[i - 1];
      const end = envAfter(prev, bp[i - 1].text, pl);
      const oldFlick = darkOf(prev.env) && !darkOf(pl.env) && !darkOf(end);
      const nowFlick = darkOf(end) && !darkOf(pl.env) && !BRIGHT_WORDS.test(bp[i].text);
      if (oldFlick || nowFlick) flick.push({ key: `${ci}:${i + 1}`, text: bp[i].text.slice(0, 50), old: oldFlick, now: nowFlick });
      if (!darkOf(end) && darkOf(pl.env) && !DARK_WORDS.test(bp[i].text)) noWhy.push({ key: `${ci}:${i + 1}`, kind: "말 없이 어두워짐", text: bp[i].text.slice(0, 50) });
      if (darkOf(end) && !darkOf(pl.env) && !BRIGHT_WORDS.test(bp[i].text)) noWhy.push({ key: `${ci}:${i + 1}`, kind: "말 없이 밝아짐", text: bp[i].text.slice(0, 50) });
    }
    // 3) 주기: 주는 물건이 장면에 있나, 주는 사람 손 → 받는 사람 손인가
    for (const sen of bp[i].text.split(/(?<=[.!?”])\s*/)) {
      const m = GIVE_SEN.exec(sen.replace(/“[^”]*”/g, ""));
      if (!m || NOT_THING.test(m[1])) continue;
      // 그 문장 안에 나온 물건 (쪽 글에서 그 문장 자리)
      const s0 = bp[i].text.indexOf(sen), s1 = s0 + sen.length;
      const t = (pl.things ?? []).find((x) => x.at !== undefined && x.at >= s0 && x.at < s1 && (x.give || x.pose === "hand" || x.appearAt !== undefined));
      gives.push({ key: `${ci}:${i + 1}`, word: m[1], shown: !!t, from: t?.give?.from, to: t?.holder, text: sen.slice(0, 60) });
    }
    // 5) 글이 말하는 물건
    const all = new Set([...(pl.things ?? []).map((t) => nameOf(t.src)), ...bgOf(loc), ...pl.props.map((q) => (q.src ? nameOf(q.src) : q.id))]);
    for (const sen of bp[i].text.replace(/“[^”]*”/g, " ").split(/(?<=[.!?])\s*/)) {
      if (NOT_SEEN.test(sen)) continue;
      for (const [rx, names] of SAID) {
        const m = rx.exec(sen);
        if (!m) continue;
        // 「@장소」: 그 장소 배경판에 그려져 있다 (부두 배경판의 나무 방파제 · 우주선 안에서 말하는 우주선)
        said.push({ key: `${ci}:${i + 1}`, word: m[0], loc, shown: names.some((n) => all.has(n) || n === `@${loc}`), text: sen.slice(0, 70) });
      }
    }
    // 2) 앉는 자리
    for (const sen of bp[i].text.split(/(?<=[.!?”])\s*/)) {
      if (!SIT.test(sen)) continue;
      for (const [rx, names] of SEATS) {
        const m = sen.match(rx);
        if (!m || sen.indexOf(m[0]) > sen.search(SIT)) continue;   // 자리 낱말이 앉기 앞에
        const drawn = names.find((n) => here.has(n) || bgOf(loc).includes(n)) ?? null;
        seats.push({ key: `${ci}:${i + 1}`, title: c.book.title, loc, word: m[0], drawn, text: sen.slice(0, 60), heroTo: +pl.hero.to.toFixed(2) });
        break;
      }
    }
  });
});

const count = <T,>(xs: T[], f: (x: T) => string) => [...xs.reduce((m, x) => m.set(f(x), (m.get(f(x)) ?? 0) + 1), new Map<string, number>())]
  .sort((a, b) => b[1] - a[1]);
const stories = (xs: { key: string }[]) => new Set(xs.map((x) => x.key.split(":")[0])).size;
console.log(`이야기 ${cases.length}, 쪽 ${pages}`);
console.log(`\n■ 같은 장소인데 다음 쪽에서 붙박이 물건이 사라짐: ${gone.length}쪽 (이야기 ${stories(gone)}편)`);
console.log(`  배경 계획엔 아직 있음 ${gone.filter((g) => g.stillInBg).length}쪽 · 뒤에서 다시 나옴 ${gone.filter((g) => g.back).length}쪽`);
console.log("  " + count(gone, (g) => g.thing).slice(0, 14).map(([k, v]) => `${k} ×${v}`).join(" · "));
for (const g of gone.filter((g) => g.stillInBg).slice(0, 6)) console.log(`  예) ${g.key} ${g.title} · ${g.loc} · ${g.thing} 사라짐 | ${g.text}`);
console.log(`\n■ 앉는 · 올라가는 자리를 말함: ${seats.length}쪽 (이야기 ${stories(seats)}편)`);
console.log(`  그 물건이 장면에 없음 ${seats.filter((s) => !s.drawn).length}쪽: ` + count(seats.filter((s) => !s.drawn), (s) => s.word).map(([k, v]) => `${k} ×${v}`).join(" · "));
console.log(`  장면에 있음 ${seats.filter((s) => s.drawn).length}쪽 (주인공이 그 옆에 붙어 서는지는 layout.mjs 가 잰다): ` + count(seats.filter((s) => s.drawn), (s) => s.word).map(([k, v]) => `${k} ×${v}`).join(" · "));
for (const s of seats.slice(0, 6)) console.log(`  예) ${s.key} ${s.title} · ${s.loc} · ${s.word} ${s.drawn ? "있음" : "없음"} | ${s.text}`);
console.log(`
■ 앞 쪽이 밝게 끝났는데 다음 쪽이 어둡게 시작했다 밝아짐: 예전 방식 ${flick.filter((f) => f.old).length}쪽 (이야기 ${stories(flick.filter((f) => f.old))}편) → 지금 ${flick.filter((f) => f.now).length}쪽`);
for (const f of flick.filter((f) => f.old).slice(0, 4)) console.log(`  예) ${f.key} | ${f.text}`);
console.log(`■ 밤낮이 쪽 글의 말 없이 바뀜: ${noWhy.length}쪽 · ` + count(noWhy, (n) => n.kind).map(([k, v]) => `${k} ${v}`).join(" · "));
for (const n of noWhy.slice(0, 6)) console.log(`  예) ${n.key} ${n.kind} | ${n.text}`);
console.log(`
■ 주는 문장: ${gives.length}쪽 (이야기 ${stories(gives)}편)`);
console.log(`  주는 물건이 장면에 있음 ${gives.filter((g) => g.shown).length} · 그중 주는 사람 손 → 받는 사람 손 ${gives.filter((g) => g.from).length}, 받는 사람 손에만(주는 사람이 장면에 없음) ${gives.filter((g) => g.shown && !g.from && g.to).length}`);
console.log(`  장면에 없음 ${gives.filter((g) => !g.shown).length}: ` + count(gives.filter((g) => !g.shown), (g) => g.word).slice(0, 20).map(([k, v]) => `${k} ×${v}`).join(" · "));
for (const g of gives.filter((g) => !g.shown).slice(0, 8)) console.log(`  예) ${g.key} ${g.word} | ${g.text}`);
const missing = said.filter((x) => !x.shown);
console.log(`
■ 글이 말하는 물건: ${said.length}문장 · 장면에 없음 ${missing.length}문장 (이야기 ${stories(missing)}편)`);
console.log("  " + count(missing, (x) => x.word).map(([k, v]) => `${k} ×${v}`).join(" · "));
for (const [w] of count(missing, (x) => x.word).slice(0, 14)) for (const x of missing.filter((y) => y.word === w).slice(0, 2)) console.log(`  예) ${x.key} ${x.loc} · ${x.word} | ${x.text}`);
fs.writeFileSync(`tools/scene-check/out/${FILE.replace(/\.json$/, "")}-continuity.json`, JSON.stringify({ gone, seats, gives, said }, null, 1));
