import { useEffect, useState } from "react";
import { speak, stopSpeak } from "@/lib";
import { useSettings } from "@/store/settings";
import { useGuardian } from "@/store/guardian";

/** 아이 말풍선 — 화면마다 처음 한 번, 말풍선 1~2개를 소리로 읽어 준다 (pt_docs 20 3-2-1, 2026-11-06).
 *  글을 잘 못 읽는 아이라 짧게. 누르면 다음 말풍선, 마지막을 누르면 닫힌다(자동으로 닫히지 않는다 — 자동 전환 금지).
 *  본 것은 이 기기에 기억한다. 설정 아이 칸의 「화면 안내 다시 보기」가 지운다.
 *  보호자 소개 카드 · 비밀번호 창이 떠 있는 동안은 기다린다 */

const KEY = "storyblanks.coach";

function seen(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]; } catch { return []; }
}

export function resetCoach() {
  try { localStorage.removeItem(KEY); } catch { /* 없어도 된다 */ }
}

/** at: 말풍선 자리. 기본은 위(제목 자리), 아래 단추를 가리키는 말이면 bottom.
 *  11/7: 아래에 두니 형태 카드 글자 · 그리기 색 팔레트를 가렸다 (실제 모드 화면 점검) */
export default function Coach({ id, lines, at = "top" }: { id: string; lines: string[]; at?: "top" | "bottom" }) {
  const [i, setI] = useState(() => (seen().includes(id) ? -1 : 0));
  const blocked = useGuardian((s) => s.intro || !!s.request || s.status?.ageVerified === false);
  const mute = useSettings((s) => s.muteAll);
  const line = i >= 0 ? lines[i] : null;

  // 화면 안내 음성이 먼저 나오고 말풍선을 읽는다 — 화면 첫 문장과 겹치지 않게 조금 뒤에
  useEffect(() => {
    if (!line || blocked) return;
    const t = window.setTimeout(() => speak(line, mute), 900);
    return () => window.clearTimeout(t);
  }, [line, blocked, mute]);

  if (!line || blocked) return null;
  const next = () => {
    stopSpeak();
    if (i + 1 < lines.length) { setI(i + 1); return; }
    try { localStorage.setItem(KEY, JSON.stringify([...new Set([...seen(), id])])); } catch { /* 다음에 또 보일 뿐 */ }
    setI(-1);
  };

  return (
    <div className={`coach-layer ${at}`} role="dialog" aria-label="도움말" onClick={next}>
      <div className="coach">
        <span>{line}</span>
        <small>{i + 1 < lines.length ? "눌러서 다음" : "눌러서 닫기"}</small>
      </div>
    </div>
  );
}
