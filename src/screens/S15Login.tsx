import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useAuth, trialLeft } from "@/store/auth";
import { login } from "@/api/auth";

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
      auth.login(r.email, r.token);
      nav("/");
    } catch {
      setErr(true);   // 어느 칸이 틀렸는지 구분해 알려주지 않는다
    } finally { setBusy(false); }
  };

  return (
    <Screen back="/welcome" speech={null} title="로그인" audience="adult" autoSpeak={false}
      acts={<BigButton go disabled={!email || !pw || busy} onClick={submit}>
        {busy ? "확인하는 중" : "로그인"}
      </BigButton>}>
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

      <div className="spacer" />

      <div className="aside-links">
        <span>계정이 없으신가요?</span>
        <button className="btn link" onClick={() => nav("/signup")}>회원가입</button>
        {left > 0 && (
          <>
            <span className="sep">·</span>
            <button className="btn link" onClick={() => { auth.startGuest(); nav("/"); }}>
              로그인 없이 시작
            </button>
          </>
        )}
      </div>
    </Screen>
  );
}
