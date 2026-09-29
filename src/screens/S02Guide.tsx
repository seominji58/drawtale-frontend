import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Paper } from "@/components/illust";
import { useSettings } from "@/store/settings";

const CARDS = [
  { ok: true, text: "사람을 한 명만 그려요" },
  { ok: true, text: "하얀 종이에 그려요" },
  { ok: false, text: "여러 명은 아직 어려워요" },
];

export default function S02Guide() {
  const nav = useNavigate();
  const level = useSettings((s) => s.level);
  const cards = level === 1 ? CARDS.filter((c) => c.ok) : CARDS;

  return (
    <Screen back="/" speech="이런 그림이 좋아요" segment={1}
      acts={<BigButton go onClick={() => nav("/upload")}>그림 찍기</BigButton>}>
      <h2 className="question">이런 그림이 좋아요</h2>
      <div className="row" style={{ flex: 1, minHeight: 0 }}>
        {cards.map((c) => (
          <div key={c.text} className="stage" style={{ flexDirection: "column", padding: 20, gap: 12 }}>
            <div className="illust-wrap"><Paper /></div>
            <p style={{
              fontSize: "var(--t-body)", fontWeight: 700,
              color: c.ok ? "var(--mint)" : "var(--berry)",
            }}>{c.ok ? "좋아요" : "아직 어려워요"}</p>
            <p className="hint" style={{ fontSize: "var(--t-label)" }}>{c.text}</p>
          </div>
        ))}
      </div>
    </Screen>
  );
}
