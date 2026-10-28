import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import GuideArt from "@/components/guideArt";
import type { GuideKind } from "@/components/guideArt";
import { useSettings, useWithAdult } from "@/store/settings";

/** ok: 지켜야 잘 되는 것, tip: 권하는 것, no: 아직 안 되는 것.
 *  tip 은 강요하지 않는다 — 팔을 몸에 붙여 그려도 캐릭터는 만들어진다. 다만 팔을 몸에서 띄워
 *  그리면 움직일 때 팔이 몸통에 눌려 뭉개지지 않는다 (docs/worklog.md 2026-09-29 「팔 모양」) */
type Kind = "ok" | "tip" | "no";
const CARDS: { kind: Kind; text: string; art: GuideKind }[] = [
  { kind: "ok", text: "사람을 한 명만 그려요", art: "one" },
  { kind: "ok", text: "하얀 종이에 그려요", art: "white" },
  { kind: "tip", text: "팔과 다리를 몸에서 조금 떨어지게 그려요", art: "spread" },
  { kind: "no", text: "여러 명은 아직 어려워요", art: "many" },
  // S-02-07 · S-02-08 (v0.4). 두 발로 선 동물은 되고 네 발 동물은 아직 안 된다 (06 R-01)
  { kind: "ok", text: "곰이나 로봇처럼 두 발로 선 친구도 돼요", art: "biped" },
  { kind: "no", text: "네 발로 걷는 동물은 아직 어려워요", art: "quad" },
];
/** S-02-09 (v0.4). 사람 사진은 받지 않는다 (06 R-11) */
const PHOTO_NOTE = "그린 그림을 올려 주세요";
const LABEL: Record<Kind, string> = { ok: "좋아요", tip: "이러면 더 잘 움직여요", no: "아직 어려워요" };
// 색만으로 구분하지 않는다 — 이름표 글자와 도장 모양이 셋 다 다르다 (AGENTS.md 3.5)
/** 카드 왼쪽 위 도장: 좋아요 = 초록 체크, 이러면 더 잘 = 노란 별, 아직 = 회색 점선 동그라미 안 「아직」 */
function Stamp({ kind }: { kind: Kind }) {
  if (kind === "ok") return (
    <span className="guide-stamp ok" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="#FFFDF8" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
  if (kind === "tip") return (
    <span className="guide-stamp tip" aria-hidden>
      <svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" fill="#FFFDF8" /></svg>
    </span>
  );
  return <span className="guide-stamp no" aria-hidden>아직</span>;
}

export default function S02Guide() {
  const nav = useNavigate();
  const level = useSettings((s) => s.level);
  // Level 1 은 「아직 어려워요」를 빼고 해도 되는 것만 보여준다
  const cards = level === 1 ? CARDS.filter((c) => c.kind !== "no") : CARDS;
  // S-02-06. 사진 올리기가 꺼져 있으면(F-SET-06 기본) 다음 화면은 화면에 그리기뿐이라 「찍기」라고 하지 않는다
  const { photo } = useWithAdult();

  return (
    <Screen back="/" speech={`이런 그림이 좋아요. ${PHOTO_NOTE}`} segment={1}
      acts={<BigButton go onClick={() => nav("/upload")}>{photo ? "그림 찍기" : "그림 그리기"}</BigButton>}>
      <h2 className="question">이런 그림이 좋아요</h2>
      {/* 카드마다 그 규칙을 보여 주는 그림 + 도장 (2026-10-28 디자인) */}
      <div className="guide-grid">
        {cards.map((c) => (
          <div key={c.text} className={`guide-card ${c.kind}`}>
            <Stamp kind={c.kind} />
            <div className="guide-art-wrap"><GuideArt kind={c.art} /></div>
            <p className="guide-label">{LABEL[c.kind]}</p>
            <p className="guide-text">{c.text}</p>
          </div>
        ))}
      </div>
      <p className="hint" style={{ textAlign: "center", fontSize: "var(--t-body)" }}>{PHOTO_NOTE}</p>
    </Screen>
  );
}
