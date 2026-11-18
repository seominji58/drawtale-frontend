/** 그림이 들어올 자리를 임시로 채우는 삽화.
 *  나중에 실제 일러스트가 오면 이 파일만 갈아끼우면 된다. */

/** 그림이 들어올 자리를 임시로 채우는 삽화.
 *  나중에 실제 일러스트가 오면 이 파일만 갈아끼우면 된다. */

/** 앱의 주인공 (S-01 · S-14 서 있음, S-04 손 흔듦). B 크레용 인물 기준 그림의 주인공 (2026-11-03, `public/illust/hero-*.webp`) */
export function Friend({ wave = false }: { wave?: boolean }) {
  return <img src={`${import.meta.env.BASE_URL}illust/hero-${wave ? "wave" : "stand"}.webp`} className="illust" alt="" aria-hidden draggable={false} />;
}

/** 삽화 넷은 B 크레용 화풍 그림이다 (2026-11-03, `public/illust/`) */
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
