import { ENGINE } from "@/api";
import type { Character } from "@/types/character";

/** 화면에 캐릭터 그림을 보일 때 쓸 주소 (2026-11-03 사용자 「통이미지는 안 된다」).
 *  배경을 잘라 낸 그림(cutoutUrl, 원본과 같은 크기라 관절 좌표가 그대로 맞는다)만 쓴다.
 *  실제 서버에서는 원본(imageUrl)을 보이지 않는다 — 사진 배경까지 나온다. 없으면 null 이고
 *  부르는 쪽이 빈 자리(안내 그림)를 둔다. 목 엔진(서버 없이 화면만)은 잘라 낸 그림이 없어 원본을 쓴다 */
export function artOf(character: Pick<Character, "cutoutUrl"> | null | undefined, imageUrl: string | null): string | null {
  if (character?.cutoutUrl) return character.cutoutUrl;
  return ENGINE === "mock" ? imageUrl : null;
}
