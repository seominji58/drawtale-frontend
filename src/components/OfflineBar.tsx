import { useEffect, useState } from "react";

/** C-05. 진행 중 작업은 중단하지 않고 띠로만 알린다 */
export default function OfflineBar() {
  const [off, setOff] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOff(false);
    const down = () => setOff(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", down);
    };
  }, []);
  if (!off) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 6,
      background: "var(--berry)", zIndex: 100,
    }} role="status" aria-label="연결이 끊겼어요" />
  );
}
