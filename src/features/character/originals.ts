import { releaseOriginal } from "@/api";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import type { Character } from "@/types/character";

/** S-13 「원본 그림 보관」이 꺼져 있으면 아이가 그림을 떠날 때 서버 원본을 지운다 (계약 2-10).
 *
 *  분석 직후에 지우지 않는 것은 렌더에 원본이 필요하고, S-11 「새 이야기 만들기」가 같은 그림을
 *  다시 쓰기 때문이다. 「떠난다」는 세 경우다.
 *  - 다른 캐릭터로 바뀜 (새 그림을 분석함)
 *  - 캐릭터가 비워짐 (S-01 이 resetAll 을 부름 — 「처음으로」)
 *  - 페이지가 사라짐 (탭 닫기, 새로고침). 캐릭터는 메모리에만 있어서 새로고침 뒤에는 다시 쓸 수 없다
 *
 *  S-06 보정 저장은 id 가 같아서 떠난 것으로 치지 않는다. 요청이 빠져도 서버가 24시간 뒤 지운다. */
export function watchOriginals(): () => void {
  const release = (c: Character | null) => {
    if (c && !useSettings.getState().keepOriginal) releaseOriginal(c.id);
  };
  const unsubscribe = useSession.subscribe((s, prev) => {
    if (prev.character && prev.character.id !== s.character?.id) release(prev.character);
  });
  const onHide = () => release(useSession.getState().character);
  window.addEventListener("pagehide", onHide);
  return () => { unsubscribe(); window.removeEventListener("pagehide", onHide); };
}
