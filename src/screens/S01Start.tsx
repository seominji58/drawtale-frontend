import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Friend } from "@/components/illust";
import { useLibrary } from "@/store/library";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { speak } from "@/lib";
import { useChildren } from "@/store/children";

export default function S01Start() {
  const nav = useNavigate();
  const { stories, load, sync } = useLibrary();
  // 오늘은 누구예요? (보호자 · 선생님 설계 4-5, 2026-11-18): 아이가 둘 이상일 때만. 글자를 못 읽어도 동물 표시로 찾는다
  const kids = useChildren((s) => s.list);
  const activeKid = useChildren((s) => s.active());
  const loadKids = useChildren((s) => s.load);
  const pickKid = useChildren((s) => s.setActive);
  useEffect(() => { void loadKids(); }, [loadKids]);
  const resetAll = useSession((s) => s.resetAll);
  const muteAll = useSettings((v) => v.muteAll);

  useEffect(() => {
    load(); resetAll();
    speak("무엇을 할까요?", muteAll);
  }, [load, resetAll, muteAll]);

  const start = () => nav("/guide");

  return (
    <Screen
      back={null}
      speech={null}
      // 설정 톱니는 Screen 이 둔다 (components/SettingsKey — 다른 아이 화면과 같은 것). 다시 듣기는 없다
      railEnd={null}
    >
      {/* 왼쪽: 테이프로 붙인 도화지 위의 주인공, 오른쪽: 인사와 두 갈래 (디자인 방향 A, 2026-10-28) */}
      <div className="home">
        <div className="stage home-sheet">
          <div className="illust-wrap"><Friend /></div>
        </div>
        <div className="home-side">
          <p className="home-brand">한칸이야기</p>
          <h1 className="home-title">내 그림이<br />주인공이 돼요</h1>
          {kids.length > 1 && (
            <div className="who-today" role="group" aria-label="오늘은 누구예요?">
              <p className="who-today-q">오늘은 누구예요?</p>
              <div className="who-today-kids">
                {kids.map((k) => (
                  <button key={k.id} className={`who-kid${activeKid?.id === k.id ? " on" : ""}`} aria-pressed={activeKid?.id === k.id}
                    onClick={() => { pickKid(k.id); void sync(); speak(k.nickname ?? "", muteAll); }}>
                    <span className="who-kid-icon" aria-hidden>{k.icon ?? "🙂"}</span>
                    <span className="who-kid-name">{k.nickname ?? ""}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="home-acts">
            <BigButton go onClick={start}>이야기 만들기</BigButton>
            <BigButton disabled={stories.length === 0} onClick={() => nav("/stories")}>
              내 이야기 책장
            </BigButton>
          </div>
        </div>
      </div>
    </Screen>
  );
}
