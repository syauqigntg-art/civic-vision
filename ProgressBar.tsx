export function ProgressBar({ pct }: { pct: number }) { const n = Math.round(pct / 10);
  return (<div><div style={{ fontFamily: "monospace" }} aria-hidden="true">{"█".repeat(n) + "░".repeat(10 - n)} {pct}%</div>
    <div className="bar" role="progressbar" aria-label="Progress analisis" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><i style={{ width: pct + "%" }} /></div></div>); }
