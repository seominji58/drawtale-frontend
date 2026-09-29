import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Screen from "@/components/Screen";
import BigButton from "@/components/BigButton";
import { useAuth } from "@/store/auth";
import { signup } from "@/api/auth";

export default function S16Signup() {
  const nav = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  const pwOk = pw.length >= 8;
  const matched = pw2.length > 0 && pw === pw2;
  const ready = !!email && pwOk && matched && agree && !busy;

  const submit = async () => {
    setBusy(true);
    try {
      const r = await signup(email, pw);
      auth.login(r.email, r.token);
      nav("/");
    } finally { setBusy(false); }
  };

  return (
    <Screen back="/login" speech={null} title="회원가입" audience="adult" autoSpeak={false}
      acts={<BigButton go disabled={!ready} onClick={submit}>
        {busy ? "만드는 중" : "가입하기"}
      </BigButton>}>
      <label className="field">
        <span>이메일</span>
        <input type="email" value={email} autoComplete="username"
          onChange={(e) => setEmail(e.target.value)} placeholder="보호자 또는 교사 이메일" />
      </label>
      <label className="field">
        <span>비밀번호</span>
        <input type="password" value={pw} autoComplete="new-password"
          onChange={(e) => setPw(e.target.value)} placeholder="8자 이상" />
        {pw.length > 0 && !pwOk && <em>8자 이상으로 지어 주세요</em>}
      </label>
      <label className="field">
        <span>비밀번호 확인</span>
        <input type="password" value={pw2} autoComplete="new-password"
          onChange={(e) => setPw2(e.target.value)} placeholder="다시 한 번" />
        {pw2.length > 0 && !matched && <em>비밀번호가 서로 달라요</em>}
      </label>
      <label className="check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        이용약관과 개인정보 처리방침에 동의합니다
      </label>
      <div className="spacer" />
      <div className="aside-links">
        <span>이미 계정이 있으신가요?</span>
        <button className="btn link" onClick={() => nav("/login")}>로그인</button>
      </div>
      <p className="hint" style={{ fontSize: "var(--t-label)" }}>
        아이의 이름과 나이, 사진은 계정에 저장하지 않습니다
      </p>
    </Screen>
  );
}
