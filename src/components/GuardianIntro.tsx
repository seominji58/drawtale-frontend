import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import BigButton from "./BigButton";
import { useGuardian } from "@/store/guardian";
import { useChildren } from "@/store/children";
import { ApiError, createChild, prettyNumber, setUseMode, type ChildSummary, type UseMode } from "@/api";
import { pendingJoin } from "@/features/family/join";

/** 처음 가입한 어른에게 (pt_docs 20 3-2-1 튜토리얼 2026-11-06, 보호자 · 선생님 설계 4장 2026-11-18).
 *  ① 「어떻게 쓰실 건가요?」 집(보호자) · 학교(교사) · 둘 다 → ② 고른 것에 맞춘 카드 → ③ 보호자 기능 소개 · 비밀번호.
 *  본 것은 계정(서버 onboarded)과 기기에 기억한다. 예전 계정(이미 본 사람)은 ① 질문만 한 번 묻는다.
 *  선생님 링크로 들어온 사람은 묻지 않는다 (링크 창이 「집에서」로 정한다). 어른이 읽는 카드라 어른 화면 크기, 움직임 없음 */

const INTRO_PAGES: { head: string; lines: string[] }[] = [
  {
    head: "한칸이야기로 할 수 있는 것",
    lines: [
      "아이가 그린 친구가 이야기의 주인공이 됩니다",
      "아이가 장소 · 문제 · 행동 · 결과 카드를 고르면 그림책이 만들어집니다",
      "그림책은 소리 내어 읽어 주고, 친구 그림이 장면 안에서 움직입니다",
    ],
  },
  {
    head: "보호자만 쓰는 기능",
    lines: [
      "📷 종이에 그린 그림을 사진으로 올리기",
      "🎤 아이가 말로 이야기 보태기",
      "🗣 보호자 목소리로 이야기 읽어 주기",
      "✏️ 내 소품 그리기 · 책장 제목 바꾸기 · 지우기",
      "아이 화면에서는 🔒 표시로 보이고, 보호자 비밀번호를 넣어야 열립니다",
    ],
  },
  {
    head: "보호자 비밀번호",
    lines: [
      "오른쪽 위 톱니(설정)는 아이도 열 수 있어요. 소리 · 이야기 길이처럼 아이가 바꿔도 되는 것만 열려 있습니다",
      "「보호자 칸」과 🔒 기능은 숫자 4자리 비밀번호로 엽니다",
      "비밀번호는 계정에 저장되어 다른 기기에서도 같습니다. 잊으면 다시 로그인해서 새로 정합니다",
    ],
  },
];

/** 학교에서 쓰기 전 확인 두 가지에 붙이는 가정통신문 동의서 양식 (public/forms) */
export const CONSENT_FORM_URL = `${import.meta.env.BASE_URL}forms/school-consent.html`;

export default function GuardianIntro() {
  useLocation();   // 링크(/join)로 맡긴 코드가 생기거나 없어지면 다시 그린다
  // 본인인증(AgeGate)이 먼저, 선생님 링크 창(JoinDialog)이 먼저다
  const status = useGuardian((s) => s.status);
  const intro = useGuardian((s) => s.intro);
  if (!status || status.ageVerified === false || pendingJoin()) return null;
  const askMode = status.useMode == null;
  if (!intro && !askMode) return null;
  return <Cards onlyAsk={!intro} />;
}

type Step = { key: string; body: ReactNode; next?: () => Promise<boolean> | boolean; nextLabel?: string };

function Cards({ onlyAsk }: { onlyAsk: boolean }) {
  const { closeIntro, ask, status, useModeChosen } = useGuardian();
  const { list, load, setActive } = useChildren();
  const [mode, setMode] = useState<UseMode | null>(status?.useMode ?? null);
  // 「소개 다시 보기」로 연 사람은 이미 고른 것이 있으니 질문 다음부터
  const [i, setI] = useState(status?.useMode && !onlyAsk ? 1 : 0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 집: 아이 별명
  const [nick, setNick] = useState("");
  // 학교: 확인 두 가지 · 추가한 아이
  const [selected, setSelected] = useState(false);
  const [consent, setConsent] = useState(false);
  const [kidName, setKidName] = useState("");
  const [added, setAdded] = useState<ChildSummary[]>([]);
  useEffect(() => { void load(); }, [load]);

  const myKid = list.find((k) => k.relation === "guardian");
  const needPin = status?.pinSet === false;

  const choose = async (m: UseMode) => {
    setBusy(true);
    try { await setUseMode(m); } catch { /* 저장 못 해도 이 기기에서는 진행, 다음에 다시 묻는다 */ }
    useModeChosen(m);
    setMode(m);
    setBusy(false);
    if (onlyAsk) closeIntro(); else setI(1);
  };

  const addSchoolKid = async () => {
    setBusy(true); setMsg(null);
    try {
      const kid = await createChild({ asTeacher: true, nickname: kidName.trim() || undefined, schoolSelected: selected, writtenConsent: consent });
      setAdded((a) => [...a, kid]);
      setKidName("");
      setActive(kid.id);
      await load();
    } catch (e) {
      const code = e instanceof ApiError ? e.serverCode : "";
      setMsg(code === "SCHOOL_CHECK_REQUIRED" ? "학교 확인 두 가지를 먼저 체크해 주세요." : "아이를 추가하지 못했습니다. 다시 해 주세요.");
    }
    setBusy(false);
  };

  const steps: Step[] = [{
    key: "ask",
    body: (
      <>
        <p className="rename-label">한칸이야기를 어떻게 쓰실 건가요?</p>
        <div className="intro-choices">
          <button className="intro-choice" disabled={busy} onClick={() => void choose("home")}>
            <b>🏠 집에서 우리 아이와 <span>(보호자)</span></b>아이가 그린 그림으로 함께 이야기를 만들어요
          </button>
          <button className="intro-choice" disabled={busy} onClick={() => void choose("school")}>
            <b>🏫 학교 · 기관에서 아이들과 <span>(교사)</span></b>선생님 · 치료사가 여러 아이와 함께 써요
          </button>
          <button className="intro-choice" disabled={busy} onClick={() => void choose("both")}>
            <b>둘 다예요 <span>(장소에 상관없이)</span></b>우리 아이도 있고, 학교에서도 아이들과 써요
          </button>
        </div>
        <p className="intro-note">나중에 설정에서 바꿀 수 있어요</p>
      </>
    ),
  }];

  if (mode === "home" || mode === "both") {
    steps.push({
      key: "kid",
      body: (
        <>
          <p className="rename-label">아이를 만들어 주세요</p>
          <ul className="intro-lines">
            <li>아이를 부를 이름(별명)을 정해요. 진짜 이름이 아니어도 괜찮아요</li>
            <li>아이가 그린 그림 · 만든 이야기는 계정이 아니라 이 아이에게 저장돼요</li>
          </ul>
          {myKid
            ? <p className="intro-note">{myKid.icon} {myKid.nickname ?? "우리 아이"} 가 이미 있어요</p>
            : <input className="title-input" placeholder="예: 민지 (건너뛰어도 돼요)" maxLength={20} value={nick}
                aria-label="아이 별명" onChange={(e) => setNick(e.target.value)} />}
        </>
      ),
      next: async () => {
        if (myKid) return true;
        try { const kid = await createChild({ nickname: nick.trim() || undefined }); setActive(kid.id); await load(); return true; }
        catch { setMsg("아이를 만들지 못했습니다. 다시 해 주세요."); return false; }
      },
    });
    steps.push({
      key: "school-too",
      body: (
        <>
          <p className="rename-label">학교에서도 쓰고 있나요?</p>
          <ul className="intro-lines">
            <li>선생님이 보낸 연결 링크가 있으면 그 링크를 열어 주세요. 학교에서 만든 이야기가 여기 책장에도 보여요</li>
            <li>선생님께 우리 아이 번호를 알려 드려도 돼요: <b className="intro-number">{prettyNumber(useChildren.getState().list.find((k) => k.relation === "guardian")?.number)}</b></li>
            <li>선생님은 학교에서 만든 것만 봐요. 집에서 만든 것은 설정에서 보호자님이 켜야 보여요</li>
            {mode === "both" && <li>학교에서 쓰실 때는 설정 → 아이 · 연결에서 아이를 추가하세요 (학교 확인 2가지를 함께 해요)</li>}
          </ul>
        </>
      ),
    });
  }
  if (mode === "school") {
    steps.push({
      key: "checks",
      body: (
        <>
          <p className="rename-label">학교에서 쓰기 전에 두 가지를 확인해 주세요</p>
          <label className="intro-check"><input type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} />
            학교가 한칸이야기를 학습지원 소프트웨어로 선정했어요 (학교운영위원회 심의)</label>
          <label className="intro-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            보호자 서명 동의서를 받았어요 (만 14세 미만 아동)</label>
          <p className="intro-note"><a href={CONSENT_FORM_URL} target="_blank" rel="noreferrer">가정통신문 동의서 양식 내려받기</a> · 동의서 원본은 학교에서 보관해 주세요</p>
          <p className="intro-note">둘 중 하나라도 아니면, 보호자께 직접 가입을 부탁해 주세요. 보호자가 가입한 뒤 아이 번호를 알려 주시면 그 아이에 연결할 수 있어요</p>
        </>
      ),
      next: () => {
        if (selected && consent) return true;
        setMsg("두 가지를 모두 확인해야 아이를 추가할 수 있습니다.");
        return false;
      },
    });
    steps.push({
      key: "add",
      body: (
        <>
          <p className="rename-label">아이를 추가해요</p>
          <ul className="intro-lines">
            <li>별명이나 번호(예: 3번)로 추가해요. 이름 · 사진은 받지 않아요</li>
            <li>집에서 이미 쓰는 아이면 나중에 설정에서 보호자께 받은 아이 번호로 붙일 수 있어요</li>
          </ul>
          <form className="intro-row" onSubmit={(e) => { e.preventDefault(); void addSchoolKid(); }}>
            <input className="title-input" placeholder="예: 3번" maxLength={20} value={kidName} aria-label="아이 별명"
              onChange={(e) => setKidName(e.target.value)} />
            <button type="submit" className="btn link" disabled={busy}>추가</button>
          </form>
          {added.length > 0 && <p className="intro-note">추가함: {added.map((k) => `${k.icon ?? ""} ${k.nickname ?? "이름 없음"}`).join(", ")}</p>}
        </>
      ),
    });
    steps.push({
      key: "link",
      body: (
        <>
          <p className="rename-label">보호자께 연결 링크를 보내 주세요</p>
          <ul className="intro-lines">
            <li>설정 → 아이 · 연결에서 아이마다 「링크 복사」를 눌러 알림장으로 보내요</li>
            <li>링크를 받은 보호자는 학교에서 만든 이야기를 집에서도 볼 수 있어요</li>
            <li>보내지 않아도, 보호자가 바로 열지 않아도 교실에서는 그대로 쓸 수 있어요</li>
          </ul>
        </>
      ),
    });
  }
  for (const page of INTRO_PAGES) {
    steps.push({ key: page.head, body: <><p className="rename-label">{page.head}</p><ul className="intro-lines">{page.lines.map((l) => <li key={l}>{l}</li>)}</ul></> });
  }

  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const done = () => {
    if (needPin) { ask("보호자 비밀번호 만들기", closeIntro); return; }
    closeIntro();
  };
  const go = async () => {
    setMsg(null);
    if (step.next) { setBusy(true); const ok = await step.next(); setBusy(false); if (!ok) return; }
    if (last) done(); else setI(i + 1);
  };

  return (
    <div className="rename-layer" data-audience="adult" role="dialog" aria-modal="true" aria-label="처음 시작하기">
      <div className="paper-card rename-card intro-card">
        {i > 0 && <p className="intro-step">{i} / {steps.length - 1}</p>}
        {step.body}
        {msg && <p className="hint" role="status">{msg}</p>}
        {i > 0 && (
          <div className="rename-acts">
            {i > 1 ? <BigButton onClick={() => setI(i - 1)}>이전</BigButton>
              : <BigButton onClick={closeIntro}>건너뛰기</BigButton>}
            <BigButton go disabled={busy} onClick={() => void go()}>
              {!last ? "다음" : needPin ? "비밀번호 만들기" : "시작하기"}
            </BigButton>
          </div>
        )}
      </div>
    </div>
  );
}
