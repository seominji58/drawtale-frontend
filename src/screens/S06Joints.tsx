import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { useSession } from "@/store/session";
import type { Keypoints } from "@/types/character";

const NAMES: Record<string, string> = {
  head: "머리", neck: "목", torso: "몸통", hip: "엉덩이",
  right_shoulder: "오른쪽 어깨", right_elbow: "오른쪽 팔꿈치", right_hand: "오른쪽 손",
  left_shoulder: "왼쪽 어깨", left_elbow: "왼쪽 팔꿈치", left_hand: "왼쪽 손",
  right_hip: "오른쪽 골반", right_knee: "오른쪽 무릎", right_foot: "오른쪽 발",
  left_hip: "왼쪽 골반", left_knee: "왼쪽 무릎", left_foot: "왼쪽 발",
};

export default function S06Joints() {
  const nav = useNavigate();
  const { imageUrl, keypoints, setKeypoints } = useSession();
  const [preview, setPreview] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<string | null>(null);

  if (!imageUrl || !keypoints) { nav("/upload", { replace: true }); return null; }
  const low = Object.entries(keypoints).filter(([, v]) => v.score < 0.4);

  const move = (e: React.PointerEvent) => {
    if (!drag.current || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setKeypoints({ ...keypoints, [drag.current as keyof Keypoints]: { x, y, score: 1 } });
  };

  return (
    <Screen back="/confirm" speech={null} title="어른이 맞춰 주세요" audience="adult"
      acts={
        <>
          <BigButton onClick={() => setPreview((v) => !v)}>{preview ? "관절 보기" : "움직여 보기"}</BigButton>
          <BigButton go onClick={() => nav("/confirm")}>다 했어요</BigButton>
        </>
      }>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        <div className="stage" style={{ flex: 1.2 }}>
          {preview
            ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion="wave" />
            : <div ref={wrap} className="joint-stage"
                   onPointerMove={move} onPointerUp={() => (drag.current = null)}>
                <img src={imageUrl} alt="" />
                {Object.entries(keypoints).map(([name, k]) => (
                  <span key={name} className={`joint ${k.score < 0.4 ? "low" : ""}`}
                    style={{ left: `${k.x * 100}%`, top: `${k.y * 100}%` }}
                    onPointerDown={(e) => {
                      drag.current = name;
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }} />
                ))}
              </div>}
        </div>
        <div className="list scroll" style={{ flex: 1 }}>
          {Object.entries(keypoints).map(([name, k]) => (
            <div key={name} className="item"
                 style={{ background: k.score < 0.4 ? "var(--err-bg)" : undefined }}>
              <span className="grow">{NAMES[name] ?? name}</span>
              <span style={{ color: k.score < 0.4 ? "var(--berry)" : "var(--ink-soft)" }}>
                {k.score.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
      {low.length > 0 && (
        <div className="box err">
          신뢰도가 낮은 관절이 {low.length}개 있습니다. 점을 끌어서 위치를 맞춰 주세요
        </div>
      )}
    </Screen>
  );
}
