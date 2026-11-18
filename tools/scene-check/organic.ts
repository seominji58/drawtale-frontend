// 대본 · 장면 유기 전수 점검 (2026-11-11, 사용자 「동작이랑 대사랑 캐릭터랑 유기적으로 이어지나 · 사물이 없는 것들이 없는지 · 개별 검사하는 동시에
// 전부 유기적으로 이어지는지 묶어서도 검사하고 배경도 검사해」). 40번 「큰 나무 틈 하늘다람쥐」에서 나온 것: 팽이가 도는데 주인공이 돎, 랜턴이
// 할머니 손이 아님, 하늘다람쥐가 날아올랐는데 땅에 가만히, 「선물이었어요」(도토리)에 선물 상자.
// 장면 계획(planPages)과 연출 말(sceneFx)로 쪽마다 따로 보는 검사 여덟 가지를 하고, 쪽 · 이야기 단위로 묶는다.
// 화면을 그린 결과(out/all-long-layout.json, layout.mjs)가 있으면 계획에 있는데 화면에서 빠진 물건도 센다.
//   npx esbuild tools/scene-check/organic.ts --bundle --platform=node --format=esm --alias:@=./src \
//     --define:import.meta.env='{"BASE_URL":"/","MODE":"production"}' --outfile=tools/scene-check/out/organic.mjs
//   node tools/scene-check/out/organic.mjs        → 종류별 개수 · 예, out/organic.json
import fs from "node:fs";
import { planPages, sceneFx, subjectOf, FLY_TEXT } from "@/features/scene/plan";
import { CHOICES, choicesFor } from "@/features/story/choices";
import type { BookPage } from "@/types/story";

const HERO = "토토";
// node organic.mjs [묶음 파일=all-long.json]: 사람 아닌 형태(forms-long.json, 이야기마다 form)도 (11/12 사용자 「비휴머노이드도」)
const FILE = process.argv[2] ?? "all-long.json";
const cases = JSON.parse(fs.readFileSync(`tools/scene-check/out/${FILE}`, "utf8"));
const fill = (t: string) => t.replace(/\{이름\}/g, HERO).replace(/\{조사:([^}]+)\}/g, "$1");
const idOf = (k: "place" | "problem", l: string) => CHOICES[k].find((c) => c.label === l)?.id;
const idIn = (k: "action" | "result", l: string, pr?: string) => choicesFor(k, pr).find((c) => c.label === l)?.id;
const nameOf = (src: string) => src.split("/").pop()!.replace(/\.webp$/, "");
let rendered: Record<string, string[]> = {};
try {
  const lay = JSON.parse(fs.readFileSync("tools/scene-check/out/all-long-layout.json", "utf8"));
  for (const p of lay.pages ?? []) rendered[p.key] = (p.things ?? []).map((t: { name: string }) => t.name);
} catch { rendered = {}; }

// 낱말 → 무엇인가
const PERSON = /(?:친구|엄마|아빠|할머니|할아버지|선생님|아저씨|아주머니|아줌마|이모|고모|삼촌|언니|오빠|형|누나|동생|안내원|선장님?|박사님?|요원|경찰관|지킴이|직원|주인|사장님|기사님?|아기|아이|반 친구들|친구들|사람|어른|요정|외계인|우주인|비행사님?|해설가|사서|간호사|의사)$/;
// 낱말 단위 (「냄새가」의 새 · 「안개가」의 개 · 「가게」의 게가 걸리지 않게)
const W = (w: string) => `(?<![가-힣])${w}(?:들)?(?:이|가|은|는|도|를|을|와|과|에게|의|랑)(?![가-힣])`;
const ANIMAL_WORDS: [RegExp, string][] = [
  [/하늘다람쥐|다람쥐/, "squirrel"], [/산?토끼/, "rabbit"], [new RegExp(`${W("새")}|(?:아기|작은|엄마|파랑|파란|노란|하얀|빨간|예쁜) 새(?!\s?(?:둥지|집|책|친구|신발|옷))|참새|비둘기|부엉이|올빼미|까치|까마귀`), "bird"], [/갈매기/, "seagull"],
  [/박쥐/, "bat"], [/나비(?!넥타이)/, "butterfly"], [/물고기/, "fish"], [/금붕어/, "fishbowl"], [/고양이/, "cat"], [new RegExp(`강아지|(?<!(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|몇|여러) )${W("개")}`), "dog"], [/애벌레/, "caterpillar"],
  [new RegExp(`${W("게")}|꽃게|소라게|${W("작은 게")}`), "crab"], [/해파리/, "jellyfish"], [/거북/, "turtle"], [/개구리/, "frog"], [/반딧불/, "firefly"], [/어항/, "fishbowl"], [/무당벌레/, "ladybug"], [/달팽이/, "snail"],
];
const isHeroWord = (w: string) => w === HERO || /^(?:나|내|저|제|우리|우린|나랑|나와)$/.test(w) || w.endsWith(HERO);
const kindOfWord = (w: string, people: string[]): "hero" | "person" | "animal" | "thing" => {
  if (isHeroWord(w)) return "hero";
  if (people.some((p) => p && (w === p || w.endsWith(p) || p.endsWith(w))) || PERSON.test(w)) return "person";
  if (ANIMAL_WORDS.some(([rx]) => rx.test(w + "가"))) return "animal";
  return "thing";
};
/** 그 자리(at)의 말이 속한 마디의 주어: 문장 처음부터 그 마디 끝(…고 · …며 · …자 · …어요)까지에서 마지막 「○○이/가/은/는/도」 */
function clauseSubject(text: string, at: number, people: string[]): { word: string; kind: ReturnType<typeof kindOfWord> } | null {
  const s0 = Math.max(text.lastIndexOf(".", at - 1), text.lastIndexOf("!", at - 1), text.lastIndexOf("?", at - 1), text.lastIndexOf("”", at - 1)) + 1;
  const rest = text.slice(at);
  const endRel = rest.search(/(?:고|며|면서|자|니|는데|어요|았어요|었어요|였어요|해요|요)(?=[\s.,!?”]|$)/);
  const seg = text.slice(s0, endRel >= 0 ? at + endRel : text.length).replace(/“[^”]*”/g, " ");
  // 앞 마디(…고 · …며 · …자)는 빼고 그 마디만
  const lastBreak = Math.max(...[/[가-힣](?:고|며|면서|자|니|는데|더니|다가),?\s/g].flatMap((rx) => [...seg.slice(0, at - s0).matchAll(rx)].map((m) => (m.index ?? 0) + m[0].length)), 0);
  const cl = seg.slice(lastBreak);
  // 장면이 쓰는 주어 판단(subjectOf)을 마디 전체에: 「시냇가 · 묻은 흙」 같은 것은 거기서 이미 거른다. 사람이 아닌 주어면 null
  const r = subjectOf(cl, people, HERO, undefined, "NONE");
  if (r === "NONE") return null;
  const word = [...cl.matchAll(/([가-힣]+)(?:이|가|은|는|께서|도)(?=\s|,)/g)].map((m) => m[1]).pop() ?? "?";
  if (r === "hero") return { word, kind: "hero" };
  if (r === null) return { word, kind: ANIMAL_WORDS.some(([rx]) => rx.test(cl)) ? "animal" : "thing" };
  return { word: r === "other" ? word : r, kind: "person" };
}

type Flag = { kind: string; key: string; detail: string; text: string };
const flags: Flag[] = [];
const add = (kind: string, key: string, detail: string, text: string) => flags.push({ kind, key, detail, text: text.slice(0, 90) });
const sentenceAt = (t: string, at: number) => {
  const s0 = Math.max(t.lastIndexOf(".", at - 1), t.lastIndexOf("!", at - 1), t.lastIndexOf("?", at - 1)) + 1;
  const ends = [".", "!", "?"].map((c) => t.indexOf(c, at)).filter((i) => i >= 0);
  return t.slice(s0, ends.length ? Math.min(...ends) + 1 : t.length).trim();
};

// 손에 드는 말 (그 사람이 그 물건을)
const HOLD_VERB = /(?:켰|켜고|켜며|켜 들|(?<!만|불러|걸어|돌어|들어|살아)들고|(?<!만)들었|(?<![가-힣])들어 (?:올|보|주)|쥐고|쥐었|쥔|(?<![가-힣])든 |안고|안았|흔들|비추|비췄|비춰|가려|가렸|높이 들|건네|내밀)/;
// 정체 · 비유 (그 물건이 아니라 다른 것을 가리킴): 「하늘다람쥐에게 주는 선물이었어요」
const COPULA = /^(?:이었|였|이에요|예요|이야|이란|이라|이라는|이랍니다|입니다)/;
// 동물 움직임 말
const ANIMAL_MOVE: [RegExp, string][] = [
  [/날아올|날아갔|날아가|날았|날아다니|훨훨|슝 날|활공|날개를 (?:펴|펼|파닥|퍼덕)/, "날기"], [/헤엄/, "헤엄"],
  [/고개를 (?:쏙 )?내밀|얼굴을 (?:쏙 )?내밀|틈에서|구멍에서|가지 위|나무 위/, "높은 곳"], [/뛰어올|깡충|폴짝/, "뛰기"],
];
const STILL = /앉아|앉았|앉은|누워|누웠|잠이 들|잠들|쳐다보|바라보|올려다보|내려다보|숨었|숨어|기다렸|기다리|멈춰|멈췄|서 있|입을 벌|울었|울고|훌쩍|떨었|꼼짝/;
// 쪽 동작(대본 action) → 그 쪽 주인공 문장에 있어야 할 말
const ACTION_WORDS: Record<string, RegExp> = {
  jump: /뛰|폴짝|깡충|점프|껑충|펄쩍|들썩|만세/, run: /달려|달렸|뛰어|뛰었|뛰며|후다닥|타다닥|헐레벌떡/, walk: /걸|걸음|다가|나아|따라|돌아서|돌아|나갔|나서|가요|갔|왔|건너|지나|발걸음|살금|뚜벅|콩콩|총총/,
  dance: /춤|덩실|빙글/, wave: /흔들|인사|안녕/,
};

let pages = 0;
const pageFlags = new Map<string, Set<string>>();
cases.forEach((c: any, ci: number) => {
  if (!c.book) return;
  const pr = idOf("problem", c.problem);
  const bp = c.book.pages.map((p: any) => ({ ...p, text: fill(p.text), childWords: p.child_words ?? "" })) as (BookPage & { lines?: { speaker: string; text: string }[] })[];
  const plans = planPages(bp, { place: idOf("place", c.place), problem: pr, action: idIn("action", c.action, pr), result: idIn("result", c.result, pr) } as any,
    c.book.character_sheet ?? {}, [], HERO, c.form ?? null);
  const form: string = c.form ?? "biped";
  const sheet: Record<string, string> = c.book.character_sheet ?? {};
  const cast = Object.keys(sheet);
  plans.forEach((pl, i) => {
    pages++;
    const key = `${ci}:${i + 1}`, text = bp[i].text, said = text.replace(/“[^”]*”/g, (m) => " ".repeat(m.length));
    const onStage = pl.props.filter((q) => q.id !== "sign" && q.id !== "cover").map((q) => q.name ?? q.id);
    // 대본 인물인 작은 동물(무당벌레 · 꼬마 게 …)은 동물 그림으로 서 있다
    for (const t of pl.things ?? []) for (const [rx, id] of ANIMAL_WORDS) if (nameOf(t.src) === id) for (const n of cast) if (rx.test(n + "가")) onStage.push(n);
    const people = [...cast, ...onStage];
    const things = pl.things ?? [];
    // 1) 동작 주인: 장면이 주인공에게 붙이는 빙글 · 몸짓(SceneStage otherSpins 와 같은 판단)인데 그 마디 주어가 물건 · 동물 · 다른 사람.
    //    「뱅글뱅글, 도토리 팽이가 돌았어요」처럼 주어가 그 말 뒤에 오면 앞부분만 보는 장면은 주인공으로 읽는다
    for (const ev of [...sceneFx(text).spins.map((x) => ({ ...x, what: "빙글" })), ...sceneFx(text).gestures.map((x) => ({ ...x, what: x.kind as string }))]) {
      if (subjectOf(ev.before, onStage, HERO, ev.before.length) !== "hero") continue;   // SceneStage otherSpins 와 같은 판단
      const at = text.indexOf(ev.before);
      if (at < 0 || ev.before.trimStart().startsWith("“")) continue;
      const sub = clauseSubject(text, at + Math.max(1, ev.before.length - 2), people);
      if (sub && sub.kind !== "hero") add("동작 주인", key, `${ev.what} → 주인공인데 주어 「${sub.word}」(${sub.kind})`, ev.before.trim());
    }
    // 2) 손에 든 물건: 「할머니가 랜턴을 켰어요」의 랜턴이 할머니 손에 · 할머니가 화면에
    for (const t of things) {
      if (t.at === undefined || t.spot === "air") continue;
      const sen = sentenceAt(said, t.at);
      const s0 = said.indexOf(sen);
      const after = said.slice(t.at, s0 + sen.length);
      if (!HOLD_VERB.test(after.slice(0, 16))) continue;
      const sub = clauseSubject(said, t.at + 1, people);
      if (!sub || sub.kind === "thing" || sub.kind === "animal") continue;
      const who = sub.kind === "hero" ? "hero" : sub.word;
      // 주기(give)는 받는 사람 손이 맞다. 사람이 든 것을 다른 사람 이름으로 부른 것(「동굴 안내원 아저씨」)도 맞게 본다
      const held = !!t.give || (t.holder && (t.holder === who || (who !== "hero" && t.holder !== "hero")));
      if (!held) add("손에 든 물건", key, `${nameOf(t.src)} → 든 사람 「${sub.word}」인데 ${t.holder ? "「" + t.holder + "」 손" : t.pose ? t.pose : "땅"}`, sen);
      if (sub.kind === "person" && !onStage.some((n) => n.includes(sub.word) || sub.word.includes(n))) add("든 사람이 화면에 없음", key, `${nameOf(t.src)} 든 「${sub.word}」`, sen);
    }
    //    생김새에 물건을 지닌 인물(「a lantern」)이 화면에 있고 글이 그 물건을 말하는데 그 사람 손에 없음
    for (const [name, desc] of Object.entries(sheet)) {
      if (!onStage.some((n) => n === name || n.includes(name))) continue;
      for (const [en, ko, img] of [["lantern", /랜턴|등불|초롱/, "lantern"], ["flashlight", /손전등/, "flashlight"], ["umbrella", /우산/, "umbrella"], ["basket", /바구니/, "basket"]] as const) {
        if (!new RegExp(en, "i").test(desc) || !ko.test(said)) continue;
        const t = things.find((x) => nameOf(x.src) === img);
        if (!t) add("지닌 물건이 없음", key, `「${name}」 생김새에 ${en}, 글에 나오는데 장면에 없음`, sentenceAt(text, said.search(ko)));
        else if (t.holder !== name && !(t.holder ?? "").includes(name)) add("지닌 물건이 손에 없음", key, `「${name}」의 ${img} → ${t.holder ? t.holder + " 손" : "땅"}`, sentenceAt(text, said.search(ko)));
      }
    }
    // 3) 동물 움직임: 「하늘다람쥐가 슝 날아올랐어요」인데 땅에 가만히
    for (const t of things) {
      const n = nameOf(t.src);
      if (!["squirrel", "rabbit", "bird", "bat", "butterfly", "fish", "cat", "dog", "caterpillar", "crab", "seagull"].includes(n)) continue;
      for (const sen of said.split(/(?<=[.!?])\s*/)) {
        const aw = ANIMAL_WORDS.find(([, id]) => id === n)?.[0];
        if (!aw || !aw.test(sen)) continue;
        for (const [rx, what] of ANIMAL_MOVE) {
          if (!rx.test(sen)) continue;
          const ok = what === "날기" ? t.spot === "air" || ["float", "flutter", "glide"].includes(t.motion ?? "") || t.pose === "high"
            : what === "헤엄" ? t.spot === "air" || t.motion === "swim" || t.motion === "float"
            : what === "높은 곳" ? t.pose === "high" || t.spot === "air"
            : ["bounce", "pop"].includes(t.motion ?? "");
          if (!ok) add("동물 움직임", key, `${n} 「${what}」인데 ${t.spot ?? "ground"}${t.motion ? " · " + t.motion : " · 가만히"}`, sen);
        }
      }
    }
    //    글에 나오는 동물이 장면에 없음 (인물로도 없음)
    for (const [rx, id] of ANIMAL_WORDS) {
      const m = rx.exec(said);
      // 만든 것(「솔방울 다람쥐」) · 집(「강아지 집」) · 멀어지는 소리도 장면에 없어도 된다
      if (!m || /없|않|꿈|그림|인형|모양|처럼|같|솔방울 다람쥐|강아지 집|노래가|소리가/.test(sentenceAt(said, m.index))) continue;
      if (things.some((t) => nameOf(t.src) === id) || onStage.some((n) => n === id || n.includes(m[0].replace(/[가는도들]$/, "")))) continue;
      add("동물이 장면에 없음", key, `${m[0].replace(/[가는도들]$/, "")} (${id})`, sentenceAt(text, m.index));
    }
    // 4) 대사 · 인물: 말하는 사람이 화면에 없음, 글에서 무엇을 하는 사람이 화면에 없음
    for (const ln of bp[i].lines ?? []) {
      if (!ln.speaker || /나레이션|narrat/i.test(ln.speaker) || isHeroWord(ln.speaker) || ln.speaker === "주인공") continue;
      if (!onStage.some((n) => n === ln.speaker || n.includes(ln.speaker) || ln.speaker.includes(n))) add("말하는 사람이 화면에 없음", key, `「${ln.speaker}」`, ln.text);
    }
    for (const m of said.matchAll(/([가-힣]+(?: [가-힣]+)?)(?:이|가|께서|도) (?!보였|보이|들렸|없)/g)) {
      const w = m[1].split(" ").pop()!;
      if (kindOfWord(w, cast) !== "person" || /친구들|사람|어른|아이$|인형$/.test(w)) continue;
      // 호칭(아저씨 · 선생님 …)으로 부르면 화면에 사람이 하나라도 있으면 그 사람으로 본다 (대본 이름 「숲 지킴이」를 글은 「아저씨」라고 부른다)
      const title = /^(?:아저씨|아주머니|아줌마|선생님|언니|오빠|형|누나|이모|고모|삼촌|사장님|기사님|선장님|비행사님|박사님|할머니|할아버지)$/.test(w);
      if (title && onStage.some((n) => !/^(?:sign|cover|bird|bat|rabbit|squirrel|cat|dog)$/.test(n))) continue;
      if (/생겼|안 보|보이지|없었|없어|어디/.test(sentenceAt(said, m.index ?? 0))) continue;
      if (!onStage.some((n) => n === w || n.includes(w) || w.includes(n))) {
        const sen = sentenceAt(text, m.index ?? 0);
        if (/전화|목소리|소리|사진|그림|꿈|생각|떠올|편지|기다리고 계|집에서|멀리/.test(sen)) continue;
        add("하는 사람이 화면에 없음", key, `「${w}」`, sen);
      }
    }
    // 5) 빠진 물건: 계획에는 있는데 화면에서 자리가 없어 빠짐 (그린 결과가 있을 때)
    if (rendered[key]) for (const t of things) {
      if (t.pose === "hand" || t.pose === "head" || t.pose === "mouth" || t.pose === "back" || t.pose === "window") continue;
      if (!rendered[key].includes(nameOf(t.src))) add("화면에서 빠진 물건", key, nameOf(t.src), sentenceAt(text, t.at ?? 0));
    }
    // 6) 정체 · 비유: 「선물이었어요」 · 「작은 별이었어요」: 그 물건이 따로 서면 안 된다
    for (const t of things) {
      if (t.at === undefined) continue;
      const w = /[가-힣]+/.exec(said.slice(t.at))?.[0] ?? "";
      const base = w.replace(/(?:이었|였|이에요|예요|이야|이란|이라|이라는).*$/, "");
      // 「빛나던 것은 소라였어요 · 그 갈매기였어요」는 그 물건이 정말 있는 것이라 맞다. 선물처럼 앞의 다른 물건을 가리키는 말만
      if (COPULA.test(said.slice(t.at + base.length)) && nameOf(t.src) === "gift") add("정체 말에 소품", key, `${nameOf(t.src)} 「${w}」`, sentenceAt(text, t.at));
    }
    // 7) 배경: 불을 켠 말인데 밝힐 것이 없음 · 밤 말 없이 밤 · 밤 말인데 낮
    if (/(?:랜턴|손전등|등불|초롱(?!초롱)|촛불)(?:을|를|이|에)? [^.!?]{0,8}?(?:켰|켜|비추|비췄|빛)/.test(said.replace(/초롱초롱/g, "")) && !things.some((t) => /lantern|flashlight|candle/.test(t.src)))
      add("불빛 물건이 없음", key, "랜턴 · 손전등을 켰는데 장면에 없음", sentenceAt(text, said.search(/랜턴|손전등|등불|초롱|촛불/)));
    // 8) 쪽 동작(대본 action)이 글과 맞나: 주인공이 뛰는(jump) 쪽인데 주인공 문장에 뛰는 말이 없음
    //    주인공이 가만히 있다고(앉아 · 누워 · 잠 · 쳐다봄 · 숨음 · 기다림 · 울음) 하는데 장면은 뛰기 · 춤 · 손 흔들기 · 걷기를 한다
    const act = bp[i].action;
    const moving = pl.hero.move !== "none" ? pl.hero.move : pl.hero.loops > 0 && act && ACTION_WORDS[act] ? act : null;
    if (moving && ACTION_WORDS[moving]) {
      const heroSens = said.split(/(?<=[.!?])\s*/).filter((s) => s.trim() && subjectOf(s, people, HERO, undefined, "hero") === "hero");
      // 숨기는 숨으러 가는 것(걷기 · 뛰기 쪽)이라 가만히가 아니다
      const still = heroSens.filter((s) => STILL.test(s) && !((moving === "walk" || moving === "run") && /^(?:숨었|숨어)$/.test(STILL.exec(s)![0])));
      // 날아 내려앉기 · 날아가 숨기는 움직임이다 (날개형)
      if (still.length && !heroSens.some((s) => ACTION_WORDS[moving].test(s) || /내려앉|날아|날았|퍼덕|파닥|기어|꿈틀|헤엄/.test(s))) add("쪽 동작이 글과 어긋남", key, `장면 ${moving}, 주인공은 「${STILL.exec(still[0])![0]}」`, still[0]);
    }
  });
  // 형태별: 날개형은 주인공이 나는 문장에서 떠야 하고 앉으면 내려와야 한다. 손 없는 형태는 손에 든 것이 땅에 놓인다
  plans.forEach((pl, i) => {
    const key = `${ci}:${i + 1}`, said = bp[i].text.replace(/“[^”]*”/g, (m) => " ".repeat(m.length));
    const sens = said.split(/(?<=[.!?])\s*/).filter((s) => s.trim());
    const heroSens = sens.filter((s) => subjectOf(s, [], HERO, undefined, "hero") === "hero");
    if (form === "winged") {
      const flies = heroSens.find((s) => FLY_TEXT.test(s) && !/날아가는 [가-힣]|날던 [가-힣]/.test(s));
      const lands = heroSens.find((s) => /앉았|앉아|내려앉|내려왔|착지|걸었|걸어|뒤뚱/.test(s));
      if (flies && !pl.hero.fly && !lands) add("[날개형] 나는데 땅에", key, "주인공이 나는 문장인데 hero.fly 아님", flies);
      if (pl.hero.fly && lands && !flies) add("[날개형] 앉았는데 떠 있음", key, "앉는 말인데 계속 남", lands);
    }
    if (form !== "biped" && form !== "quadruped") for (const t of pl.things ?? []) {
      if (t.holder === "hero" && t.pose === "hand") add(`[${form}] 손 없는데 손에 듦`, key, nameOf(t.src), sentenceAt(bp[i].text, t.at ?? 0));
    }
    if (form === "quadruped") for (const t of pl.things ?? []) {
      if (t.holder === "hero" && t.pose === "hand" && t.h > 0.2) add("[4족형] 입에 물기엔 큰 것", key, `${nameOf(t.src)} 키 ${t.h}`, sentenceAt(bp[i].text, t.at ?? 0));
    }
  });
  // 이야기 단위: 인물이 말 없이 사라짐 · 생김
  plans.forEach((pl, i) => {
    if (!i) return;
    const prev = new Set(plans[i - 1].props.map((q) => q.name ?? q.id)), now = new Set(pl.props.map((q) => q.name ?? q.id));
    const t = bp[i].text;
    for (const n of prev) if (!now.has(n) && plans[i - 1].location === pl.location && n !== "sign" && t.includes(n.split(" ").pop()!))
      add("말하는 인물이 다음 쪽에서 사라짐", `${ci}:${i + 1}`, `「${n}」`, t);
  });
});

// 묶기: 쪽마다 걸린 종류
for (const f of flags) (pageFlags.get(f.key) ?? pageFlags.set(f.key, new Set()).get(f.key)!).add(f.kind);
const byKind = new Map<string, Flag[]>();
for (const f of flags) (byKind.get(f.kind) ?? byKind.set(f.kind, []).get(f.kind)!).push(f);
const stories = (xs: Flag[]) => new Set(xs.map((x) => x.key.split(":")[0])).size;
console.log(`이야기 ${cases.length}, 쪽 ${pages}, 걸린 쪽 ${pageFlags.size} (두 가지 넘게 걸린 쪽 ${[...pageFlags.values()].filter((s) => s.size >= 2).length})`);
for (const [k, xs] of [...byKind].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n■ ${k}: ${xs.length} (이야기 ${stories(xs)}편)`);
  const seen = new Set<string>();
  for (const x of xs) { if (seen.has(x.detail + x.text) || seen.size >= 6) continue; seen.add(x.detail + x.text); console.log(`  ${x.key} ${x.detail} | ${x.text}`); }
}
fs.writeFileSync(`tools/scene-check/out/${FILE.replace(/\.json$/, "")}-organic.json`, JSON.stringify({ flags, pages: Object.fromEntries([...pageFlags].map(([k, v]) => [k, [...v]])) }, null, 1));
