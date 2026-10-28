import { useRef, useState } from "react";
import type { StepChoice } from "@/types/story";
import { useSettings } from "@/store/settings";
import { speak } from "@/lib";

export default function ChoiceCard({
  choice, selected = false, onPick,
}: { choice: StepChoice; selected?: boolean; onPick: (id: string) => void }) {
  const muteAll = useSettings((s) => s.muteAll);
  const [on, setOn] = useState(false);
  const lock = useRef(0);

  const handle = () => {
    const now = Date.now();
    if (now - lock.current < 300) return;
    lock.current = now;
    setOn(true);
    speak(choice.label, muteAll);
    setTimeout(() => {
      setOn(false);
      onPick(choice.id);
    }, 200);
  };

  return (
    <button className={`choice ${on || selected ? "on" : ""}`} onClick={handle} aria-label={choice.label} aria-pressed={selected}>
      {/* 고른 카드는 압정으로 꽂아 둔 것처럼 (10/28 사용자 「고정핀으로 고정된 느낌」) */}
      {selected && (
        <span className="choice-pin" aria-hidden>
          <svg viewBox="0 0 40 40">
            {/* 위에서 본 압정: 종이에 꽂혀 바늘은 안 보이고 머리와 그림자만 */}
            <ellipse cx="24" cy="25" rx="13" ry="10" fill="rgba(58,46,38,.25)" />
            <circle cx="20" cy="20" r="13" fill="#A2402A" stroke="#3A2E26" strokeWidth="3" />
            <circle cx="20" cy="18" r="9.5" fill="#D65A3B" />
            <ellipse cx="16" cy="14" rx="3.6" ry="2.4" fill="#FFFDF8" opacity=".8" transform="rotate(-30 16 14)" />
          </svg>
        </span>
      )}
      {/* 아이콘을 못 불러오면 깨진 그림 대신 빈 자리를 둔다.
          아이 화면에 깨진 아이콘이 뜨는 것보다 낫고, 원인은 콘솔에 남긴다 */}
      <img src={choice.iconUrl} alt=""
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
          console.warn(`[한칸이야기] 아이콘을 불러오지 못했습니다: ${choice.iconUrl}`);
        }} />
      <span>{choice.label}</span>
    </button>
  );
}
