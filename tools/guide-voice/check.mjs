// 화면 안내 음성 검사: 앱이 speak() 로 읽는 정해진 문장이 음성 표(guide.json)에 다 있는지 (2026-11-09).
//
//   node tools/guide-voice/check.mjs        # 저장소 맨 위에서
//
// 화면 문구를 고치고 lines.json 을 같이 고치지 않으면 그 문장만 조용히 브라우저 음성으로 나왔다
// (11/3 이후 형태 고르기 · 돌리기 안내 · 이름 꼭 짓기 등). 모으는 곳:
// - 실제 모듈: 카드(사람 · 사람 아닌 주인공), 질문, 오류 제목 (vite 로 불러온다)
// - 화면 코드의 글자 그대로: speech="…" · speech={조건 ? "…" : "…"} · speak("…") · <Coach lines={[…]}> · label: "…"
// - 형태 이름(kid_label): AI 저장소 runtime/ai_server/forms/*.json
// 아이가 적은 이름 · 말한 문장 · 이야기 글은 표에 없는 게 맞다 (브라우저 음성).
// 표에 없는 문장이 있으면 그 목록을 찍고 1 로 끝난다 → lines.json 에 넣고 make.py.
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";

const ROOT = path.resolve(import.meta.dirname, "../..");
const GUIDE = JSON.parse(fs.readFileSync(path.join(ROOT, "src/features/voice/guide.json"), "utf8"));
const LINES = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/guide-voice/lines.json"), "utf8"));
const FORMS = path.resolve(ROOT, "../drawtale-ai-git/runtime/ai_server/forms");

const found = new Map();   // 문장 → 어디서
const add = (text, where) => { const t = text?.trim(); if (t && !found.has(t)) found.set(t, where); };

// 1) 실제 모듈: 브라우저 전역만 흉내 낸다
globalThis.window ??= globalThis;
const store = () => ({ getItem: () => null, setItem() {}, removeItem() {} });
globalThis.localStorage ??= store();
globalThis.sessionStorage ??= store();
const vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
try {
  const ch = await vite.ssrLoadModule("/src/features/story/choices.ts");
  const st = await vite.ssrLoadModule("/src/types/story.ts");
  const lib = await vite.ssrLoadModule("/src/lib.ts");
  const { useSession } = await vite.ssrLoadModule("/src/store/session.ts");
  const kinds = ch.askOrder(2);
  const cards = () => {
    for (const k of kinds) {
      ch.choicesFor(k).forEach((c) => add(c.label, `카드 ${k}`));
      for (const p of ch.CHOICES.problem) ch.choicesFor(k, p.id).forEach((c) => add(c.label, `카드 ${k}`));
    }
  };
  cards();
  // 사람이 아닌 주인공이면 손 쓰는 행동 카드 글이 바뀐다
  useSession.setState({ character: { form: "quadruped" } });
  cards();
  kinds.forEach((k) => add(st.ASK_QUESTION[k], "S-07 질문"));
  Object.values(lib.ERROR_TEXT).forEach((t) => add(t.title, "E-01 제목"));
} finally {
  await vite.close();
}

// 2) 화면 코드의 글자 그대로
const strings = (src) => [...src.matchAll(/"([^"\n]*[가-힣][^"\n]*)"/g)].map((m) => m[1]);
/** `{` 로 시작하는 글에서 짝이 맞는 `}` 까지의 안쪽 (따옴표 안의 괄호는 센다지 않음) */
function braced(s) {
  let depth = 0, q = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === q && s[i - 1] !== "\\") q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") q = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return s.slice(1, i);
  }
  return "";
}
/** <Tag …> 의 속성 글. 속성 안의 `() =>` 의 `>` 에서 끊기지 않게 괄호 밖의 `>` 까지 */
function tagProps(src, tag) {
  const out = [];
  for (const m of src.matchAll(new RegExp(`<${tag}\\b`, "g"))) {
    let i = m.index + m[0].length, depth = 0, q = null;
    for (; i < src.length; i++) {
      const ch = src[i];
      if (q) { if (ch === q && src[i - 1] !== "\\") q = null; continue; }
      if (ch === '"' || ch === "`") q = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0) break;
    }
    out.push(src.slice(m.index + m[0].length, i));
  }
  return out;
}
const consts = (src) => Object.fromEntries([...src.matchAll(/const (\w+) = "([^"\n]+)";/g)].map((m) => [m[1], m[2]]));
for (const dir of ["src/screens", "src/components"]) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    if (!f.endsWith(".tsx")) continue;
    const src = fs.readFileSync(path.join(ROOT, dir, f), "utf8");
    const c = consts(src);
    const where = `${dir}/${f}`;
    // speech={…} 안의 글자 · 상수 (템플릿 문자열의 ${상수} 도 푼다), audience="adult" 화면은 읽지 않으니 뺀다
    for (const props of tagProps(src, "Screen")) {
      if (/audience="adult"/.test(props) || /speech=\{null\}/.test(props)) continue;
      const at = props.indexOf("speech=");
      if (at < 0) continue;
      const v = props.slice(at + 7);
      if (v.startsWith('"')) { add(v.slice(1, v.indexOf('"', 1)), where); continue; }
      const expr = braced(v);
      strings(expr).forEach((s) => add(s, where));
      for (const t of expr.matchAll(/`([^`]+)`/g)) add(t[1].replace(/\$\{(\w+)\}/g, (_, n) => c[n] ?? `\${${n}}`), where);
      if (c[expr.trim()]) add(c[expr.trim()], where);
    }
    for (const m of src.matchAll(/speak\((?:"([^"]+)"|(\w+))\s*,/g)) add(m[1] ?? c[m[2]], where);
    // speak(표[키]): 그 표의 글 전부 (S-07 말하기 실패 HEARD_ERROR …)
    for (const m of src.matchAll(/speak\((\w+)\[/g)) {
      const body = src.match(new RegExp(`const ${m[1]}\\b[^=]*=\\s*(\\{[\\s\\S]*?\\n\\});`));
      if (body) strings(body[1]).forEach((s) => add(s, where));
    }
    // 이름 카드: const NAMES = [...] 와 speak(`${n}, 좋은 이름이에요`)
    const names = src.match(/const NAMES = \[([^\]]+)\]/);
    if (names) {
      const list = strings(names[1]);
      list.forEach((s) => add(s, where));
      for (const t of src.matchAll(/speak\(`([^`]+)`/g)) list.forEach((n) => add(t[1].replace(/\$\{\w+\}/, n), where));
    }
    for (const m of src.matchAll(/<Coach\b[^>]*lines=\{\[([^\]]+)\]\}/g)) strings(m[1]).forEach((s) => add(s, where));
    // ChoiceCard 로 읽는 카드 (형태 고르기의 「다른 모습 친구」 · 「여기에 없어요」 …)
    if (src.includes("<ChoiceCard")) for (const m of src.matchAll(/label: "([^"]+)"/g)) add(m[1], where);
  }
}

// 3) 형태 이름 (S-03 형태 고르기 카드)
if (fs.existsSync(FORMS)) {
  for (const f of fs.readdirSync(FORMS).filter((f) => f.endsWith(".json"))) {
    const d = JSON.parse(fs.readFileSync(path.join(FORMS, f), "utf8"));
    add(d.kid_label, `형태 ${f}`);
  }
} else console.warn(`형태 정의를 못 찾음: ${FORMS} (형태 이름은 건너뜀)`);

const listed = new Set(Object.values(LINES).flat());
const missing = [...found].filter(([t]) => !GUIDE[t]);
const unmade = [...listed].filter((t) => !GUIDE[t]);
console.log(`읽는 문장 ${found.size}, 표 ${Object.keys(GUIDE).length}`);
for (const [t, w] of missing) console.log(`  표에 없음${listed.has(t) ? " (lines.json 에는 있음, make.py 필요)" : ""}: ${t}   ← ${w}`);
for (const t of unmade) if (!found.has(t)) console.log(`  lines.json 에 있는데 파일 없음: ${t}`);
const lost = Object.entries(GUIDE).filter(([, f]) => !fs.existsSync(path.join(ROOT, "public/voice/guide", f)));
for (const [t, f] of lost) console.log(`  표에는 있는데 파일 없음: ${t} (${f})`);
const unused = [...listed].filter((t) => !found.has(t));
if (unused.length) console.log(`  (참고) 화면에서 더 안 읽는 듯한 문장 ${unused.length}: ${unused.join(" / ")}`);
process.exit(missing.length || unmade.length || lost.length ? 1 : 0);
