import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { sentences, speak } from "@/lib";

/** 기본 조작은 탭 두 번이다. 카드를 고르고 자리를 고른다.
 *  드래그만 지원하면 소근육 조작이 어려운 아이가 배제된다.
 *  카드는 이야기 문장이다 — 백엔드가 장면이 아니라 `text` 한 덩어리를 주기 때문이다 (계약 2-6). */
export default function S10Order() {
  const nav = useNavigate();
  const { story } = useSession();
  const { level, muteAll } = useSettings();
  const lines = useMemo(() => sentences(story?.text ?? ""), [story]);
  const count = Math.min(level === 1 ? 2 : 4, lines.length);

  const cards = useMemo(() => {
    const src = lines.slice(0, count).map((text, index) => ({ index, text }));
    return [...src].sort(() => Math.random() - 0.5);
  }, [lines, count]);

  const [slots, setSlots] = useState<(number | null)[]>(Array(count).fill(null));
  const [picked, setPicked] = useState<number | null>(null);

  if (!story) { nav("/", { replace: true }); return null; }
  const used = new Set(slots.filter((v) => v !== null));
  const filled = slots.every((v) => v !== null);

  const done = () => {
    const ok = slots.every((v, n) => v === n);
    // 시도 횟수를 보낼 곳이 백엔드에 없어 기록하지 않는다 (계약에 activity 없음)
    if (ok) nav("/done");
    else { setSlots(Array(count).fill(null)); setPicked(null); }
  };

  return (
    <Screen back="/story" speech="어떤 순서였을까요?" segment={4}
      acts={
        <>
          <BigButton onClick={() => { setSlots(Array(count).fill(null)); setPicked(null); }}>
            다시하기
          </BigButton>
          <BigButton go disabled={!filled} onClick={done}>다 했어요</BigButton>
        </>
      }>
      <h2 className="question">어떤 순서였을까요?</h2>

      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        {cards.map((s) => (
          <button key={s.index} disabled={used.has(s.index)}
            className={`stage ${used.has(s.index) ? "card-used" : ""} ${picked === s.index ? "card-picked" : ""}`}
            onClick={() => { setPicked(s.index); speak(s.text, muteAll); }}>
            <span className="said">{s.text}</span>
          </button>
        ))}
      </div>

      <div className="slot-row">
        {slots.map((v, n) => (
          <button key={n}
            className={`slot-box ${v !== null ? "taken" : picked !== null ? "open" : ""}`}
            onClick={() => {
              if (v === null && picked !== null) {
                const next = [...slots]; next[n] = picked; setSlots(next); setPicked(null);
              } else if (v !== null) {
                setSlots(slots.map((x, m) => (m === n ? null : x)));
              }
            }}>
            {v === null ? n + 1 : `장면 ${v + 1}`}
          </button>
        ))}
      </div>
    </Screen>
  );
}
