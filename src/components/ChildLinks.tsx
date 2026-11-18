import { useEffect, useState, type ReactNode } from "react";
import {
  ApiError, attachChild, createChild, createGuardianLink, listMembers, prettyNumber, removeMember, renewChildNumber,
  setShareHome, updateChild, type ChildMemberInfo, type ChildSummary, type UseMode,
} from "@/api";
import { useChildren } from "@/store/children";
import { useGuardian } from "@/store/guardian";
import { useLibrary } from "@/store/library";
import { CONSENT_FORM_URL } from "./GuardianIntro";

/** 설정 어른 칸 맨 위 「아이 · 연결」 (설계 「보호자-교사-계정」 5장, 2026-11-18).
 *  원칙: ① 만들기는 그 자리의 동의로 바로 ② 보호자 쪽으로는 언제나 열림 ③ 선생님 쪽으로는 보호자가 열 때만 ④ 같은 아이는 한 책장.
 *  - 우리 아이(보호자): 아이 번호(선생님께 알려 주기) · 연결된 어른 · 집 공유 켜기 · 끊기 · 책장 학교/집 편수
 *  - 학교 아이(교사): 아이 추가(학교 확인 2가지) · 아이 번호로 붙이기 · 보호자 링크 복사 · 끝내기
 *  이름 · 이메일을 두지 않아 어른은 「보호자」 · 「선생님」으로만 보인다 */

function Row({ name, desc, children }: { name: ReactNode; desc: ReactNode; children?: ReactNode }) {
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

const FAIL: Record<string, string> = {
  SCHOOL_CHECK_REQUIRED: "학교 확인 두 가지를 모두 체크해 주세요.",
  NUMBER_INVALID: "아이 번호가 맞지 않습니다. 보호자님께 다시 확인해 주세요.",
  ALREADY_LINKED: "이미 연결된 아이입니다.",
  RATE_LIMITED: "잠시 뒤 다시 해 주세요.",
};
const failOf = (e: unknown, fallback: string) => FAIL[e instanceof ApiError ? e.serverCode ?? "" : ""] ?? fallback;
const nameOf = (k: ChildSummary) => k.nickname ?? (k.relation === "guardian" ? "우리 아이" : "이름 없음");
const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };

export default function ChildLinks() {
  const { list, load, setActive, active } = useChildren();
  const useMode: UseMode | null | undefined = useGuardian((s) => s.status?.useMode);
  const sync = useLibrary((s) => s.sync);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { void load(); }, [load]);

  const mine = list.filter((k) => k.relation === "guardian");
  const school = list.filter((k) => k.relation === "teacher");
  const showHome = useMode !== "school" || mine.length > 0;
  const showSchool = useMode === "school" || useMode === "both" || school.length > 0;
  const now = active();
  const refresh = async () => { await load(); void sync(); };

  return (
    <>
      <div className="item note"><span className="desc">
        그림 · 이야기는 아이의 것이에요. <b>보호자는 언제나 다 볼 수 있고</b>, 선생님은 학교에서 만든 것만 봐요 (집 공유를 켜면 집 것도).
      </span></div>
      {list.length > 1 && now && (
        <Row name="지금 아이" desc="이 기기에서 만드는 그림 · 이야기가 이 아이에게 저장되고, 책장에도 이 아이의 이야기가 보입니다">
          <select className="title-input" style={{ maxWidth: 220 }} value={now.id} aria-label="지금 아이"
            onChange={(e) => { setActive(e.target.value); void sync(); }}>
            {list.map((k) => <option key={k.id} value={k.id}>{k.icon} {nameOf(k)}{k.relation === "teacher" ? " (학교)" : ""}</option>)}
          </select>
        </Row>
      )}
      {showHome && <>
        <div className="item head sub"><span className="grow"><span className="name">🏠 우리 아이</span></span></div>
        {mine.map((k) => <HomeKid key={k.id} kid={k} onChange={refresh} setMsg={setMsg} />)}
        <AddHomeKid onAdded={async (k) => { await refresh(); if (!now) setActive(k.id); }} setMsg={setMsg} />
      </>}
      {showSchool && <SchoolKids kids={school} onChange={refresh} setMsg={setMsg} onAdded={(k) => { if (!now) setActive(k.id); }} />}
      {msg && <p className="hint" role="status" style={{ padding: "0 20px" }}>{msg}</p>}
    </>
  );
}

function HomeKid({ kid, onChange, setMsg }: { kid: ChildSummary; onChange: () => Promise<void>; setMsg: (m: string | null) => void }) {
  const [members, setMembers] = useState<ChildMemberInfo[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  useEffect(() => { void listMembers(kid.id).then(setMembers).catch(() => setMembers([])); }, [kid.id]);
  const teachers = members.filter((m) => m.relation === "teacher");

  const share = async (m: ChildMemberInfo, on: boolean) => {
    setMembers((all) => all.map((x) => (x.id === m.id ? { ...x, shareHome: on } : x)));
    try { await setShareHome(kid.id, m.id, on); } catch { setMsg("바꾸지 못했습니다. 다시 해 주세요."); }
  };
  const unlink = async (m: ChildMemberInfo) => {
    try { await removeMember(kid.id, m.id); setMembers(await listMembers(kid.id)); } catch { setMsg("연결을 끊지 못했습니다."); }
  };
  const renew = async () => {
    try { await renewChildNumber(kid.id); await onChange(); setMsg("새 번호를 만들었습니다. 이미 연결된 선생님은 그대로입니다."); }
    catch { setMsg("번호를 바꾸지 못했습니다."); }
  };
  const saveName = async () => {
    if (renaming === null) return;
    try { await updateChild(kid.id, { nickname: renaming }); setRenaming(null); await onChange(); } catch { setMsg("이름을 바꾸지 못했습니다."); }
  };

  return (
    <>
      {renaming !== null
        ? <form className="item" onSubmit={(e) => { e.preventDefault(); void saveName(); }}>
            <input className="title-input" value={renaming} maxLength={20} autoFocus aria-label="아이 별명" onChange={(e) => setRenaming(e.target.value)} />
            <button type="submit" className="btn link">저장</button>
            <button type="button" className="btn link" onClick={() => setRenaming(null)}>취소</button>
          </form>
        : <Row name={<>{kid.icon} {nameOf(kid)}</>} desc={`책장: 학교 ${kid.school_stories ?? 0}편 · 집 ${kid.home_stories ?? 0}편`}>
            <button className="btn link" onClick={() => setRenaming(kid.nickname ?? "")}>이름 바꾸기</button>
          </Row>}
      <Row name={<>아이 번호 <b className="intro-number">{prettyNumber(kid.number)}</b></>}
        desc="선생님께 이 번호를 알려 드리면 학교에서 만든 그림 · 이야기가 이 아이 책장에 모여요. 번호가 퍼졌으면 새로 바꾸세요">
        <span style={{ display: "flex", gap: 14 }}>
          <button className="btn link" onClick={() => void copy(prettyNumber(kid.number)).then((ok) => setMsg(ok ? "번호를 복사했습니다." : null))}>복사</button>
          <button className="btn link" onClick={() => void renew()}>새 번호</button>
        </span>
      </Row>
      {teachers.length === 0 && <Row name="연결된 선생님" desc="아직 없습니다" />}
      {teachers.map((m, i) => (
        <Row key={m.id} name={`선생님 ${i + 1}`} desc={`${m.since.slice(0, 10)} 연결. 켜면 집에서 만든 이야기도 선생님이 볼 수 있습니다`}>
          <span style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input type="checkbox" className="tog" checked={m.shareHome} aria-label="집에서 만든 이야기도 보여 주기"
              onChange={(e) => void share(m, e.target.checked)} />
            <button className="btn link" style={{ color: "var(--berry)" }} onClick={() => void unlink(m)}>연결 끊기</button>
          </span>
        </Row>
      ))}
    </>
  );
}

function AddHomeKid({ onAdded, setMsg }: { onAdded: (k: ChildSummary) => Promise<void> | void; setMsg: (m: string | null) => void }) {
  const [name, setName] = useState<string | null>(null);
  const add = async () => {
    try { const k = await createChild({ nickname: (name ?? "").trim() || undefined }); setName(null); await onAdded(k); }
    catch { setMsg("아이를 추가하지 못했습니다."); }
  };
  return name === null
    ? <Row name="+ 아이 추가" desc="둘째 · 셋째도 따로 책장을 가집니다"><button className="btn link" onClick={() => setName("")}>추가</button></Row>
    : <form className="item" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <input className="title-input" value={name} maxLength={20} autoFocus placeholder="별명 (건너뛰어도 돼요)" aria-label="아이 별명"
          onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn link">추가</button>
        <button type="button" className="btn link" onClick={() => setName(null)}>취소</button>
      </form>;
}

const STATUS_TEXT: Record<string, string> = { linked: "보호자 연결됨", invited: "링크 보냄", none: "보호자 아직" };

function SchoolKids({ kids, onChange, setMsg, onAdded }: {
  kids: ChildSummary[]; onChange: () => Promise<void>; setMsg: (m: string | null) => void; onAdded: (k: ChildSummary) => void;
}) {
  const [selected, setSelected] = useState(false);
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const checked = selected && consent;

  const add = async () => {
    setBusy(true); setMsg(null);
    try {
      const k = await createChild({ asTeacher: true, nickname: name.trim() || undefined, schoolSelected: selected, writtenConsent: consent });
      setName(""); await onChange(); onAdded(k);
    } catch (e) { setMsg(failOf(e, "아이를 추가하지 못했습니다.")); }
    setBusy(false);
  };
  const attach = async () => {
    if (!checked) { setMsg(FAIL.SCHOOL_CHECK_REQUIRED); return; }
    setBusy(true); setMsg(null);
    try { const k = await attachChild(number); setNumber(""); await onChange(); onAdded(k); setMsg(`${nameOf(k)}에 연결했습니다. 학교에서 만든 것이 보호자 책장에도 보입니다.`); }
    catch (e) { setMsg(failOf(e, "연결하지 못했습니다.")); }
    setBusy(false);
  };
  const link = async (k: ChildSummary) => {
    try {
      const r = await createGuardianLink(k.id);
      const ok = await copy(r.url);
      setMsg(ok ? `링크를 복사했습니다 (${r.expiresAt.slice(0, 10)}까지, 한 번만). 알림장으로 보호자께 보내 주세요.` : `링크: ${r.url}`);
      await onChange();
    } catch { setMsg("링크를 만들지 못했습니다."); }
  };
  const end = async (k: ChildSummary) => {
    if (!k.member_id) return;
    if (!window.confirm(`${nameOf(k)}와(과)의 연결을 끝낼까요? 학교에서 만든 기록은 아이에게 남고, 이 계정에서는 더 보이지 않습니다.`)) return;
    try { await removeMember(k.id, k.member_id); await onChange(); setMsg("연결을 끝냈습니다. 학교에서 만든 기록은 아이에게 남습니다."); }
    catch { setMsg("연결을 끝내지 못했습니다."); }
  };

  return (
    <>
      <div className="item head sub"><span className="grow"><span className="name">🏫 학교 아이들</span></span></div>
      <div className="item"><span className="grow">
        <span className="name">학교에서 쓰기 전 확인</span>
        <label className="intro-check"><input type="checkbox" checked={selected} onChange={(e) => setSelected(e.target.checked)} />
          학교가 한칸이야기를 학습지원 소프트웨어로 선정했어요 (학교운영위원회 심의)</label>
        <label className="intro-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          보호자 서명 동의서를 받았어요 (만 14세 미만 아동) · <a href={CONSENT_FORM_URL} target="_blank" rel="noreferrer">동의서 양식</a></label>
        <span className="desc">아이를 추가하거나 번호로 붙일 때 확인합니다. 둘 중 하나라도 아니면 보호자께 직접 가입을 부탁해 주세요</span>
      </span></div>
      <form className="item" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <span className="grow"><span className="name">+ 아이 추가</span><span className="desc">별명이나 번호(예: 3번)로. 이름 · 사진은 받지 않아요</span></span>
        <input className="title-input" style={{ maxWidth: 140 }} value={name} maxLength={20} placeholder="예: 3번" aria-label="아이 별명"
          onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn link" disabled={busy || !checked}>추가</button>
      </form>
      <form className="item" onSubmit={(e) => { e.preventDefault(); void attach(); }}>
        <span className="grow"><span className="name">보호자 번호로 붙이기</span><span className="desc">집에서 이미 쓰는 아이면 보호자께 받은 아이 번호를 넣어요</span></span>
        <input className="title-input" style={{ maxWidth: 160, textTransform: "uppercase" }} value={number} maxLength={12} placeholder="#K7M2-Q9KX"
          aria-label="아이 번호" onChange={(e) => setNumber(e.target.value)} />
        <button type="submit" className="btn link" disabled={busy || !number.trim() || !checked}>붙이기</button>
      </form>
      {kids.map((k) => (
        <Row key={k.id} name={<>{k.icon} {nameOf(k)}</>} desc={`${STATUS_TEXT[k.guardian_status ?? "none"]} · 학교 이야기 ${k.school_stories ?? 0}편`}>
          <span style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {k.guardian_status !== "linked" && (
              <button className="btn link" onClick={() => void link(k)}>{k.guardian_status === "invited" ? "링크 다시 복사" : "보호자 링크 복사"}</button>
            )}
            <button className="btn link" style={{ color: "var(--berry)" }} onClick={() => void end(k)}>끝내기</button>
          </span>
        </Row>
      ))}
    </>
  );
}
