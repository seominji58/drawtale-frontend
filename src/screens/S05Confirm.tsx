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
import { useForm } from "@/features/character/forms";
import { turnCharacter } from "@/api";

export default function S05Confirm() {
  const nav = useNavigate();
  const { imageUrl, keypoints, character, setFile, setCharacter } = useSession();
  // 옆모습 형태(4족형)는 AI 가 머리 쪽을 틀리면(꼬리가 굵은 악어) 점이 모두 뒤집힌다 — 한 번에 바로잡는 버튼 (11/4 사용자)
  const side = useForm(character?.form).hero?.facing === "auto";
  const [turning, setTurning] = useState(false);
  // AI 가 얼굴 · 꼬리로 본 자리에 이름표 — 「얼굴이 반대쪽이에요」가 무엇을 묻는지 알게 (11/5 사용자 「무슨 기능인지 명확하지 않다」).
  // 꼬리가 없는 그림은 꼬리 점이 엉덩이에 겹쳐 있어 꼬리 이름표를 달지 않는다
  const k = keypoints;
  const hasTail = !!(k?.tail_tip && k?.hip) && Math.hypot(k.tail_tip.x - k.hip.x, k.tail_tip.y - k.hip.y) > 0.02;
  const tags: Record<string, string> | undefined = side ? { neck: "얼굴", ...(hasTail ? { tail_tip: "꼬리" } : {}) } : undefined;
  const turn = async () => {
    if (!character || turning) return;
    setTurning(true);
    try { setCharacter(await turnCharacter(character.id)); }
    catch (e) { console.warn("[한칸이야기] 얼굴 방향을 바꾸지 못했습니다", e); }
    finally { setTurning(false); }
  };
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
          {/* 그림을 비우고 S-03 고르기(화면에 그리기 · 그림 찍기 · 앨범)로 — 그림이 남아 있으면 「이 그림으로」 화면이 떴다 (11/3 사용자) */}
          <BigButton onClick={() => { setFile(null); nav("/upload"); }}>{photo ? "다시 찍기" : "다시 그리기"}</BigButton>
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
              ? <JointView imageUrl={imageUrl} character={character} keypoints={keypoints} tags={tags}
                  busy={turning ? "얼굴 쪽을 바꾸는 중이에요…" : null} />
              : <img src={imageUrl} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />}
          </div>
          <figcaption className="hint">점이 몸을 움직이는 자리예요</figcaption>
        </figure>
      </div>
      {/* 옆모습 형태: AI 가 머리 쪽을 틀리면 점이 모두 뒤집힌다(꼬리가 굵은 악어). 이름표를 보고 바로 답하게 묻는다 */}
      {side && character && (
        <div className="face-check">
          <span>「얼굴」 자리가 맞나요?</span>
          <button className="face-flip" onClick={turn} disabled={turning}>
            {turning ? "바꾸는 중이에요…" : "아니요, 반대쪽이에요 ⇄"}
          </button>
        </div>
      )}
      {/* S-05-05. AI 가 자신 없어 한 관절이 있거나 검출 점수가 낮을 때 둔다 (계약 2-3). 점수를 모르면(목 엔진, 예전 서버) 늘 둔다.
          보호자 모드면 관절이 정상이어도 늘 둔다 — 보호자가 판단해 고친다 (2026-11-03 사용자) */}
      {/* 11/4 사용자: 관절 고치기는 기본 · 보호자 모드 모두 — 늘 둔다 */}
      {character && (
        <div className="aside-links">
          <span>{needsAdult(character) ? "잘 움직이지 않나요?" : "관절을 바꾸고 싶나요?"}</span>
          {/* 어른 화면으로 가는 길이라 자물쇠를 붙이고, 가서 무엇을 하는지 적는다 (2026-10-28 — 링크가 눈에 띄지 않았다) */}
          <button className="btn link adult-link" onClick={() => nav("/joints")}>
            <LockIcon />{needsAdult(character) ? "어른에게 도움 받기 · 관절 맞추기" : "관절 고치기"}
          </button>
        </div>
      )}
    </Screen>
  );
}
