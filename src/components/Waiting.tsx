import type { ReactNode } from "react";

export default function Waiting({
  message, steps, current, diagnostics, art,
}: {
  message: string; steps: number; current: number;
  diagnostics?: string | null; art?: ReactNode;
}) {
  return (
    <div className="wait">
      <div className="mark">{art}</div>
      <p className="msg">{message}</p>
      <div className="dots" role="img" aria-label={`${steps}단계 중 ${current}단계`}>
        {Array.from({ length: steps }, (_, i) => (
          <i key={i} className={i < current ? "on" : ""} />
        ))}
      </div>
      {diagnostics && <p className="diag">{diagnostics}</p>}
    </div>
  );
}
