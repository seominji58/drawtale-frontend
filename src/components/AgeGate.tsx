import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import BigButton from "./BigButton";
import { checkMyAge } from "@/api";
import { useAuth } from "@/store/auth";
import { useGuardian } from "@/store/guardian";
import { AGE_CHECK_TEXT, openAgeCheck, preloadAgeCheck, returnedVerification } from "@/features/identity/ageCheck";
import type { AgeCheckOutcome } from "@/features/identity/ageCheck";

/** 예전에 가입한 계정의 보호자 나이 확인 (2026-11-09, 계약 2-17).
 *  본인인증을 넣기 전에 가입한 보호자는 다음 로그인 때 한 번 본인인증을 한다, 다른 화면 위에 덮고, 끝나야 닫힌다.
 *  새로 가입하는 사람은 S-16 에서 이미 했다. 폰은 KG이니시스 화면을 다녀와 첫 화면(/)으로 돌아오고, 여기서 이어 받는다 */
/** 계정에 들어가는 화면 · 약관에서는 덮지 않는다. 로그인된 채로 가입 화면을 열면 가입 화면 위에 이 창이 덮여
 *  새 가입용 본인인증과 두 번 묻는 것처럼 보였다 (11/9 실제 시험) */
const ENTRY = /^\/(welcome|login|signup|auth|terms|privacy)(\/|$)/;

export default function AgeGate() {
  const need = useGuardian((s) => s.status?.ageVerified === false);
  const { pathname } = useLocation();
  if (!need || ENTRY.test(pathname)) return null;
  return <Gate />;
}

function Gate() {
  const ageChecked = useGuardian((s) => s.ageChecked);
  const logout = useAuth((s) => s.logout);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const once = useRef(false);

  const finish = async (o: AgeCheckOutcome) => {
    if (!o.ok) { setError(o.message ? `${AGE_CHECK_TEXT[o.reason]} (${o.message})` : AGE_CHECK_TEXT[o.reason]); return; }
    setBusy(true);
    const r = await checkMyAge(o.id);
    setBusy(false);
    if (r.ok) ageChecked();
    else setError(AGE_CHECK_TEXT[r.code] ?? AGE_CHECK_TEXT.failed);
  };

  // 폰에서 다녀왔으면 그 결과로
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    preloadAgeCheck();
    const back = returnedVerification();
    if (back) void finish(back);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  const start = async () => {
    setError(null);
    setBusy(true);
    const o = await openAgeCheck("/");
    setBusy(false);
    await finish(o);
  };

  return (
    <div className="rename-layer" data-audience="adult" role="dialog" aria-modal="true" aria-label="보호자 확인">
      <div className="paper-card rename-card intro-card">
        <p className="rename-label">보호자 확인을 한 번 해 주세요</p>
        <ul className="intro-lines">
          <li>한칸이야기는 만 14세 이상의 보호자 또는 교사 계정으로 씁니다</li>
          <li>KG이니시스 간편인증(카카오 · PASS · 토스 등)으로 나이만 확인합니다. 이름 · 전화번호 · 생년월일은 저장하지 않습니다</li>
          <li>한 번 하면 다시 묻지 않습니다</li>
        </ul>
        {error && <p className="box warn" role="alert">{error}</p>}
        <div className="rename-acts">
          <BigButton onClick={() => logout()}>로그아웃</BigButton>
          <BigButton go disabled={busy} onClick={start}>{busy ? "확인하는 중" : "본인인증 하기"}</BigButton>
        </div>
      </div>
    </div>
  );
}
