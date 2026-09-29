import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useLibrary } from "@/store/library";
import { useSession } from "@/store/session";
import { useAuth } from "@/store/auth";

export default function S12Stories() {
  const nav = useNavigate();
  const { stories, load } = useLibrary();
  const setStory = useSession((s) => s.setStory);
  const mode = useAuth((s) => s.mode);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen back="/" speech={null} title="내 이야기" autoSpeak={false}>
      {mode === "guest" && (
        <div className="box warn">앱을 닫으면 이야기가 사라져요</div>
      )}

      {stories.length > 0 ? (
        <div className="list scroll">
          {stories.map((s) => (
            <button key={s.storyId} className="item"
              onClick={() => { setStory(s); nav("/story"); }}>
              <span className="thumb" />
              <span className="grow">
                <span className="name">{s.title}</span>
                <span className="desc">{s.createdAt}에 만들었어요</span>
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
