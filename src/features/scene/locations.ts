/** S-09 장면 — 장소 카드마다 그 안의 세부 장소 (2026-11-03).
 *  백엔드 `app/services/book.py` SCENE_LOCATIONS 와 같은 id. 그림은 `public/scenes/{id}/`(배경판 · 물건 · layout.json).
 *  대본이 쪽마다 `scene.location` 을 적는다. 예전 대본 · 미리 만든 카드 이야기는 없으므로 영어 배경 문장의 낱말로 짐작한다 */
import type { BookPage } from "@/types/story";

interface Sub {
  id: string;
  /** scene.background(영어) · 쪽 글(한국어)에 이 낱말이 있으면 이 자리 */
  words: string[];
}

/** 첫 번째가 장소 기본 배경 */
export const LOCATIONS: Record<string, Sub[]> = {
  // 집은 실내가 기본 (11/3 사용자 「집 안에서 기다리는데 배경은 밖」 — 현관 · 욕실처럼 목록에 없는 실내가 마당으로 갔다).
  // 마당은 바깥 낱말이 있을 때만
  home: [
    { id: "home-living", words: ["living room", "sofa", "couch", "hallway", "indoor", "inside the house", "entryway", "entrance hall",
      "front door", "doorway", "bathroom", "inside a cozy home", "inside the home", "window", " room", "거실", "현관", "소파"] },
    { id: "home", words: ["yard", "garden", "gate", "outside the house", "alley", "porch", "doorstep", "street", "backyard", "마당", "대문", "골목"] },
    { id: "home-kitchen", words: ["kitchen", "dining", "table", "부엌", "식탁"] },
    { id: "home-bedroom", words: ["bedroom", "bed ", "pillow", "침대", "내 방", "방에서", "방으로"] },
  ],
  playground: [
    { id: "playground", words: ["slide", "swing", "sandbox", "seesaw", "jungle gym", "monkey bars", "미끄럼틀", "그네", "모래놀이", "시소"] },
    { id: "playground-path", words: ["path", "bench", "walkway", "park", "산책길", "벤치"] },
  ],
  school: [
    { id: "school", words: ["playground", "schoolyard", "field", "yard", "운동장"] },
    { id: "school-classroom", words: ["classroom", "desk", "blackboard", "chalkboard", "교실", "칠판"] },
    { id: "school-cafeteria", words: ["cafeteria", "lunch", "lunchroom", "canteen", "tray", "급식실", "식판", "급식"] },
    { id: "school-hallway", words: ["hallway", "corridor", "locker", "복도", "사물함"] },
    { id: "school-music", words: ["music", "piano", "drum", "instrument", "음악실", "피아노"] },
    { id: "school-library", words: ["library", "bookshelf", "bookshelves", "도서관", "책장"] },
  ],
  town: [
    { id: "town", words: ["거리"] },
    // 11/11 가게 안 (빵집 · 꽃집 · 문구점 안, tools/art/gen_places2.py): 「빵집 안 포대 뒤에 숨었어요」가 바깥 시장 거리였다.
    // 「빵집 안」이 「빵집」과 같은 자리에서 잡히므로 시장보다 먼저 둔다
    { id: "town-shop", words: ["inside the shop", "inside the bakery", "inside a shop", "inside a bakery", "빵집 안", "가게 안", "꽃집 안", "문구점 안", "빵집 문을 열고", "가게 문을 열고"] },
    { id: "town-market", words: ["market", "stall", "shop", "store", "bakery", "시장", "가게", "빵집"] },
    { id: "town-park", words: ["park", "fountain", "공원", "분수"] },
    { id: "town-busstop", words: ["bus", "버스", "정류장"] },
  ],
  forest: [
    { id: "forest", words: ["숲속"] },
    { id: "forest-stream", words: ["stream", "river", "brook", "creek", "water", "시냇물", "개울", "냇가"] },
    { id: "forest-trail", words: ["trail", "path", "log", "숲길", "오솔길", "통나무"] },
    { id: "forest-flowers", words: ["flower", "meadow", "butterfl", "꽃밭"] },
  ],
  sea: [
    { id: "sea", words: ["모래사장", "바닷가"] },
    // 「물속」만으로는 바닷속이 아니다: 「바위 웅덩이 맑은 물속에서 작은 게가 기어갔어요」에 이야기 8쪽 내내 바닷속 배경이었다 (11/11 전수 점검 580번).
    // 주인공이 물속에 들어가는 말만
    { id: "sea-underwater", words: ["underwater", "under the sea", "coral", "seabed", "sea floor", "바닷속", "물속으로", "물속에서 헤엄", "물속을 헤엄", "물속 깊", "물속 나라", "바다 속", "잠수"] },
    { id: "sea-pier", words: ["pier", "dock", "boat", "harbor", "lighthouse", "등대", "선착장", "부두", "배를 타"] },
    // 11/4 등대 안 (둥근 창 · 나선 계단, tools/art gen_places 와 같은 방식)
    { id: "sea-lighthouse", words: ["inside the lighthouse", "inside a lighthouse", "room inside the lighthouse", "lighthouse room", "spiral stair", "등대 안", "등대 속", "등대 계단"] },
  ],
  space: [
    { id: "space", words: ["달 표면"] },
    { id: "space-ship", words: ["spaceship", "inside the ship", "cockpit", "control panel", "corridor", "hallway", "space station", "우주선"] },
    { id: "space-planet", words: ["planet", "alien", "행성", "외계"] },
  ],
  cave: [
    { id: "cave", words: ["동굴 안"] },
    { id: "cave-entrance", words: ["entrance", "outside the cave", "opening", "동굴 입구", "동굴 앞"] },
    { id: "cave-lake", words: ["lake", "pool", "underground water", "호수"] },
  ],
};

/** 장소 카드 id(`school`)면 그 장소의 장면을 쓸 수 있다. 말로 정한 장소는 없음 */
export const hasScenes = (place?: string) => !!place && place in LOCATIONS;

/** 이 쪽의 세부 장소 id. scene.location → 배경 문장 낱말 → 앞 쪽 자리 → 장소 기본.
 *  낱말은 문장에서 **먼저 나온 것**이 이긴다 — 「놀이터 구석의 벤치, 미끄럼틀은 안 보임」처럼 여러 자리 낱말이 섞이면
 *  배경 문장은 보통 장면의 자리부터 적는다 (카드 이야기 1,024편 8,192쪽으로 확인, 2026-11-03) */
export function locationFor(place: string, page: BookPage, prev?: string): string {
  const subs = LOCATIONS[place];
  const loc = page.scene?.location;
  // 쪽 글이 「동굴 안 · 동굴 속 · 굴 안」이면 대본이 입구라고 적어도 안쪽 — 입구(바깥) 배경에 해가 떠 동굴 밖처럼 보였다 (11/10)
  if (place === "cave" && /동굴 (?:안|속)|굴 (?:안|속)|동굴 깊/.test(page.text ?? "") && !/동굴 (?:입구|앞|밖)/.test(page.text ?? "")) return "cave";
  // 앞 쪽에서 동굴 안으로 들어갔으면, 나간다는 말이 없는 한 계속 안쪽 (대본이 쪽마다 입구라고 적어도)
  if (place === "cave" && prev === "cave" && loc === "cave-entrance" && !/입구|밖|나왔|나와|나가|나섰/.test(page.text ?? "")) return "cave";
  if (loc && subs.some((s) => s.id === loc)) return loc;
  // 영어 배경 문장이 먼저, 그다음 쪽 한국어 글 — 짧은 이야기 · 예전 이야기는 배경 문장이 없다 (11/3).
  // 한 줄로 이어 붙여 「먼저 나온 낱말」이 배경 문장 쪽에서 먼저 잡히게
  const bg = ` ${(page.scene?.background || "").toLowerCase()} | ${page.text ?? ""} `;
  // 등대가 나오는 바다 쪽은 등대가 그려진 부두 배경 — 「바닷가에 등대가」처럼 다른 낱말이 먼저 나오면 등대 없는 모래사장이었다 (11/4).
  // 바닷속(물속)은 그대로
  if (place === "sea" && /lighthouse|등대/.test(bg) && !/underwater|under the sea|바닷속|물속/.test(bg)) {
    return /inside (?:the |a )?lighthouse|lighthouse room|spiral stair|등대 (?:안|속|계단)/.test(bg) ? "sea-lighthouse" : "sea-pier";
  }
  let best: string | undefined, at = Infinity;
  for (const s of subs) for (const w of s.words) {
    const i = bg.indexOf(w);
    if (i >= 0 && i < at) { at = i; best = s.id; }
  }
  if (best) return best;
  return prev && subs.some((s) => s.id === prev) ? prev : subs[0].id;
}

export const sceneBase = (id: string) => `${import.meta.env.BASE_URL}scenes/${id}/`;
