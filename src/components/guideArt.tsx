/** S-02 그림 안내 카드마다 다른 크레파스 그림 (2026-10-28 — 여섯 장이 같은 자리표시였다).
 *  아이가 그린 듯한 선, 갈색 테두리. 실제 예시 사진이 생기면 이 그림을 바꾼다 (art-direction 1장: 실제 돌려 본 그림이 맞다) */
export type GuideKind = "one" | "white" | "spread" | "many" | "biped" | "quad";

const INK = "#3A2E26";
const S = { stroke: INK, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

/** 막대 사람 하나 (x, y 는 머리 가운데) */
function Kid({ x, y, s = 1, color = "#D65A3B", arms = 0 }: { x: number; y: number; s?: number; color?: string; arms?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r="14" {...S} fill="#FCE3C8" />
      <path d="M-14 22h28l4 34h-36z" {...S} fill={color} />
      <path d={`M-14 26l-${16 + arms} ${10 + arms}M14 26l${16 + arms} ${10 + arms}M-8 56l-${4 + arms / 2} 26M8 56l${4 + arms / 2} 26`} {...S} />
      <path d="M-5 -2v2M5 -2v2M-5 6q5 4 10 0" {...S} strokeWidth={3} />
    </g>
  );
}

export default function GuideArt({ kind }: { kind: GuideKind }) {
  return (
    <svg viewBox="0 0 160 150" className="guide-art" aria-hidden>
      {kind === "one" && <Kid x={80} y={34} />}
      {kind === "white" && (
        <>
          <rect x="32" y="10" width="96" height="128" rx="6" {...S} fill="#FFFFFF" transform="rotate(-3 80 74)" />
          <Kid x={80} y={44} s={0.82} color="#4F8FD6" />
        </>
      )}
      {kind === "spread" && (
        <>
          <Kid x={80} y={34} arms={10} color="#4FA77A" />
          <path d="M30 70l-10 4 6 8M130 70l10 4-6 8" {...S} stroke="#E8B23C" strokeWidth={3} />
        </>
      )}
      {kind === "many" && (
        <>
          <Kid x={38} y={40} s={0.7} color="#4F8FD6" />
          <Kid x={80} y={34} s={0.7} />
          <Kid x={122} y={40} s={0.7} color="#4FA77A" />
        </>
      )}
      {kind === "biped" && (
        <g>
          {/* 두 발로 선 곰 */}
          <circle cx="62" cy="22" r="9" {...S} fill="#C99A63" />
          <circle cx="98" cy="22" r="9" {...S} fill="#C99A63" />
          <circle cx="80" cy="38" r="22" {...S} fill="#C99A63" />
          <path d="M72 34v2M88 34v2M75 46q5 4 10 0" {...S} strokeWidth={3} />
          <path d="M58 62h44l4 40H54z" {...S} fill="#C99A63" />
          <path d="M58 66l-18 16M102 66l18 16M66 102l-2 30M94 102l2 30" {...S} />
        </g>
      )}
      {kind === "quad" && (
        <g>
          {/* 네 발 강아지 */}
          <path d="M40 66h74q10 0 10 12v14q0 10-10 10H42q-10 0-10-12V78q0-12 8-12z" {...S} fill="#E8B23C" />
          <circle cx="126" cy="56" r="17" {...S} fill="#E8B23C" />
          <path d="M116 44l-4-14 12 8M134 40l6-12 2 16" {...S} fill="#E8B23C" />
          <path d="M122 54v2M132 54v2M126 64q4 3 8 0" {...S} strokeWidth={3} />
          <path d="M32 74q-14-6-14-20" {...S} />
          <path d="M46 102v28M64 102v28M92 102v28M110 102v28" {...S} />
        </g>
      )}
    </svg>
  );
}
