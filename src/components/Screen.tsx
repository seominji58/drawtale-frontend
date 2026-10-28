import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Segment } from "@/types/story";
import { useSettings, LEVEL_CONFIG } from "@/store/settings";
import { speak, stopSpeak } from "@/lib";

interface Props {
  /** C-01 되돌리기가 갈 곳. null 이면 숨긴다 */
  back?: string | (() => void) | null;
  /** C-02 다시 듣기가 읽어줄 문장. null 이면 숨긴다 */
  speech?: string | null;
  /** C-03 전체 진행 표시 구간 */
  segment?: Segment;
  /** 상단 레일 가운데 제목 (S-12, S-13, 어른 화면) */
  title?: string;
  /** 어른 화면은 밀도를 다르게 한다 */
  audience?: "child" | "adult";
  autoSpeak?: boolean;
  /** 레일 오른쪽에 다시 듣기 대신 둘 것 (S-01 설정 버튼) */
  railEnd?: ReactNode;
  acts?: ReactNode;
  children: ReactNode;
}

/** 레일 단추 그림. 글자(「뒤로」 · 「소리」)는 아이가 못 읽고 작아서 그림으로 (디자인 방향 A, 2026-10-28) */
export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function SoundIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9z" />
      <path d="M17 8c1.5 1.2 1.5 6.8 0 8" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export default function Screen({
  back = null, speech = null, segment = null, title,
  audience = "child", autoSpeak = true, railEnd, acts, children,
}: Props) {
  const nav = useNavigate();
  const { level, muteAll } = useSettings();
  const cfg = LEVEL_CONFIG[level];

  useEffect(() => {
    if (speech && autoSpeak && cfg.autoSpeak && audience === "child") speak(speech, muteAll);
    return stopSpeak;
  }, [speech, autoSpeak, cfg.autoSpeak, muteAll, audience]);

  const onBack = () => {
    if (typeof back === "function") back();
    else if (typeof back === "string") nav(back);
  };

  return (
    <div className="screen" data-audience={audience}>
      <div className="rail">
        <div className="rail-side">
          {back !== null && (
            <button className="round" onClick={onBack} aria-label="되돌리기"><BackIcon /></button>
          )}
        </div>
        <div className="rail-mid">
          {title
            ? <h1 className="rail-title">{title}</h1>
            : segment && (
                <div className="dots" role="img" aria-label={`전체 네 단계 중 ${segment}단계`}>
                  {[1, 2, 3, 4].map((i) => <i key={i} className={i === segment ? "on" : ""} />)}
                </div>
              )}
        </div>
        <div className="rail-side end">
          {railEnd ?? (speech !== null && (
            <button className="round" onClick={() => speak(speech, muteAll)} aria-label="다시 듣기">
              <SoundIcon />
            </button>
          ))}
        </div>
      </div>

      <div className="main">{children}</div>
      {acts && <div className="acts">{acts}</div>}
    </div>
  );
}
