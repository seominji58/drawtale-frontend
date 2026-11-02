import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen, { LockIcon } from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterPreview from "@/features/character/CharacterPreview";
import JointView from "@/features/character/JointView";
import { useSession } from "@/store/session";
import { useSettings, useWithAdult } from "@/store/settings";
import { MOTIONS } from "@/features/character/skeleton";
import type { MotionId } from "@/types/story";
import { needsAdult } from "@/types/character";

export default function S05Confirm() {
  const nav = useNavigate();
  const { imageUrl, keypoints, character } = useSession();
  const level = useSettings((s) => s.level);
  // 다음은 늘 이름 짓기 (S05Name). 읽어주기 판과 상관없이 묻고, 지을지 말지는 아이가 고른다 (2026-11-02 사용자)
  const next = "/name";
  const [i, setI] = useState(3);
  // 사진 올리기가 꺼져 있으면(F-SET-06 기본) 그림은 화면에서 그린 것이다
  const { photo } = useWithAdult();

  if (!imageUrl || !keypoints) return <Navigate to="/upload" replace />;
  const motion = (level === 1 ? "wave" : MOTIONS[i % MOTIONS.length].id) as MotionId;

  return (
    <Screen back="/upload" speech="내 친구가 움직여요" segment={2}
      acts={
        <>
          <BigButton onClick={() => nav("/upload")}>{photo ? "다시 찍기" : "다시 그리기"}</BigButton>
          <BigButton go onClick={() => nav(next)}>이 친구로 할래요</BigButton>
        </>
      }>
      <h2 className="question">내 친구가 움직여요</h2>
      {/* 왼쪽 움직이는 미리보기 · 오른쪽 관절이 찍힌 그림 (2026-11-02 사용자 「미리보기 영상 반 / 관절 배정 이미지 반」).
          이야기를 만들기 전에 어디를 관절로 잡았는지 한눈에 본다. 고치는 것은 S-06(어른) */}
      <div className="preview-pair">
        <figure>
          <div className="stage" onClick={() => setI((v) => v + 1)}>
            <CharacterPreview motion={motion} />
          </div>
          <figcaption className="hint">이렇게 움직여요</figcaption>
        </figure>
        <figure>
          <div className="stage">
            {character
              ? <JointView imageUrl={imageUrl} character={character} keypoints={keypoints} />
              : <img src={imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
          </div>
          <figcaption className="hint">점이 몸을 움직이는 자리예요</figcaption>
        </figure>
      </div>
      {/* S-05-05. AI 가 자신 없어 한 관절이 있거나 검출 점수가 낮을 때만 둔다 (계약 2-3).
          점수를 모르면(목 엔진, 예전 서버) 늘 둔다 */}
      {character && needsAdult(character) && (
        <div className="aside-links">
          <span>잘 움직이지 않나요?</span>
          {/* 어른 화면으로 가는 길이라 자물쇠를 붙이고, 가서 무엇을 하는지 적는다 (2026-10-28 — 링크가 눈에 띄지 않았다) */}
          <button className="btn link adult-link" onClick={() => nav("/joints")}>
            <LockIcon />어른에게 도움 받기 · 관절 맞추기
          </button>
        </div>
      )}
    </Screen>
  );
}
