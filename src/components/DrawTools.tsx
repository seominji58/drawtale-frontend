import { PEN_COLORS, PEN_WIDTHS } from "@/features/draw/drawing";

/* 그리기 도구 — S-03D 화면에 그리기와 내 소품 그리기가 같이 쓴다 (2026-10-27).
   아이 화면 터치 타깃 88px (AGENTS.md 3.1). 고른 것은 밝은 배경 · 테두리 · ✓ — 색만으로 구분하지 않는다 (3.5) */

export type Tool = "pen" | "eraser";
export const TAP = 88;

/** 색 8가지. 고르면 그리기 도구로 돌아간다 */
export function ColorPalette({ tool, color, onColor, cols = 2, size = TAP }: {
  tool: Tool; color: string; onColor: (hex: string) => void;
  /** 한 줄에 몇 개. 넓은 화면은 2 (세로로 긴 줄), 좁은 화면은 4 */
  cols?: number;
  /** 동그라미 지름. 폰처럼 좁으면 줄인다 */
  size?: number;
}) {
  return (
    <div role="radiogroup" aria-label="색" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: 12, alignContent: "start" }}>
      {PEN_COLORS.map((c) => {
        const on = tool === "pen" && color === c.hex;
        return (
          <button key={c.id} className="btn" role="radio" aria-checked={on} aria-label={c.name}
            onClick={() => onColor(c.hex)}
            style={{
              width: size, height: size, minHeight: size, padding: 0, borderRadius: "50%",
              background: c.hex, color: "#FFFFFF", fontSize: 30,
              outline: on ? "6px solid #3A3733" : undefined, outlineOffset: on ? 3 : undefined,
            }}>
            {on ? "✓" : ""}
          </button>
        );
      })}
    </div>
  );
}

/** 그리기 · 지우개와 선 굵기 세 가지 (지우개는 고른 굵기의 두 배) */
export function PenTools({ tool, color, width, onTool, onWidth }: {
  tool: Tool; color: string; width: number; onTool: (t: Tool) => void; onWidth: (px: number) => void;
}) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {(["pen", "eraser"] as Tool[]).map((t) => (
          <button key={t} className="btn" aria-pressed={tool === t} onClick={() => onTool(t)}
            style={{ minHeight: TAP, padding: 0, ...(tool === t ? { background: "var(--butter)" } : {}) }}>
            {tool === t ? "✓ " : ""}{t === "pen" ? "그리기" : "지우개"}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="선 굵기" style={{ display: "grid", gridTemplateColumns: `repeat(3, ${TAP}px)`, gap: 12 }}>
        {PEN_WIDTHS.map((w) => {
          const on = width === w.px;
          const dot = Math.round(w.px * 1.4);
          return (
            <button key={w.id} className="btn" role="radio" aria-checked={on} aria-label={`선 ${w.name}`}
              onClick={() => onWidth(w.px)}
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
    </>
  );
}
