/** 투명 프레임 묶음 (AI 렌더, 2026-11-03) — 정사각 칸을 가로 8칸씩 줄 바꿔 늘어놓은 WebP 한 장(남는 칸은 투명).
 *  칸은 렌더 화면을 자르지 않고 줄인 것이라, 같은 캐릭터면 동작이 달라도 크기 · 발끝 자리가 같다.
 *  장 수 · 첫 장의 그림 자리는 서버가 쪽 정보로 준다 — 그림은 다른 주소(API · 저장소)에 있어
 *  화면이 픽셀을 읽으면 CORS 에 막힌다. 그래서 여기서는 그리기만 한다 */
export const SPRITE_COLS = 8;

export interface Sprite {
  img: HTMLImageElement;
  cell: number;
  frames: number;
  /** 첫 장에서 그림이 차지하는 자리 (칸 대비 0~1) */
  box: [number, number, number, number];
}

const cache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  const key = url.split("?")[0];
  let p = cache.get(key);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("sprite load failed"));
      img.src = url;
    });
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

export async function loadSprite(url: string, meta: { frames: number; box: [number, number, number, number] }): Promise<Sprite> {
  const img = await loadImage(url);
  return { img, cell: img.naturalWidth / SPRITE_COLS, frames: Math.max(1, meta.frames), box: meta.box };
}

/** i 번째 장을 캔버스에 그린다 */
export function drawFrame(g: CanvasRenderingContext2D, s: Sprite, i: number) {
  const sx = (i % SPRITE_COLS) * s.cell, sy = Math.floor(i / SPRITE_COLS) * s.cell;
  g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  g.drawImage(s.img, sx, sy, s.cell, s.cell, 0, 0, g.canvas.width, g.canvas.height);
}
