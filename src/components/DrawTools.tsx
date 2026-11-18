import { useEffect, useRef, useState } from "react";
import { FULL_COLORS, KID_COLORS, PEN_WIDTHS, isFaint, luminance } from "@/features/draw/drawing";

/* 그리기 도구 — S-03D 화면에 그리기와 내 소품 그리기가 같이 쓴다 (2026-10-27).
   아이 화면 터치 타깃 88px (AGENTS.md 3.1). 고른 것은 밝은 배경 · 테두리 · ✓ — 색만으로 구분하지 않는다 (3.5) */

export type Tool = "pen" | "fill" | "eraser";
export const TAP = 88;

/** 그림판 배치. wide = [색 세 칸 | 종이 | 도구 세 칸] (가로 1024),
 *  mid = 색 · 도구를 두 칸씩 세워 종이 양옆에 (세로 태블릿 768, 11/6 화면 점검. 전에는 종이 아래로 내려 색 둘째 줄과 도구가 아래 단추 줄에 가렸다),
 *  narrow = 종이 아래로 내리고 위아래로 민다 (폰),
 *  short = 낮은 가로 화면(폰을 가로로): [색 세 칸 | 종이 | 도구 세 칸] 인데 단추를 줄인다 (11/9 기기 점검. 높이 240 에서
 *  narrow 로 가 종이 아래 색 · 도구가 칸 밖으로 밀려 보이지 않았다) */
export type DrawMode = "wide" | "mid" | "narrow" | "short";
const SIDE_3 = TAP * 3 + 24;
const SIDE_2 = TAP * 2 + 12;
/** 두 칸으로 세운 아이 팔레트 높이 (12색 = 여섯 줄) */
const MID_TALL = TAP * 6 + 12 * 5;

/** 폰을 가로로 돌린 낮은 화면 (ui.css 와 같은 값) */
const SHORT_LANDSCAPE = "(orientation: landscape) and (max-height: 520px)";
/** 큰 화면 (tokens.css 「큰 화면」과 같은 값) */
const BIG_SCREEN = "(min-width: 1600px) and (min-height: 900px)";

/** 그림판 자리(rw × rh)에 종이(W × H 비율)를 가장 크게 맞춘다 */
export function fitDraw(rw: number, rh: number, W: number, H: number) {
  // 낮은 가로: 종이는 높이를 다 쓰고, 남는 폭을 색 · 도구 각 세 칸에 나눈다. 단추는 40 ~ 56px
  // CSS 의 낮은 가로 화면(ui.css 「낮은 가로 화면」)과 같은 조건. 그림판 칸 높이로만 보면 가로 1024 × 768 도 걸려 단추가 작아졌다
  if (typeof window !== "undefined" && window.matchMedia?.(SHORT_LANDSCAPE).matches) {
    const paperW = Math.floor((rh * W) / H);
    // 색 열두 개가 세 칸 네 줄이라 높이에도 들어가야 한다
    const tap = Math.max(36, Math.min(56, Math.floor((rw - paperW - 2 * 12 - 2 * 16) / 6), Math.floor((rh - 3 * 8) / 4)));
    const s = Math.min((rw - 2 * (tap * 3 + 16) - 24) / W, rh / H);
    return { w: Math.max(1, Math.floor(W * s)), h: Math.max(1, Math.floor(H * s)), mode: "short" as DrawMode, aw: rw, tap };
  }
  // 넓은 배치의 색은 세 칸 네 줄 (4 × 88 + 3 × 12 = 388px). 그림판 칸이 그보다 낮으면(아이패드 미니 가로, Safari 막대를 빼면 670)
  // 색 넷째 줄이 아래 단추에 겹쳤다 (11/9), 단추를 높이에 맞춰 줄인다 (60px 아래로는 줄이지 않는다)
  const wideTap = Math.max(60, Math.min(TAP, Math.floor((rh - 3 * 12) / 4)));
  if (wideTap < TAP && rw >= (wideTap * 3 + 24) * 2 + 40 + 320) {
    const side = wideTap * 3 + 24;
    const s = Math.min((rw - side * 2 - 40) / W, rh / H);
    return { w: Math.max(1, Math.floor(W * s)), h: Math.max(1, Math.floor(H * s)), mode: "wide" as DrawMode, aw: rw, tap: wideTap };
  }
  // 큰 화면(TV · 큰 모니터, 11/10): 단추를 그림판 높이에 맞춰 키운다 (ui.css 「큰 화면」과 같은 조건). 88 고정이면 1920 · 4K 에서
  // 종이만 커지고 단추 · 글자는 태블릿 크기 그대로 작았다. 색 세 칸 네 줄이 높이에, 양옆 세 칸이 폭에 들어가는 만큼만
  if (typeof window !== "undefined" && window.matchMedia?.(BIG_SCREEN).matches) {
    const tap = Math.min(170, Math.floor((rh - 3 * 12) / 4), Math.floor((rw * 0.42 - 40) / 6));
    if (tap > TAP) {
      const side = tap * 3 + 24;
      const s = Math.min((rw - side * 2 - 40) / W, rh / H);
      return { w: Math.max(1, Math.floor(W * s)), h: Math.max(1, Math.floor(H * s)), mode: "wide" as DrawMode, aw: rw, tap };
    }
  }
  const mode: DrawMode = rw >= SIDE_3 * 2 + 40 + 320 ? "wide"
    : rw >= SIDE_2 * 2 + 40 + 280 && rh >= MID_TALL ? "mid" : "narrow";
  const s = mode === "wide" ? Math.min((rw - SIDE_3 * 2 - 40) / W, rh / H)
    : mode === "mid" ? Math.min((rw - SIDE_2 * 2 - 40) / W, rh / H)
    : Math.min((rw - 12) / W, Math.max(260, rh * 0.8) / H);
  return { w: Math.max(1, Math.floor(W * s)), h: Math.max(1, Math.floor(H * s)), mode, aw: rw, tap: TAP };
}

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
    <div role="radiogroup" aria-label="색" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${size}px)`, gap: size < 70 ? 8 : 12, alignContent: "start" }}>
      {KID_COLORS.map((c) => {
        const on = tool !== "eraser" && color === c.hex;
        return (
          <button key={c.id} className="btn" role="radio" aria-checked={on} aria-label={c.name}
            onClick={() => onColor(c.hex)}
            style={{
              width: size, height: size, minHeight: size, padding: 0, borderRadius: "50%",
              background: c.hex, color: checkColor(c.hex), fontSize: Math.round(size * 0.34),
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
/** 「내가 만든 색」 여섯 칸 — 빈 칸은 null. 예전(왼쪽부터 쌓던) 목록도 앞에서부터 칸에 넣어 읽는다 */
const readSlots = (): (string | null)[] => {
  let saved: unknown[] = [];
  try { saved = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { /* 없으면 빈 칸 */ }
  return Array.from({ length: RECENT_MAX }, (_, i) => (typeof saved[i] === "string" ? (saved[i] as string) : null));
};

/** 보호자 모드 팔레트. 칸이 작아도 된다 — 어른 손가락 기준 44px */
function FullPalette({ tool, color, onColor }: PaletteProps) {
  // 「내가 만든 색」은 아이 · 어른이 고른 칸에 담는다 (11/5 사용자 — 전에는 만든 색이 왼쪽부터 저절로 쌓였다).
  // 색 만들기 창을 닫으면 「담을 칸을 눌러요」 — 그때 누른 칸에 그 색이 들어간다(있던 색은 바뀐다). 담을 색이 없으면 칸 색으로 그린다
  const [slots, setSlots] = useState<(string | null)[]>(readSlots);
  const [toStore, setToStore] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  // 색 고르기 창을 닫을 때(브라우저 change)만 — React 의 onChange 는 고르는 동안 계속 불린다
  useEffect(() => {
    const el = picker.current;
    if (!el) return;
    const done = () => setToStore(el.value);
    el.addEventListener("change", done);
    return () => el.removeEventListener("change", done);
  });
  const on = (hex: string) => tool !== "eraser" && color.toLowerCase() === hex.toLowerCase();
  const inBase = FULL_COLORS.some((c) => c.hex.toLowerCase() === color.toLowerCase());

  const tapSlot = (i: number) => {
    if (toStore) {
      const next = slots.map((x, k) => (k === i ? toStore : x));
      setSlots(next);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* 저장 못 해도 된다 */ }
      onColor(toStore);
      setToStore(null);
    } else if (slots[i]) {
      onColor(slots[i]!);
    }
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
          aria-label="색 만들기" style={!inBase && tool !== "eraser" ? { background: color, color: checkColor(color) } : undefined}>
          <span aria-hidden="true" className="make-wheel" />색 만들기
        </button>
        {/* 브라우저 색 고르기 창 (그림판의 「색 편집」). 고르는 동안에도 바로 칠할 색이 바뀐다 */}
        <input ref={picker} type="color" value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#3a3733"}
          onChange={(e) => onColor(e.target.value)}
          tabIndex={-1} aria-hidden="true" className="make-input" />
      </div>
      <div className={`palette-recent ${toStore ? "storing" : ""}`} role="group" aria-label="내가 만든 색">
        <span>{toStore ? "담을 칸을 눌러요" : "내가 만든 색"}</span>
        {slots.map((hex, i) => (
          <button key={`slot-${i}`} type="button" className={`swatch ${hex ? "" : "empty"}`}
            aria-label={hex ? `만든 색 ${i + 1}` : `빈 칸 ${i + 1}`} aria-pressed={!!hex && on(hex)}
            onClick={() => tapSlot(i)}
            style={hex ? { background: hex, color: checkColor(hex) } : undefined}>
            {hex && on(hex) ? "✓" : hex ? "" : "+"}
          </button>
        ))}
      </div>
      {tool !== "eraser" && isFaint(color) && (
        <p className="palette-note">아주 옅은 색이에요. 이 색으로만 그리면 AI가 친구를 못 찾을 수 있어요. 테두리는 진한 색으로 그려 주세요.</p>
      )}
    </div>
  );
}

/** 그리기 · 지우개와 선 굵기 세 가지 (지우개는 고른 굵기의 두 배) */
export function PenTools({ tool, color, width, onTool, onWidth, onClear, cols = 3, tap = TAP }: {
  tool: Tool; color: string; width: number; onTool: (t: Tool) => void; onWidth: (px: number) => void;
  /** 한 줄에 몇 칸. 세로 태블릿(mid)은 2 */
  cols?: number;
  /** 전체 지우기 — 지우개 옆에 둔다 (11/5 사용자 — 아래 단추 줄에 있으니 손이 멀었다). 없으면 그리지 않는다. null 이면 끈 상태 */
  onClear?: (() => void) | null;
  /** 단추 한 변. 낮은 가로 화면(short)은 줄인다 */
  tap?: number;
}) {
  const small = tap < 70;
  const gap = small ? 8 : 12;
  return (
    <>
      {/* 그리기 · 채우기(페인트 통 — 선으로 닫힌 칸을 누르면 고른 색으로) · 지우개 (11/5 사용자) */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tap}px)`, gap }}>
        {(["pen", "fill", "eraser"] as Tool[]).map((t) => (
          <button key={t} className="btn" aria-pressed={tool === t} onClick={() => onTool(t)}
            style={{ width: tap, minHeight: tap, padding: 0, fontSize: small ? 12 : tap > TAP ? Math.round(tap * 0.25) : 17, letterSpacing: small ? "-.05em" : undefined, ...(tool === t ? { background: "var(--butter)" } : {}) }}>
            {tool === t ? "✓" : ""}{t === "pen" ? "그리기" : t === "fill" ? "채우기" : "지우개"}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="선 굵기" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${tap}px)`, gap }}>
        {PEN_WIDTHS.map((w) => {
          const on = width === w.px;
          const dot = Math.round(w.px * 1.4 * Math.max(1, tap / TAP));
          return (
            <button key={w.id} className="btn" role="radio" aria-checked={on} aria-label={`선 ${w.name}`}
              onClick={() => onWidth(w.px)}
              style={{
                width: tap, minHeight: tap, padding: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: small ? 1 : 4,
                ...(on ? { background: "var(--butter)" } : {}),
              }}>
              <span aria-hidden="true" style={{
                display: "block", flex: "0 0 auto", width: dot, height: dot, borderRadius: "50%",
                background: tool === "eraser" ? "#B8B2AA" : color,
              }} />
              <span style={{ fontSize: small ? 11 : tap > TAP ? Math.round(tap * 0.2) : 14 }}>{on ? "✓ " : ""}{w.name}</span>
            </button>
          );
        })}
      </div>
      {onClear !== undefined && (
        <button className="btn" disabled={!onClear} onClick={() => onClear?.()}
          style={{ minHeight: small ? tap : Math.round(tap * 0.73), padding: 0, fontSize: small ? 13 : tap > TAP ? Math.round(tap * 0.36) : undefined, ...(onClear ? {} : { opacity: 0.45 }) }}>전체 지우기</button>
      )}
    </>
  );
}
