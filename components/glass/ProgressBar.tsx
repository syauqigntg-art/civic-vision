export function ProgressBar({ pct }: { pct: number }) {
  const value = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;

  return (
    <div
      className="bar cv-progress-track"
      role="progressbar"
      aria-label="Progress jawaban wajib"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <i
        className="cv-progress-fill"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
