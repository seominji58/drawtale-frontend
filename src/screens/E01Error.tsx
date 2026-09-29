import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Puzzled } from "@/components/illust";
import { useSession } from "@/store/session";
import { ERROR_TEXT } from "@/lib";
import { STEP_ORDER } from "@/types/story";

/** 모달이 아니라 전체 화면으로 띄운다. 배경이 비치면 아이가 혼란스러워한다. */
export default function E01Error() {
  const nav = useNavigate();
  const { errorCode, setError, say } = useSession();
  const t = ERROR_TEXT[errorCode ?? "ENGINE_ERROR"] ?? ERROR_TEXT.ENGINE_ERROR;

  const primary = () => {
    setError(null);
    if (errorCode === "CONTENT_BLOCKED") {
      // 걸린 것은 대개 아이가 덧붙인 말이다. 말은 지우고 고른 카드는 두고 S-07 로 돌아간다
      STEP_ORDER.forEach((k) => say(k, null));
      nav("/steps");
      return;
    }
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
