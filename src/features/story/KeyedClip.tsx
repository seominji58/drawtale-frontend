import { useEffect, useRef, useState, type CSSProperties } from "react";
import { keyOut, type Box } from "./key";

const isVideo = (u: string) => /\.mp4(\?|#|$)/i.test(u);

/** 캐릭터 영상 · 정지 그림을 바탕 없이 그린다 (features/story/key.ts).
 *  영상은 숨긴 video 의 장면을 캔버스에 옮겨 바탕을 지운다. paused 면 첫 장면에 멈춘다.
 *  onBox: 첫 장면에서 캐릭터가 차지한 상자 — 장소 장면에 세울 자리를 잡는다 (PlaceScene).
 *  파일 주소가 CORS 를 허용하지 않아 캔버스에서 읽지 못하면 원래 영상 · 그림을 그대로 보인다 */
export default function KeyedClip({ src, paused = false, onBox, className, style }: {
  src: string; paused?: boolean; onBox?: (box: Box | null, ratio: number) => void;
  className?: string; style?: CSSProperties;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [plain, setPlain] = useState(false);
  const onBoxRef = useRef(onBox);
  onBoxRef.current = onBox;

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d", { willReadFrequently: true });
    if (!c || !ctx) return;
    let stop = false;
    let first = true;
    let raf = 0;

    const draw = (source: CanvasImageSource, w: number, h: number) => {
      if (!w || !h) return;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(source, 0, 0, w, h);
      let frame: ImageData;
      try {
        frame = ctx.getImageData(0, 0, w, h);
      } catch {
        stop = true;
        setPlain(true);   // CORS 로 막혔다
        onBoxRef.current?.(null, w / h);
        return;
      }
      const box = keyOut(frame);
      ctx.putImageData(frame, 0, 0);
      if (first) { first = false; onBoxRef.current?.(box, w / h); }
    };

    if (!isVideo(src)) {
      const img = new Image();
      if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
      img.onload = () => { if (!stop) draw(img, img.naturalWidth, img.naturalHeight); };
      img.onerror = () => { setPlain(true); onBoxRef.current?.(null, 1); };
      img.src = src;
      return () => { stop = true; };
    }

    const v = document.createElement("video");
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.playsInline = true;
    v.loop = true;
    v.preload = "auto";
    // 새 장면이 나올 때만 다시 그린다 (영상은 초당 15~30장, 화면은 60번). 못 쓰는 브라우저는 화면마다
    const onFrame = (v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number })
      .requestVideoFrameCallback?.bind(v);
    const tick = () => {
      if (stop) return;
      draw(v, v.videoWidth, v.videoHeight);
      if (onFrame) onFrame(tick); else raf = requestAnimationFrame(tick);
    };
    if (paused) {
      v.onloadeddata = () => { v.currentTime = 0.001; };
      v.onseeked = () => { if (!stop) draw(v, v.videoWidth, v.videoHeight); };
    } else {
      v.autoplay = true;
      v.onloadeddata = () => { void v.play().catch(() => {}); tick(); };
    }
    v.onerror = () => { setPlain(true); onBoxRef.current?.(null, 1); };
    v.src = src;
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
  }, [src, paused]);

  if (plain) {
    return isVideo(src)
      ? <video className={`clip-art ${className ?? ""}`} style={style} src={paused ? `${src}#t=0.001` : src}
               autoPlay={!paused} loop muted playsInline preload="auto" />
      : <img className={className} style={style} src={src} alt="" />;
  }
  return <canvas ref={canvas} className={className} style={style} aria-hidden />;
}
