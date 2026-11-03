/** 내 이야기 책장(S-12) 표지에 쓸 아이 그림 작은 사본.
 *  이야기를 만들 때 긴 변 240px 로 줄여 이야기에 붙여 둔다.
 *  (2026-10-28 사용자 「표지에 들어갈 그림은 아이가 그린 그림이 낫지 않나」)
 *  저장은 이야기 목록과 같은 곳 — 이 기기 localStorage.
 *  서버에는 보내지 않는다. 한 장 10~30KB 라 목록이 길어져도 저장 한도(약 5MB)에 한참 못 미친다.
 *
 *  2026-11-03: 업로드 원본으로 만들면 사진 배경까지 표지에 나왔다(사용자 확인). 이야기 동작 영상이 있으면
 *  그 첫 장면 — 배경을 잘라 낸 캐릭터 — 으로 만들고, 없을 때만 원본 그림을 쓴다 */
const SIDE = 240;

function toCover(source: CanvasImageSource, width: number, height: number): string | null {
  const s = Math.min(1, SIDE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * s));
  const h = Math.max(1, Math.round(height * s));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, w, h);
  // webp 를 못 만드는 브라우저는 png 를 돌려준다 — 그래도 쓸 수 있다
  return canvas.toDataURL("image/webp", 0.82);
}

/** 영상 첫 장면. 영상은 API 주소에 있어 crossOrigin 으로 받아야 캔버스에서 꺼낼 수 있다 (서버 CORS 허용) */
async function firstFrame(clipUrl: string): Promise<string | null> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 15000);
    video.onloadeddata = () => { video.currentTime = 0.001; };
    video.onseeked = () => { clearTimeout(t); resolve(); };
    video.onerror = () => { clearTimeout(t); reject(new Error("video")); };
    video.src = clipUrl;
  });
  return toCover(video, video.videoWidth, video.videoHeight);
}

async function fromImage(url: string): Promise<string | null> {
  const img = new Image();
  // 잘라 낸 그림은 API 주소에 있다. 캔버스에서 꺼내려면 CORS 로 받는다 (서버가 허용한다)
  if (/^https?:/i.test(url)) img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  return toCover(img, img.naturalWidth, img.naturalHeight);
}

/** clipUrl(이야기 동작 영상)이 있으면 그 첫 장면, 아니면 imageUrl(잘라 낸 그림 또는 원본) */
export async function makeCover(clipUrl: string | null, imageUrl: string | null): Promise<string | null> {
  if (clipUrl) {
    try {
      const cover = await firstFrame(clipUrl);
      if (cover) return cover;
    } catch {
      // 영상을 못 읽으면 원본 그림으로 내려간다
    }
  }
  if (!imageUrl) return null;
  try {
    return await fromImage(imageUrl);
  } catch {
    return null;   // 표지가 없으면 책장은 고른 장소 그림으로 대신한다
  }
}
