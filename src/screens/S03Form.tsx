import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import ChoiceCard from "@/components/ChoiceCard";
import { useSession } from "@/store/session";
import { useForms, type FormDef } from "@/features/character/forms";
import type { StepChoice } from "@/types/story";

/** 형태 카드 그림 (public/forms, 11/4 사용자). 형태는 특정 동물이 아니라 몸 모양 안내선으로 —
 *  정면 강아지 그림은 「옆모습 · 다리 아래로」 그려야 하는 4족형과 맞지 않았다. 「다른 모습」은 새 · 나비 · 물고기 ·
 *  애벌레 · 하마 · 문어 · 고양이 모음(장면 그림을 합친 것)으로 사람이 아닌 친구 전부를 뜻한다 — 형태(날개 · 지느러미 · 긴 몸 · 네 발)를 하나씩, 11/5 사용자. 그림이 없는 형태는 물음표 */
const ICON: Record<string, string> = {
  biped: "biped.svg", quadruped: "quadruped.svg", chain: "chain.svg", finned: "finned.svg", winged: "winged.svg", radial: "radial.svg",
  nonhumanoid: "others.webp", none: "none.svg",
};
const ORDER = ["quadruped", "winged", "chain", "finned", "radial"];
const icon = (key: string) => `${import.meta.env.BASE_URL}forms/${ICON[key] ?? "none.svg"}`;
const card = (f: FormDef): StepChoice => ({ id: f.id, iconUrl: icon(f.id), label: f.kid_label });

/** S-03 「이 그림으로」 다음 — 「누구를 그렸어요?」 (pt_docs 19 5장, 2026-11-04).
 *  사람 관절 모델은 강아지도 사람으로 통과시켜 몸이 세로로 서서 비틀린 채 움직였다. 그래서 그림의 몸 구조(형태)를
 *  아이가 고른다 — 기본 · 보호자 모드 모두. 1단계 「두 발로 서는 친구 / 다른 모습 친구」, 다른 모습이면 2단계에서 형태별.
 *  준비된 형태만 서버가 보낸다(준비 안 된 것은 숨김). 2단계가 하나뿐이어도 무엇인지 확인받는다 */
export default function S03Form() {
  const nav = useNavigate();
  const { file, setForm } = useSession();
  // 「화면에 그리기」에서 왔다 — 형태를 고르면 그 모양 안내선으로 그리러 간다 (그림이 아직 없다)
  const st = useLocation().state as { draw?: boolean; other?: boolean } | null;
  const draw = !!st?.draw;
  const next = draw ? "/draw" : "/analyzing";
  const { forms, load } = useForms();
  // 그리기 화면에서 뒤로 왔으면 고르던 단계(다른 모습 친구)로 — 처음부터 다시 고르지 않게 (11/5 사용자)
  const [other, setOther] = useState(!!st?.other);
  // 2단계 「여기에 없어요」를 눌렀다 — 아직 준비 안 된 모양(물고기 · 새 …). 1단계로 돌아가 두 발 친구를 권한다
  const [missing, setMissing] = useState(false);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!file && !draw) nav("/upload", { replace: true }); }, [file, draw, nav]);

  const humanoid = forms.filter((f) => f.group === "humanoid");
  // 많이 그리는 순서로 (서버는 형태 이름 순서로 보낸다 — 4족형이 뒤로 밀렸다, 11/5). 목록에 없는 새 형태는 뒤에
  const rank = (id: string) => { const i = ORDER.indexOf(id); return i < 0 ? ORDER.length : i; };
  const nonhumanoid = forms.filter((f) => f.group === "nonhumanoid").sort((a, b) => rank(a.id) - rank(b.id));
  const choose = (id: string) => { setForm(id); nav(next); };

  // 서버가 다른 형태를 하나도 주지 않으면(예전 서버 · 목 엔진) 묻지 않고 사람으로 간다
  useEffect(() => {
    if (useForms.getState().loaded && nonhumanoid.length === 0) { setForm("biped"); nav(next, { replace: true }); }
  }, [forms, nonhumanoid.length, nav, setForm, next]);

  const step1: StepChoice[] = [
    ...humanoid.slice(0, 1).map(card),
    { id: "__other", iconUrl: icon("nonhumanoid"), label: "다른 모습 친구" },
  ];
  const step2: StepChoice[] = [...nonhumanoid.map(card), { id: "__none", iconUrl: icon("none"), label: "여기에 없어요" }];

  return (
    <Screen back={other ? () => setOther(false) : "/upload"} segment={1}
      speech={other ? "어떤 친구예요?" : missing ? "아직 준비 중인 모양이에요. 두 발 친구로 해 볼까요?" : "누구를 그렸어요?"}>
      {/* 소리를 꺼 둔 아이도 보게 — 「여기에 없어요」 다음에만 글로 */}
      {missing && !other && <h2 className="question">아직 준비 중인 모양이에요. 두 발 친구로 해 볼까요?</h2>}
      <div className="pick-area">
        <div className="choices form-choices" data-count={other ? step2.length : step1.length}>
          {(other ? step2 : step1).map((c) => (
            <ChoiceCard key={c.id} choice={c}
              onPick={(id) => (id === "__other" ? setOther(true)
                : id === "__none" ? (setMissing(true), setOther(false)) : choose(id))} />
          ))}
        </div>
      </div>
    </Screen>
  );
}
