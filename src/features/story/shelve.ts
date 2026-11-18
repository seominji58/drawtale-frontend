import type { Story } from "@/types/story";
import { firstClip } from "./clip";
import { makeCover } from "./cover";

/** 다 만든 이야기를 책장에 꽂는다 — S-08(바로 받은 것) · S-12(늦게 끝나 나중에 찾은 것, 2026-11-04) 같은 길.
 *  고른 카드 · 보호자 모드를 붙여 두고(다시 볼 때 소품), 표지는 아이 그림을 작게 줄여 붙인다.
 *  표지는 늦게 끝나도 같은 이야기(storyId)를 덮어쓸 뿐이다.
 *  still: 배경을 잘라 낸 정지 그림. 없으면 동작 영상의 첫 장면으로 — 원본은 사진 배경까지 나와서 쓰지 않는다 */
export function shelve(
  res: Story, extra: Pick<Story, "picks" | "guardian" | "form">, still: string | null, add: (s: Story) => void,
): Story {
  const s = { ...res, ...extra };
  add(s);
  const clip = firstClip(res);
  if (still || clip) {
    void makeCover(still ? null : clip, still).then((cover) => { if (cover) add({ ...s, cover }); });
  }
  return s;
}
