/** S-02 그림 안내 카드마다 다른 예시 그림 (2026-10-28 크레파스 SVG → 2026-11-03 실제 아이가 흰 종이에 그린 듯한 그림, `public/guide/`).
 *  우리 화풍이 아니라 아이 그림처럼 — 아이가 「이렇게 그리면 된다」를 보고 따라 그린다 */
export type GuideKind = "one" | "white" | "spread" | "many" | "biped" | "quad";

export default function GuideArt({ kind }: { kind: GuideKind }) {
  return <img src={`${import.meta.env.BASE_URL}guide/${kind}.webp`} className="guide-art" alt="" aria-hidden draggable={false} />;
}
