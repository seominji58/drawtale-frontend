import { useEffect, useState } from "react";
import CharacterCanvas from "./CharacterCanvas";
import { artOf } from "./art";
import { useSession } from "@/store/session";
import { fetchCharacter } from "@/api";
import type { MotionId } from "@/types/story";

/** 미리보기를 기다리는 최대 시간. 넘으면 브라우저 애니메이션으로 대신한다 */
const WAIT_MS = 90_000;
const POLL_MS = 1_500;

/** S-05 · 이름 짓기의 「내 친구가 움직여요」.
 *  서버가 Meta 로 렌더한 MP4 가 있으면 그것을 튼다. 브라우저 조각 애니메이션은 그림을 네모로
 *  잘라 붙인 것처럼 보여서다 (사용자, 2026-10-08). 서버가 만드는 중이면 그림을 멈춘 채 보여 주며
 *  다시 묻고, 없거나 실패하면(목 엔진 · 목 AI · 렌더 실패) 브라우저 애니메이션으로 대신한다 */
export default function CharacterPreview({ motion = "wave" }: { motion?: MotionId }) {
  const { imageUrl, keypoints, character, setCharacter } = useSession();
  const [gaveUp, setGaveUp] = useState(false);
  const rendering = character?.previewStatus === "rendering" && !gaveUp;
  const id = character?.id;

  useEffect(() => {
    if (!rendering || !id) return;
    const ctrl = new AbortController();
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > WAIT_MS) { setGaveUp(true); return; }
      fetchCharacter(id, ctrl.signal)
        .then((c) => { if (c.previewStatus !== "rendering") setCharacter(c); })
        .catch(() => {});   // 한 번 못 물어도 다음에 다시 묻는다
    }, POLL_MS);
    return () => { clearInterval(t); ctrl.abort(); };
  }, [rendering, id, setCharacter]);

  if (!imageUrl || !keypoints) return null;
  // 원본(사진 배경까지)은 보이지 않는다. 배경을 잘라 낸 그림만 (features/character/art.ts)
  const art = artOf(character, imageUrl);

  if (character?.previewUrl) {
    return <video className="clip-art" key={character.previewUrl} src={character.previewUrl} autoPlay loop muted playsInline
      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />;
  }
  if (rendering) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {/* 영상을 만드는 동안은 배경을 잘라 낸 정지 그림 — 원본은 사진 배경까지 나왔다 (2026-11-03) */}
        {art
          ? <img src={art} alt="" style={{ flex: 1, minHeight: 0, maxWidth: "100%", objectFit: "contain" }} />
          : <div style={{ flex: 1 }} />}
        <p className="hint">움직일 준비를 하고 있어요</p>
      </div>
    );
  }
  if (!art) return <p className="hint">움직일 준비를 하고 있어요</p>;
  return <CharacterCanvas imageUrl={art} keypoints={keypoints} motion={motion} />;
}
