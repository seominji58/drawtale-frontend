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
  home: [
    { id: "home", words: [] },
    { id: "home-living", words: ["living room", "sofa", "couch"] },
    { id: "home-kitchen", words: ["kitchen", "dining", "table"] },
    { id: "home-bedroom", words: ["bedroom", "bed ", "pillow"] },
  ],
  playground: [
    { id: "playground", words: [] },
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
    { id: "space-ship", words: ["spaceship", "inside the ship", "cockpit", "control panel"] },
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

/** 이 쪽의 세부 장소 id. scene.location → 배경 문장 낱말 → 앞 쪽 자리 → 장소 기본 */
export function locationFor(place: string, page: BookPage, prev?: string): string {
  const subs = LOCATIONS[place];
  const loc = page.scene?.location;
  if (loc && subs.some((s) => s.id === loc)) return loc;
  const bg = ` ${(page.scene?.background || "").toLowerCase()} `;
  if (bg.trim()) {
    const hit = subs.slice(1).find((s) => s.words.some((w) => bg.includes(w)));
    if (hit) return hit.id;
    // 기본 자리도 낱말이 있으면 (학교 운동장 등)
    if (subs[0].words.some((w) => bg.includes(w))) return subs[0].id;
  }
  return prev && subs.some((s) => s.id === prev) ? prev : subs[0].id;
}

export const sceneBase = (id: string) => `${import.meta.env.BASE_URL}scenes/${id}/`;
