/** 내 이야기 책장(S-12) 표지에 쓸 아이 그림 작은 사본.
 *  업로드한 그림은 탭 안의 objectURL 로만 있어서, 이야기를 만들 때 긴 변 240px 로 줄여 이야기에 붙여 둔다.
 *  (2026-10-28 사용자 「표지에 들어갈 그림은 아이가 그린 그림이 낫지 않나」)
 *  저장은 이야기 목록과 같은 곳 — 회원은 이 기기 localStorage, 비회원은 sessionStorage(탭을 닫으면 사라짐).
 *  서버에는 보내지 않는다. 한 장 10~30KB 라 목록이 길어져도 저장 한도(약 5MB)에 한참 못 미친다. */
const SIDE = 240;

export async function makeCover(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = Math.min(1, SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * s));
    const h = Math.max(1, Math.round(img.naturalHeight * s));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    // webp 를 못 만드는 브라우저는 png 를 돌려준다 — 그래도 쓸 수 있다
    return canvas.toDataURL("image/webp", 0.82);
  } catch {
    return null;   // 표지가 없으면 책장은 고른 장소 그림으로 대신한다
  }
}
