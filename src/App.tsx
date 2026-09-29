import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import OfflineBar from "@/components/OfflineBar";
import { useAuth } from "@/store/auth";
import { useSettings } from "@/store/settings";

import S01Start from "@/screens/S01Start";
import S02Guide from "@/screens/S02Guide";
import S03Upload from "@/screens/S03Upload";
import S04Analyzing from "@/screens/S04Analyzing";
import S05Confirm from "@/screens/S05Confirm";
import S06Joints from "@/screens/S06Joints";
import S07Steps from "@/screens/S07Steps";
import S08Generating from "@/screens/S08Generating";
import S09Story from "@/screens/S09Story";
import S10Order from "@/screens/S10Order";
import S11Done from "@/screens/S11Done";
import S12Stories from "@/screens/S12Stories";
import S13Settings from "@/screens/S13Settings";
import E01Error from "@/screens/E01Error";
import S14Welcome from "@/screens/S14Welcome";
import S15Login from "@/screens/S15Login";
import S16Signup from "@/screens/S16Signup";

export default function App() {
  const mode = useAuth((s) => s.mode);
  const level = useSettings((s) => s.level);

  useEffect(() => { document.documentElement.dataset.level = String(level); }, [level]);

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
      <Routes>
        <Route path="/welcome" element={<S14Welcome />} />
        <Route path="/login" element={<S15Login />} />
        <Route path="/signup" element={<S16Signup />} />
        {mode === "unset" ? (
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        ) : (
          <>
            <Route path="/" element={<S01Start />} />
            <Route path="/guide" element={<S02Guide />} />
            <Route path="/upload" element={<S03Upload />} />
            <Route path="/analyzing" element={<S04Analyzing />} />
            <Route path="/confirm" element={<S05Confirm />} />
            <Route path="/joints" element={<S06Joints />} />
            <Route path="/steps" element={<S07Steps />} />
            <Route path="/generating" element={<S08Generating />} />
            <Route path="/story" element={<S09Story />} />
            <Route path="/order" element={<S10Order />} />
            <Route path="/done" element={<S11Done />} />
            <Route path="/stories" element={<S12Stories />} />
            <Route path="/settings" element={<S13Settings />} />
            <Route path="/error" element={<E01Error />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </>
  );
}
