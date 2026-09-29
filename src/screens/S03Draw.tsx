import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import {
  H, PARTS, W, countPieces, drawGuide, drawItems, emptyDrawing, stampFor, toPngFile,
} from "@/features/draw/drawing";
import type { Drawing, Part, Pt } from "@/features/draw/drawing";

/** S-03D 화면에 그리기. 설계서에 없는 화면이다 (open-decisions 0-4, 2026-09-29 사용자 결정).
 *  S-03 의 「그림 찍기」와 나란히 있다. 머리 → 몸 → 팔 → 다리를 한 단계씩, 점선 안내 위에
 *  손으로 그리거나 도장을 찍는다. 다 그리면 S-03 으로 돌아가 「이 그림으로」를 누른다.
 *  한 화면 한 질문, 자동 전환 없음 — 「다음」은 아이가 누른다. */

const QUESTION: Record<Part, string> = {
  head: "머리를 그려 볼까요?",
  body: "몸을 그려 볼까요?",
  arms: "팔을 그려 볼까요?",
  legs: "다리를 그려 볼까요?",
};
const LABEL: Record<Part, string> = { head: "머리", body: "몸", arms: "팔", legs: "다리" };

/** 팔·다리는 몸에 붙여야 한다 — 떨어진 조각은 캐릭터에서 빠진다 */
const TIP: Record<Part, string> = {
  head: "",
  body: "머리에 붙여서",
  arms: "몸에 붙여서, 옆으로 벌려요",
  legs: "몸에 붙여서 아래로",
};

type Tool = "pen" | "stamp";

export default function S03Draw() {
  const nav = useNavigate();
  const setFile = useSession((s) => s.setFile);
  const level = useSettings((s) => s.level);
  // 소근육 조작이 어려울 수 있어 Level 1 은 도장부터 시작한다
  const [tool, setTool] = useState<Tool>(level === 1 ? "stamp" : "pen");
  const [at, setAt] = useState(0);
  const [drawing, setDrawing] = useState<Drawing>(emptyDrawing);
  const [apart, setApart] = useState(false);
  const [busy, setBusy] = useState(false);

  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef<Pt[] | null>(null);
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
    drawItems(ctx, drawing, live.current ?? undefined);
  }, [box, drawing, part]);

  useEffect(paint, [paint]);

  const toLogical = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const add = (item: Drawing[Part][number]) => {
    setApart(false);
    setDrawing((d) => ({ ...d, [part]: [...d[part], item] }));
  };

  const down = (e: React.PointerEvent) => {
    if (tool === "stamp") {
      const id = stampFor(part, toLogical(e));
      // 같은 도장을 또 누르면 아무 일도 없다 (한 자리에 하나)
      if (drawing[part].some((it) => it.kind === "stamp" && it.id === id)) return;
      add({ kind: "stamp", id });
      return;
    }
    live.current = [toLogical(e)];
    // 손가락이 그림판 밖으로 나가도 획이 이어지게. 실패해도 그리기는 된다
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    paint();
  };
  const move = (e: React.PointerEvent) => {
    if (!live.current) return;
    live.current.push(toLogical(e));
    paint();
  };
  const up = () => {
    const pts = live.current;
    live.current = null;
    if (pts) add({ kind: "stroke", pts });
  };

  const undo = () => {
    setApart(false);
    setDrawing((d) => ({ ...d, [part]: d[part].slice(0, -1) }));
  };

  const next = async () => {
    if (!last) { setAt(at + 1); return; }
    // 떨어진 조각은 캐릭터에서 빠진다 (AI 는 가장 큰 덩어리 하나만 쓴다)
    if (countPieces(drawing) > 1) { setApart(true); return; }
    setBusy(true);
    try {
      setFile(await toPngFile(drawing));
      nav("/upload", { replace: true });   // S-03 에서 「이 그림으로」를 누른다
    } finally {
      setBusy(false);
    }
  };

  const hint = [TIP[part], tool === "stamp" ? "점선을 누르면 모양이 찍혀요" : "점선을 따라 그려요"]
    .filter(Boolean).join(" · ");

  return (
    <Screen back={at === 0 ? "/upload" : () => { setApart(false); setAt(at - 1); }}
      speech={QUESTION[part]} segment={1}
      acts={
        <>
          <BigButton disabled={empty} nudgeOnDisabled={false} onClick={undo}>되돌리기</BigButton>
          <BigButton go disabled={empty || busy} onClick={next}>{last ? "다 그렸어요" : "다음"}</BigButton>
        </>
      }>
      <h2 className="question">{QUESTION[part]}</h2>
      <p className="hint">{hint}</p>

      {/* 그림판이 가장 커야 한다. 도구는 옆 세로 줄로 (기준 화면이 가로 1024×768) */}
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        <div ref={wrap} className="stage" style={{ flex: 1 }}>
          <canvas ref={canvas}
            style={{ width: box.w, height: box.h, touchAction: "none", borderRadius: 16, cursor: "crosshair" }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
        </div>
        <div style={{ flex: "0 0 200px", display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
          {(["pen", "stamp"] as Tool[]).map((t) => (
            // 고른 도구는 밝은 배경 블록으로 — 색만으로 구분하지 않도록 글자 앞에 표시도 붙인다
            <button key={t} className="btn" aria-pressed={tool === t} onClick={() => setTool(t)}
              style={{ flex: "0 0 auto", ...(tool === t ? { background: "var(--butter)" } : {}) }}>
              {tool === t ? "✓ " : ""}{t === "pen" ? "손으로 그리기" : "도장 찍기"}
            </button>
          ))}
        </div>
      </div>

      {apart && <div className="box warn">떨어진 곳이 있어요. 몸에 붙게 그려 볼까요?</div>}

      <div className="steps">
        {PARTS.map((p, i) => (
          <span key={p} className={`step ${i === at ? "on" : ""} ${i < at ? "done" : ""}`}>
            <i /> {LABEL[p]}
          </span>
        ))}
      </div>
    </Screen>
  );
}
