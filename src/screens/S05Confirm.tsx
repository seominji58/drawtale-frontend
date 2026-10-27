import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterPreview from "@/features/character/CharacterPreview";
import { useSession } from "@/store/session";
import { useSettings, useWithAdult } from "@/store/settings";
import { MOTIONS } from "@/features/character/skeleton";
import type { MotionId } from "@/types/story";
import { needsAdult } from "@/types/character";

export default function S05Confirm() {
  const nav = useNavigate();
  const { imageUrl, keypoints, character } = useSession();
  const level = useSettings((s) => s.level);
  // 캐릭터 목소리 판이면 나레이터가 부를 이름을 먼저 짓는다 (S05Name)
  const next = useSettings((s) => s.voiceMode) === "characters" ? "/name" : "/steps";
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
      <div className="stage" onClick={() => setI((v) => v + 1)}>
        <CharacterPreview motion={motion} />
      </div>
      {/* S-05-05. AI 가 자신 없어 한 관절이 있거나 검출 점수가 낮을 때만 둔다 (계약 2-3).
          점수를 모르면(목 엔진, 예전 서버) 늘 둔다 */}
      {character && needsAdult(character) && (
        <div className="aside-links">
          <span>잘 움직이지 않나요?</span>
          <button className="btn link" onClick={() => nav("/joints")}>어른에게 도움 받기</button>
        </div>
      )}
    </Screen>
  );
}
