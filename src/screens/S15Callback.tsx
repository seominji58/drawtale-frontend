import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useAuth } from "@/store/auth";
import { finishSocialLogin, PROVIDER_NAME } from "@/api/auth";
import type { SocialProvider } from "@/api/auth";

/** S-15 소셜 로그인에서 돌아오는 자리 (`/auth/:provider/callback`).
 *  설계서에 없는 화면이다. 로그인 흐름의 일부라 S-15 에 붙인다 (open-decisions 0-3). */
export default function S15Callback() {
  const nav = useNavigate();
  const { provider = "" } = useParams();
  const [params] = useSearchParams();
  const login = useAuth((s) => s.login);
  const [failed, setFailed] = useState(false);

  const p = provider as SocialProvider;
  const name = PROVIDER_NAME[p] ?? provider;

  useEffect(() => {
    if (!(p in PROVIDER_NAME)) { setFailed(true); return; }
    finishSocialLogin(p, params)
      .then((r) => { login(r.account, r.token); nav("/", { replace: true }); })
      .catch((e: Error) => {
        // 카카오 화면에서 취소했으면 오류로 보이지 않고 로그인 화면으로 돌아간다
        if (e.message === "CANCELLED") nav("/login", { replace: true });
        // 처음 온 사람이다. 약관 동의를 받은 뒤 가입한다
        else if (e.message === "SIGNUP_REQUIRED") nav("/signup", { replace: true, state: { social: p } });
        else setFailed(true);
      });
  }, [p, params, login, nav]);

  return (
    <Screen back={null} speech={null} title="로그인" audience="adult" autoSpeak={false}
      acts={failed ? <BigButton go onClick={() => nav("/login", { replace: true })}>로그인으로 돌아가기</BigButton> : undefined}>
      <div className="spacer" />
      {failed
        ? <div className="box err">{name} 로그인을 마치지 못했습니다. 다시 시도해 주세요</div>
        : <p className="hint" style={{ textAlign: "center" }}>{name} 계정을 확인하고 있어요</p>}
      <div className="spacer" />
    </Screen>
  );
}
