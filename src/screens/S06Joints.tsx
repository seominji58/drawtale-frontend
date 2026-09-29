import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { useSession } from "@/store/session";
import { saveJoints } from "@/api";
import { JOINT_ORDER } from "@/types/character";
import type { JointName } from "@/types/character";

/** S-06-03 관절 목록. hand·foot 은 모델 이름이고 실제로는 손목·발목이다 (open-decisions 3번).
 *  neck 은 Meta 모델에서 얼굴 가운데라서 「얼굴」로 적는다 */
const NAMES: Record<JointName, string> = {
  neck: "얼굴", torso: "몸통", hip: "엉덩이",
  right_shoulder: "오른쪽 어깨", right_elbow: "오른쪽 팔꿈치", right_hand: "오른쪽 손목",
  left_shoulder: "왼쪽 어깨", left_elbow: "왼쪽 팔꿈치", left_hand: "왼쪽 손목",
  right_hip: "오른쪽 골반", right_knee: "오른쪽 무릎", right_foot: "오른쪽 발목",
  left_hip: "왼쪽 골반", left_knee: "왼쪽 무릎", left_foot: "왼쪽 발목",
};

export default function S06Joints() {
  const nav = useNavigate();
  const { imageUrl, character, keypoints, setKeypoints, setCharacter } = useSession();
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [moved, setMoved] = useState<Set<JointName>>(new Set());
  const wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<JointName | null>(null);
  // 그림은 object-fit: contain 으로 여백을 두고 그려진다. 점은 무대 전체가 아니라
  // 그림이 실제로 그려진 칸을 기준으로 놓아야 저장되는 좌표가 맞는다
  const [box, setBox] = useState({ l: 0, t: 0, w: 1, h: 1 });

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el || !character) return;
    const fit = () => {
      const { width: W, height: H } = el.getBoundingClientRect();
      const s = Math.min(W / character.width, H / character.height);
      const w = character.width * s, h = character.height * s;
      setBox({ l: (W - w) / 2, t: (H - h) / 2, w, h });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [character, preview]);

  if (!imageUrl || !character || !keypoints) { nav("/upload", { replace: true }); return null; }

  const move = (e: React.PointerEvent) => {
    const name = drag.current;
    if (!name || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left - box.l) / box.w));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top - box.t) / box.h));
    setKeypoints({ ...keypoints, [name]: { x, y } });
    if (!moved.has(name)) setMoved(new Set(moved).add(name));
  };

  // 계약 2-4: 끈 관절이 없으면 저장하지 않는다. 끈 것이 있으면 15개 전부를 보낸다
  const done = async () => {
    if (moved.size === 0) { nav("/confirm"); return; }
    setSaving(true); setFailed(false);
    try {
      setCharacter(await saveJoints(character, keypoints));
      nav("/confirm");
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    // 되돌리기는 저장하지 않은 보정을 버린다. 서버 렌더는 저장된 관절만 쓰기 때문이다
    <Screen back={() => { setKeypoints(character.keypoints); nav("/confirm"); }}
      speech={null} title="어른이 맞춰 주세요" audience="adult"
      acts={
        <>
          <BigButton onClick={() => setPreview((v) => !v)}>{preview ? "관절 보기" : "움직여 보기"}</BigButton>
          <BigButton go disabled={saving} onClick={done}>다 했어요</BigButton>
        </>
      }>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        <div className="stage" style={{ flex: 1.2 }}>
          {preview
            ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion="wave" />
            : <div ref={wrap} className="joint-stage"
                   onPointerMove={move} onPointerUp={() => (drag.current = null)}>
                <img src={imageUrl} alt="" />
                {JOINT_ORDER.map((name) => (
                  <span key={name} className="joint"
                    style={{ left: box.l + keypoints[name].x * box.w, top: box.t + keypoints[name].y * box.h }}
                    onPointerDown={(e) => {
                      drag.current = name;
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }} />
                ))}
              </div>}
        </div>
        <div className="list scroll" style={{ flex: 1 }}>
          {JOINT_ORDER.map((name) => (
            <div key={name} className="item">
              <span className="grow">{NAMES[name]}</span>
              {moved.has(name) && <span style={{ color: "var(--ink-soft)" }}>옮김</span>}
            </div>
          ))}
        </div>
      </div>
      {failed
        ? <div className="box err">저장하지 못했습니다. 「다 했어요」를 다시 눌러 주세요</div>
        : <div className="box">점을 끌어서 그림의 관절 자리에 맞춰 주세요</div>}
    </Screen>
  );
}
