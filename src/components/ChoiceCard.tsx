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
    <button className={`choice ${on || selected ? "on" : ""}`} onClick={handle} aria-label={choice.label}>
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
