// 주인공이 있는 곳 시험 (2026-11-11): 쪽 글이 주인공이 그곳에 있다고 분명히 말하면 그 장면, 가는 길 · 보이기만 · 다른 사람만 거기 있으면 그대로.
// 사용자 「대본 내용이랑 뒷배경이 안 맞는 것들은 없었어?」
//   npx esbuild tools/scene-check/where.ts --bundle --platform=node --format=esm --alias:@=./src \
//     '--define:import.meta.env={"BASE_URL":"/","MODE":"production"}' --outfile=tools/scene-check/out/where.mjs && node tools/scene-check/out/where.mjs
import { whereHeroIs } from "@/features/scene/plan";

/** [쪽 글, 장소 카드, 지금 장면, 기대 장면(바뀌지 않으면 undefined)] — 주인공 이름은 계획 밖이라 「나」로 적는다 */
const CASES: [string, string, string, string | undefined][] = [
  ["나는 부엌에서 방울토마토 세 알을 쪼르르 씻었어요.", "home", "home-living", "home-kitchen"],
  ["나는 엄마와 식탁에 앉아 방울토마토를 먹었어요.", "home", "home-living", "home-kitchen"],
  ["부엌에서 엄마가 후다닥 달려왔어요.", "home", "home-living", undefined],
  ["나는 집으로 무사히 돌아왔어요. 대문 앞에서 엄마가 두 팔을 벌렸어요.", "town", "home-living", "home"],
  ["창밖에서 훌쩍훌쩍 소리가 들렸어요. 대문 앞에서 친구가 울고 있었어요.", "home", "home-living", undefined],
  ["엄마와 나는 대문 안으로 들어갔어요.", "town", "home", "home-living"],
  ["나는 빵집 안 밀가루 포대 뒤에 쏙 숨었어요.", "home", "home-living", "town-shop"],
  ["나는 빵집 안에 있는 어른에게 달려갔어요.", "town", "town-market", "town-shop"],
  ["딸랑, 나는 빵집 문을 열고 길을 잃었다고 말했어요.", "town", "town-market", "town-shop"],
  ["나는 엄마와 시장에 도착했어요.", "home", "home-living", "town-market"],
  ["골목 끝에 작은 빵집이 보였어요.", "town", "town", undefined],
  ["노란 꽃길을 지나 우리는 놀이터로 들어갔어요.", "town", "town", "playground"],
  ["나는 그네에 앉아 무지개 쪽으로 발을 굴렀어요.", "playground", "playground-path", "playground"],
  ["나는 미끄럼틀로 가는 길에 넘어졌어요.", "playground", "playground-path", undefined],
  ["나는 미끄럼틀을 향해 뛰었어요.", "playground", "playground-path", undefined],
  ["어른이 나를 큰 미끄럼틀까지 데려다 줬어요.", "playground", "playground-path", "playground"],
  // 놀이 기구를 지나며 놂 (11/11 994번), 모래 터널 · 지난 일 말은 아님
  ["토토는 꼬불꼬불한 길을 따라 신나게 놀았어요. 구름다리를 건너고, 또 긴 터널을 지났어요.", "playground", "playground-path", "playground"],
  ["나는 놀이터 구름다리에 두 손으로 매달렸어요.", "playground", "playground-path", "playground"],
  ["나는 모래 터널 속을 기어갔어요.", "playground", "playground-path", undefined],
  ["아까 건넌 구름다리가 출렁출렁 흔들렸어요.", "playground", "playground-path", undefined],
  ["나는 바다 방파제 입구에 도착해 낚싯대를 번쩍 들어 보였어요.", "sea", "sea", "sea-pier"],
  ["나는 콩콩 뛰어서 교문을 지났어요.", "school", "school-classroom", "school"],
  ["졸졸 흐르는 작은 시냇물 옆을 지나갔어요.", "forest", "forest-trail", "forest-stream"],
  ["저기 책이 가득한 도서관이 보였어요.", "school", "school-hallway", undefined],
];
let bad = 0;
for (const [t, place, loc, want] of CASES) {
  const got = whereHeroIs(t, place, loc);
  if (got !== want) { bad++; console.log(`X ${t} [${place} · ${loc}] → ${got} (기대 ${want})`); }
}
console.log(`주인공이 있는 곳 ${CASES.length - bad}/${CASES.length}`);
process.exitCode = bad ? 1 : 0;
