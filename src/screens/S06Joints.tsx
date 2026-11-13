import { useLayoutEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterPreview from "@/features/character/CharacterPreview";
import { useSession } from "@/store/session";
import { saveJoints } from "@/api";
import { bonesOf, labelOf, orderOf, useForm } from "@/features/character/forms";
import { lowJoints } from "@/types/character";
import type { Keypoints } from "@/types/character";

export default function S06Joints() {
  const nav = useNavigate();
  const { imageUrl, character, keypoints, setKeypoints, setCharacter } = useSession();
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [moved, setMoved] = useState<Set<string>>(new Set());
  /** 지금 고른 관절. 점을 잡거나 목록을 누르면 바뀌고, 점과 목록 줄이 함께 밝아진다 */
  const [picked, setPicked] = useState<string | null>(null);
  /** 「처음 자리로」 확인 상자. 브라우저 confirm() 은 화면 밖 모양이라 쓰지 않는다 */
  const [asking, setAsking] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const rows = useRef<Partial<Record<string, HTMLButtonElement | null>>>({});
  const drag = useRef<string | null>(null);
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

  // 관절 이름 · 뼈 · 화면 이름 · 안내는 캐릭터 형태의 정의로 (2족형 · 4족형 — pt_docs 19, 계약 2-13)
  const form = useForm(character?.form);
  if (!imageUrl || !character || !keypoints) return <Navigate to="/upload" replace />;
  const ORDER = orderOf(form).filter((n) => keypoints[n]);
  const BONES = bonesOf(form).filter(([a, b]) => keypoints[a] && keypoints[b]);
  // AI 가 관절을 못 찾아 기본 뼈대를 놓았다 — 처음부터 모두 맞춰야 한다 (S-04 가 바로 이 화면으로 보낸다)
  const template = character.jointsFound === false && !character.corrected;

  const pick = (name: string) => {
    setPicked(name);
    rows.current[name]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const move = (e: React.PointerEvent, name = drag.current) => {
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
  const same = (a: Keypoints, b: Keypoints, n: string) =>
    Math.abs(a[n].x - b[n].x) < 1e-6 && Math.abs(a[n].y - b[n].y) < 1e-6;
  const atAi = !ai || ORDER.every((n) => same(keypoints, ai, n));
  const resetToAi = () => {
    setAsking(false);
    if (!ai) return;
    setKeypoints({ ...ai });
    setMoved(new Set(ORDER.filter((n) => !same(ai, character.keypoints, n))));
  };

  // AI 가 자신 없어 한 관절 (score < 0.4, 계약 2-3). 빨간 점으로 두고, 어른이 옮기면 확인한 것으로 센다
  const low = new Set(lowJoints(character));
  const unchecked = [...low].filter((n) => !moved.has(n)).length;
  const state = (n: string) => (moved.has(n) ? "moved" : low.has(n) ? "low" : "");
  const at = (n: string) => ({ x: box.l + keypoints[n].x * box.w, y: box.t + keypoints[n].y * box.h });

  // 계약 2-4: 서버에 저장된 관절과 다른 게 없으면 저장하지 않는다. 다르면 15개 전부를 보낸다
  // 기본 뼈대는 옮기지 않았어도 한 번 저장한다 — 「확인했다」는 표시(corrected)가 남아 다시 이 화면으로 보내지 않는다
  const dirty = template || ORDER.some((n) => !same(keypoints, character.keypoints, n));
  const save = async (): Promise<boolean> => {
    if (!dirty) return true;
    setSaving(true); setFailed(false);
    try {
      setCharacter(await saveJoints(character, keypoints));
      return true;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const done = async () => { if (await save()) nav("/confirm"); };
  // 움직여 보기: 지금 관절을 저장하면 서버가 그 관절로 영상을 다시 만든다 — 그 영상을 보인다 (CharacterPreview).
  // 전에는 브라우저가 사진 원본을 뼈마다 네모로 잘라 돌려서 종이째 조각으로 흩어져 보였다 (2026-11-03)
  const togglePreview = async () => {
    if (preview) { setPreview(false); return; }
    if (await save()) setPreview(true);
  };

  return (
    // 되돌리기는 저장하지 않은 보정을 버린다. 서버 렌더는 저장된 관절만 쓰기 때문이다
    <Screen back={() => { setKeypoints(character.keypoints); nav("/confirm"); }}
      // 기본 · 보호자 모드 모두 연다 (11/4 사용자). 어려우면 어른을 부르도록 권하기만 한다
      speech={null} title={template ? "점을 몸에 맞게 옮겨 주세요" : "관절을 맞춰 주세요"} audience="adult"
      acts={
        <>
          <BigButton disabled={saving} onClick={togglePreview}>{preview ? "관절 보기" : "움직여 보기"}</BigButton>
          <BigButton go disabled={saving} onClick={done}>다 했어요</BigButton>
        </>
      }>
      <div className="joints">
        <div className="stage">
          {preview
            ? <CharacterPreview />
            : <div ref={wrap} className="joint-stage"
                   // 고른 점을 그림의 빈 곳을 눌러 옮긴다 (탭 두 번, AGENTS 3.5 「드래그만 되는 조작 금지」).
                   // 겹친 점(꼬리 없는 꼬리 · 하나만 그린 뒷다리)은 목록에서 골라 이렇게 옮긴다 (11/7)
                   onPointerDown={(e) => {
                     if (!picked || e.target !== e.currentTarget) return;
                     drag.current = picked;
                     move(e, picked);
                     e.currentTarget.setPointerCapture(e.pointerId);
                   }}
                   onPointerMove={(e) => move(e)} onPointerUp={() => (drag.current = null)}
                   onPointerCancel={() => (drag.current = null)}>
                <img src={imageUrl} alt="" draggable={false} />
                <svg className="joint-bones" aria-hidden="true">
                  {BONES.map(([a, b]) => {
                    const p = at(a), q = at(b);
                    return <line key={b} x1={p.x} y1={p.y} x2={q.x} y2={q.y} />;
                  })}
                </svg>
                {ORDER.map((name) => {
                  const p = at(name);
                  return (
                    <span key={name} role="button" aria-label={labelOf(form, name)}
                      className={`joint ${state(name)} ${picked === name ? "on" : ""}`}
                      style={{ left: p.x, top: p.y }}
                      onPointerDown={(e) => {
                        drag.current = name;
                        pick(name);
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}>
                      {picked === name && <span className="joint-name">{labelOf(form, name)}</span>}
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
            {ORDER.map((name) => (
              <button key={name} ref={(el) => { rows.current[name] = el; }}
                className={`item joint-row ${picked === name ? "on" : ""}`}
                aria-pressed={picked === name} onClick={() => pick(name)}>
                <i className={`joint-dot ${state(name)}`} aria-hidden="true" />
                <span className="grow">{labelOf(form, name)}</span>
                {moved.has(name)
                  ? <span style={{ color: "var(--ink-soft)" }}>옮김</span>
                  : low.has(name) && <span style={{ color: "var(--berry)", fontWeight: 700 }}>확인해 주세요</span>}
              </button>
            ))}
          </div>
          <p className="joint-note">목록에서 고른 뒤 그림을 누르면 그 자리로 옮겨져요. 겹친 점도 이렇게 옮겨요.</p>
          {/* 05 S-06: right · left 는 그림 속 캐릭터 기준이다 (사람만 — 4족형은 앞 · 뒷다리로 부른다) */}
          {form.id === "biped"
            ? <p className="joint-note">오른쪽 · 왼쪽은 그림 속 친구 기준이에요. 친구의 오른손은 화면 왼쪽에 있어요.</p>
            : form.guide?.slice(0, -1).map((g) => <p key={g} className="joint-note">{g}</p>)}
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
            : template
              ? <div className="box warn">관절을 찾지 못해 기본 자리에 놓았어요. 점을 몸에 맞게 옮겨 주세요 · 어려우면 어른에게 도와 달라고 해요</div>
              : <div className="box">{form.guide?.[form.guide.length - 1] ?? "점을 끌어서 그림의 관절 자리에 맞춰 주세요"}</div>}
      {!atAi && !preview && !asking && (
        <div className="aside-links">
          <span>잘못 옮겼나요?</span>
          <button className="btn link" onClick={() => setAsking(true)}>처음 자리로 되돌리기</button>
        </div>
      )}
    </Screen>
  );
}
