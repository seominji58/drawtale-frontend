import { useLayoutEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterCanvas from "@/features/character/CharacterCanvas";
import { useSession } from "@/store/session";
import { saveJoints } from "@/api";
import { PARENT } from "@/features/character/skeleton";
import { JOINT_ORDER, lowJoints } from "@/types/character";
import type { JointName, Keypoints } from "@/types/character";

/** S-06-03 관절 목록. hand·foot 은 모델 이름이고 실제로는 손목·발목이다 (open-decisions 3번).
 *  neck 은 Meta 모델에서 얼굴 가운데라서 「얼굴」로 적는다 */
const NAMES: Record<JointName, string> = {
  neck: "얼굴", torso: "몸통", hip: "엉덩이",
  right_shoulder: "오른쪽 어깨", right_elbow: "오른쪽 팔꿈치", right_hand: "오른쪽 손목",
  left_shoulder: "왼쪽 어깨", left_elbow: "왼쪽 팔꿈치", left_hand: "왼쪽 손목",
  right_hip: "오른쪽 골반", right_knee: "오른쪽 무릎", right_foot: "오른쪽 발목",
  left_hip: "왼쪽 골반", left_knee: "왼쪽 무릎", left_foot: "왼쪽 발목",
};

/** 점을 잇는 뼈. 어디가 어디에 붙었는지 보여야 어긋난 관절이 눈에 띈다 (2026-10-28) */
const BONES = JOINT_ORDER.flatMap((n) => {
  const p = PARENT[n];
  return p && p !== "root" ? [[p as JointName, n] as const] : [];
});

export default function S06Joints() {
  const nav = useNavigate();
  const { imageUrl, character, keypoints, setKeypoints, setCharacter } = useSession();
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [moved, setMoved] = useState<Set<JointName>>(new Set());
  /** 지금 고른 관절. 점을 잡거나 목록을 누르면 바뀌고, 점과 목록 줄이 함께 밝아진다 */
  const [picked, setPicked] = useState<JointName | null>(null);
  /** 「처음 자리로」 확인 상자. 브라우저 confirm() 은 화면 밖 모양이라 쓰지 않는다 */
  const [asking, setAsking] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const rows = useRef<Partial<Record<JointName, HTMLButtonElement | null>>>({});
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

  if (!imageUrl || !character || !keypoints) return <Navigate to="/upload" replace />;

  const pick = (name: JointName) => {
    setPicked(name);
    rows.current[name]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const move = (e: React.PointerEvent) => {
    const name = drag.current;
    if (!name || !wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left - box.l) / box.w));
    const y = Math.min(1, Math.max(0, (e.clientY - r.top - box.t) / box.h));
    setKeypoints({ ...keypoints, [name]: { x, y } });
    if (!moved.has(name)) setMoved(new Set(moved).add(name));
  };

  // S-06-07 처음 자리로: AI 가 처음 짚은 관절로 되돌린다. 확인을 한 번 받는다 (설계서 v0.2 S-06-02).
  // 저장된 관절과 달라지는 것은 「옮김」으로 두어, 「다 했어요」가 서버에 AI 값을 다시 저장한다
  const ai = character.aiKeypoints;
  const same = (a: Keypoints, b: Keypoints, n: JointName) =>
    Math.abs(a[n].x - b[n].x) < 1e-6 && Math.abs(a[n].y - b[n].y) < 1e-6;
  const atAi = !ai || JOINT_ORDER.every((n) => same(keypoints, ai, n));
  const resetToAi = () => {
    setAsking(false);
    if (!ai) return;
    setKeypoints({ ...ai });
    setMoved(new Set(JOINT_ORDER.filter((n) => !same(ai, character.keypoints, n))));
  };

  // AI 가 자신 없어 한 관절 (score < 0.4, 계약 2-3). 빨간 점으로 두고, 어른이 옮기면 확인한 것으로 센다
  const low = new Set(lowJoints(character));
  const unchecked = [...low].filter((n) => !moved.has(n)).length;
  const state = (n: JointName) => (moved.has(n) ? "moved" : low.has(n) ? "low" : "");
  const at = (n: JointName) => ({ x: box.l + keypoints[n].x * box.w, y: box.t + keypoints[n].y * box.h });

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
      <div className="joints">
        <div className="stage">
          {preview
            ? <CharacterCanvas imageUrl={imageUrl} keypoints={keypoints} motion="wave" />
            : <div ref={wrap} className="joint-stage"
                   onPointerMove={move} onPointerUp={() => (drag.current = null)}
                   onPointerCancel={() => (drag.current = null)}>
                <img src={imageUrl} alt="" draggable={false} />
                <svg className="joint-bones" aria-hidden="true">
                  {BONES.map(([a, b]) => {
                    const p = at(a), q = at(b);
                    return <line key={b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
                  })}
                </svg>
                {JOINT_ORDER.map((name) => {
                  const p = at(name);
                  return (
                    <span key={name} role="button" aria-label={NAMES[name]}
                      className={`joint ${state(name)} ${picked === name ? "on" : ""}`}
                      style={{ left: p.x, top: p.y }}
                      onPointerDown={(e) => {
                        drag.current = name;
                        pick(name);
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}>
                      {picked === name && <span className="joint-name">{NAMES[name]}</span>}
                    </span>
                  );
                })}
              </div>}
        </div>

        <div className="joint-side">
          <div className="joint-key" aria-hidden="true">
            <span><i className="joint-dot" />AI가 찾은 자리</span>
            <span><i className="joint-dot low" />확인해 주세요</span>
            <span><i className="joint-dot moved" />옮김</span>
          </div>
          <div className="list scroll">
            {JOINT_ORDER.map((name) => (
              <button key={name} ref={(el) => { rows.current[name] = el; }}
                className={`item joint-row ${picked === name ? "on" : ""}`}
                aria-pressed={picked === name} onClick={() => pick(name)}>
                <i className={`joint-dot ${state(name)}`} aria-hidden="true" />
                <span className="grow">{NAMES[name]}</span>
                {moved.has(name)
                  ? <span style={{ color: "var(--ink-soft)" }}>옮김</span>
                  : low.has(name) && <span style={{ color: "var(--berry)", fontWeight: 700 }}>확인해 주세요</span>}
              </button>
            ))}
          </div>
          {/* 05 S-06: right · left 는 그림 속 캐릭터 기준이다 */}
          <p className="joint-note">오른쪽 · 왼쪽은 그림 속 친구 기준이에요. 친구의 오른손은 화면 왼쪽에 있어요.</p>
        </div>
      </div>

      {failed
        ? <div className="box err">저장하지 못했습니다. 「다 했어요」를 다시 눌러 주세요</div>
        : asking
          ? <div className="box warn inline">
              <span>관절을 AI가 처음 짚은 자리로 되돌릴까요?</span>
              <button className="btn link" onClick={resetToAi}>되돌리기</button>
              <button className="btn link" onClick={() => setAsking(false)}>그대로 두기</button>
            </div>
          : unchecked > 0
            ? <div className="box warn">AI가 자신 없는 관절이 {unchecked}개 있어요. 빨간 점부터 맞춰 주세요</div>
            : <div className="box">점을 끌어서 그림의 관절 자리에 맞춰 주세요. 목록을 누르면 그 점이 커져요</div>}
      {!atAi && !preview && !asking && (
        <div className="aside-links">
          <span>잘못 옮겼나요?</span>
          <button className="btn link" onClick={() => setAsking(true)}>처음 자리로 되돌리기</button>
        </div>
      )}
    </Screen>
  );
}
