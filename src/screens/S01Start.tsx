import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import Screen, { LockIcon } from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Friend } from "@/components/illust";
import { useLibrary } from "@/store/library";
import { useSession } from "@/store/session";
import { useAuth, trialLeft } from "@/store/auth";
import { useSettings } from "@/store/settings";
import { speak } from "@/lib";

export default function S01Start() {
  const nav = useNavigate();
  const { stories, load } = useLibrary();
  const resetAll = useSession((s) => s.resetAll);
  const mode = useAuth((a) => a.mode);
  const muteAll = useSettings((v) => v.muteAll);
  const [held, setHeld] = useState(0);
  const [hint, setHint] = useState(false);
  const timer = useRef<number>();
  const downAt = useRef(0);

  useEffect(() => {
    load(); resetAll();
    speak("무엇을 할까요?", muteAll);
  }, [load, resetAll, muteAll]);

  // 어른 설정은 3초 길게 누르기로만 연다. 짧은 탭은 반응하지 않는다
  const down = () => {
    const start = Date.now();
    downAt.current = start;
    setHint(false);
    timer.current = window.setInterval(() => {
      const p = (Date.now() - start) / 3000;
      setHeld(p);
      if (p >= 1) { up(); nav("/settings"); }
    }, 60);
  };
  const up = () => {
    clearInterval(timer.current);
    // 짧게 눌렀으면 길게 눌러야 한다고 알려준다
    if (downAt.current && Date.now() - downAt.current < 2900) {
      setHint(true);
      setTimeout(() => setHint(false), 1800);
    }
    downAt.current = 0;
    setHeld(0);
  };

  const start = () => nav(mode === "guest" && trialLeft() === 0 ? "/welcome" : "/guide");

  return (
    <Screen
      back={null}
      speech={null}
      railEnd={
        <>
          <button className="round hold"
            style={{ "--p": `${Math.min(held, 1) * 360}deg` } as CSSProperties}
            onPointerDown={down} onPointerUp={up} onPointerLeave={up}
            aria-label="어른 설정. 3초 길게 누르세요">
            <LockIcon />
          </button>
          {hint && <span className="hold-hint">3초 동안 꾹 눌러 주세요</span>}
        </>
      }
    >
      {/* 왼쪽: 테이프로 붙인 도화지 위의 주인공, 오른쪽: 인사와 두 갈래 (디자인 방향 A, 2026-10-28) */}
      <div className="home">
        <div className="stage home-sheet">
          <div className="illust-wrap"><Friend /></div>
        </div>
        <div className="home-side">
          <p className="home-brand">한칸이야기</p>
          <h1 className="home-title">내 그림이<br />주인공이 돼요</h1>
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
