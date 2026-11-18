import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BigButton from "./BigButton";
import { ApiError, acceptInvitation, invitationInfo, setUseMode } from "@/api";
import { useChildren } from "@/store/children";
import { useGuardian } from "@/store/guardian";
import { useLibrary } from "@/store/library";
import { clearPendingJoin, pendingJoin } from "@/features/family/join";

/** 선생님 링크로 로그인한 보호자에게 (설계 「보호자-교사-계정」 3-3 · 4-4, 2026-11-18).
 *  「○○ 선생님이 민지의 학교 기록을 보내 드렸어요」 → 이미 내 아이가 있으면 「같은 아이로 합치기 / 새 아이로」.
 *  원칙 2: 보호자 쪽으로는 승인 없이 열린다. 본인인증(AgeGate)이 먼저다 */
export default function JoinDialog() {
  const status = useGuardian((s) => s.status);
  const [code, setCode] = useState<string | null>(pendingJoin());
  // 링크(/join/:code)는 이 창보다 늦게 코드를 맡겨 둔다 — 화면이 바뀔 때마다 다시 읽는다
  // (이미 로그인한 보호자가 링크를 열면 이 창이 먼저 그려져 코드를 못 봤다, 2026-11-18 화면 시험)
  const { pathname } = useLocation();
  useEffect(() => { setCode(pendingJoin()); }, [pathname]);
  if (!code || !status || status.ageVerified === false) return null;
  // 끝나면 소개 카드(GuardianIntro)가 다시 그려지게 상태를 새로 (링크가 있는 동안 소개 카드는 기다린다)
  return <Join code={code} onDone={() => {
    clearPendingJoin(); setCode(null);
    useGuardian.setState((s) => ({ status: s.status ? { ...s.status } : s.status }));
  }} />;
}

function Join({ code, onDone }: { code: string; onDone: () => void }) {
  const { list, load, setActive } = useChildren();
  const sync = useLibrary((s) => s.sync);
  const [info, setInfo] = useState<{ relation: string; childNickname: string | null; childIcon: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  useEffect(() => {
    void load();
    invitationInfo(code).then(setInfo).catch((e) => {
      const c = e instanceof ApiError ? e.serverCode : "";
      setError(c === "INVITE_INVALID" ? "링크 기한이 지났거나 이미 쓴 링크예요. 선생님께 새 링크를 부탁해 주세요." : "링크를 확인하지 못했어요. 다시 열어 주세요.");
    });
  }, [code, load]);

  const mine = list.filter((k) => k.relation === "guardian");
  const name = info?.childNickname ?? "아이";

  const accept = async (mergeInto?: string) => {
    setBusy(true); setError(null);
    try {
      const kid = await acceptInvitation(code, mergeInto);
      // 링크로 온 보호자는 「집에서」로 시작한다 (처음 질문을 건너뜀)
      if (useGuardian.getState().status?.useMode == null) {
        try { await setUseMode("home"); } catch { /* 다음에 다시 묻는다 */ }
        useGuardian.getState().useModeChosen("home");
      }
      await load();
      setActive(kid.id);
      void sync();
      setDoneMsg(mergeInto ? `학교 기록을 ${kid.nickname ?? "우리 아이"}에게 합쳤어요. 책장에서 함께 볼 수 있어요.`
        : `${kid.nickname ?? "아이"}의 학교 기록을 받았어요. 책장에서 볼 수 있어요.`);
    } catch (e) {
      const c = e instanceof ApiError ? e.serverCode : "";
      setError(c === "ALREADY_LINKED" ? "이미 연결된 아이예요." : c === "INVITE_INVALID"
        ? "링크 기한이 지났거나 이미 쓴 링크예요. 선생님께 새 링크를 부탁해 주세요." : "연결하지 못했어요. 다시 해 주세요.");
    }
    setBusy(false);
  };

  return (
    <div className="rename-layer" data-audience="adult" role="dialog" aria-modal="true" aria-label="학교 기록 받기">
      <div className="paper-card rename-card intro-card">
        {doneMsg ? <>
          <p className="rename-label">연결했어요</p>
          <p className="intro-note">{doneMsg}</p>
          <p className="intro-note">선생님은 학교에서 만든 것만 봐요. 집에서 만든 것은 설정 → 아이 · 연결에서 켜야 보여요.</p>
          <div className="rename-acts"><BigButton go onClick={onDone}>확인</BigButton></div>
        </> : error && !info ? <>
          <p className="rename-label">학교 기록 받기</p>
          <p className="hint" role="status">{error}</p>
          <div className="rename-acts"><BigButton onClick={onDone}>닫기</BigButton></div>
        </> : !info ? <p className="intro-note">링크를 확인하고 있어요</p> : <>
          <p className="rename-label">선생님이 「{info.childIcon ?? ""} {name}」의 학교 기록을 보내 드렸어요</p>
          {mine.length > 0 ? <>
            <p className="intro-note">이미 있는 아이와 같은 아이인가요?</p>
            <div className="intro-choices">
              {mine.map((k) => (
                <button key={k.id} className="intro-choice" disabled={busy} onClick={() => void accept(k.id)}>
                  <b>{k.icon} {k.nickname ?? "우리 아이"}와 합치기</b>학교 기록 · 선생님 연결이 이 아이로 옮겨져요
                </button>
              ))}
              <button className="intro-choice" disabled={busy} onClick={() => void accept()}>
                <b>새 아이로 추가</b>둘째 · 셋째인 경우
              </button>
            </div>
          </> : <>
            <p className="intro-note">받으면 학교에서 만든 그림 · 이야기를 집 책장에서도 볼 수 있어요.</p>
            <div className="rename-acts">
              <BigButton onClick={onDone}>나중에</BigButton>
              <BigButton go disabled={busy} onClick={() => void accept()}>받기</BigButton>
            </div>
          </>}
          {error && <p className="hint" role="status">{error}</p>}
        </>}
      </div>
    </div>
  );
}
