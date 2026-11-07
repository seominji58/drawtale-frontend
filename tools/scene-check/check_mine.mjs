// 내 소품 움직임 · 자리 검사 (pt_docs 20 2-b, 2026-11-06).  node tools/scene-check/check_mine.mjs
// plan.ts 를 esbuild 로 묶어 문장마다 기대한 움직임 · 자리가 나오는지 본다. 규칙을 고치면 여기 경우를 늘린다
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = join(mkdtempSync(join(tmpdir(), "scene-check-")), "plan.mjs");
await build({ entryPoints: ["src/features/scene/plan.ts"], bundle: true, format: "esm", platform: "node", outfile: out,
  alias: { "@": "./src" }, loader: { ".json": "json" }, logLevel: "error",
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", VITE_ENGINE: "mock" }) } });
const { thingsFor, mineMotion } = await import(pathToFileURL(out).href);

// [쪽 글, 내 소품 이름, 기대 움직임(undefined = 자리 움직임만), 기대 자리, 날씨]
const CASES = [
  ["나는 노란 우산을 펼쳤어요.", "노란 우산", "pop", undefined],
  ["공이 데굴데굴 굴러갔어요.", "공", "roll", undefined],
  ["빨간 풍선이 하늘로 둥실 떠올랐어요.", "풍선", "float", undefined],
  ["깃발이 살랑살랑 흔들렸어요.", "깃발", "sway", undefined],
  ["토끼 인형이 통통 튀었어요.", "토끼 인형", "bounce", undefined],
  ["개구리 장난감이 폴짝 뛰었어요.", "개구리 장난감", "bounce", undefined],
  ["나는 별사탕을 손에 꼭 쥐었어요.", "별사탕", undefined, "hand"],
  ["나는 강아지 인형을 품에 꼭 안고 잤어요.", "강아지 인형", undefined, "hand"],
  ["종이배가 물에 둥둥 떠내려갔어요.", "종이배", undefined, "water"],
  ["모자가 바람에 날아갔어요.", "모자", undefined, "blown"],
  ["상자가 툭 떨어졌어요.", "상자", undefined, "fall"],
  // 앞 문장의 말이 걸리지 않게
  ["공이 데굴데굴 굴러갔어요. 나는 상자를 열었어요.", "상자", "pop", undefined],
  ["나는 상자를 열었어요. 그 안에서 공이 통통 튀어나왔어요.", "상자", "pop", undefined],
  // 4족형 자리 (pt_docs 20 2-a) — 입에 묾 · 등에 태움 (사람 주인공이면 화면이 보통 자리로)
  ["나는 공을 입에 물고 달려갔어요.", "공", undefined, "mouth"],
  ["나는 뼈다귀를 물고 집으로 돌아왔어요.", "뼈다귀", undefined, "mouth"],
  ["나는 아기 고양이 인형을 등에 태우고 걸었어요.", "고양이 인형", undefined, "back"],
  ["나는 바구니를 등에 얹고 천천히 걸었어요.", "바구니", undefined, "back"],
  // 한 글자 이름은 낱말 단위 — 다른 낱말(꽃집 · 별밭) 속 글자 자리의 말을 읽지 않는다
  ["친구와 꽃집 앞에서 깡충깡충 뛰며 놀았어요. 빨간 꽃, 노란 꽃이 가득했어요.", "꽃", "pop", undefined],
  ["토끼들과 별밭을 깡충깡충 뛰었어요. 하늘에서 별이 둥실둥실 떠다녔어요.", "별", "float", undefined],
  // 바람 부는 쪽인데 움직임 말이 없으면 바람에 흔들림
  // 손에 든 것은 손을 따라간다(따로 움직이지 않음) — 손에 놓을 수 없으면 화면이 등장 통통(SceneStage)
  ["나는 연을 들고 언덕에 올라갔어요.", "연", undefined, "hand", "wind"],
  ["나는 바람개비를 보았어요.", "바람개비", "wind", undefined, "wind"],
];

let bad = 0;
for (const [text, name, motion, pose, weather = null] of CASES) {
  const t = thingsFor(text, [{ name, png: "data:image/png;base64,x", height: 0.2 }])[0];
  const gotPose = t?.pose;
  const gotMotion = !t ? "(없음)" : t.pose ? undefined : mineMotion(text, name, weather);
  const ok = t && gotPose === pose && gotMotion === motion;
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "XX "} ${name.padEnd(8)} 움직임 ${String(gotMotion).padEnd(9)} 자리 ${String(gotPose).padEnd(9)} ← ${text}`);
}
// 이름이 글에 없으면 놓지 않는다
const none = thingsFor("나는 놀이터에 갔어요.", [{ name: "우산", png: "data:,", height: 0.2 }]);
if (none.length) { bad++; console.log("XX 글에 없는 소품이 놓였다"); } else console.log("OK  글에 없는 소품은 놓지 않음");
console.log(bad ? `\n틀림 ${bad}` : `\n모두 통과 (${CASES.length + 1})`);
process.exit(bad ? 1 : 0);
