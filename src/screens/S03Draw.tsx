import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { ColorPalette, PenTools, TAP } from "@/components/DrawTools";
import type { Tool } from "@/components/DrawTools";
import { useSession } from "@/store/session";
import { useGuardianMode } from "@/store/settings";
import ConfirmCard from "@/components/ConfirmCard";
import {
  ERASER_SCALE, H, PARTS, PEN_COLORS, PEN_WIDTHS, W, drawFigureGuide, drawLayer, emptyDrawing, hasLoosePieces, toPngFile,
} from "@/features/draw/drawing";
import type { Drawing, LiveStroke, Part, Pt } from "@/features/draw/drawing";

/** S-03D 화면에 그리기 (pt_docs 05 S-03D, v0.3 신설. 처음 결정은 open-decisions 0-4, 2026-09-29).
 *  S-03 의 「그림 찍기」와 나란히 있다. 다 그리면 S-03 으로 돌아가 「이 그림으로」를 누른다.
 *  2026-10-27: 도장 찍기를 빼고 직접 그리기만 — 색 · 선 굵기 세 가지 · 지우개 (사용자 결정).
 *  2026-10-28: 색은 아이 모드 12색, 보호자 모드 24색 + 색 만들기 (사용자 결정).
 *  2026-11-03: 머리 → 몸 → 팔 → 다리 단계 · 점선 안내를 없애고 한 장에 통으로 자유롭게 (사용자
 *  「점선 따라 그리세요 말고 자유롭게」 · 「몸, 머리, 팔, 다리 선택 없이 통으로」). 전체 지우기 (확인 카드).
 *  사람 모양 안내선 하나만 옅게 깐다(같은 날 사용자 「사람 형태 가이드 라인만」). 떨어진 조각은 막지 않고 알려만 준다. 그린 것은 drawing.body 한 칸에 모은다(예전 단계 그림도 그대로 그려진다).
 *  예전 도장 그림 데이터는 drawing.ts 에 남아 있어 그대로 그려진다. */

/** 넓은 화면에서 종이 양옆이 차지하는 폭: 색 세 칸(보호자 팔레트도 같은 폭) + 도구 세 칸 + 사이 간격 */
const SIDES = (TAP * 3 + 24) + (TAP * 3 + 24) + 2 * 20;
const QUESTION = "내 친구를 그려 볼까요?";

export default function S03Draw() {
  const nav = useNavigate();
  const setFile = useSession((s) => s.setFile);
  const guardian = useGuardianMode();
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0].hex);
  const [width, setWidth] = useState(PEN_WIDTHS[1].px);
  /** 그린 차례. 지우개가 먼저 그린 선을 지우게 한다 */
  const order = useRef(0);
  const [drawing, setDrawing] = useState<Drawing>(emptyDrawing);
  /** 「다 그렸어요」를 눌렀는데 떨어진 조각이 있다 — 고칠지 이대로 갈지 묻는다 */
  const [loose, setLoose] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const [busy, setBusy] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<LiveStroke | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0, wide: true, aw: 0 });

  const empty = PARTS.every((p) => drawing[p].length === 0);

  // 남은 자리에 4:5 종이를 가장 크게 맞춘다 (2026-10-28).
  // 넓으면 [색 | 종이 | 도구] 를 가운데 붙여 놓고, 좁으면(폰) 종이 아래로 색 · 도구를 내리고 위아래로 민다
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const wide = r.width >= SIDES + 320;
      const s = wide
        ? Math.min((r.width - SIDES) / W, r.height / H)
        : Math.min((r.width - 12) / W, Math.max(260, r.height * 0.8) / H);
      setBox({ w: Math.max(1, Math.floor(W * s)), h: Math.max(1, Math.floor(H * s)), wide, aw: r.width });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    drawFigureGuide(ctx);   // 사람 모양 안내선 (그림 PNG 에는 안 들어간다)
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
    // 손가락이 그림판 밖으로 나가도 획이 이어지게. 실패해도 그리기는 된다
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
    if (!s) return;
    setLoose(false);
    setDrawing((d) => ({ ...d, body: [...d.body, { kind: "stroke", pts: s.pts, color: s.color, width: s.width, erase: s.erase || undefined, t: ++order.current }] }));
  };

  /** 마지막에 그린 것 하나 (어느 칸에 있든 가장 늦게 그린 것) */
  const undo = () => {
    setLoose(false);
    setDrawing((d) => {
      const lastPart = [...PARTS].reverse().reduce<Part | null>((best, p) => {
        const it = d[p][d[p].length - 1];
        if (!it) return best;
        const t = "t" in it ? it.t ?? 0 : 0;
        const bi = best ? d[best][d[best].length - 1] : undefined;
        const bt = bi && "t" in bi ? bi.t ?? 0 : -1;
        return t >= bt ? p : best;
      }, null);
      return lastPart ? { ...d, [lastPart]: d[lastPart].slice(0, -1) } : d;
    });
  };

  const finish = async (force = false) => {
    // 떨어진 조각은 움직일 때 몸과 따로 논다 — 막지는 않고 한 번 알려 준다
    if (!force && hasLoosePieces(drawing)) { setLoose(true); return; }
    setBusy(true);
    try {
      setFile(await toPngFile(drawing));
      nav("/upload", { replace: true });   // S-03 에서 「이 그림으로」를 누른다
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back="/upload" speech={QUESTION} segment={1}
      acts={
        <>
          <BigButton disabled={empty} nudgeOnDisabled={false} onClick={undo}>되돌리기</BigButton>
          <BigButton disabled={empty} nudgeOnDisabled={false} onClick={() => setAskClear(true)}>전체 지우기</BigButton>
          <BigButton go disabled={empty || busy} onClick={() => void finish()}>다 그렸어요</BigButton>
        </>
      }>
      <h2 className="question">{QUESTION}</h2>
      <p className="hint">{tool === "eraser" ? "문지르면 지워져요" : "선을 따라 그려도, 내 마음대로 그려도 돼요 · 팔다리를 몸에 붙이면 더 잘 움직여요"}</p>

      {/* 그림판이 가장 커야 한다. 넓으면 색은 왼쪽, 도구 · 굵기는 오른쪽에 종이와 붙여 둔다
          (기준 화면이 가로 1024×768). 좁으면 종이 아래로 내려간다 */}
      <div ref={wrap} className={`draw-area ${box.wide ? "wide" : "narrow"}`}>
        {/* 아이 모드 12색, 보호자 모드는 24색 + 색 만들기 (2026-10-28 사용자) */}
        <ColorPalette full={guardian} tool={tool} color={color} cols={box.wide ? 3 : 4}
          size={box.wide ? TAP : Math.min(TAP, Math.floor((box.aw - 36 - 24) / 4))}
          onColor={(hex) => { setColor(hex); setTool("pen"); }} />

        <div className="draw-paper" style={{ width: box.w, height: box.h }}>
          <canvas ref={canvas}
            style={{ width: box.w, height: box.h, touchAction: "none", cursor: "crosshair" }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>

        <div className="draw-tools">
          <PenTools tool={tool} color={color} width={width} onTool={setTool} onWidth={setWidth} />
        </div>
      </div>

      {loose && (
        <div className="box warn inline">
          <span>떨어진 조각이 있어요. 몸에 붙이면 더 잘 움직여요</span>
          <button className="btn link" onClick={() => void finish(true)}>이대로 할래요</button>
        </div>
      )}
      {askClear && (
        <ConfirmCard title="그림을 모두 지울까요?" yes="모두 지우기"
          onYes={() => { setDrawing(emptyDrawing()); setLoose(false); setAskClear(false); }} onNo={() => setAskClear(false)} />
      )}
    </Screen>
  );
}
