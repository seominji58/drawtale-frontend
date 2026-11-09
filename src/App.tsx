import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import OfflineBar from "@/components/OfflineBar";
import GuardianGate from "@/components/GuardianGate";
import GuardianIntro from "@/components/GuardianIntro";
import AgeGate from "@/components/AgeGate";
import { useGuardian } from "@/store/guardian";
import { useAuth } from "@/store/auth";
import { useSettings, ORDER_GAME } from "@/store/settings";
import { watchOriginals } from "@/features/character/originals";
import { onRouteChange, watchUpdates } from "@/features/app/update";
import { useForms } from "@/features/character/forms";

import S01Start from "@/screens/S01Start";
import S02Guide from "@/screens/S02Guide";
import S03Upload from "@/screens/S03Upload";
import S03Draw from "@/screens/S03Draw";
import S03Form from "@/screens/S03Form";
import S04Analyzing from "@/screens/S04Analyzing";
import S05Confirm from "@/screens/S05Confirm";
import S05Name from "@/screens/S05Name";
import S06Joints from "@/screens/S06Joints";
import S07Steps from "@/screens/S07Steps";
import S08Generating from "@/screens/S08Generating";
import S09Story from "@/screens/S09Story";
import S10Order from "@/screens/S10Order";
import S11Done from "@/screens/S11Done";
import S12Stories from "@/screens/S12Stories";
import SProps from "@/screens/SProps";
import SPropDraw from "@/screens/SPropDraw";
import SPropView from "@/screens/SPropView";
import S13Settings from "@/screens/S13Settings";
import S13Voice from "@/screens/S13Voice";
import E01Error from "@/screens/E01Error";
import S14Welcome from "@/screens/S14Welcome";
import S15Login from "@/screens/S15Login";
import S16Signup from "@/screens/S16Signup";
import S15Callback from "@/screens/S15Callback";
import SLegal from "@/screens/SLegal";

export default function App() {
  const mode = useAuth((s) => s.mode);
  const level = useSettings((s) => s.level);

  useEffect(() => { document.documentElement.dataset.level = String(level); }, [level]);

  // 원본 그림 보관을 끈 경우 그림을 떠날 때 서버 원본을 지운다 (S-13, 계약 2-10).
  // 아래 주석의 비회원 데이터와 달리, 캐릭터는 새로고침하면 어차피 다시 쓸 수 없어서 pagehide 에 지워도 된다
  useEffect(() => watchOriginals(), []);

  // 새 버전이 배포되면 만들던 것이 없는 화면에서 새로고침한다 (features/app/update.ts)
  const { pathname } = useLocation();
  useEffect(() => watchUpdates(), []);
  // 형태 목록 (pt_docs 19) — 관절 화면을 새로고침으로 바로 열어도 그 형태의 관절을 그린다
  useEffect(() => { void useForms.getState().load(); }, []);
  useEffect(() => onRouteChange(), [pathname]);
  // 설정(과 그 안의 목소리 등록)을 떠나면 열어 둔 보호자 칸을 잠근다 — 한 번 풀면 설정을 닫을 때까지
  useEffect(() => { if (pathname !== "/settings" && pathname !== "/voice") useGuardian.getState().lock(); }, [pathname]);
  // 보호자 비밀번호 · 소개 카드 상태 (pt_docs 20 3장). 로그아웃하면 열어 둔 보호자 칸도 닫는다
  useEffect(() => {
    if (mode === "member") void useGuardian.getState().load();
    else useGuardian.setState({ status: null, unlocked: false, request: null, intro: false });
  }, [mode]);

  /* 비회원 데이터를 지우는 pagehide 핸들러는 두지 않는다 (설계서 11.1).
     pagehide 는 탭을 닫을 때만이 아니라 페이지를 떠날 때마다 발생해서,
     새로고침 한 번에 만들던 이야기가 통째로 사라졌다.
     설계서가 요구하는 「탭을 닫으면 함께 사라진다」는 sessionStorage 자체가
     보장한다 — 브라우저가 탭과 함께 지운다. 메모리 상태와 objectURL 도
     페이지가 사라질 때 같이 해제된다. 핸들러가 할 일이 없다.
     세션을 끊어야 할 때는 store/auth.ts 의 logout() 을 쓴다. */

  return (
    <>
      <OfflineBar />
      {mode === "member" && <GuardianIntro />}
      {mode === "member" && <GuardianGate />}
      {/* 예전 계정의 본인인증(나이 확인), 다른 창보다 위에 (2026-11-09) */}
      {mode === "member" && <AgeGate />}
      <Routes>
        <Route path="/welcome" element={<S14Welcome />} />
        <Route path="/login" element={<S15Login />} />
        <Route path="/signup" element={<S16Signup />} />
        <Route path="/auth/:provider/callback" element={<S15Callback />} />
        {/* 약관은 로그인하지 않아도 볼 수 있어야 한다 */}
        <Route path="/terms" element={<SLegal kind="terms" />} />
        <Route path="/privacy" element={<SLegal kind="privacy" />} />
        {mode === "unset" ? (
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        ) : (
          <>
            <Route path="/" element={<S01Start />} />
            <Route path="/guide" element={<S02Guide />} />
            <Route path="/upload" element={<S03Upload />} />
            <Route path="/draw" element={<S03Draw />} />
            <Route path="/form" element={<S03Form />} />
            <Route path="/analyzing" element={<S04Analyzing />} />
            <Route path="/confirm" element={<S05Confirm />} />
            <Route path="/name" element={<S05Name />} />
            <Route path="/joints" element={<S06Joints />} />
            <Route path="/steps" element={<S07Steps />} />
            <Route path="/generating" element={<S08Generating />} />
            <Route path="/story" element={<S09Story />} />
            {/* 순서 맞추기는 꺼 둠 (ORDER_GAME, 10/27) — 꺼져 있으면 다 했어요로 */}
            <Route path="/order" element={ORDER_GAME ? <S10Order /> : <Navigate to="/done" replace />} />
            <Route path="/done" element={<S11Done />} />
            <Route path="/stories" element={<S12Stories />} />
            {/* 내 소품 (2026-10-27 로컬 시험, open-decisions 0-13) */}
            <Route path="/props" element={<SProps />} />
            <Route path="/props/new" element={<SPropDraw />} />
            <Route path="/props/:id" element={<SPropView />} />
            <Route path="/settings" element={<S13Settings />} />
            <Route path="/voice" element={<S13Voice />} />
            <Route path="/error" element={<E01Error />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}
