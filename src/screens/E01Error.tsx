import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Puzzled } from "@/components/illust";
import { useSession } from "@/store/session";
import { ERROR_TEXT } from "@/lib";

/** 모달이 아니라 전체 화면으로 띄운다. 배경이 비치면 아이가 혼란스러워한다. */
export default function E01Error() {
  const nav = useNavigate();
  const { errorCode, setError } = useSession();
  const t = ERROR_TEXT[errorCode ?? "ENGINE_ERROR"] ?? ERROR_TEXT.ENGINE_ERROR;

  const primary = () => {
    setError(null);
    nav(errorCode === "ENGINE_ERROR" ? "/" : "/upload");
  };

  return (
    <Screen back={null} speech={t.title}
      acts={
        <>
          <BigButton go onClick={primary}>{t.primary}</BigButton>
          <BigButton onClick={() => { setError(null); nav("/"); }}>처음으로</BigButton>
        </>
      }>
      <div className="stage">
        <div className="illust-wrap"><Puzzled /></div>
      </div>
      <h2 className="question">{t.title}</h2>
      <p className="hint">{t.hint}</p>
    </Screen>
  );
}
