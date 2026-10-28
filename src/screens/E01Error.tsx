import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { Puzzled } from "@/components/illust";
import { useSession } from "@/store/session";
import { DRAW_TEXT, ERROR_TEXT } from "@/lib";
import { useWithAdult } from "@/store/settings";
import { STEP_ORDER } from "@/types/story";
import { isPictureError, pictureFails } from "@/store/retry";

/** 모달이 아니라 전체 화면으로 띄운다. 배경이 비치면 아이가 혼란스러워한다. */
export default function E01Error() {
  const nav = useNavigate();
  const { errorCode, setError, say } = useSession();
  const { photo } = useWithAdult();
  const base = ERROR_TEXT[errorCode ?? "ENGINE_ERROR"] ?? ERROR_TEXT.ENGINE_ERROR;
  // 사진 올리기가 꺼져 있으면(F-SET-06 기본) 그림은 화면에서 그린 것이다. 「찍기」 대신 「그리기」로 말한다
  const once = !photo && DRAW_TEXT[errorCode ?? ""] ? { ...base, ...DRAW_TEXT[errorCode ?? ""] } : base;
  // 그림이 연속으로 걸러지면 같은 안내로 돌려보내지 않는다 (05 E-01 「반복해서 걸러질 때」).
  // 2회면 화면에 그리기(S-03D)를 권하고, 3회부터는 어른을 부르게 한다. 주된 버튼은 계속 S-03D,
  // 3회부터는 「어른에게 도움 받기」(→ S-02 그림 안내를 어른과 같이 본다)를 더한다 (10/27 사용자 「다른 버튼도 필요」)
  const fails = isPictureError(errorCode) ? pictureFails() : 0;
  const t = fails >= 3 ? { ...once, hint: "옆에 있는 어른에게 도와 달라고 해 볼까요?", primary: "화면에 그리기" }
    : fails === 2 ? { ...once, hint: "화면에 그려 볼까요?", primary: "화면에 그리기" }
    : once;

  const primary = () => {
    setError(null);
    if (errorCode === "CONTENT_BLOCKED") {
      // 걸린 것은 대개 아이가 덧붙인 말이다. 말은 지우고 고른 카드는 두고 S-07 로 돌아간다
      STEP_ORDER.forEach((k) => say(k, null));
      nav("/steps");
      return;
    }
    nav(fails >= 2 ? "/draw" : errorCode === "ENGINE_ERROR" ? "/" : "/upload");
  };

  return (
    <Screen back={null} speech={t.title}
      acts={
        <>
          <BigButton go onClick={primary}>{t.primary}</BigButton>
          {fails >= 3
            ? <BigButton onClick={() => { setError(null); nav("/guide"); }}>어른에게 도움 받기</BigButton>
            : <BigButton onClick={() => { setError(null); nav("/"); }}>처음으로</BigButton>}
        </>
      }>
      {/* 빈 무대 대신 도화지 + 큰 글 (2026-10-28 디자인) */}
      <div className="hero">
        <div className="stage hero-sheet"><div className="illust-wrap"><Puzzled /></div></div>
        <div className="hero-side">
          <h2 className="hero-title">{t.title}</h2>
          <p className="hero-sub">{t.hint}</p>
        </div>
      </div>
      {/* 3회부터는 「처음으로」가 주된 줄에서 빠지므로 글자 줄로 남긴다 (한 화면의 주된 행동은 하나) */}
      {fails >= 3 && (
        <div className="aside-links">
          <button className="btn link" onClick={() => { setError(null); nav("/"); }}>처음으로</button>
        </div>
      )}
    </Screen>
  );
}
