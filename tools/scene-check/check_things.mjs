// 장면 물건 낱말 검사 (2026-11-06 2차 14장). node tools/scene-check/check_things.mjs
// [쪽 글, 놓여야 할 그림(없으면 null), 실내?] — 다른 뜻(배가 꼬르륵 · 사과했어요 · 북쪽 · 소라게 · 소라빵)은 걸리면 안 된다
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const out = join(mkdtempSync(join(tmpdir(), "scene-check-")), "plan.mjs");
await build({ entryPoints: ["src/features/scene/plan.ts"], bundle: true, format: "esm", platform: "node", outfile: out,
  alias: { "@": "./src" }, loader: { ".json": "json" }, logLevel: "error",
  define: { "import.meta.env": JSON.stringify({ BASE_URL: "/" }) } });
const { thingsFor } = await import(pathToFileURL(out).href);

const CASES = [
  ["멀리서 작은 배 한 척이 통통 다가왔어요.", "props/boat.webp"],
  ["아빠 배가 들어올 때 바다가 반짝였어요.", "props/boat.webp"],
  ["빵 냄새에 배가 꼬르륵 울렸어요.", null],
  ["배식대 앞에 줄을 섰어요.", null],
  ["멀리서 별똥별이 쓩 하고 지나갔어요.", "props/shootingstar.webp"],
  ["헬멧을 벗자 시원한 바람이 불었어요.", "props/helmet.webp"],
  ["시장에는 빨간 사과와 노란 바나나가 있었어요.", "props/apple.webp"],
  ["친구 손을 잡고 사과를 사각 한 입 먹었어요.", "props/apple.webp"],
  ["나는 친구에게 먼저 사과했어요.", null],
  ["나는 고개를 숙이고 사과를 했어요.", null],
  ["빈 식판을 들고 가서 제자리에 놓았어요.", "props/tray.webp"],
  ["베개 옆에는 민들레가 있었어요.", "props/pillow.webp"],
  ["엄마가 물뿌리개로 촉촉하게 물을 주었어요.", "props/wateringcan.webp"],
  ["우체통 옆에서 편지를 꼭 쥐었어요.", "props/letter.webp"],
  ["노란 리본을 따라 콩콩 걸었어요.", "props/ribbon.webp"],
  ["빨간 우주 장갑에 발이 걸렸어요.", "props/spacegloves.webp"],
  ["놀란 나는 우주복 장갑을 꼭 쥐었어요.", "props/spacegloves.webp"],
  ["장갑 속은 아직 따뜻했어요.", "props/mittens.webp"],
  ["작은 북을 둥둥 두드리며 노래했어요.", "props/drum.webp"],
  ["우리는 북쪽으로 걸어갔어요.", null],
  ["커다란 소라 껍데기가 보였어요.", "props/conch.webp"],
  ["소라게가 모래 위를 기어갔어요.", null],
  ["사장님이 따끈한 소라빵을 내 손에 올려 주었어요.", null],
  ["빨간 로켓이 보였어요!", "props/rocket.webp"],
];
// 자리 — 낱말 단위 정규식(공 · 나비 · 지도)도 조사 뒤 동사를 읽는다
const POSE_CASES = [
  ["나는 공을 손에 꼭 쥐었어요.", "props/ball.webp", "hand"],
  ["나는 공을 입에 물고 달려갔어요.", "props/ball.webp", "mouth"],
  ["지도가 바람에 날아갔어요.", "props/map.webp", "blown"],
  ["나는 바구니를 등에 얹고 걸었어요.", "props/basket.webp", "back"],
  // 걸리면 안 되는 것 — 무는 쪽 · 발등 · 묻다
  ["엄마 새가 벌레를 물고 둥지로 들어갔어요.", "props/bird.webp", undefined],
  ["나는 공을 발등에 올려 툭툭 튕겼어요.", "props/ball.webp", undefined],
  ["모래성을 쌓던 아이가 다가와 괜찮으냐고 물었어요.", "props/sandcastle.webp", undefined],
];
// 주어 — 「오늘 나는」처럼 꾸밈말이 앞에 있어도 주인공
const SUBJ_CASES = [
  ["오늘 나는 공을 입에 물고 달려갔어요.", "props/ball.webp", "hero"],
  ["친구가 공을 손에 꼭 쥐었어요.", "props/ball.webp", "친구"],
  ["나비가 꽃잎 위에서 공을 꼭 안았어요.", "props/ball.webp", "나비"],
];
// 장소 · 진짜 물건인지 (11/9 배치 검사, 카드 이야기 160편에서 찾은 것) — [쪽 글, 장소, 실내?, 놓여야 할 그림 | null(이 그림은 안 됨), 볼 그림]
const PLACE_CASES = [
  ["과일 가게를 하는 할머니였어요.", "town-market", false, null, "props/crab.webp"],
  ["빨래집게가 달그락달그락 부딪혀요.", "home-living", true, null, "props/crab.webp"],
  ["작은 게 한 마리가 모래 위를 기어갔어요.", "sea", false, "props/crab.webp", "props/crab.webp"],
  ["꽃게가 집게발을 번쩍 들었어요.", "sea", false, "props/crab.webp", "props/crab.webp"],
  ["바닷속 물고기 그림이 하나씩 나왔어요.", "school-library", true, null, "props/fish.webp"],
  ["작은 물고기가 지나가요.", "school-library", true, null, "props/fish.webp"],
  ["작은 물고기가 돌 사이로 지나가요.", "forest-stream", false, "props/fish.webp", "props/fish.webp"],
  ["창가에 내가 그린 꽃 그림이 보였어요.", "school-classroom", true, null, "forest-flowers/flowers.webp"],
  ["“우리 돌멩이 박사님, 이쪽이야.”", "space-ship", true, null, "forest-stream/rocks.webp"],
  ["나는 소행성 돌멩이를 꺼내 놓았어요.", "space-ship", true, "forest-stream/rocks.webp", "forest-stream/rocks.webp"],
  ["양동이 속 장미들이 바람에 살랑 흔들렸어요.", "town-market", false, null, "props/sandtoys.webp"],
  ["내 파란 양동이가 파도에 떠내려갔어.", "sea", false, "props/sandtoys.webp", "props/sandtoys.webp"],
  ["길 옆 커다란 웅덩이가 까맣게 보였어요.", "space", false, null, "props/puddle.webp"],
  ["운동장 웅덩이마다 파란 하늘이 비쳤어요.", "school-classroom", true, null, "props/puddle.webp"],
  ["비가 그치고 웅덩이에 하늘이 비쳤어요.", "playground", false, "props/puddle.webp", "props/puddle.webp"],
  ["텐트 천장에는 작은 별 스티커가 붙어 있었어요.", "school-library", true, "props/tent.webp", "props/tent.webp"],
];
let bad = 0;
for (const [text, loc, indoor, want, look] of PLACE_CASES) {
  const got = thingsFor(text, [], indoor, new Set(), loc).map((t) => t.src);
  const ok = want ? got.includes(want) : !got.includes(look);
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "XX "} 장소 ${loc.padEnd(16)} ${(want ?? `(${look.split("/").pop()} 없음)`).padEnd(26)} 놓인 것 ${got.join(", ") || "-"} ← ${text}`);
}
for (const [text, src, who] of SUBJ_CASES) {
  const t = thingsFor(text, [], false).find((x) => x.src === src);
  const ok = (t?.subject === "hero" ? "hero" : t?.subject) === who;
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "XX "} 주어 ${String(t?.subject).padEnd(6)} (기대 ${who}) ← ${text}`);
}
for (const [text, src, pose] of POSE_CASES) {
  const t = thingsFor(text, [], false).find((x) => x.src === src);
  const ok = t?.pose === pose;
  if (!ok) bad++;
  console.log(`${ok ? "OK " : "XX "} 자리 ${String(t?.pose).padEnd(6)} (기대 ${pose}) ← ${text}`);
}
for (const [text, want] of CASES) {
  const got = thingsFor(text, [], false).map((t) => t.src);
  const ok = want ? got.includes(want) : !got.some((s) => /boat|apple|drum|conch|mittens|spacegloves/.test(s));
  // 「우주 장갑」에 털장갑까지 겹쳐 놓이면 안 된다
  const dup = got.includes("props/spacegloves.webp") && got.includes("props/mittens.webp");
  if (!ok || dup) bad++;
  console.log(`${ok && !dup ? "OK " : "XX "} ${(want ?? "(없음)").padEnd(26)} 놓인 것 ${got.join(", ") || "-"} ← ${text}`);
}
console.log(bad ? `\n틀림 ${bad}` : `\n모두 통과 (${CASES.length + POSE_CASES.length + SUBJ_CASES.length + PLACE_CASES.length})`);
process.exit(bad ? 1 : 0);
