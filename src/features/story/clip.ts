import type { Story } from "@/types/story";

const isClip = (u?: string | null): u is string => !!u && /\.mp4(\?|$)/i.test(u);

/** 이 이야기의 동작 영상 하나 (쪽 영상 먼저, 없으면 이야기 영상). 없으면 null.
 *  원본 그림 대신 이 영상의 첫 장면을 쓰면 사진 배경 없이 캐릭터만 보인다 (2026-11-03) */
export function firstClip(story: Pick<Story, "animationUrl" | "book"> | null | undefined): string | null {
  if (!story) return null;
  return (story.book?.pages ?? []).map((p) => p.animationUrl).find(isClip)
    ?? (isClip(story.animationUrl) ? story.animationUrl : null);
}

/** 이 이야기 캐릭터의, 배경을 잘라 낸 정지 그림. 지금 세션의 캐릭터가 그 이야기의 것일 때만
 *  (책장에서 예전 이야기를 열면 다른 캐릭터일 수 있다) */
export function cutoutFor(
  story: Pick<Story, "characterId"> | null | undefined,
  character: { id: string; cutoutUrl?: string | null } | null | undefined,
): string | null {
  return story && character && character.id === story.characterId ? character.cutoutUrl ?? null : null;
}

/** 영상 첫 장면을 멈춘 채로 그리게 하는 주소 (#t 는 서버로 가지 않는다) */
export const firstFrameSrc = (clip: string) => `${clip}#t=0.001`;
