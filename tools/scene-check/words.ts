// 대본 낱말 전수 점검 (2026-11-11, 사용자 994번 「다른 대본에서도 이런 것들 찾으라고 시켰는데 또 있는 거야」).
// 앞의 글 · 배경 점검은 장소 말만 봐서 두 가지를 놓쳤다:
//   ① 몸에 걸친 물건 말(「신발 끈을 묶었어요 · 장갑을 끼고 · 가방을 메고」)에 그 물건 소품이 땅에 따로 섬
//   ② 글에 나오는데 그림이 없는 물건 말(「구름다리 · 터널 · 안내소 · 정문」)
// 저장 긴 이야기(out/all-long.json) 모든 문장으로 둘 다 센다. 결과 out/words.json, 사람이 보고 고칠 것을 고른다.
//   npx esbuild tools/scene-check/words.ts --bundle --platform=node --format=esm --alias:@=./src '--define:import.meta.env={"BASE_URL":"/","MODE":"production"}' --outfile=tools/scene-check/out/_words.mjs && node tools/scene-check/out/_words.mjs
import fs from "node:fs";
import { thingsFor } from "@/features/scene/plan";
import { LOCATIONS } from "@/features/scene/locations";

const cases = JSON.parse(fs.readFileSync("tools/scene-check/out/all-long.json", "utf8")) as { book?: { pages: { text: string }[] } }[];
const fill = (t: string) => t.replace(/\{이름\}/g, "토토").replace(/\{조사:([^}]+)\}/g, "$1");
const sentences: { key: string; s: string }[] = [];
cases.forEach((c, i) => c.book?.pages.forEach((p, j) => {
  for (const s of fill(p.text).split(/(?<=[.!?”])\s+/)) sentences.push({ key: `${i}:${j + 1}`, s });
}));

// ① 몸에 걸친 물건: 소품이 선 문장 중 그 낱말 바로 뒤(8자 안)에 신다 · 끼다 · 메다 · 입다 · 두르다 · 매다 · 끈
const WORN = /^[가-힣]{0,2}\s?(?:(?:을|를|이|가|도)\s?)?(?:꼭\s|다시\s|얼른\s|단단히\s|꽉\s)?(?:신(?:고|었|은|어|는)|끼(?:고|었|운)|꼈|메(?:고|었|은)|멨|입(?:고|었|은)|두르|둘렀|매(?:고|었)|끈|끝)/;
const worn: Record<string, string[]> = {};
for (const { key, s } of sentences) {
  for (const t of thingsFor(s)) {
    if (t.at === undefined) continue;
    const word = /[가-힣]+/.exec(s.slice(t.at))?.[0] ?? "";
    const after = s.slice(t.at + word.length);
    if (WORN.test(after) && t.pose !== "head") (worn[t.src.split("/").pop()!] ??= []).push(`${key} ${s}`);
  }
}

// ② 그림 없는 물건 말: 조사를 떼어 낸 낱말 중 3번 넘게 나오고, 「○○이 있었어요」로 소품이 안 서고, 배경 그림 이름 · 장소 말도 아닌 것
const JOSA = /(?:에서는|에서|으로|에게|한테|처럼|까지|부터|이랑|이에요|예요|이|가|을|를|은|는|에|로|와|과|도|의|만|랑)$/;
const count = new Map<string, { n: number; ex: string[] }>();
for (const { key, s } of sentences) {
  for (const raw of s.replace(/[“”"'.,!?]/g, " ").split(/\s+/)) {
    if (!/^[가-힣]{2,}$/.test(raw)) continue;
    const w = raw.replace(JOSA, "");
    if (w.length < 2 || w === raw && !/[이가을를은는에로와과도의]$/.test(raw)) continue;   // 조사가 붙은 말만 (명사일 가능성)
    const c = count.get(w) ?? { n: 0, ex: [] };
    c.n++; if (c.ex.length < 3) c.ex.push(`${key} ${s}`);
    count.set(w, c);
  }
}
const placeWords = new Set(Object.values(LOCATIONS).flatMap((l) => (l as { words?: string[] }).words ?? []));
const bgNames = new Set(fs.readdirSync("public/scenes").flatMap((d) => { try { return fs.readdirSync(`public/scenes/${d}`); } catch { return []; } }).map((f) => f.replace(/\.webp$/, "")));
const noPic = [...count.entries()].filter(([w, c]) => c.n >= 3 && thingsFor(`${w}이 있었어요. ${w}를 보았어요.`).length === 0 && !placeWords.has(w) && !bgNames.has(w))
  .sort((a, b) => b[1].n - a[1].n);
fs.writeFileSync("tools/scene-check/out/words.json", JSON.stringify({ worn, noPic: noPic.map(([w, c]) => ({ w, ...c })) }, null, 1));
console.log("① 몸에 걸친 물건인데 소품이 섬");
for (const [k, v] of Object.entries(worn)) console.log(`  ${k} ${v.length}`, "|", v.slice(0, 2).join(" / "));
console.log(`② 그림 없는 낱말 (3번 넘게) ${noPic.length}개, out/words.json`);
