import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { ColorPalette, PenTools } from "@/components/DrawTools";
import type { Tool } from "@/components/DrawTools";
import { ERASER_SCALE, H, PEN_COLORS, PEN_WIDTHS, W, drawLayer, emptyDrawing, toTrimmedPng } from "@/features/draw/drawing";
import type { Drawing, LiveStroke, Pt } from "@/features/draw/drawing";
import { propById, useProps } from "@/features/props/props";

/** 내 소품 그리기 — 물건 하나를 한 장에 그린다 (2026-10-27 로컬 시험, open-decisions 0-13).
 *  S-03D 와 같은 도구(색 · 굵기 · 지우개). 부위 단계 · 안내 점선은 없다.
 *  「다 그렸어요」를 누르면 그린 곳만 잘라 투명 그림으로 저장하고 목록으로 돌아간다. */
export default function SPropDraw() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const prop = propById(id);
  const saved = useProps((s) => s.drawn[id]);
  const save = useProps((s) => s.save);
  const remove = useProps((s) => s.remove);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0].hex);
  const [width, setWidth] = useState(PEN_WIDTHS[1].px);
  const order = useRef(0);
  const [drawing, setDrawing] = useState<Drawing>(emptyDrawing);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<LiveStroke | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** 예전에 그린 것을 지우고 새로 그리는 중인지 */
  const [fresh, setFresh] = useState(!saved);
  const empty = drawing.head.length === 0;

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const s = Math.min((r.width - 16) / W, (r.height - 16) / H);
      setBox({ w: Math.max(1, Math.floor(W * s)), h: Math.max(1, Math.floor(H * s)) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fresh]);

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c || !box.w) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== box.w * dpr) { c.width = box.w * dpr; c.height = box.h * dpr; }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.setTransform((box.w * dpr) / W, 0, 0, (box.h * dpr) / H, 0, 0);
    drawLayer(ctx, drawing, live.current ?? undefined);
  }, [box, drawing]);
  useEffect(paint, [paint]);

  if (!prop) return <Navigate to="/props" replace />;

  const toLogical = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const down = (e: React.PointerEvent) => {
    const erase = tool === "eraser";
    live.current = { pts: [toLogical(e)], color, width: erase ? width * ERASER_SCALE : width, erase };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    paint();
  };
  const move = (e: React.PointerEvent) => {
    if (!live.current) return;
    live.current.pts.push(toLogical(e));
    paint();
  };
  const up = () => {
    const s = live.current;
    live.current = null;
    if (s) setDrawing((d) => ({ ...d, head: [...d.head, { kind: "stroke", pts: s.pts, color: s.color, width: s.width, erase: s.erase || undefined, t: ++order.current }] }));
  };
  const done = () => {
    const png = toTrimmedPng(drawing);
    if (png) save(prop.id, png);
    nav("/props", { replace: true });
  };

  const question = `${prop.object} 그려 볼까요?`;

  // 이미 그린 물건: 그림을 보여 주고 「다시 그리기」 · 「그대로 둘래요」
  if (!fresh && saved) {
    return (
      <Screen back="/props" speech={`${prop.object} 그렸어요`} title="내 소품"
        acts={
          <>
            <BigButton onClick={() => { remove(prop.id); setFresh(true); }}>다시 그리기</BigButton>
            <BigButton go onClick={() => nav("/props")}>그대로 둘래요</BigButton>
          </>
        }>
        <h2 className="question">내가 그린 {prop.name}</h2>
        <div className="stage">
          <img src={saved} alt={`내가 그린 ${prop.name}`} style={{ maxHeight: "80%", objectFit: "contain" }} />
        </div>
      </Screen>
    );
  }

  return (
    <Screen back="/props" speech={question} title="내 소품"
      acts={
        <>
          <BigButton disabled={empty} nudgeOnDisabled={false}
            onClick={() => setDrawing((d) => ({ ...d, head: d.head.slice(0, -1) }))}>되돌리기</BigButton>
          <BigButton go disabled={empty} onClick={done}>다 그렸어요</BigButton>
        </>
      }>
      <h2 className="question">{question}</h2>
      <p className="hint">{tool === "eraser" ? "문지르면 지워져요" : "크게 그려요"}</p>
      <div className="row" style={{ flex: 1, minHeight: 0, flexWrap: "wrap", alignItems: "flex-start" }}>
        <ColorPalette tool={tool} color={color} onColor={(hex) => { setColor(hex); setTool("pen"); }} />
        <div ref={wrap} className="stage" style={{ flex: 1, minWidth: 240, alignSelf: "stretch" }}>
          <canvas ref={canvas}
            style={{ width: box.w, height: box.h, touchAction: "none", borderRadius: 16, cursor: "crosshair" }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
        <div style={{ flex: "0 0 288px", display: "flex", flexDirection: "column", gap: 12 }}>
          <PenTools tool={tool} color={color} width={width} onTool={setTool} onWidth={setWidth} />
        </div>
      </div>
    </Screen>
  );
}
