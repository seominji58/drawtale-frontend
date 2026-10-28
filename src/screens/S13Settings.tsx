import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useSettings, FIXED_LEVEL } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { useLibrary } from "@/store/library";
import type { ProtagonistVoice, StoryLength, SupportLevel, VoiceMode } from "@/types/story";
import { voiceSupported } from "@/features/story/voice";

function Row({ name, desc, children }: { name: string; desc: string; children: ReactNode }) {
  return (
    <div className="item">
      <span className="grow">
        <span className="name">{name}</span>
        <span className="desc">{desc}</span>
      </span>
      {children}
    </div>
  );
}

/** 묶음 머리. 위 바로가기 칩이 이 id 로 찾아간다 */
function Head({ id, name, desc, children }: { id: string; name: string; desc?: string; children?: ReactNode }) {
  // 머리는 위에 붙어 있으므로(sticky) 이름만 둔다. 긴 설명은 그 아래 보통 줄로 — 붙어 있는 동안 목록을 가리지 않게
  return (
    <>
      {/* 위치는 이 표식으로 잰다. 위에 붙는(sticky) 머리는 offsetTop 이 붙은 자리로 나와 쓸 수 없다 */}
      <div className="set-anchor" id={`set-${id}`} data-section={id} aria-hidden />
      <div className="item head">
        <span className="grow"><span className="name">{name}</span></span>
        {children}
      </div>
      {desc && <div className="item note"><span className="desc">{desc}</span></div>}
    </>
  );
}

/** 바로가기 칩. 설정이 길어 폰 · 태블릿 · 컴퓨터 어디서든 원하는 묶음으로 바로 간다 (10/28 사용자 「스크롤 방식 고민」) */
const SECTIONS: [string, string][] = [
  ["account", "계정"], ["story", "이야기"], ["sound", "소리"], ["adult", "어른과 함께"], ["info", "기록 · 안내"], ["mine", "만든 이야기"],
];

export default function S13Settings() {
  const nav = useNavigate();
  const s = useSettings();
  const { mode, account, logout } = useAuth();
  const { stories, remove } = useLibrary();
  const listRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState("account");

  // 지금 보고 있는 묶음을 칩에 표시한다: 목록 맨 위를 지난 마지막 머리.
  // 머리가 위에 붙어 있어(sticky) IntersectionObserver 로는 늘 「보이는」 것으로 나와 스크롤 위치로 센다
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const onScroll = () => {
      const heads = [...root.querySelectorAll<HTMLElement>("[data-section]")];
      const top = root.scrollTop + 12;
      const atEnd = root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      const passed = heads.filter((h) => h.offsetTop <= top);
      const now = atEnd ? heads[heads.length - 1] : passed[passed.length - 1] ?? heads[0];
      if (now) setCurrent(now.dataset.section!);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [stories.length]);

  const jump = (id: string) => {
    const root = listRef.current, el = document.getElementById(`set-${id}`);
    if (!root || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.scrollTo({ top: el.offsetTop, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <Screen back="/" speech={null} title="어른 설정" audience="adult" autoSpeak={false}
      acts={<BigButton onClick={() => nav("/")}>닫기</BigButton>}>
      <nav className="set-nav" aria-label="설정 묶음 바로가기">
        {SECTIONS.filter(([id]) => id !== "mine" || stories.length > 0).map(([id, label]) => (
          <button key={id} className={current === id ? "on" : ""} aria-current={current === id} onClick={() => jump(id)}>{label}</button>
        ))}
      </nav>
      {/* 터치 · 휠 · 트랙패드 · 스크롤 막대 · 키보드(눌러서 고른 뒤 화살표 · Page Down) 모두로 내린다 */}
      <div className="list scroll set-list" ref={listRef} tabIndex={0} aria-label="설정 목록">
        <Head id="account" name="계정" />
        <Row name="계정" desc={mode === "member" ? (account ?? "로그인됨") : "로그인 없이 사용 중입니다"}>
          {/* 로그아웃하면 「어른과 함께」 기능도 끈다. 다음에 들고 있는 사람이 보호자라는 보장이 없다 */}
          <button className="btn link"
            onClick={mode === "member" ? () => { s.set("photoUpload", false); s.set("voiceInput", false); logout(); } : () => nav("/login")}>
            {mode === "member" ? "로그아웃" : "로그인"}
          </button>
        </Row>

        {/* 지원 수준은 고정 (FIXED_LEVEL, open-decisions 0-12). null 이면 다시 보인다 */}
        {!FIXED_LEVEL && <Row name="지원 수준" desc="아동의 사용을 돕는 수준을 선택하세요">
          <span className="seg">
            {[1, 2, 3].map((n) => (
              <button key={n} className={s.level === n ? "on" : ""}
                onClick={() => s.set("level", n as SupportLevel)}>{n}</button>
            ))}
          </span>
        </Row>}

        <Head id="story" name="이야기" />
        {/* 긴 이야기 (open-decisions 0-6, 사용자 2026-10-12). 쪽 수는 서버 설정(STORY_PAGES, 지금 8쪽) */}
        <Row name="이야기 길이"
          desc={s.storyLength === "long"
            ? "아이가 고른 네 칸을 뼈대로 여러 쪽짜리 그림책을 만듭니다. 아이가 고르지 않은 큰 사건은 넣지 않습니다. 새로 만드는 이야기부터 적용됩니다"
            : "아이가 고른 네 칸이 네 문장이 됩니다. 새로 만드는 이야기부터 적용됩니다"}>
          <span className="seg">
            {([["short", "짧게"], ["long", "길게"]] as [StoryLength, string][]).map(([v, label]) => (
              <button key={v} className={s.storyLength === v ? "on" : ""}
                onClick={() => s.set("storyLength", v)}>{label}</button>
            ))}
          </span>
        </Row>

        {/* 긴 동화책 대비 두 가지 읽어주기 (open-decisions 0-6). 새로 만드는 이야기부터 바뀐다 */}
        <Row name="읽어주기"
          desc={s.voiceMode === "characters"
            ? "이야기에 짧은 대사가 들어가고, 대사는 등장인물 목소리로 읽어 줍니다. 새로 만드는 이야기부터 적용됩니다"
            : "한 사람(나레이터)이 이야기 전체를 읽어 줍니다. 새로 만드는 이야기부터 적용됩니다"}>
          <span className="seg">
            {([["narration", "나레이션만"], ["characters", "캐릭터 목소리"]] as [VoiceMode, string][]).map(([v, label]) => (
              <button key={v} className={s.voiceMode === v ? "on" : ""}
                onClick={() => s.set("voiceMode", v)}>{label}</button>
            ))}
          </span>
        </Row>
        {s.voiceMode === "characters" && (
          <Row name="주인공 목소리" desc="아이가 그린 주인공의 대사를 읽을 목소리입니다. 다른 인물은 엄마 · 할머니 · 동물처럼 종류에 맞춰 정해집니다">
            <span className="seg">
              {([["girl", "여자아이"], ["boy", "남자아이"]] as [ProtagonistVoice, string][]).map(([v, label]) => (
                <button key={v} className={s.protagonistVoice === v ? "on" : ""}
                  onClick={() => s.set("protagonistVoice", v)}>{label}</button>
              ))}
            </span>
          </Row>
        )}

        <Head id="sound" name="소리" />
        <Row name="소리 전체 끄기" desc="모든 음성과 효과음을 끕니다. 교실에서 쓸 때 켜세요">
          <input type="checkbox" checked={s.muteAll}
            onChange={(e) => s.set("muteAll", e.target.checked)}
            className="tog" />
        </Row>
        {/* 「어른과 함께」 묶음 (pt_docs 03 F-SET-06, 01 NFR-15). 위험이 따르는 기능은 로그인한 보호자만 켠다.
            설계는 「로그인 후 아이 프로필 설정」에 두는 것이고, 아이 프로필(F-ACC-07)이 아직 없어 그때까지 여기 둔다.
            로그인하지 않았으면 설정값과 상관없이 꺼진 것으로 본다 (store/settings.ts useWithAdult) */}
        <Head id="adult" name="어른과 함께"
          desc={mode === "member"
            ? "위험이 따를 수 있는 기능입니다. 켜면 아이 화면에 버튼이 생기고, 꺼 두면 버튼 자체가 보이지 않습니다. 아이 곁에서 함께 써 주세요"
            : "로그인한 보호자만 켤 수 있습니다. 로그인하지 않으면 아래 기능은 모두 꺼져 있습니다"}>
          {mode !== "member" && <button className="btn link" onClick={() => nav("/login")}>로그인</button>}
        </Head>
        <Row name="사진으로 그림 올리기"
          desc="종이에 그린 그림을 찍거나 앨범에서 고를 수 있습니다. 사람 사진이나 남이 그린 그림이 올라와도 자동으로 가려내지 못하니, 직접 그린 그림인지 함께 확인해 주세요. 끄면 화면에 그리기만 남습니다">
          <input type="checkbox" checked={mode === "member" && s.photoUpload} disabled={mode !== "member"}
            onChange={(e) => s.set("photoUpload", e.target.checked)}
            className="tog" />
        </Row>
        {/* 아이 목소리는 개인정보다. 어디로 가는지 켜는 사람이 알고 켠다 */}
        <Row name="목소리로 덧붙이기"
          desc={voiceSupported()
            ? "이야기를 만들 때 아이가 마이크로 한마디 덧붙일 수 있습니다. 목소리는 이 브라우저의 음성 인식 서버(브라우저 회사)로 보내져 글자로 바뀌고, 그 글자는 이야기를 만드는 외부 AI 로 갑니다. 녹음 파일은 저장하지 않습니다"
            : "이 브라우저는 음성 인식을 지원하지 않습니다. 크롬이나 사파리에서 켤 수 있습니다"}>
          <input type="checkbox" checked={mode === "member" && s.voiceInput} disabled={mode !== "member" || !voiceSupported()}
            onChange={(e) => s.set("voiceInput", e.target.checked)}
            className="tog" />
        </Row>
        <Head id="info" name="기록 · 안내" />
        <Row name="원본 그림 보관" desc="끄면 그 그림을 다 쓰고 나갈 때(처음으로 · 새 그림 · 탭 닫기) 서버에서 지웁니다. 늦어도 하루 뒤에는 지웁니다. 관절과 만든 이야기는 남습니다">
          <input type="checkbox" checked={s.keepOriginal}
            onChange={(e) => s.set("keepOriginal", e.target.checked)}
            className="tog" />
        </Row>
        <Row name="진단 모드" desc="화면에 단계명과 소요 시간, 사용된 엔진 이름을 표시합니다">
          <input type="checkbox" checked={s.diagnostics}
            onChange={(e) => s.set("diagnostics", e.target.checked)}
            className="tog" />
        </Row>

        {/* AI 생성 표시 (인공지능기본법 제31조, 2026-01-22 시행). 어른 화면이라 분명하게 적는다.
            아이 화면(S-09)에는 쉬운 말로 둔다 */}
        <Row name="AI 생성 안내"
          desc="이야기 문장과 읽어 주는 음성, 움직이는 영상은 AI 가 만듭니다. 아이가 고른 네 칸과 말한 내용을 바탕으로 만들며, 아이 그림은 외부로 보내지 않습니다">
          <span className="hint">알림</span>
        </Row>

        {stories.length > 0 && <Head id="mine" name="만든 이야기" desc="지우면 되돌릴 수 없습니다" />}
        {stories.map((st) => (
          <Row key={st.storyId} name={st.title} desc={`${st.createdAt}에 만들었어요`}>
            <button className="btn link" style={{ color: "var(--berry)" }}
              onClick={() => { if (confirm("이 이야기를 지울까요?")) remove(st.storyId); }}>
              삭제
            </button>
          </Row>
        ))}
      </div>
    </Screen>
  );
}
