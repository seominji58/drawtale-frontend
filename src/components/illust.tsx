/** 그림이 들어올 자리를 임시로 채우는 삽화.
 *  나중에 실제 일러스트가 오면 이 파일만 갈아끼우면 된다. */

/** 그림이 들어올 자리를 임시로 채우는 삽화.
 *  나중에 실제 일러스트가 오면 이 파일만 갈아끼우면 된다. */

export function Friend({ wave = false }: { wave?: boolean }) {
  // 아이가 크레파스로 그린 듯한 주인공 (디자인 방향 A). 실제로는 아이 그림이 이 자리에 온다
  return (
    <svg viewBox="0 0 200 240" className="illust" aria-hidden>
      <path d="M100 26c22 0 36 15 35 36s-16 35-36 34-34-15-34-35 13-35 35-35z" fill="#FCE3C8" stroke="#3A2E26" strokeWidth="4" strokeLinecap="round" />
      <path d="M86 56l1 3M112 55l1 3" stroke="#3A2E26" strokeWidth="5" strokeLinecap="round" />
      <path d="M88 74c7 6 17 6 24 -1" stroke="#D65A3B" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M76 100c-4 30-6 62-2 84 18 4 36 4 54 0 3-24 1-54-4-84-16-4-32-4-48 0z" fill="#D65A3B" stroke="#3A2E26" strokeWidth="4" strokeLinejoin="round" />
      <path d="M78 116c-18 6-30 18-38 34" stroke="#3A2E26" strokeWidth="5" strokeLinecap="round" fill="none" />
      <g className={wave ? "wave-arm" : undefined} style={{ transformOrigin: "124px 114px" }}>
        <path d="M124 114c16 4 30 14 40 30" stroke="#3A2E26" strokeWidth="5" strokeLinecap="round" fill="none" />
      </g>
      <path d="M88 186c-2 16-4 30-8 42M114 186c2 16 4 30 9 42" stroke="#3A2E26" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M70 230h20M114 230h20" stroke="#4F8FD6" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function Paper() {
  return (
    <svg viewBox="0 0 220 220" className="illust" aria-hidden>
      <rect x="34" y="26" width="152" height="168" rx="22" fill="#fff" stroke="#E6D9C3" strokeWidth="6" />
      <rect x="140" y="26" width="24" height="48" fill="#FFE39A" />
      <polygon points="140,74 152,64 164,74 164,26 140,26" fill="#FFE39A" />
      <circle cx="110" cy="86" r="30" fill="#FFE3D5" />
      <circle cx="98" cy="82" r="4.5" fill="#3A2E26" />
      <circle cx="122" cy="82" r="4.5" fill="#3A2E26" />
      <path d="M100 98q10 8 20 0" stroke="#3A2E26" strokeWidth="4" strokeLinecap="round" fill="none" />
      <rect x="94" y="118" width="32" height="38" rx="14" fill="#4F8FD6" />
      <path d="M54 168h112" stroke="#E6D9C3" strokeWidth="8" strokeLinecap="round" />
      <path d="M54 184h80" stroke="#E6D9C3" strokeWidth="8" strokeLinecap="round" />
      <circle cx="64" cy="54" r="12" fill="#4FA77A" />
    </svg>
  );
}

export function Pencil() {
  return (
    <svg viewBox="0 0 220 220" className="illust" aria-hidden>
      <g transform="rotate(-24 110 110)">
        <rect x="88" y="30" width="44" height="132" rx="12" fill="#FFE39A" />
        <rect x="88" y="30" width="44" height="28" rx="12" fill="#E26D5A" />
        <rect x="88" y="58" width="44" height="12" fill="#E6D9C3" />
        <path d="M88 160h44l-22 32z" fill="#3A2E26" />
        <polygon points="88,160 132,160 110,140" fill="#FFD3C2" />
      </g>
      <path d="M40 186q30-24 60 0t60-10" stroke="#4F8FD6" strokeWidth="9" strokeLinecap="round" strokeDasharray="12 12" fill="none" />
      <circle cx="48" cy="50" r="10" fill="#FFE39A" />
      <circle cx="176" cy="66" r="14" fill="#C9D8F2" />
      <polygon points="176,36 182,50 196,52 184,62 188,76 176,68 164,76 168,62 156,52 170,50" fill="#FFE39A" />
    </svg>
  );
}

export function Puzzled() {
  return (
    <svg viewBox="0 0 220 220" className="illust" aria-hidden>
      <path d="M20 110 Q 110 -20 200 110 Q 110 60 20 110" fill="#E6D9C3" opacity="0.5" />
      <circle cx="104" cy="124" r="56" fill="#FFE3D5" />
      <path d="M48 108a56 56 0 0 1 112 0c0 8-12 6-20 0-14-10-60-10-76 0-8 6-20 8-20 0z" fill="#6B5548" />
      <circle cx="86" cy="126" r="7" fill="#3A2E26" />
      <circle cx="122" cy="126" r="7" fill="#3A2E26" />
      <ellipse cx="104" cy="150" rx="10" ry="8" fill="#E26D5A" />
      <path d="M168 56q0-20 18-20t18 18c0 14-18 12-18 26" stroke="#4F8FD6" strokeWidth="11" strokeLinecap="round" fill="none" />
      <circle cx="186" cy="100" r="6.5" fill="#4F8FD6" />
      <path d="M40 70 Q 30 90 40 100 Q 50 90 40 70 Z" fill="#8DB5E3" />
      <path d="M60 40 Q 50 60 60 70 Q 70 60 60 40 Z" fill="#8DB5E3" opacity="0.6" />
    </svg>
  );
}

export function Party() {
  return (
    <svg viewBox="0 0 220 220" className="illust" aria-hidden>
      <circle cx="110" cy="124" r="56" fill="#FFE3D5" />
      <path d="M54 110a56 56 0 0 1 112 0c0 8-10 6-18 0-14-10-62-10-76 0-8 6-18 8-18 0z" fill="#6B5548" />
      <polygon points="74,74 146,74 110,16" fill="#E26D5A" />
      <circle cx="110" cy="16" r="12" fill="#FFE39A" />
      <path d="M90 122q8-10 16 0" stroke="#3A2E26" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M114 122q8-10 16 0" stroke="#3A2E26" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M94 144q16 20 32 0z" fill="#E26D5A" />
      <g fill="#FFE39A">
        <rect x="24" y="44" width="18" height="18" rx="6" transform="rotate(20 33 53)" />
        <rect x="184" y="66" width="18" height="18" rx="6" transform="rotate(-15 193 75)" />
        <circle cx="40" cy="150" r="8" />
      </g>
      <g fill="#4F8FD6">
        <rect x="40" y="136" width="16" height="16" rx="5" transform="rotate(-25 48 144)" />
        <rect x="176" y="28" width="16" height="16" rx="5" transform="rotate(30 184 36)" />
      </g>
      <g fill="#4FA77A">
        <rect x="18" y="104" width="14" height="14" rx="5" transform="rotate(12 25 111)" />
        <rect x="194" y="126" width="14" height="14" rx="5" transform="rotate(-20 201 133)" />
        <circle cx="160" cy="160" r="10" />
      </g>
    </svg>
  );
}

export function Scene({ n }: { n: number }) {
  const sky = ["#DCE8F3", "#E6F4EA", "#FCEEE5", "#F1E8D8"][n % 4];
  const ground = ["#A3D4AF", "#95D5A9", "#F7BA8B", "#D9CCB6"][n % 4];
  const sun = ["#FFE39A", "#FFE39A", "#E26D5A", "#FFE39A"][n % 4];
  return (
    <svg viewBox="0 0 220 150" className="illust" aria-hidden>
      <rect width="220" height="150" fill={sky} />
      <circle cx="180" cy="40" r="22" fill={sun} />
      <path d="M20 70 Q 40 50 70 60 Q 90 40 120 70 Z" fill="#FFFFFF" opacity="0.8" />
      <ellipse cx="110" cy="150" rx="160" ry="60" fill={ground} />
      <path d="M80 150 Q 110 120 140 150 Z" fill="#FFFFFF" opacity="0.3" />
      <circle cx="110" cy="90" r="22" fill="#fff" />
      <circle cx="102" cy="85" r="4" fill="#3A2E26" />
      <circle cx="118" cy="85" r="4" fill="#3A2E26" />
      <rect x="104" y="110" width="12" height="20" rx="6" fill="#4F8FD6" />
    </svg>
  );
}
