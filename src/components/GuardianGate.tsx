import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BigButton from "./BigButton";
import { checkGuardianPin, setGuardianPin } from "@/api";
import type { PinResult } from "@/api";
import { useGuardian } from "@/store/guardian";
import type { PinMode } from "@/store/guardian";
import { useAuth } from "@/store/auth";

/** 보호자 비밀번호 창 (숫자 4자리, 큰 숫자 단추) — pt_docs 20 3장, 2026-11-06.
 *  store/guardian 의 request 가 있으면 뜬다. App 에 하나만 둔다.
 *
 *  - check: 넣으면 서버가 확인. 틀리면 남은 기회, 다섯 번 틀리면 5분 막힘을 보인다
 *  - create · reset: 두 번 넣어 같으면 만든다 (reset 은 「잊었어요」 → 다시 로그인한 뒤 10분 안)
 *  - change: 지금 비밀번호 → 새 비밀번호 두 번
 *  아이가 보지 않는 어른 창이라 어른 화면 크기(data-audience="adult")로 둔다 */

type Step = "current" | "new" | "again";

const firstStep = (mode: PinMode): Step => (mode === "check" || mode === "change" ? "current" : "new");

const HEAD: Record<PinMode, Record<Step, string>> = {
  check: { current: "보호자 비밀번호를 넣어 주세요", new: "", again: "" },
  create: { current: "", new: "보호자 비밀번호를 만들어 주세요", again: "한 번 더 눌러 주세요" },
  reset: { current: "", new: "새 보호자 비밀번호를 정해 주세요", again: "한 번 더 눌러 주세요" },
  change: { current: "지금 비밀번호를 넣어 주세요", new: "새 비밀번호를 넣어 주세요", again: "한 번 더 눌러 주세요" },
};

function failText(r: PinResult): string {
  if (r.ok) return "";
  switch (r.reason) {
    case "wrong": return r.triesLeft > 0 ? `비밀번호가 맞지 않아요 · 남은 기회 ${r.triesLeft}번` : "비밀번호가 맞지 않아요";
    case "locked": return `여러 번 틀려서 잠시 막혔어요 · ${Math.max(1, Math.ceil(r.retryAfter / 60))}분 뒤에 다시 해 주세요`;
    case "required": return "다시 로그인한 지 10분이 지났어요. 「비밀번호를 잊었어요」로 다시 해 주세요";
    case "not_set": return "아직 비밀번호가 없어요. 새로 만들어 주세요";
    default: return "인터넷 연결을 확인하고 다시 해 주세요";
  }
}

export default function GuardianGate() {
  const req = useGuardian((s) => s.request);
  if (!req) return null;
  // 요청이 바뀌면 처음부터 (key)
  return <PinPad key={`${req.mode}:${req.title}`} mode={req.mode} title={req.title} />;
}

function PinPad({ mode: startMode, title }: { mode: PinMode; title: string }) {
  const nav = useNavigate();
  const finish = useGuardian((s) => s.finish);
  const [mode, setMode] = useState<PinMode>(startMode);
  const [step, setStep] = useState<Step>(firstStep(startMode));
  const [digits, setDigits] = useState("");
  const [current, setCurrent] = useState("");
  const [first, setFirst] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const pinOf = (m: PinMode) => (m === "change" ? current : undefined);

  const submit = async (pin: string) => {
    if (step === "current") {
      if (mode === "change") { setCurrent(pin); setStep("new"); setDigits(""); setMsg(null); return; }
      setBusy(true);
      const r = await checkGuardianPin(pin);
      setBusy(false);
      setDigits("");
      if (r.ok) { finish(true); return; }
      if (r.reason === "not_set") { setMode("create"); setStep("new"); }
      setMsg(failText(r));
      return;
    }
    if (step === "new") { setFirst(pin); setStep("again"); setDigits(""); setMsg(null); return; }
    // again
    if (pin !== first) { setStep("new"); setFirst(""); setDigits(""); setMsg("두 번 넣은 숫자가 달라요. 처음부터 다시 넣어 주세요"); return; }
    setBusy(true);
    const r = await setGuardianPin(pin, pinOf(mode));
    setBusy(false);
    setDigits("");
    if (r.ok) { finish(true); return; }
    // 바꾸기에서 지금 비밀번호가 틀렸으면 처음(지금 비밀번호)부터
    setStep(mode === "change" ? "current" : "new");
    setFirst("");
    setMsg(failText(r));
  };

  const press = (d: string) => {
    if (busy) return;
    const next = (digits + d).slice(0, 4);
    setDigits(next);
    if (next.length === 4) void submit(next);
  };
  const erase = () => { if (!busy) setDigits((v) => v.slice(0, -1)); };
  const close = () => { if (!busy) finish(false); };

  // 컴퓨터에서는 숫자 · 지우기 · Esc 키로도
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") erase();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const relogin = () => {
    useGuardian.getState().startReset();
    useAuth.getState().logout();
    nav("/login", { replace: true });
  };

  return (
    <div className="rename-layer" data-audience="adult" role="dialog" aria-modal="true" aria-label={title}
         onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="paper-card rename-card pin-card">
        <p className="pin-title">🔒 {title}</p>
        {forgot ? (
          <>
            <p className="hint">다시 로그인(카카오 · 구글)하면 지금 비밀번호 없이 새 비밀번호를 정할 수 있어요.
              로그인한 뒤 10분 안에 보호자 칸을 열어 주세요.</p>
            <div className="rename-acts">
              <BigButton onClick={() => setForgot(false)}>돌아가기</BigButton>
              <BigButton go onClick={relogin}>다시 로그인</BigButton>
            </div>
          </>
        ) : (
          <>
            <p className="rename-label">{HEAD[mode][step]}</p>
            <div className="pin-dots" aria-label={`${digits.length}자리 넣음`}>
              {[0, 1, 2, 3].map((i) => <i key={i} className={i < digits.length ? "on" : ""} />)}
            </div>
            <p className={`pin-msg ${msg && !busy ? "bad" : ""}`} role="status">
              {busy ? "확인하고 있어요" : msg ?? (mode === "create" || mode === "reset" ? "숫자 4자리, 아이가 모르는 숫자로 정해 주세요" : " ")}</p>
            <div className="pin-pad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button key={d} type="button" className="pin-key" disabled={busy} onClick={() => press(d)}>{d}</button>
              ))}
              <button type="button" className="pin-key small" onClick={close}>닫기</button>
              <button type="button" className="pin-key" disabled={busy} onClick={() => press("0")}>0</button>
              <button type="button" className="pin-key small" disabled={busy || !digits} onClick={erase} aria-label="한 자리 지우기">지우기</button>
            </div>
            {(mode === "check" || mode === "change") && step === "current" && (
              <button type="button" className="btn link pin-forgot" onClick={() => setForgot(true)}>비밀번호를 잊었어요</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
