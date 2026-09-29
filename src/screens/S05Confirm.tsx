import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { MOTIONS } from "@/features/character/skeleton";
import type { MotionId } from "@/types/story";

export default function S05Confirm() {
  const nav = useNavigate();
  const { imageUrl, analysis, keypoints } = useSession();
  const level = useSettings((s) => s.level);
  const [i, setI] = useState(3);

  const needHelp = useMemo(() => {
    if (!analysis || !keypoints) return false;
    if (analysis.character.confidence < 0.6) return true;
    return Object.values(keypoints).some((k) => k.score < 0.4);
  }, [analysis, keypoints]);

  if (!imageUrl || !keypoints) { nav("/upload", { replace: true }); return null; }
  const motion = (level === 1 ? "wave" : MOTIONS[i % MOTIONS.length].id) as MotionId;

  return (
    <Screen back="/upload" speech="내 친구가 움직여요" segment={2}
      acts={
        <>
          <BigButton onClick={() => nav("/upload")}>다시 찍기</BigButton>
          <BigButton go onClick={() => nav("/steps")}>이 친구로 할래요</BigButton>
        </>
      }>
      <h2 className="question">내 친구가 움직여요</h2>
      <div className="stage" onClick={() => setI((v) => v + 1)}>
        <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion={motion} />
      </div>
      {needHelp && (
        <div className="box warn inline">
          <span>캐릭터가 잘 움직이지 않나요?</span>
          <button className="btn link" onClick={() => nav("/joints")}>어른에게 도움 받기</button>
        </div>
      )}
    </Screen>
  );
}
