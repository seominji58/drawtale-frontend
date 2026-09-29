import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Paper } from "@/components/illust";
import { useSettings } from "@/store/settings";

/** ok: 지켜야 잘 되는 것, tip: 권하는 것, no: 아직 안 되는 것.
 *  tip 은 강요하지 않는다 — 팔을 몸에 붙여 그려도 캐릭터는 만들어진다. 다만 팔을 몸에서 띄워
 *  그리면 움직일 때 팔이 몸통에 눌려 뭉개지지 않는다 (docs/worklog.md 2026-09-29 「팔 모양」) */
type Kind = "ok" | "tip" | "no";
const CARDS: { kind: Kind; text: string }[] = [
  { kind: "ok", text: "사람을 한 명만 그려요" },
  { kind: "ok", text: "하얀 종이에 그려요" },
  { kind: "tip", text: "팔과 다리를 몸에서 조금 떨어지게 그려요" },
  { kind: "no", text: "여러 명은 아직 어려워요" },
];
const LABEL: Record<Kind, string> = { ok: "좋아요", tip: "이러면 더 잘 움직여요", no: "아직 어려워요" };
// 색만으로 구분하지 않는다 — 이름표 글자가 셋 다 다르다 (AGENTS.md 3.5)
const COLOR: Record<Kind, string> = { ok: "var(--mint)", tip: "var(--ink)", no: "var(--berry)" };

export default function S02Guide() {
  const nav = useNavigate();
  const level = useSettings((s) => s.level);
  // Level 1 은 「아직 어려워요」를 빼고 해도 되는 것만 보여준다
  const cards = level === 1 ? CARDS.filter((c) => c.kind !== "no") : CARDS;

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
              color: COLOR[c.kind],
            }}>{LABEL[c.kind]}</p>
            <p className="hint" style={{ fontSize: "var(--t-label)" }}>{c.text}</p>
          </div>
        ))}
      </div>
    </Screen>
  );
}
