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
          <svg viewBox="0 0 44 48">
            {/* 위로 살짝 기운 압정: 앞에서 조금 내려다본 모양. 머리 · 받침 아래로 은색 바늘이 짧게 보인다 */}
            <ellipse cx="24" cy="44" rx="9" ry="2.6" fill="rgba(58,46,38,.22)" />
            <path d="M22 33v9" stroke="#3A2E26" strokeWidth="4.6" strokeLinecap="round" />
            <path d="M22 33v9" stroke="#A9AFB5" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M21.4 34v5" stroke="#EEF0F2" strokeWidth="1" strokeLinecap="round" />
            <ellipse cx="22" cy="31" rx="12.5" ry="4.5" fill="#A2402A" stroke="#3A2E26" strokeWidth="2.5" />
            <path d="M16.5 15.5C18 20 18.5 24 17.5 29h9c-1-5-.5-9 1-13.5" fill="#C24E32" stroke="#3A2E26" strokeWidth="2.5" strokeLinejoin="round" />
            <ellipse cx="22" cy="13" rx="10" ry="6.5" fill="#D65A3B" stroke="#3A2E26" strokeWidth="2.5" />
            <ellipse cx="18.5" cy="11" rx="3.4" ry="1.8" transform="rotate(-15 18.5 11)" fill="#FFFDF8" opacity=".8" />
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
