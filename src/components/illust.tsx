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

/** 삽화 넷은 B 크레용 화풍 그림이다 (2026-11-03, `public/illust/`). 주인공 자리(Friend)는 아이 그림이 오는 곳이라 SVG 그대로 */
const art = (name: string) => () => (
  <img src={`${import.meta.env.BASE_URL}illust/${name}.webp`} className="illust" alt="" aria-hidden draggable={false} />
);
/** S-03 그림 올리기 */
export const Paper = art("paper");
/** S-08 이야기 쓰는 중 */
export const Pencil = art("pencil");
/** E-01 오류 */
export const Puzzled = art("puzzled");
/** S-11 다 했어요 */
export const Party = art("party");

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
