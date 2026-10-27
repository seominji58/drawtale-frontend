import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useSession } from "@/store/session";
import {
  ERASER_SCALE, H, PARTS, PEN_COLORS, PEN_WIDTHS, W, detachedParts, drawGuide, drawLayer, emptyDrawing, toPngFile,
} from "@/features/draw/drawing";
import type { Drawing, LiveStroke, Part, Pt } from "@/features/draw/drawing";

/** S-03D 화면에 그리기. 설계서에 없는 화면이다 (open-decisions 0-4, 2026-09-29 사용자 결정).
 *  S-03 의 「그림 찍기」와 나란히 있다. 머리 → 몸 → 팔 → 다리를 한 단계씩, 점선 안내 위에
 *  손으로 그린다. 다 그리면 S-03 으로 돌아가 「이 그림으로」를 누른다.
 *  2026-10-27: 도장 찍기를 빼고 직접 그리기만 — 색 8가지 · 선 굵기 세 가지 · 지우개 (사용자 결정).
 *  예전 도장 그림 데이터는 drawing.ts 에 남아 있어 그대로 그려진다.
 *  한 화면 한 질문, 자동 전환 없음 — 「다음」은 아이가 누른다.
 *  단계 칸(머리·몸·팔·다리)은 언제든 눌러서 돌아가 고칠 수 있다. */

const QUESTION: Record<Part, string> = {
  head: "머리를 그려 볼까요?",
  body: "몸을 그려 볼까요?",
  arms: "팔을 그려 볼까요?",
  legs: "다리를 그려 볼까요?",
};
const LABEL: Record<Part, string> = { head: "머리", body: "몸", arms: "팔", legs: "다리" };

/** 「○○가 떨어져 있어요」의 조사까지 맞춘 이름 */
const SUBJECT: Record<Part, string> = { head: "머리가", body: "몸이", arms: "팔이", legs: "다리가" };

/** 팔·다리는 몸에 붙여야 한다 — 떨어진 조각은 캐릭터에서 빠진다 */
const TIP: Record<Part, string> = {
  head: "",
  body: "머리에 붙여서",
  arms: "몸에 붙여서, 옆으로 벌려요",
  legs: "몸에 붙여서 아래로",
};

type Tool = "pen" | "eraser";

/** 아이 화면 터치 타깃 (AGENTS.md 3.1) */
const TAP = 88;

export default function S03Draw() {
  const nav = useNavigate();
  const setFile = useSession((s) => s.setFile);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PEN_COLORS[0].hex);
  const [width, setWidth] = useState(PEN_WIDTHS[1].px);
  /** 그린 차례. 지우개가 부위와 상관없이 먼저 그린 선을 지우게 한다 */
  const order = useRef(0);
  const [at, setAt] = useState(0);
  const [drawing, setDrawing] = useState<Drawing>(emptyDrawing);
  /** 몸에서 떨어진 부위. 「다 그렸어요」를 누를 때 확인한다 */
  const [apart, setApart] = useState<Part[]>([]);
  const [busy, setBusy] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<LiveStroke | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const part = PARTS[at];
  const last = at === PARTS.length - 1;
  const empty = drawing[part].length === 0;

  // 무대 안에 4:5 종이를 맞춘다
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
    drawGuide(ctx, part, drawing);
    drawLayer(ctx, drawing, live.current ?? undefined);
  }, [box, drawing, part]);

  useEffect(paint, [paint]);

  const toLogical = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const add = (item: Drawing[Part][number]) => {
    setApart([]);
    setDrawing((d) => ({ ...d, [part]: [...d[part], item] }));
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
    if (s) add({ kind: "stroke", pts: s.pts, color: s.color, width: s.width, erase: s.erase || undefined, t: ++order.current });
  };

  const undo = () => {
    setApart([]);
    setDrawing((d) => ({ ...d, [part]: d[part].slice(0, -1) }));
  };

  const next = async () => {
    if (!last) { setAt(at + 1); return; }
    // 떨어진 조각은 캐릭터에서 빠진다 (AI 는 가장 큰 덩어리 하나만 쓴다)
    const loose = detachedParts(drawing);
    if (loose.length) { setApart(loose); return; }
    setBusy(true);
    try {
      setFile(await toPngFile(drawing));
      nav("/upload", { replace: true });   // S-03 에서 「이 그림으로」를 누른다
    } finally {
      setBusy(false);
    }
  };

  const hint = [TIP[part], tool === "eraser" ? "문지르면 지워져요" : "점선을 따라 그려요"]
    .filter(Boolean).join(" · ");

  return (
    <Screen back={at === 0 ? "/upload" : () => setAt(at - 1)}
      speech={QUESTION[part]} segment={1}
      acts={
        <>
          <BigButton disabled={empty} nudgeOnDisabled={false} onClick={undo}>되돌리기</BigButton>
          <BigButton go disabled={empty || busy} onClick={next}>{last ? "다 그렸어요" : "다음"}</BigButton>
        </>
      }>
      <h2 className="question">{QUESTION[part]}</h2>
      <p className="hint">{hint}</p>

      {/* 그림판이 가장 커야 한다. 색은 왼쪽, 도구 · 굵기 · 단계는 오른쪽 세로 줄 (기준 화면이 가로 1024×768).
          좁은 화면에서는 줄이 아래로 내려간다 */}
      <div className="row" style={{ flex: 1, minHeight: 0, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* 색 8가지. 고른 색은 굵은 테두리 + ✓ — 색만으로 구분하지 않는다 (AGENTS.md 3.5) */}
        <div role="radiogroup" aria-label="색" style={{ display: "grid", gridTemplateColumns: `repeat(2, ${TAP}px)`, gap: 12 }}>
          {PEN_COLORS.map((c) => {
            const on = tool === "pen" && color === c.hex;
            return (
              <button key={c.id} className="btn" role="radio" aria-checked={on} aria-label={c.name}
                onClick={() => { setColor(c.hex); setTool("pen"); }}
                style={{
                  width: TAP, height: TAP, minHeight: TAP, padding: 0, borderRadius: "50%",
                  background: c.hex, color: "#FFFFFF", fontSize: 30,
                  outline: on ? "6px solid #3A3733" : undefined, outlineOffset: on ? 3 : undefined,
                }}>
                {on ? "✓" : ""}
              </button>
            );
          })}
        </div>

        <div ref={wrap} className="stage" style={{ flex: 1, minWidth: 240, alignSelf: "stretch" }}>
          <canvas ref={canvas}
            style={{ width: box.w, height: box.h, touchAction: "none", borderRadius: 16, cursor: "crosshair" }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>

        <div style={{ flex: `0 0 ${TAP * 3 + 24}px`, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* 그리기 · 지우개 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["pen", "eraser"] as Tool[]).map((t) => (
              <button key={t} className="btn" aria-pressed={tool === t} onClick={() => setTool(t)}
                style={{ minHeight: TAP, padding: 0, ...(tool === t ? { background: "var(--butter)" } : {}) }}>
                {tool === t ? "✓ " : ""}{t === "pen" ? "그리기" : "지우개"}
              </button>
            ))}
          </div>
          {/* 선 굵기 세 가지. 동그라미 크기로 보인다 (지우개는 이 굵기의 두 배) */}
          <div role="radiogroup" aria-label="선 굵기" style={{ display: "grid", gridTemplateColumns: `repeat(3, ${TAP}px)`, gap: 12 }}>
            {PEN_WIDTHS.map((w) => {
              const on = width === w.px;
              const dot = Math.round(w.px * 1.4);
              return (
                <button key={w.id} className="btn" role="radio" aria-checked={on} aria-label={`선 ${w.name}`}
                  onClick={() => setWidth(w.px)}
                  style={{
                    width: TAP, minHeight: TAP, padding: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", gap: 4,
                    ...(on ? { background: "var(--butter)" } : {}),
                  }}>
                  <span aria-hidden="true" style={{
                    display: "block", flex: "0 0 auto", width: dot, height: dot, borderRadius: "50%",
                    background: tool === "eraser" ? "#B8B2AA" : color,
                  }} />
                  <span style={{ fontSize: 14 }}>{on ? "✓ " : ""}{w.name}</span>
                </button>
              );
            })}
          </div>
          {/* 단계 칸. 누르면 그 부위로 간다 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {PARTS.map((p, i) => {
              const loose = apart.includes(p);
              const done = drawing[p].length > 0;
              return (
                <button key={p} className="btn" aria-current={i === at ? "step" : undefined}
                  aria-label={`${LABEL[p]}${loose ? ", 떨어져 있어요" : done ? ", 그렸어요" : ""}`}
                  onClick={() => setAt(i)}
                  style={{
                    minHeight: TAP, padding: 0, flexDirection: "column", gap: 2,
                    background: i === at ? "var(--butter)" : undefined,
                    outline: loose ? "4px solid var(--berry)" : undefined,
                  }}>
                  <span>{loose ? "! " : done ? "✓ " : ""}{LABEL[p]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {apart.length > 0 && (
        <div className="box warn inline">
          <span>
            {apart[0] === "body" ? "몸이 머리나 팔다리와" : `${SUBJECT[apart[0]]} 몸에서`} 떨어져 있어요. 붙게 그려 볼까요?
          </span>
          <button className="btn link" onClick={() => setAt(PARTS.indexOf(apart[0]))}>
            {LABEL[apart[0]]} 고치러 가기
          </button>
        </div>
      )}
    </Screen>
  );
}
