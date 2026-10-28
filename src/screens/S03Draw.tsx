import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { ColorPalette, PenTools, TAP } from "@/components/DrawTools";
import type { Tool } from "@/components/DrawTools";
import { useSession } from "@/store/session";
import { useGuardianMode } from "@/store/settings";
import {
  ERASER_SCALE, H, PARTS, PEN_COLORS, PEN_WIDTHS, W, detachedParts, drawGuide, drawLayer, emptyDrawing, toPngFile,
} from "@/features/draw/drawing";
import type { Drawing, LiveStroke, Part, Pt } from "@/features/draw/drawing";

/** S-03D 화면에 그리기 (pt_docs 05 S-03D, v0.3 신설. 처음 결정은 open-decisions 0-4, 2026-09-29).
 *  S-03 의 「그림 찍기」와 나란히 있다. 머리 → 몸 → 팔 → 다리를 한 단계씩, 점선 안내 위에
 *  손으로 그린다. 다 그리면 S-03 으로 돌아가 「이 그림으로」를 누른다.
 *  2026-10-27: 도장 찍기를 빼고 직접 그리기만 — 색 · 선 굵기 세 가지 · 지우개 (사용자 결정).
 *  2026-10-28: 색은 아이 모드 12색, 보호자 모드 24색 + 색 만들기 (사용자 결정).
 *  예전 도장 그림 데이터는 drawing.ts 에 남아 있어 그대로 그려진다.
 *  한 화면 한 질문, 자동 전환 없음 — 「다음」은 아이가 누른다.
 *  단계 칸(머리·몸·팔·다리)은 언제든 눌러서 돌아가 고칠 수 있다. */

const QUESTION: Record<Part, string> = {
  head: "머리를 그려 볼까요?",
  body: "몸을 그려 볼까요?",
  arms: "팔을 그려 볼까요?",
  legs: "다리를 그려 볼까요?",
};
/** 넓은 화면에서 종이 양옆이 차지하는 폭: 색 세 칸(보호자 팔레트도 같은 폭) + 도구 세 칸 + 사이 간격 */
const SIDES = (TAP * 3 + 24) + (TAP * 3 + 24) + 2 * 20;
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

export default function S03Draw() {
  const nav = useNavigate();
  const setFile = useSession((s) => s.setFile);
  const guardian = useGuardianMode();
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
  const [box, setBox] = useState({ w: 0, h: 0, wide: true, aw: 0 });

  const part = PARTS[at];
  const last = at === PARTS.length - 1;
  const empty = drawing[part].length === 0;

  // 남은 자리에 4:5 종이를 가장 크게 맞춘다 (2026-10-28).
  // 넓으면 [색 | 종이 | 도구] 를 가운데 붙여 놓고, 좁으면(폰) 종이 아래로 색 · 도구를 내리고 위아래로 민다.
  // 예전에는 종이를 감싼 무대 틀이 남은 폭을 다 차지해서 종이 양옆이 빈 칸으로 남고, 색과 도구가 화면 끝으로 밀렸다
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

      {/* 그림판이 가장 커야 한다. 넓으면 색은 왼쪽, 도구 · 굵기 · 단계는 오른쪽에 종이와 붙여 둔다
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
