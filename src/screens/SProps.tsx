import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { MAX_PROPS, paperToSticker, useProps } from "@/features/props/props";
import { useAuth } from "@/store/auth";
import { useWithAdult } from "@/store/settings";

/** 내 소품 — 아이가 등록한 물건 목록 (2026-10-27 로컬 시험, 설계서에 없는 화면 · open-decisions 0-13).
 *  「소품 그리기」로 화면에 그리거나, 보호자가 켰으면 「그림 올리기」로 종이 그림을 찍어 올린 뒤 이름을 적는다.
 *  등록한 소품은 이 기기(비회원은 이 탭)의 모든 이야기에서 쓴다 — 이름이 카드의 물건과 맞으면 그 쪽에 소품 장면이 나온다. */
export default function SProps() {
  const nav = useNavigate();
  const mine = useProps((s) => s.mine);
  const reload = useProps((s) => s.reload);
  const mode = useAuth((s) => s.mode);
  // 사진 올리기는 「어른과 함께」를 켠 보호자만 (F-SET-06, S-03 과 같은 조건)
  const photoOn = useWithAdult().photo;
  const file = useRef<HTMLInputElement>(null);
  const [failed, setFailed] = useState(false);
  const full = mine.length >= MAX_PROPS;

  // 로그인 · 로그아웃 뒤에는 저장 장소가 바뀐다 (회원 이 기기 · 비회원 이 탭)
  useEffect(() => { reload(); }, [reload, mode]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setFailed(false);
    try {
      const png = await paperToSticker(f);
      if (!png) { setFailed(true); return; }
      nav("/props/new", { state: { png, from: "photo" } });
    } catch {
      setFailed(true);
    }
  };

  return (
    <Screen back="/stories" speech="내 소품이에요" title="내 소품"
      acts={
        <>
          {photoOn && (
            <BigButton disabled={full} onClick={() => file.current?.click()}>그림 올리기</BigButton>
          )}
          <BigButton go disabled={full} onClick={() => nav("/props/new")}>소품 그리기</BigButton>
        </>
      }>
      <h2 className="question">내 소품</h2>
      <p className="hint">내가 만든 물건이 이야기에 나와요</p>
      {mode === "guest" && <div className="box warn">앱을 닫으면 소품이 사라져요</div>}
      {failed && <div className="box warn">그림을 찾지 못했어요. 흰 종이에 그린 그림을 밝은 곳에서 찍어 주세요.</div>}
      {full && <div className="box warn">소품은 {MAX_PROPS}개까지 넣을 수 있어요</div>}
      <input ref={file} type="file" accept="image/*" hidden
        onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />

      {mine.length > 0 ? (
        <div className="scroll" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 200px))", gap: 24, padding: 4, alignContent: "start",
        }}>
          {mine.map((p) => (
            // 카드 모양은 S-07 카드와 같고, 높이는 칸 폭에서 정한다 (목록이 길어지면 아래로 스크롤)
            <button key={p.id} className="choice" aria-label={p.name} onClick={() => nav(`/props/${p.id}`)}
              style={{ height: "auto", width: "100%", justifyContent: "center" }}>
              <img src={p.png} alt="" style={{ width: "75%", height: "auto", flex: "0 0 auto", aspectRatio: "1 / 1" }} />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="stage empty" style={{ flexDirection: "column", gap: 12, padding: 32 }}>
          <p className="question">아직 소품이 없어요</p>
          <p className="hint">우산 · 꽃 · 구름처럼 이야기에 나올 물건을 그려 보세요</p>
        </div>
      )}
    </Screen>
  );
}
