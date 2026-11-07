import { TAP } from "@/components/DrawTools";
import { PROP_SIZES, propHeight } from "@/features/props/props";
import type { PropSize } from "@/features/props/props";

/** 소품 크기 고르기 — 작게 · 보통 · 크게. 위에는 장면 칸 안에서 실제로 보일 크기를 미리 보여 준다 */
export default function PropSizePicker({ png, size, onSize }: {
  png: string; size: PropSize; onSize: (s: PropSize) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      {/* 장면 칸 미리 보기 (4:3) — 소품이 장면에서 차지할 크기 */}
      <div aria-hidden="true" style={{
        aspectRatio: "4 / 3", width: "100%", borderRadius: 16, background: "var(--milk)",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        <img src={png} alt="" style={{ height: `${propHeight(size) * 100}%`, maxWidth: "60%", objectFit: "contain" }} />
      </div>
      <div role="radiogroup" aria-label="소품 크기" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {PROP_SIZES.map((x) => (
          <button key={x.id} type="button" className="btn" role="radio" aria-checked={size === x.id}
            onClick={() => onSize(x.id)}
            style={{ minHeight: TAP * 0.7, padding: 0, ...(size === x.id ? { background: "var(--butter)" } : {}) }}>
            {size === x.id ? "✓ " : ""}{x.name}
          </button>
        ))}
      </div>
    </div>
  );
}
