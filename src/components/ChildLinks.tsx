import { useEffect, useState, type ReactNode } from "react";
import { ApiError, acceptInvitation, createInvitation, listMembers, removeMember, setShareHome, type ChildMemberInfo } from "@/api";
import { useChildren } from "@/store/children";
import { useLibrary } from "@/store/library";

/** 설정 보호자 칸 「아이 · 선생님 연결」 (보호자 · 교사 계정 3단계, 2026-11-17, 설계 검토 「보호자-교사-계정」 5장 흐름 A).
 *  - 보호자: 선생님에게 줄 연결 코드 만들기, 연결된 선생님 보기 · 「집에서 만든 이야기도 보여 주기」 · 연결 끊기
 *  - 선생님: 보호자에게 받은 코드 넣기, 연결된 아이 중 「지금 아이」 고르기 (학교에서 만든 그림 · 이야기가 그 아이에게 붙는다)
 *  이름 · 이메일을 두지 않아 어른은 「보호자」 · 「선생님」으로만, 아이는 별명이 없으면 순서로 부른다 */

function Row({ name, desc, children }: { name: string; desc: string; children?: ReactNode }) {
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
  INVITE_INVALID: "코드가 맞지 않거나 기한이 지났습니다. 보호자님께 새 코드를 받아 주세요.",
  ALREADY_LINKED: "이미 연결된 아이입니다.",
};

export default function ChildLinks() {
  const { list, load, setActive, active } = useChildren();
  const sync = useLibrary((s) => s.sync);
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [members, setMembers] = useState<ChildMemberInfo[]>([]);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const now = active();
  const guardian = now?.relation === "guardian";

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setInvite(null);
    if (!now || now.relation !== "guardian") { setMembers([]); return; }
    void listMembers(now.id).then(setMembers).catch(() => setMembers([]));
  }, [now?.id, now?.relation]);

  const nameOf = (k: { id: string; nickname: string | null; relation: string }) => {
    if (k.nickname) return k.nickname;
    if (k.relation === "guardian") return "우리 아이";
    return `연결된 아이 ${list.filter((x) => x.relation === "teacher").findIndex((x) => x.id === k.id) + 1}`;
  };

  const makeCode = async () => {
    if (!now) return;
    setBusy(true); setMsg(null);
    try { setInvite(await createInvitation(now.id)); } catch { setMsg("코드를 만들지 못했습니다. 잠시 뒤 다시 해 주세요."); }
    setBusy(false);
  };
  const join = async () => {
    if (!code.trim()) return;
    setBusy(true); setMsg(null);
    try {
      const kid = await acceptInvitation(code);
      setCode("");
      await load();
      setActive(kid.id);
      void sync();
      setMsg("연결했습니다. 이제 이 기기에서 만드는 그림 · 이야기는 그 아이의 「학교에서 만든 것」으로 저장됩니다.");
    } catch (e) {
      const c = e instanceof ApiError ? e.serverCode ?? "" : "";
      setMsg(FAIL[c] ?? "연결하지 못했습니다. 인터넷 연결을 확인하고 다시 해 주세요.");
    }
    setBusy(false);
  };
  const share = async (m: ChildMemberInfo, on: boolean) => {
    if (!now) return;
    setMembers((all) => all.map((x) => (x.id === m.id ? { ...x, shareHome: on } : x)));
    try { await setShareHome(now.id, m.id, on); } catch { setMembers(await listMembers(now.id).catch(() => members)); }
  };
  const unlink = async (m: ChildMemberInfo) => {
    if (!now) return;
    try {
      await removeMember(now.id, m.id);
      if (m.isMe) { await load(); void sync(); } else setMembers(await listMembers(now.id));
    } catch { setMsg("연결을 끊지 못했습니다. 잠시 뒤 다시 해 주세요."); }
  };

  return (
    <>
      {list.length > 1 && now && (
        <Row name="지금 아이" desc="이 기기에서 만드는 그림 · 이야기가 이 아이에게 저장되고, 책장에도 이 아이의 이야기가 보입니다">
          <select className="title-input" style={{ maxWidth: 200 }} value={now.id} aria-label="지금 아이"
            onChange={(e) => { setActive(e.target.value); void sync(); }}>
            {list.map((k) => <option key={k.id} value={k.id}>{nameOf(k)}{k.relation === "teacher" ? " (선생님으로 연결)" : ""}</option>)}
          </select>
        </Row>
      )}
      {guardian && (
        <Row name="선생님 연결 코드"
          desc={invite
            ? `선생님께 이 코드를 알려 주세요: ${invite.code} (${invite.expiresAt.slice(0, 10)}까지, 한 번만 쓸 수 있음). 연결되면 선생님이 학교에서 만든 이야기가 이 책장에도 보입니다`
            : "학교에서 만든 그림 · 이야기를 집에서도 보려면, 코드를 만들어 선생님께 알려 주세요. 선생님은 학교에서 만든 것만 보고, 집에서 만든 것은 아래에서 켜야 보입니다"}>
          <button className="btn link" disabled={busy} onClick={() => void makeCode()}>{invite ? "새 코드" : "코드 만들기"}</button>
        </Row>
      )}
      {guardian && members.filter((m) => m.relation === "teacher").map((m, i) => (
        <Row key={m.id} name={`선생님 ${i + 1}`} desc={`${m.since.slice(0, 10)} 연결. 켜면 집에서 만든 이야기도 선생님이 볼 수 있습니다`}>
          <span style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input type="checkbox" className="tog" checked={m.shareHome} aria-label="집에서 만든 이야기도 보여 주기"
              onChange={(e) => void share(m, e.target.checked)} />
            <button className="btn link" style={{ color: "var(--berry)" }} onClick={() => void unlink(m)}>연결 끊기</button>
          </span>
        </Row>
      ))}
      {now?.relation === "teacher" && (
        <Row name="이 아이와 연결 끊기" desc="끊어도 학교에서 만든 그림 · 이야기는 아이에게 남아 보호자님이 계속 봅니다">
          <button className="btn link" style={{ color: "var(--berry)" }} disabled={!now.member_id}
            onClick={() => void unlinkSelf(now.id, now.member_id!)}>연결 끊기</button>
        </Row>
      )}
      <form className="item" onSubmit={(e) => { e.preventDefault(); void join(); }}>
        <span className="grow">
          <span className="name">아이 연결 코드 넣기 (선생님)</span>
          <span className="desc">보호자님께 받은 6자리 코드를 넣으면 그 아이와 연결됩니다. 학교에서 만든 그림 · 이야기가 그 아이에게 저장됩니다</span>
        </span>
        <input className="title-input" style={{ maxWidth: 120, textTransform: "uppercase" }} value={code} maxLength={8}
          aria-label="연결 코드" onChange={(e) => setCode(e.target.value)} />
        <button type="submit" className="btn link" disabled={busy || !code.trim()}>연결</button>
      </form>
      {msg && <p className="hint" role="status" style={{ padding: "0 20px" }}>{msg}</p>}
    </>
  );

  /** 선생님이 자기 연결을 끊는다 (연결 번호는 아이 목록이 준다) */
  async function unlinkSelf(childId: string, memberId: string) {
    try {
      await removeMember(childId, memberId);
      await load();
      void sync();
      setMsg("연결을 끊었습니다.");
    } catch { setMsg("연결을 끊지 못했습니다. 잠시 뒤 다시 해 주세요."); }
  }
}
