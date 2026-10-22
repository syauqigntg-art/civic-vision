const P: Record<string, [string, string, string]> = {
  see: ["SEE", "Mengamati masalah", "Amati video/stimulus, catat fakta, dan rumuskan masalah awal."],
  think: ["THINK", "Menganalisis masalah", "Telusuri penyebab, bukti, dampak, dan sudut pandang pihak terkait."],
  connect: ["CONNECT", "Menghubungkan konsep", "Hubungkan kasus dengan nilai Pancasila, hak-kewajiban, keadilan, atau konsep IPS."],
  act: ["ACT", "Merancang tindakan", "Susun solusi, langkah nyata, pembagian peran, dan indikator keberhasilan."],
};

const ALL_PHASES = ["see", "think", "connect", "act"];
const ANALYSIS_PHASES = ["think", "connect", "act"];

export function PhaseBar({
  current,
  includeSee = true,
  completed = [],
}: {
  current?: string | null;
  includeSee?: boolean;
  completed?: string[];
}) {
  const phases = includeSee ? ALL_PHASES : ANALYSIS_PHASES;

  return (
    <ol
      className={"phases" + (includeSee ? "" : " three")}
      aria-label={includeSee ? "Empat tahap belajar" : "Tiga tahap analisis"}
    >
      {phases.map((phase) => {
        const isCurrent = phase === current;
        const isComplete = !isCurrent && completed.includes(phase);

        return (
          <li
            key={phase}
            className={"ph" + (isCurrent ? " on" : isComplete ? " ok" : "")}
            aria-current={isCurrent ? "step" : undefined}
          >
            <b>{P[phase][0]}</b>
            <small>{P[phase][1]}</small>
            {isComplete && <small aria-label="Tahap selesai">✓ Selesai</small>}
          </li>
        );
      })}
    </ol>
  );
}

export function PhaseCards() {
  return (
    <ol className="phases big">
      {ALL_PHASES.map((phase, index) => (
        <li key={phase} className="ph">
          <b>{index + 1}. {P[phase][0]}</b>
          <small>{P[phase][1]}</small>
          <p>{P[phase][2]}</p>
        </li>
      ))}
    </ol>
  );
}
