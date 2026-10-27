import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import { TAP } from "@/components/DrawTools";
import { PROPS, useProps } from "@/features/props/props";
import { useAuth } from "@/store/auth";

/** 내 소품 — 아이가 그릴 물건 목록 (2026-10-27 로컬 시험, 설계서에 없는 화면 · open-decisions 0-13).
 *  하나를 누르면 그 물건을 그린다. 그린 물건은 그 물건을 쓰는 카드를 고른 이야기(S-09)에 나온다.
 *  한 화면 한 질문: 「무엇을 그려 볼까요?」 */
export default function SProps() {
  const nav = useNavigate();
  const drawn = useProps((s) => s.drawn);
  const reload = useProps((s) => s.reload);
  const mode = useAuth((s) => s.mode);

  // 로그인 · 로그아웃 뒤에는 저장 장소가 바뀐다 (회원 이 기기 · 비회원 이 탭)
  useEffect(() => { reload(); }, [reload, mode]);

  return (
    <Screen back="/stories" speech="무엇을 그려 볼까요?" title="내 소품">
      <h2 className="question">무엇을 그려 볼까요?</h2>
      <p className="hint">내가 그린 물건이 이야기에 나와요</p>
      {mode === "guest" && <div className="box warn">앱을 닫으면 그린 물건이 사라져요</div>}

      <div className="scroll" style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 24, padding: 4,
      }}>
        {PROPS.map((p) => {
          const png = drawn[p.id];
          return (
            <button key={p.id} className="choice" aria-label={`${p.name}${png ? ", 그렸어요" : ""}`}
              onClick={() => nav(`/props/${p.id}`)}
              style={{ minHeight: TAP * 1.6 }}>
              {png
                ? <img src={png} alt="" style={{ objectFit: "contain" }} />
                : <span aria-hidden="true" style={{ fontSize: 56, opacity: 0.45 }}>{p.emoji}</span>}
              <span>{png ? "✓ " : ""}{p.name}</span>
            </button>
          );
        })}
      </div>
    </Screen>
  );
}
