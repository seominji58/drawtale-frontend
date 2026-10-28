import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { ColorPalette, PenTools } from "@/components/DrawTools";
import type { Tool } from "@/components/DrawTools";
import { ERASER_SCALE, H, PEN_COLORS, PEN_WIDTHS, W, drawLayer, emptyDrawing, toTrimmedPng } from "@/features/draw/drawing";
import type { Drawing, LiveStroke, Pt } from "@/features/draw/drawing";
import { MAX_PROP_NAME, useProps } from "@/features/props/props";
import type { PropSize } from "@/features/props/props";
import PropSizePicker from "@/features/props/PropSizePicker";
import { useGuardianMode } from "@/store/settings";

/** 소품 그리기 · 이름 붙이기 (2026-10-27 로컬 시험, open-decisions 0-13).
 *  1) 화면에 한 장 그린다 (S-03D 와 같은 도구, 부위 단계 · 안내 점선 없음). 종이 그림을 올렸으면 이 단계를 건너뛴다.
 *  2) 「무엇을 그렸나요?」 — 아이 · 보호자가 이름을 적고 「이걸로 할래요」로 등록한다. */
export default function SPropDraw() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { png?: string; from?: "photo" } };
  const add = useProps((s) => s.add);
  // 보호자 모드에서만 연다 (open-decisions 0-13)
  const guardian = useGuardianMode();

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0].hex);
  const [width, setWidth] = useState(PEN_WIDTHS[1].px);
  const order = useRef(0);
  const [drawing, setDrawing] = useState<Drawing>(emptyDrawing);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<LiveStroke | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  /** 이름 붙이는 단계의 그림. 종이 그림을 올렸으면 처음부터 있다 */
  const [png, setPng] = useState<string | null>(loc.state?.png ?? null);
  const from = loc.state?.from === "photo" ? "photo" : "draw";
  const [name, setName] = useState("");
  const [size, setSize] = useState<PropSize>("m");
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
  }, [png]);

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
    if (s) {
      setDrawing((d) => ({
        ...d, head: [...d.head, { kind: "stroke", pts: s.pts, color: s.color, width: s.width, erase: s.erase || undefined, t: ++order.current }],
      }));
    }
  };

  if (!guardian) return <Navigate to="/stories" replace />;

  // 2) 이름 붙이기
  if (png) {
    const typed = name.trim().slice(0, MAX_PROP_NAME);
    const register = () => {
      if (!typed) return;
      add({ name: typed, png, from, size });
      nav("/props", { replace: true });
    };
    return (
      <Screen back={from === "photo" ? "/props" : () => setPng(null)} speech="무엇을 그렸나요?" title="내 소품">
        <h2 className="question">무엇을 그렸나요?</h2>
        <div className="row" style={{ flex: 1, minHeight: 0, flexWrap: "wrap", alignItems: "stretch" }}>
          <div className="stage" style={{ flex: 1, minWidth: 240, padding: 24 }}>
            <PropSizePicker png={png} size={size} onSize={setSize} />
          </div>
          {/* 이름은 아이가 말하고 보호자가 적어도 된다. 글쇠판은 어른 크기 (AGENTS.md 3.4) */}
          <form data-audience="adult" className="own" style={{ flex: "0 1 360px" }}
            onSubmit={(e) => { e.preventDefault(); register(); }}>
            <span className="own-title">소품 이름</span>
            <div className="own-field">
              <input value={name} maxLength={MAX_PROP_NAME} autoFocus
                aria-label="소품 이름" placeholder="예: 노란 우산"
                onChange={(e) => setName(e.target.value)} />
              <em>이야기 카드에 나오는 물건 이름(우산 · 꽃 · 구름 …)으로 끝나면 그 이야기에 나와요</em>
            </div>
            <button type="submit" className="btn go own-ok" disabled={!typed}>이걸로 할래요</button>
          </form>
        </div>
      </Screen>
    );
  }

  // 1) 그리기
  return (
    <Screen back="/props" speech="무엇을 그려 볼까요?" title="내 소품"
      acts={
        <>
          <BigButton disabled={empty} nudgeOnDisabled={false}
            onClick={() => setDrawing((d) => ({ ...d, head: d.head.slice(0, -1) }))}>되돌리기</BigButton>
          <BigButton go disabled={empty} onClick={() => setPng(toTrimmedPng(drawing))}>다 그렸어요</BigButton>
        </>
      }>
      <h2 className="question">무엇을 그려 볼까요?</h2>
      <p className="hint">{tool === "eraser" ? "문지르면 지워져요" : "이야기에 나올 물건을 크게 그려요"}</p>
      <div className="row" style={{ flex: 1, minHeight: 0, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* 내 소품은 보호자 모드에서만 쓰므로 보호자 팔레트 (2026-10-28) */}
        <ColorPalette full tool={tool} color={color} onColor={(hex) => { setColor(hex); setTool("pen"); }} />
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
