/** 화면 어디서나 쓰는 작은 도구들 */

/** C-02 다시 듣기. 음성 파일이 없을 때는 브라우저 TTS 로 대신 읽는다. */
export function speak(text: string, mute: boolean) {
  if (mute || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function stopSpeak() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** S-03 클라이언트 리사이즈. 긴 변 1600px, JPEG 0.85 */
export async function shrink(file: File, max = 1600, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (ratio === 1 && file.size < 2_000_000) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * ratio);
  c.height = Math.round(bitmap.height * ratio);
  c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** 설계서 E-01 오류 문구표 */
export const ERROR_TEXT: Record<string, { title: string; hint: string; primary: string }> = {
  NO_CHARACTER:        { title: "그림에서 친구를 못 찾았어요", hint: "사람을 한 명만 크게 그려 볼까요?", primary: "다시 찍기" },
  MULTIPLE_CHARACTERS: { title: "친구가 여러 명이에요", hint: "한 명만 나오게 찍어 볼까요?", primary: "다시 찍기" },
  LOW_CONFIDENCE:      { title: "그림이 조금 흐릿해요", hint: "더 밝은 곳에서 찍어 볼까요?", primary: "다시 찍기" },
  UNSUPPORTED_IMAGE:   { title: "이 그림은 열 수 없어요", hint: "다른 그림을 골라 볼까요?", primary: "앨범에서 고르기" },
  ENGINE_TIMEOUT:      { title: "시간이 오래 걸리고 있어요", hint: "잠시 뒤에 다시 해 볼까요?", primary: "다시 하기" },
  ENGINE_ERROR:        { title: "잠깐 문제가 생겼어요", hint: "처음부터 다시 해 볼까요?", primary: "처음으로" },
};
