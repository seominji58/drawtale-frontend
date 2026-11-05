import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import CharacterPreview from "@/features/character/CharacterPreview";
import { useSession } from "@/store/session";
import { useSettings, LEVEL_CONFIG } from "@/store/settings";
import { speak, stopSpeak } from "@/lib";

/** S-05 다음 「친구 이름 짓기」 (pt_docs 05 S-05N).
 *  2026-11-02 사용자: 읽어주기 판과 상관없이 **늘** 묻고, 먼저 「이름 지을래요 / 이름 없이 할래요」를 단추로 고른다.
 *  캐릭터 목소리 판은 나레이터가 이 이름으로 3인칭으로 부른다. 나레이션만 판(「나는」)은 글에 쓰지 않고
 *  서버에 등록만 해 둔다 — 나중에 캐릭터 목소리 판으로 바꿀 때 쓴다 (계약 2-5). 05 는 「캐릭터 목소리 판일 때만」이라 어긋난다 (open-decisions 0-18).
 *  쉬운 두 글자 이름. 성별을 가리지 않는 이름만 둔다 */
const NAMES = ["토토", "하루", "콩이", "별이", "보리", "솜이"];
/** 서버가 받는 이름 길이 (계약 2-5 protagonist_name) */
const MAX_NAME = 10;
/** 이름에 쓰는 글자만 남긴다 — 글자 · 숫자, 10자.
 *  이름은 카드로 고르거나 **적기만** 한다. 말로 짓기는 뺐다 (2026-11-02 사용자 「음성은 이름 적는 부분에서는 안 할려고」) */
const cleanName = (v: string) => v.replace(/[^\p{L}\p{N}]/gu, "").slice(0, MAX_NAME);

export default function S05Name() {
  const nav = useNavigate();
  const { imageUrl, keypoints, name, setName, character } = useSession();
  // 사람이 아닌 주인공(4족형 …)은 이름을 꼭 짓는다 (11/5 사용자) — 화면이 무슨 동물인지 묻지 않아서 이야기는 이름으로 부른다.
  // 「지을까요?」를 건너뛰고 바로 이름 카드, 「이름 없이」는 없다 (서버도 이름 없으면 NAME_REQUIRED)
  const mustName = !!character?.form && character.form !== "biped";
  const level = useSettings((s) => s.level);
  const muteAll = useSettings((s) => s.muteAll);
  const lock = useRef(0);
  /** 이름을 짓기로 했는지. 돌아왔을 때 이미 지은 이름이 있으면 바로 이름 카드 */
  const [naming, setNaming] = useState(!!name || mustName);
  /** 직접 적은 이름 (2026-11-02 사용자 「카드 말고 아이가 직접 입력하거나 말해서」). 카드를 고르면 비운다 */
  const [typed, setTyped] = useState(name && !NAMES.includes(name) ? name : "");

  useEffect(() => () => stopSpeak(), []);
  if (!imageUrl || !keypoints) return <Navigate to="/upload" replace />;

  const names = NAMES.slice(0, LEVEL_CONFIG[level].choiceCount);

  const choose = (n: string) => {
    const now = Date.now();
    if (now - lock.current < 300) return;   // 연타 방지
    lock.current = now;
    setName(n);
    speak(`${n}, 좋은 이름이에요`, muteAll);
  };
  /** 카드에서 고르면 적은 칸은 비운다 */
  const pickCard = (n: string) => { setTyped(""); choose(n); };
  /** 적는 칸: 글자 · 숫자만, 10자까지 (계약 2-5 protagonist_name). 비우면 이름도 비운다 */
  const write = (v: string) => {
    const n = cleanName(v);
    setTyped(n);
    setName(n || null);
  };

  const go = (withName: boolean) => {
    stopSpeak();
    if (!withName) setName(null);   // 이름 없이 가면 서버가 지어 준다
    nav("/steps");
  };

  // 먼저 지을지 말지를 단추로 고른다
  if (!naming) {
    return (
      <Screen back="/confirm" speech="친구 이름을 지어 줄까요?" segment={2}
        acts={
          <>
            <BigButton onClick={() => go(false)}>이름 없이 할래요</BigButton>
            <BigButton go onClick={() => { setNaming(true); speak("어떤 이름이 좋을까요?", muteAll); }}>이름 지을래요</BigButton>
          </>
        }>
        <h2 className="question">친구 이름을 지어 줄까요?</h2>
        <div className="stage"><CharacterPreview /></div>
      </Screen>
    );
  }

  return (
    <Screen back={mustName ? "/confirm" : () => { stopSpeak(); setNaming(false); }}
      speech={mustName ? "친구 이름을 지어 주세요. 어떤 이름이 좋을까요?" : "어떤 이름이 좋을까요?"} segment={2}
      acts={<BigButton go disabled={!name} onClick={() => go(true)}>이 이름으로 할래요</BigButton>}>
      <h2 className="question">어떤 이름이 좋을까요?</h2>

      {/* 무대는 넘치는 것을 잘라 내므로 아래 여백을 두어 이름표가 잘리지 않게 한다 (2026-11-03) */}
      <div className="stage" style={{ flexDirection: "column", gap: 12, padding: "16px 16px 20px" }}>
        <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", justifyContent: "center" }}>
          <CharacterPreview />
        </div>
        {name && (
          // 이름표는 고른 이름 카드처럼 노란 알약을 통째로 칠한다. 읽는 문장의 형광펜(.said.now)은
          // 아래 절반만 칠해서 둥근 모양과 겹치면 반쪽 알약처럼 보였다
          <button className="said" onClick={() => speak(name, muteAll)}
            style={{ flex: "0 0 auto", border: 0, fontFamily: "inherit", fontSize: "var(--t-question)", lineHeight: 1.3,
              padding: "10px 36px", cursor: "pointer", background: "var(--butter)" }}>
            {name}
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "var(--gap)", flex: "0 0 auto" }}>
        {names.map((n) => (
          <button key={n} className={`btn ${name === n && !typed ? "on" : ""}`} onClick={() => pickCard(n)}
            aria-pressed={name === n && !typed}
            style={{ width: "auto", minWidth: 140, fontSize: "var(--t-button)", background: name === n && !typed ? "var(--butter)" : undefined }}>
            {n}
          </button>
        ))}
      </div>
      {/* 직접 적기. 카드에 없는 이름도 아이가 정한다 */}
      <div className="own-field name-own">
        <input value={typed} maxLength={MAX_NAME}
          aria-label="친구 이름 직접 적기" placeholder="이름을 직접 적어요"
          onChange={(e) => write(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && typed) go(true); }} />
        <em>진짜 이름이나 학교 이름은 쓰지 않아요</em>
      </div>

      {!mustName && (
        <div className="aside-links">
          <button className="btn link" onClick={() => go(false)}>이름 없이 할래요</button>
        </div>
      )}
    </Screen>
  );
}
