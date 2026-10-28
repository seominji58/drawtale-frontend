import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useAuth, trialLeft } from "@/store/auth";
import { login } from "@/api/auth";
import SocialButtons from "@/components/SocialButton";

export default function S15Login() {
  const nav = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const left = trialLeft();

  const submit = async () => {
    setBusy(true); setErr(false);
    try {
      const r = await login(email, pw);
      auth.login(r.account, r.token);
      nav("/");
    } catch {
      setErr(true);   // 어느 칸이 틀렸는지 구분해 알려주지 않는다
    } finally { setBusy(false); }
  };

  // 가운데 찢은 종이 카드 하나 (2026-10-28 디자인 — 시안 L-Fiber 의 가장자리). 주된 행동(로그인)은 카드 안에
  return (
    <Screen back="/welcome" speech={null} audience="adult" autoSpeak={false}>
      <div className="auth-wrap">
        <form className="paper-card auth-card" onSubmit={(e) => { e.preventDefault(); if (email && pw && !busy) submit(); }}>
          <span className="tape" aria-hidden />
          <p className="auth-brand">한칸이야기</p>
          <h1 className="auth-title">보호자 · 선생님 로그인</h1>
          <p className="auth-sub">계정은 어른의 것이에요. 아이는 로그인하지 않아요.</p>
          <SocialButtons intent="login" />
          <p className="auth-sub" style={{ fontSize: 13 }}>
            카카오·구글에서는 회원번호만 받습니다. 이름·이메일·사진은 받지 않아요.
            처음이시면 회원가입 화면에서 약관에 동의한 뒤 시작합니다.
          </p>
          <p className="auth-or">또는 이메일로</p>
          <label className="field">
            <span>이메일</span>
            <input type="email" value={email} autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} placeholder="보호자 또는 교사 이메일" />
          </label>
          <label className="field">
            <span>비밀번호</span>
            <input type="password" value={pw} autoComplete="current-password"
              onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" />
          </label>
          {err && <div className="box err">이메일이나 비밀번호가 맞지 않아요</div>}
          <BigButton go disabled={!email || !pw || busy} onClick={submit}>
            {busy ? "확인하는 중" : "로그인"}
          </BigButton>
          <div className="aside-links">
            <span>계정이 없으신가요?</span>
            <button type="button" className="btn link" onClick={() => nav("/signup")}>회원가입</button>
            {left > 0 && (
              <>
                <span className="sep">·</span>
                <button type="button" className="btn link" onClick={() => { auth.startGuest(); nav("/"); }}>
                  로그인 없이 시작
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </Screen>
  );
}
