import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import ConfirmCard from "@/components/ConfirmCard";
import { useSettings, useWithAdult, FIXED_LEVEL } from "@/store/settings";
import { useAuth } from "@/store/auth";
import { TITLE_MAX, useLibrary } from "@/store/library";
import type { ProtagonistVoice, StoryLength, SupportLevel, VoiceMode } from "@/types/story";
import { voiceSupported } from "@/features/story/voice";
import { deleteAccount, deleteMyVoice, getMyVoice, voiceSampleUrl } from "@/api";
import type { VoiceKind } from "@/api";
import { SPEECH_RATES } from "@/lib";
import { useGuardian } from "@/store/guardian";
import { resetCoach } from "@/components/Coach";
import { LockIcon } from "@/components/Screen";
import type { GuardianVoice } from "@/api";

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

/** 이야기 제목 길이 (책장 책등에 들어가는 만큼) */

/** 바로가기 칩. 설정이 길어 폰 · 태블릿 · 컴퓨터 어디서든 원하는 묶음으로 바로 간다 (10/28 사용자 「스크롤 방식 고민」) */
/** 아이 칸(잠금 없음)이 먼저, 보호자 칸(비밀번호)이 뒤 (pt_docs 20 3-2, 2026-11-06) */
const SECTIONS: [string, string][] = [
  ["story", "이야기"], ["sound", "소리"], ["guardian", "보호자"], ["account", "계정"], ["info", "기록"], ["mine", "만든 이야기"],
];
/** 보호자 칸을 열기 전에도 무엇이 있는지는 보인다 (숨기지 않고 잠그기) */
const GUARDIAN_ITEMS = [
  "보호자 모드 켜기 · 끄기", "사진으로 그림 올리기 · 말로 이야기 보태기 · 읽어 주는 목소리",
  "원본 그림 보관 · 진단 모드", "만든 이야기 제목 고치기 · 지우기", "로그인 · 로그아웃 · 계정 탈퇴 · 비밀번호 바꾸기",
];

export default function S13Settings() {
  const nav = useNavigate();
  // 아이 화면 어디서든 톱니로 들어온다(components/SettingsKey) — 닫으면 그 화면으로 돌아간다. 없으면 처음 화면.
  // 닫으면 열어 둔 보호자 칸도 잠근다 (한 번 풀면 설정을 닫을 때까지)
  const from = (useLocation().state as { from?: string } | null)?.from;
  const { unlocked, ask: askPin, change, lock, openIntro, status: pinStatus } = useGuardian();
  const close = () => { lock(); nav(from && from !== "/settings" ? from : "/"); };
  const openGuardian = () => askPin(pinStatus?.pinSet === false ? "보호자 비밀번호 만들기" : "보호자 칸 열기", () => undefined, { keep: true });
  const [coachReset, setCoachReset] = useState(false);
  const s = useSettings();
  const { guardian } = useWithAdult();
  const { mode, account, logout } = useAuth();
  const { stories, remove, rename } = useLibrary();
  /** 제목을 고치는 중인 이야기와 그 글 (로그인한 보호자만) */
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const saveTitle = () => {
    const t = editing?.title.trim().slice(0, TITLE_MAX);
    if (editing && t) rename(editing.id, t);
    setEditing(null);
  };
  const listRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState("account");
  // 보호자 목소리 상태 (로그인했을 때만 서버에 묻는다). null 이면 아직 모름
  const [myVoice, setMyVoice] = useState<GuardianVoice | null>(null);
  // 아이 목소리 상태 (2026-11-09 시연용)
  const [kidVoice, setKidVoice] = useState<GuardianVoice | null>(null);
  // 목소리 들어 보기 — 재생 중인 쪽 · 실패 안내
  const [sampling, setSampling] = useState<VoiceKind | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const hear = async (kind: VoiceKind) => {
    setSampling(kind); setSampleError(null);
    try {
      const url = await voiceSampleUrl(kind);
      if (!url) { setSampling(null); return; }
      const a = new Audio(url);
      a.onended = a.onerror = () => { URL.revokeObjectURL(url); setSampling(null); };
      await a.play();
    } catch {
      setSampleError("목소리를 들려주지 못했어요. 잠시 뒤에 다시 해 주세요.");
      setSampling(null);
    }
  };
  useEffect(() => {
    if (mode !== "member") { setMyVoice(null); setKidVoice(null); return; }
    let alive = true;
    getMyVoice().then((v) => { if (alive) setMyVoice(v); }).catch(() => { if (alive) setMyVoice(null); });
    getMyVoice("child").then((v) => { if (alive) setKidVoice(v); }).catch(() => { if (alive) setKidVoice(null); });
    return () => { alive = false; };
  }, [mode]);
  // 되돌릴 수 없는 일은 화면 안 카드로 한 번 묻는다 (브라우저 확인 창 대신, 11/3 사용자)
  const [ask, setAsk] = useState<{ kind: "voice" } | { kind: "childVoice" } | { kind: "story"; id: string; title: string } | { kind: "account" } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const forgetVoice = async () => {
    setWorking(true);
    try {
      await deleteMyVoice();
      s.set("guardianNarrator", false);
      setMyVoice((v) => (v ? { ...v, registered: false, consentedAt: null } : v));
      setAsk(null);
    } catch { setAsk(null); setNotice("지우지 못했습니다. 인터넷 연결을 확인하고 다시 해 주세요."); }
    finally { setWorking(false); }
  };
  const forgetKidVoice = async () => {
    setWorking(true);
    try {
      await deleteMyVoice("child");
      s.set("childNarrator", false);
      setKidVoice((v) => (v ? { ...v, registered: false, consentedAt: null } : v));
      setAsk(null);
    } catch { setAsk(null); setNotice("지우지 못했습니다. 인터넷 연결을 확인하고 다시 해 주세요."); }
    finally { setWorking(false); }
  };
  /** 로그아웃하면 「어른과 함께」 기능도 끈다. 다음에 들고 있는 사람이 보호자라는 보장이 없다 */
  const signOut = () => { s.set("guardianMode", false); s.set("photoUpload", false); s.set("voiceInput", false); s.set("guardianNarrator", false); s.set("childNarrator", false); logout(); };
  /** 계정 탈퇴: 서버에서 다 지운 뒤 이 기기의 이야기 목록 · 내 소품 · 그 계정 설정도 지우고 처음 화면으로 */
  const withdraw = async () => {
    setWorking(true);
    try {
      await deleteAccount();
      for (const k of ["storyblanks.stories", "storyblanks.myprops", "storyblanks.consents"]) {
        try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch { /* 없어도 된다 */ }
      }
      signOut();
      setAsk(null);
      nav("/welcome", { replace: true });
    } catch { setAsk(null); setNotice("탈퇴하지 못했습니다. 인터넷 연결을 확인하고 다시 해 주세요."); }
    finally { setWorking(false); }
  };

  // 지금 보고 있는 묶음을 칩에 표시한다: 목록 맨 위를 지난 마지막 머리.
  // 머리가 위에 붙어 있어(sticky) IntersectionObserver 로는 늘 「보이는」 것으로 나와 스크롤 위치로 센다.
  // 칩을 눌러 가는 동안은 누른 칩만 켜 둔다 — 지나가는 묶음 칩이 차례로 깜빡였다 (11/3 사용자 「카테고리 버튼이 이상하게」)
  const jumping = useRef<number>(0);
  const spacer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const onScroll = () => {
      if (jumping.current) return;
      const heads = [...root.querySelectorAll<HTMLElement>("[data-section]")];
      const top = root.scrollTop + 12;
      const passed = heads.filter((h) => h.offsetTop <= top);
      const now = passed[passed.length - 1] ?? heads[0];
      if (now) setCurrent(now.dataset.section!);
    };
    // 마지막 묶음도 맨 위까지 올라오게 끝에 빈 칸을 둔다 — 없으면 끝 근처 묶음(기록 · 안내)은 위로 못 와서
    // 그 칩을 눌러도 · 휠로 내려도 다른 칩이 켜졌다
    const fit = () => {
      const sp = spacer.current, heads = root.querySelectorAll<HTMLElement>("[data-section]");
      const last = heads[heads.length - 1];
      if (!sp || !last) return;
      sp.style.height = "0px";
      const tail = root.scrollHeight - last.offsetTop;
      sp.style.height = `${Math.max(0, root.clientHeight - tail)}px`;
      onScroll();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(root);
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); root.removeEventListener("scroll", onScroll); };
  }, [stories.length]);

  const jump = (id: string) => {
    const root = listRef.current, el = document.getElementById(`set-${id}`);
    if (!root || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCurrent(id);
    // 다 갈 때까지 스크롤 표시를 멈춘다 (scrollend 가 없는 브라우저는 잠깐 뒤)
    window.clearTimeout(jumping.current);
    jumping.current = window.setTimeout(() => { jumping.current = 0; }, reduce ? 50 : 900);
    const done = () => { window.clearTimeout(jumping.current); jumping.current = 0; root.removeEventListener("scrollend", done); };
    root.addEventListener("scrollend", done);
    root.scrollTo({ top: el.offsetTop, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <Screen back={close} speech={null} title="설정" audience="adult" autoSpeak={false}
      acts={<BigButton onClick={close}>닫기</BigButton>}>
      <nav className="set-nav" aria-label="설정 묶음 바로가기">
        {SECTIONS.filter(([id]) => unlocked ? id !== "mine" || stories.length > 0 : !["account", "info", "mine"].includes(id)).map(([id, label]) => (
          <button key={id} className={current === id ? "on" : ""} aria-current={current === id} onClick={() => jump(id)}>{label}</button>
        ))}
      </nav>
      {/* 터치 · 휠 · 트랙패드 · 스크롤 막대 · 키보드(눌러서 고른 뒤 화살표 · Page Down) 모두로 내린다 */}
      {ask?.kind === "voice" && (
        <ConfirmCard title="등록한 목소리를 지울까요?" yes="지우기" busy={working}
          onYes={() => void forgetVoice()} onNo={() => setAsk(null)}>
          <p className="hint">이 목소리로 만든 이야기 음성도 함께 지워집니다.</p>
        </ConfirmCard>
      )}
      {ask?.kind === "childVoice" && (
        <ConfirmCard title="등록한 아이 목소리를 지울까요?" yes="지우기" busy={working}
          onYes={() => void forgetKidVoice()} onNo={() => setAsk(null)}>
          <p className="hint">이 목소리로 만든 이야기 음성도 함께 지워집니다.</p>
        </ConfirmCard>
      )}
      {ask?.kind === "story" && (
        <ConfirmCard title={`「${ask.title}」 이야기를 지울까요?`} yes="지우기"
          onYes={() => { remove(ask.id); setAsk(null); }} onNo={() => setAsk(null)}>
          <p className="hint">이 기기의 책장에서 사라집니다.</p>
        </ConfirmCard>
      )}
      {ask?.kind === "account" && (
        <ConfirmCard title="계정을 탈퇴할까요?" yes={working ? "지우는 중" : "탈퇴하기"} busy={working}
          onYes={() => void withdraw()} onNo={() => setAsk(null)}>
          <p className="hint">이 계정의 그림 · 이야기 · 음성 · 영상 · 등록한 목소리가 모두 지워지고 되돌릴 수 없습니다.</p>
        </ConfirmCard>
      )}
      {notice && <ConfirmCard title={notice} yes="확인" no={null} onYes={() => setNotice(null)} onNo={() => setNotice(null)} />}
      <div className="list scroll set-list" ref={listRef} tabIndex={0} aria-label="설정 목록">
        {/* 지원 수준은 고정 (FIXED_LEVEL, open-decisions 0-12). null 이면 다시 보인다 */}
        {!FIXED_LEVEL && <Row name="지원 수준" desc="아동의 사용을 돕는 수준을 선택하세요">
          <span className="seg">
            {[1, 2, 3].map((n) => (
              <button key={n} className={s.level === n ? "on" : ""}
                onClick={() => s.set("level", n as SupportLevel)}>{n}</button>
            ))}
          </span>
        </Row>}

        {/* ── 아이 칸: 잠금 없음. 아이가 바꿔도 되는 것만 (pt_docs 20 3-2) ── */}
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
        <Row name="읽어주기 빠르기" desc="이야기와 화면 안내를 읽는 빠르기입니다. 이야기 보기 화면에서도 바꿀 수 있습니다">
          <span className="seg">
            {SPEECH_RATES.map(([label, v]) => (
              <button key={label} className={s.speechRate === v ? "on" : ""} onClick={() => s.set("speechRate", v)}>{label}</button>
            ))}
          </span>
        </Row>
        {/* 지금 나레이션을 누구 목소리로 읽는지 한눈에 (11/9 사용자 「어떤 걸로 선택됐는지 어떻게 확인하냐」).
            나레이터는 하나만 — 아래 두 스위치 중 켜진 것. 둘 다 꺼져 있으면 기본 나레이터 */}
        <Row name="지금 읽어 주는 목소리"
          desc={mode !== "member" ? "로그인하면 보호자 · 아이 목소리를 고를 수 있습니다"
            : "새로 만드는 이야기부터 이 목소리로 읽습니다. 바꾸려면 보호자 칸의 「읽어 주는 목소리」에서 고르세요 (이 기기에 저장)"}>
          <strong style={{ whiteSpace: "nowrap" }}>
            {guardian && s.childNarrator && kidVoice?.registered ? "아이 목소리"
              : guardian && s.guardianNarrator && myVoice?.registered ? "보호자 목소리"
              : "기본 나레이터"}
          </strong>
        </Row>
        <Row name="화면 안내 다시 보기" desc="화면마다 처음 한 번 나오는 말풍선 도움말을 다시 보여 줍니다">
          <button className="btn link" disabled={coachReset} onClick={() => { resetCoach(); setCoachReset(true); }}>
            {coachReset ? "다시 보여 줄게요" : "다시 보기"}
          </button>
        </Row>
        {/* AI 생성 표시 (인공지능기본법 제31조, 2026-01-22 시행). 어른 화면이라 분명하게 적는다.
            아이 화면(S-09)에는 쉬운 말로 둔다 */}
        <Row name="AI 생성 안내"
          desc="이야기 문장과 읽어 주는 음성, 움직이는 영상은 AI 가 만듭니다. 아이가 고른 네 칸과 말한 내용을 바탕으로 만들며, 아이 그림은 외부로 보내지 않습니다">
          <span className="hint">알림</span>
        </Row>

        {/* ── 보호자 칸: 보호자 비밀번호로 연다. 열기 전에도 무엇이 있는지는 보인다 ── */}
        {unlocked ? <>
        {/* 「어른과 함께」 묶음 (pt_docs 03 F-SET-06, 01 NFR-15). 위험이 따르는 기능은 로그인한 보호자만 켠다.
            설계는 「로그인 후 아이 프로필 설정」에 두는 것이고, 아이 프로필(F-ACC-07)이 아직 없어 그때까지 여기 둔다.
            로그인하지 않았으면 설정값과 상관없이 꺼진 것으로 본다 (store/settings.ts useWithAdult) */}
        <Head id="guardian" name="보호자 기능"
          desc="위험이 따를 수 있는 기능입니다. 켜면 아이 화면에서 바로 쓰고, 꺼 두면 아이 화면에 🔒 로 보입니다(누르면 보호자 비밀번호). 아이 곁에서 함께 써 주세요">
          <button className="btn link" onClick={lock}>보호자 칸 잠그기</button>
        </Head>
        {/* 보호자 모드 켜기 · 끄기 (2026-11-03 사용자). 끄면 아래 기능 · 내 소품이 모두 꺼진 것으로 본다(켜 둔 값은 남는다).
            켜면 S-05 에서 관절이 정상이어도 보호자가 판단해 고칠 수 있다 */}
        <Row name="보호자 모드"
          desc={mode !== "member" ? "로그인한 보호자만 켤 수 있습니다"
            : guardian ? "켜져 있습니다. 아래 기능 · 내 소품을 쓸 수 있고, 캐릭터 확인(S-05)에서 관절을 언제든 고칠 수 있습니다"
            : "꺼져 있습니다. 아이 혼자 쓰는 기본 화면입니다. 아래 기능과 내 소품은 아이 화면에 🔒 로 보입니다"}>
          <input type="checkbox" className="tog" checked={guardian} disabled={mode !== "member"}
            onChange={(e) => s.set("guardianMode", e.target.checked)} />
        </Row>
        <Row name="사진으로 그림 올리기"
          desc="종이에 그린 그림을 찍거나 앨범에서 고를 수 있습니다. 사람 사진이나 남이 그린 그림이 올라와도 자동으로 가려내지 못하니, 직접 그린 그림인지 함께 확인해 주세요. 끄면 화면에 그리기만 남습니다">
          <input type="checkbox" checked={guardian && s.photoUpload} disabled={!guardian}
            onChange={(e) => s.set("photoUpload", e.target.checked)}
            className="tog" />
        </Row>
        {/* 아이 목소리는 개인정보다. 어디로 가는지 켜는 사람이 알고 켠다 */}
        {/* 11/9 이름 바꿈 (「목소리로 덧붙이기」) — 실제로는 아이 말을 넣어 이야기를 이어 만드는 기능이라 헷갈렸다 */}
        <Row name="말로 이야기 보태기"
          desc={voiceSupported()
            ? "이야기를 만들 때 아이가 마이크로 한마디 하면, 그 말을 넣어 이야기를 이어 만듭니다. 목소리는 이 브라우저의 음성 인식 서버(브라우저 회사)로 보내져 글자로 바뀌고, 그 글자는 이야기를 만드는 외부 AI 로 갑니다. 녹음 파일은 저장하지 않습니다"
            : "이 브라우저는 음성 인식을 지원하지 않습니다. 크롬이나 사파리에서 켤 수 있습니다"}>
          <input type="checkbox" checked={guardian && s.voiceInput} disabled={!guardian || !voiceSupported()}
            onChange={(e) => s.set("voiceInput", e.target.checked)}
            className="tog" />
        </Row>
        {/* 목소리 (11/9 다시 짬 — 사용자 「둘 다 녹음하면 무엇이 자동으로 쓰이는지 모르겠고, 녹음 결과도 못 들어 본다」).
            ① 읽어 주는 목소리를 한 줄에서 하나 고른다(기본 · 보호자 · 아이 — 등록한 것만 고를 수 있다).
            ② 목소리마다 등록 · 들어 보기 · 다시 녹음 · 지우기. 새로 등록하면 그 목소리로 바뀐다(위 줄에 보인다).
            녹음은 저장하지 않아(ElevenLabs 로만 넘김) 원본 대신 그 목소리로 읽은 짧은 문장을 들려준다 */}
        <Row name="읽어 주는 목소리"
          desc={mode !== "member" ? "로그인한 보호자만 고를 수 있습니다"
            : "이야기 나레이션을 누구 목소리로 읽을지 하나 고릅니다. 등록한 목소리만 고를 수 있고, 새로 만드는 이야기부터 적용됩니다"}>
          <span className="seg">
            {([["default", "기본"], ["guardian", "보호자"], ["child", "아이"]] as const).map(([k, label]) => {
              const on = k === "child" ? s.childNarrator && !!kidVoice?.registered
                : k === "guardian" ? s.guardianNarrator && !s.childNarrator && !!myVoice?.registered
                : !(s.childNarrator && kidVoice?.registered) && !(s.guardianNarrator && myVoice?.registered);
              const can = k === "default" || (guardian && (k === "child" ? !!kidVoice?.registered : !!myVoice?.registered));
              return (
                <button key={k} className={on ? "on" : ""} disabled={!can}
                  onClick={() => { s.set("guardianNarrator", k === "guardian"); s.set("childNarrator", k === "child"); }}>{label}</button>
              );
            })}
          </span>
        </Row>
        {([["guardian", "보호자 목소리", myVoice, "/voice",
            "보호자님이 1~3분 글을 읽어 녹음하면, 이야기 나레이션을 그 목소리로 읽어 드립니다. 등록 전에 동의 내용을 안내합니다"],
           ["child", "아이 목소리", kidVoice, "/child-voice",
            "보호자님 동의 아래 아이가 30초~3분 짧은 글을 읽어 녹음하면, 이야기 나레이션을 아이 목소리로 읽어 줍니다 (시연용)"]] as const)
          .map(([kind, label, v, path, intro]) => (
          <Row key={kind} name={label}
            desc={mode !== "member" ? "로그인한 보호자만 쓸 수 있습니다"
              : v?.registered ? `${v.consentedAt?.slice(0, 10) ?? ""} 등록. 녹음 파일은 저장하지 않아, 들어 보기는 이 목소리로 읽은 짧은 문장입니다. 다시 녹음하면 예전 목소리는 지워지고, 지우면 동의를 거둬들인 것으로 기록합니다`
              : v && !v.available ? "지금은 목소리를 등록할 수 없습니다" : intro}>
            {mode === "member" && v?.registered
              ? <span style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button className="btn link" disabled={sampling !== null} onClick={() => void hear(kind)}>
                    {sampling === kind ? "듣는 중…" : "들어 보기"}</button>
                  <button className="btn link" disabled={!guardian} onClick={() => nav(path)}>다시 녹음</button>
                  <button className="btn link" style={{ color: "var(--berry)" }}
                    onClick={() => setAsk({ kind: kind === "child" ? "childVoice" : "voice" })}>지우기</button>
                </span>
              : <button className="btn link" disabled={mode !== "member" || !guardian || !v?.available}
                  onClick={() => nav(path)}>등록하기</button>}
          </Row>
        ))}
        {sampleError && <p className="hint" role="status" style={{ padding: "0 20px" }}>{sampleError}</p>}
        <Head id="info" name="기록" />
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

        <Head id="account" name="계정" />
        <Row name="보호자 비밀번호" desc="보호자 칸과 아이 화면의 🔒 기능을 여는 숫자 4자리입니다. 잊으면 비밀번호 창의 「비밀번호를 잊었어요」로 다시 로그인해 새로 정합니다">
          <button className="btn link" onClick={change}>바꾸기</button>
        </Row>
        <Row name="보호자 소개 다시 보기" desc="처음 로그인했을 때 본 소개 카드 3장입니다">
          <button className="btn link" onClick={openIntro}>보기</button>
        </Row>
        <Row name="계정" desc={mode === "member" ? (account ?? "로그인됨") : "로그인 없이 사용 중입니다"}>
          <button className="btn link" onClick={mode === "member" ? signOut : () => nav("/login")}>
            {mode === "member" ? "로그아웃" : "로그인"}
          </button>
        </Row>
        {mode === "member" && (
          <Row name="계정 탈퇴" desc="그림 · 이야기 · 목소리가 모두 지워지고 되돌릴 수 없습니다">
            <button className="btn link" style={{ color: "var(--berry)" }} onClick={() => setAsk({ kind: "account" })}>탈퇴하기</button>
          </Row>
        )}

        </> : <>
        <div className="set-anchor" id="set-guardian" data-section="guardian" aria-hidden />
        <div className="item head"><span className="grow"><span className="name">보호자 칸</span></span></div>
        <div className="item set-locked">
          <span className="desc">보호자 비밀번호를 넣으면 열립니다. 한 번 열면 설정을 닫을 때까지 열려 있습니다.</span>
          <ul>{GUARDIAN_ITEMS.map((t) => <li key={t}>{t}</li>)}</ul>
          <button className="locked-feature" onClick={openGuardian}>
            <LockIcon />{pinStatus?.pinSet === false ? "보호자 비밀번호 만들기" : "보호자 비밀번호 넣기"}
          </button>
        </div>
        </>}
        {/* 제목 고치기 · 지우기는 로그인한 보호자만 (2026-11-02 사용자 「보호자 모드에서」, 「삭제도 보호자랑 같이」).
            아이가 혼자 지우지 않게. 로그인한 계정의 이야기만 보인다 */}
        {unlocked && stories.length > 0 && <Head id="mine" name="만든 이야기"
          desc={mode === "member" ? "제목을 고치거나 지울 수 있습니다. 지우면 되돌릴 수 없습니다"
            : "제목 고치기와 지우기는 로그인한 보호자만 할 수 있습니다"} />}
        {unlocked && stories.map((st) => (
          editing?.id === st.storyId
            ? <form key={st.storyId} className="item" onSubmit={(e) => { e.preventDefault(); saveTitle(); }}>
                <input className="title-input" value={editing.title} maxLength={TITLE_MAX} autoFocus
                  aria-label="이야기 제목" onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
                <button type="submit" className="btn link" disabled={!editing.title.trim()}>저장</button>
                <button type="button" className="btn link" onClick={() => setEditing(null)}>취소</button>
              </form>
            : <Row key={st.storyId} name={st.title} desc={`${st.createdAt}에 만들었어요`}>
                {mode === "member" && (
                  <span style={{ display: "flex", gap: 14 }}>
                    <button className="btn link" onClick={() => setEditing({ id: st.storyId, title: st.title })}>제목 고치기</button>
                    <button className="btn link" style={{ color: "var(--berry)" }}
                      onClick={() => setAsk({ kind: "story", id: st.storyId, title: st.title })}>
                      삭제
                    </button>
                  </span>
                )}
              </Row>
        ))}
        {/* 마지막 묶음도 맨 위까지 올라오게 하는 빈 칸 (높이는 위 fit) */}
        <div ref={spacer} aria-hidden />
      </div>
    </Screen>
  );
}
