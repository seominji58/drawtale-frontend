import { useRef, useState } from "react";
import { FULL_COLORS, KID_COLORS, PEN_WIDTHS, isFaint, luminance } from "@/features/draw/drawing";

/* 그리기 도구 — S-03D 화면에 그리기와 내 소품 그리기가 같이 쓴다 (2026-10-27).
   아이 화면 터치 타깃 88px (AGENTS.md 3.1). 고른 것은 밝은 배경 · 테두리 · ✓ — 색만으로 구분하지 않는다 (3.5) */

export type Tool = "pen" | "eraser";
export const TAP = 88;

/** 색 고르기. 아이 모드는 12색 큰 동그라미, 보호자 모드(`full`)는 24색 + 「색 만들기」 + 최근 만든 색 — 그림판처럼.
 *  고르면 그리기 도구로 돌아간다 */
export function ColorPalette({ full = false, ...rest }: PaletteProps & { full?: boolean }) {
  return full ? <FullPalette {...rest} /> : <KidPalette {...rest} />;
}

interface PaletteProps {
  tool: Tool; color: string; onColor: (hex: string) => void;
  /** 한 줄에 몇 개 (아이 모드). 넓은 화면은 3, 좁은 화면은 4 */
  cols?: number;
  /** 동그라미 지름 (아이 모드). 폰처럼 좁으면 줄인다 */
  size?: number;
}

/** 밝은 색 위에서는 체크를 진하게 */
const checkColor = (hex: string) => (luminance(hex) > 0.62 ? "#3A2E26" : "#FFFFFF");

function KidPalette({ tool, color, onColor, cols = 3, size = TAP }: PaletteProps) {
  return (
    <div role="radiogroup" aria-label="색" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: 12, alignContent: "start" }}>
      {KID_COLORS.map((c) => {
        const on = tool === "pen" && color === c.hex;
        return (
          <button key={c.id} className="btn" role="radio" aria-checked={on} aria-label={c.name}
            onClick={() => onColor(c.hex)}
            style={{
              width: size, height: size, minHeight: size, padding: 0, borderRadius: "50%",
              background: c.hex, color: checkColor(c.hex), fontSize: 30,
              outline: on ? "6px solid #3A3733" : undefined, outlineOffset: on ? 3 : undefined,
            }}>
            {on ? "✓" : ""}
          </button>
        );
      })}
    </div>
  );
}

const RECENT_KEY = "drawtale-recent-colors";
const RECENT_MAX = 6;
const readRecent = (): string[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").filter((x: unknown) => typeof x === "string").slice(0, RECENT_MAX); }
  catch { return []; }
};

/** 보호자 모드 팔레트. 칸이 작아도 된다 — 어른 손가락 기준 44px */
function FullPalette({ tool, color, onColor }: PaletteProps) {
  const [recent, setRecent] = useState<string[]>(readRecent);
  const picker = useRef<HTMLInputElement>(null);
  const on = (hex: string) => tool === "pen" && color.toLowerCase() === hex.toLowerCase();
  const inBase = FULL_COLORS.some((c) => c.hex.toLowerCase() === color.toLowerCase());

  // 「색 만들기」로 정한 색을 최근 색 맨 앞에 둔다 (같은 기기에서만 남는다)
  const keep = (hex: string) => {
    const next = [hex, ...recent.filter((x) => x.toLowerCase() !== hex.toLowerCase())].slice(0, RECENT_MAX);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* 저장 못 해도 된다 */ }
  };

  const swatch = (hex: string, name: string, key: string) => (
    <button key={key} type="button" role="radio" aria-checked={on(hex)} aria-label={name} title={name}
      className="swatch" onClick={() => onColor(hex)}
      style={{ background: hex, color: checkColor(hex) }}>
      {on(hex) ? "✓" : ""}
    </button>
  );

  return (
    <div className="palette-full">
      <div role="radiogroup" aria-label="색" className="swatches">
        {FULL_COLORS.map((c) => swatch(c.hex, c.name, c.id))}
      </div>
      <div className="palette-make">
        <button type="button" className="make" onClick={() => picker.current?.click()}
          aria-label="색 만들기" style={!inBase && tool === "pen" ? { background: color, color: checkColor(color) } : undefined}>
          <span aria-hidden="true" className="make-wheel" />색 만들기
        </button>
        {/* 브라우저 색 고르기 창 (그림판의 「색 편집」). 고르는 동안에도 바로 칠할 색이 바뀐다 */}
        <input ref={picker} type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#3a3733"}
          onInput={(e) => onColor((e.target as HTMLInputElement).value)}
          onChange={(e) => keep(e.target.value)}
          tabIndex={-1} aria-hidden="true" className="make-input" />
      </div>
      {recent.length > 0 && (
        <div className="palette-recent" role="radiogroup" aria-label="최근 만든 색">
          <span>최근</span>
          {recent.map((hex) => swatch(hex, `만든 색 ${hex}`, `r-${hex}`))}
        </div>
      )}
      {tool === "pen" && isFaint(color) && (
        <p className="palette-note">아주 옅은 색이에요. 이 색으로만 그리면 AI가 친구를 못 찾을 수 있어요. 테두리는 진한 색으로 그려 주세요.</p>
      )}
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
