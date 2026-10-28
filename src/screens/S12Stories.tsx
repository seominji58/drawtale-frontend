import type { CSSProperties } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useLibrary } from "@/store/library";
import { useSession } from "@/store/session";
import { useAuth } from "@/store/auth";
import { useGuardianMode } from "@/store/settings";

/** 책 천 색. 네 단계 크레파스 색을 옅게 돌려 쓴다 */
const COVERS = ["#CFE0F5", "#F6D3CC", "#CFE8D9", "#F7E3B0"];

export default function S12Stories() {
  const nav = useNavigate();
  const { stories, load } = useLibrary();
  const setStory = useSession((s) => s.setStory);
  const mode = useAuth((s) => s.mode);
  const guardian = useGuardianMode();

  useEffect(() => { load(); }, [load]);

  return (
    <Screen back="/" speech={null} title="내 이야기" autoSpeak={false}>
      {mode === "guest" && (
        <div className="box warn">앱을 닫으면 이야기가 사라져요</div>
      )}

      {/* 내 소품 — 그린 물건이 이야기에 나온다 (open-decisions 0-13). 보호자 모드에서만. 곁들이는 길이라 글자 줄로 */}
      {guardian && (
        <div className="aside-links">
          <button className="btn link" onClick={() => nav("/props")}>내 소품 그리기</button>
        </div>
      )}

      {stories.length > 0 ? (
        <div className="shelf">
          {stories.map((s, i) => (
            <button key={s.storyId} className="book" aria-label={`${s.title}, ${s.createdAt}`}
              style={{ "--book-color": COVERS[i % COVERS.length] } as CSSProperties}
              onClick={() => { setStory(s); nav("/story"); }}>
              {/* 두께 있는 책: 표지 천 + 왼쪽 책등 + 오른쪽 · 아래 종이 결. 표지 가운데에 아이 그림을 붙인다 */}
              <span className="book-cover">
                <span className="book-label">
                  {s.cover
                    ? <img src={s.cover} alt="" />
                    : s.picks?.place && <img className="fallback" src={`/icons/place/${s.picks.place}.png`} alt=""
                        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
                </span>
                <span className="book-title">{s.title}</span>
                <span className="book-date">{s.createdAt}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="stage empty" style={{ flexDirection: "column", gap: 20, padding: 32 }}>
          <p className="question">아직 이야기가 없어요</p>
          <p className="hint">상상한 이야기를 만들어 보세요</p>
          <div style={{ width: 280 }}>
            <BigButton go onClick={() => nav("/guide")}>이야기 만들기</BigButton>
          </div>
        </div>
      )}
    </Screen>
  );
}
