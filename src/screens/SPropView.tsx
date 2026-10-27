import { Navigate, useNavigate, useParams } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useGuardianMode } from "@/store/settings";
import { useProps } from "@/features/props/props";

/** 내 소품 하나 보기 · 지우기 (2026-10-27 로컬 시험, open-decisions 0-13) */
export default function SPropView() {
  const nav = useNavigate();
  const { id = "" } = useParams();
  const prop = useProps((s) => s.mine.find((p) => p.id === id));
  const remove = useProps((s) => s.remove);
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
      <div className="stage">
        <img src={prop.png} alt={prop.name} style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
      </div>
    </Screen>
  );
}
