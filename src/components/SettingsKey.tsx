import { useLocation, useNavigate } from "react-router-dom";

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" aria-hidden>
      <path d="M10.3 2.8h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9-2.6-.5v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8z" />
      <circle cx="12" cy="12" r="3.3" />
    </svg>
  );
}

/** 설정으로 가는 톱니 — **누구나 한 번 누르면** 열린다 (pt_docs 20 3장, 2026-11-06).
 *  전에는 자물쇠를 3초 꾹 눌러야 열려서 설정이 있는지조차 몰랐다(11/5 사용자 「기능이 숨어 있는 느낌」).
 *  아이가 바꾸면 안 되는 것은 설정 안 「보호자 칸」에 두고 보호자 비밀번호로 연다 (store/guardian).
 *  설정을 닫으면 들어오기 전 화면으로 돌아간다 (state.from) */
export default function SettingsKey() {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <button className="round" aria-label="설정" onClick={() => nav("/settings", { state: { from: loc.pathname } })}>
      <GearIcon />
    </button>
  );
}
