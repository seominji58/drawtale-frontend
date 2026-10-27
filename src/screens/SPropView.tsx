import { Navigate, useNavigate, useParams } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useGuardianMode } from "@/store/settings";
import { useProps } from "@/features/props/props";
import PropSizePicker from "@/features/props/PropSizePicker";

/** 내 소품 하나 보기 · 지우기 (2026-10-27 로컬 시험, open-decisions 0-13) */
export default function SPropView() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const prop = useProps((s) => s.mine.find((p) => p.id === id));
  const remove = useProps((s) => s.remove);
  const update = useProps((s) => s.update);
  // 보호자 모드에서만 연다 (open-decisions 0-13)
  const guardian = useGuardianMode();
  if (!guardian) return <Navigate to="/stories" replace />;
  if (!prop) return <Navigate to="/props" replace />;

  return (
    <Screen back="/props" speech={prop.name} title="내 소품"
      acts={
        <>
          <BigButton onClick={() => { remove(prop.id); nav("/props", { replace: true }); }}>지우기</BigButton>
          <BigButton go onClick={() => nav("/props")}>다 봤어요</BigButton>
        </>
      }>
      <h2 className="question">{prop.name}</h2>
      <p className="hint">장면에서 보일 크기를 고를 수 있어요</p>
      <div className="stage" style={{ padding: 24 }}>
        <div style={{ width: "min(100%, 520px)" }}>
          <PropSizePicker png={prop.png} size={prop.size ?? "m"} onSize={(size) => update(prop.id, { size })} />
        </div>
      </div>
    </Screen>
  );
}
