import { useRef, useState } from "react";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  go?: boolean;
  disabled?: boolean;
  /** 비활성이어도 누를 수 있고, 누르면 흔들림으로 아직 안 됐다고 알린다 */
  nudgeOnDisabled?: boolean;
}

export default function BigButton({
  children, onClick, go = false, disabled = false, nudgeOnDisabled = true,
}: Props) {
  const [nudging, setNudging] = useState(false);
  const lock = useRef(0);

  const handle = () => {
    if (disabled) {
      if (!nudgeOnDisabled) return;
      setNudging(true);
      setTimeout(() => setNudging(false), 220);
      return;
    }
    const now = Date.now();
    if (now - lock.current < 300) return;   // 중복 입력 차단
    lock.current = now;
    onClick?.();
  };

  return (
    <button
      className={`btn ${go ? "go" : ""} ${disabled ? "off" : ""} ${nudging ? "nudge" : ""}`}
      onClick={handle}
      aria-disabled={disabled}
    >
      {children}
    </button>
  );
}
