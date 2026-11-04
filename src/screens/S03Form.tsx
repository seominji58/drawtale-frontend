import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import ChoiceCard from "@/components/ChoiceCard";
import { useSession } from "@/store/session";
import { useForms, type FormDef } from "@/features/character/forms";
import type { StepChoice } from "@/types/story";

/** 형태 카드 그림 — 장면 층의 인물 · 동물 그림을 다시 쓴다. 없는 형태는 고양이 */
const ICON: Record<string, string> = { biped: "friend", quadruped: "dog", nonhumanoid: "cat" };
const icon = (key: string) => `${import.meta.env.BASE_URL}scenes/props/${ICON[key] ?? "cat"}.webp`;
const card = (f: FormDef): StepChoice => ({ id: f.id, iconUrl: icon(f.id), label: f.kid_label });

/** S-03 「이 그림으로」 다음 — 「누구를 그렸어요?」 (pt_docs 19 5장, 2026-11-04).
 *  사람 관절 모델은 강아지도 사람으로 통과시켜 몸이 세로로 서서 비틀린 채 움직였다. 그래서 그림의 몸 구조(형태)를
 *  아이가 고른다 — 기본 · 보호자 모드 모두. 1단계 「두 발로 서는 친구 / 다른 모습 친구」, 다른 모습이면 2단계에서 형태별.
 *  준비된 형태만 서버가 보낸다(준비 안 된 것은 숨김). 2단계가 하나뿐이어도 무엇인지 확인받는다 */
export default function S03Form() {
  const nav = useNavigate();
  const { file, setForm } = useSession();
  const { forms, load } = useForms();
  const [other, setOther] = useState(false);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!file) nav("/upload", { replace: true }); }, [file, nav]);

  const humanoid = forms.filter((f) => f.group === "humanoid");
  const nonhumanoid = forms.filter((f) => f.group === "nonhumanoid");
  const choose = (id: string) => { setForm(id); nav("/analyzing"); };

  // 서버가 다른 형태를 하나도 주지 않으면(예전 서버 · 목 엔진) 묻지 않고 사람으로 간다
  useEffect(() => {
    if (useForms.getState().loaded && nonhumanoid.length === 0) { setForm("biped"); nav("/analyzing", { replace: true }); }
  }, [forms, nonhumanoid.length, nav, setForm]);

  const step1: StepChoice[] = [
    ...humanoid.slice(0, 1).map(card),
    { id: "__other", iconUrl: icon("nonhumanoid"), label: "다른 모습 친구" },
  ];

  return (
    <Screen back={other ? () => setOther(false) : "/upload"} segment={1}
      speech={other ? "어떤 친구예요?" : "누구를 그렸어요?"}>
      <div className="pick-area">
        <div className="choices" data-count={other ? nonhumanoid.length : step1.length}>
          {(other ? nonhumanoid.map(card) : step1).map((c) => (
            <ChoiceCard key={c.id} choice={c}
              onPick={(id) => (id === "__other" ? setOther(true) : choose(id))} />
          ))}
        </div>
      </div>
    </Screen>
  );
}
