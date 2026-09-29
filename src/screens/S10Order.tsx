import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Scene } from "@/components/illust";
import { useSession } from "@/store/session";
import { useSettings } from "@/store/settings";
import { postActivity } from "@/api";
import { speak } from "@/lib";

/** 기본 조작은 탭 두 번이다. 카드를 고르고 자리를 고른다.
 *  드래그만 지원하면 소근육 조작이 어려운 아이가 배제된다. */
export default function S10Order() {
  const nav = useNavigate();
  const { story } = useSession();
  const { level, muteAll } = useSettings();
  const count = level === 1 ? 2 : 4;

  const cards = useMemo(() => {
    const src = (story?.scenes ?? []).slice(0, count);
    return [...src].sort(() => Math.random() - 0.5);
  }, [story, count]);

  const [slots, setSlots] = useState<(number | null)[]>(Array(count).fill(null));
  const [picked, setPicked] = useState<number | null>(null);
  const [tries, setTries] = useState(0);

  if (!story) { nav("/", { replace: true }); return null; }
  const used = new Set(slots.filter((v) => v !== null));
  const filled = slots.every((v) => v !== null);

  const done = () => {
    const ok = slots.every((v, n) => v === n);
    setTries((t) => t + 1);
    postActivity(story.storyId, tries + 1, ok);
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
            onClick={() => { setPicked(s.index); speak(s.sentence, muteAll); }}>
            <div className="illust-wrap"><Scene n={s.index} /></div>
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
