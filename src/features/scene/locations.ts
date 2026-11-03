/** S-09 장면 — 장소 카드마다 그 안의 세부 장소 (2026-11-03).
 *  백엔드 `app/services/book.py` SCENE_LOCATIONS 와 같은 id. 그림은 `public/scenes/{id}/`(배경판 · 물건 · layout.json).
 *  대본이 쪽마다 `scene.location` 을 적는다. 예전 대본 · 미리 만든 카드 이야기는 없으므로 영어 배경 문장의 낱말로 짐작한다 */
import type { BookPage } from "@/types/story";

interface Sub {
  id: string;
  /** scene.background(영어)에 이 낱말이 있으면 이 자리 */
  words: string[];
}

/** 첫 번째가 장소 기본 배경 */
export const LOCATIONS: Record<string, Sub[]> = {
  // 집은 실내가 기본 (11/3 사용자 「집 안에서 기다리는데 배경은 밖」 — 현관 · 욕실처럼 목록에 없는 실내가 마당으로 갔다).
  // 마당은 바깥 낱말이 있을 때만
  home: [
    { id: "home-living", words: ["living room", "sofa", "couch", "hallway", "indoor", "inside the house", "entryway", "entrance hall",
      "front door", "doorway", "bathroom", "inside a cozy home", "inside the home", "window", " room"] },
    { id: "home", words: ["yard", "garden", "gate", "outside the house", "alley", "porch", "doorstep", "street", "backyard"] },
    { id: "home-kitchen", words: ["kitchen", "dining", "table"] },
    { id: "home-bedroom", words: ["bedroom", "bed ", "pillow"] },
  ],
  playground: [
    { id: "playground", words: ["slide", "swing", "sandbox", "seesaw", "jungle gym", "monkey bars"] },
    { id: "playground-path", words: ["path", "bench", "walkway", "park"] },
  ],
  school: [
    { id: "school", words: ["playground", "schoolyard", "field", "yard"] },
    { id: "school-classroom", words: ["classroom", "desk", "blackboard", "chalkboard"] },
    { id: "school-cafeteria", words: ["cafeteria", "lunch", "lunchroom", "canteen", "tray"] },
    { id: "school-hallway", words: ["hallway", "corridor", "locker"] },
    { id: "school-music", words: ["music", "piano", "drum", "instrument"] },
    { id: "school-library", words: ["library", "bookshelf", "bookshelves"] },
  ],
  town: [
    { id: "town", words: [] },
    { id: "town-market", words: ["market", "stall", "shop", "store", "bakery"] },
    { id: "town-park", words: ["park", "fountain"] },
    { id: "town-busstop", words: ["bus"] },
  ],
  forest: [
    { id: "forest", words: [] },
    { id: "forest-stream", words: ["stream", "river", "brook", "creek", "water"] },
    { id: "forest-trail", words: ["trail", "path", "log"] },
    { id: "forest-flowers", words: ["flower", "meadow", "butterfl"] },
  ],
  sea: [
    { id: "sea", words: [] },
    { id: "sea-underwater", words: ["underwater", "under the sea", "coral", "seabed", "sea floor"] },
    { id: "sea-pier", words: ["pier", "dock", "boat", "harbor", "lighthouse"] },
  ],
  space: [
    { id: "space", words: [] },
    { id: "space-ship", words: ["spaceship", "inside the ship", "cockpit", "control panel", "corridor", "hallway", "space station"] },
    { id: "space-planet", words: ["planet", "alien"] },
  ],
  cave: [
    { id: "cave", words: [] },
    { id: "cave-entrance", words: ["entrance", "outside the cave", "opening"] },
    { id: "cave-lake", words: ["lake", "pool", "underground water"] },
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
  if (loc && subs.some((s) => s.id === loc)) return loc;
  const bg = ` ${(page.scene?.background || "").toLowerCase()} `;
  let best: string | undefined, at = Infinity;
  for (const s of subs) for (const w of s.words) {
    const i = bg.indexOf(w);
    if (i >= 0 && i < at) { at = i; best = s.id; }
  }
  if (best) return best;
  return prev && subs.some((s) => s.id === prev) ? prev : subs[0].id;
}

export const sceneBase = (id: string) => `${import.meta.env.BASE_URL}scenes/${id}/`;
