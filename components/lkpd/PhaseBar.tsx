const P: Record<string, [string, string, string]> = {
  see: ["SEE", "Melihat permasalahan", "Lihat masalahnya: tonton video dan temukan apa yang terjadi."],
  think: ["THINK", "Memikirkan dan menganalisis", "Pikirkan penyebab dari berbagai sisi."],
  connect: ["CONNECT", "Menghubungkan dengan Pancasila", "Hubungkan kasus dengan sila dan nilai Pancasila."],
  act: ["ACT", "Melakukan tindakan nyata", "Tentukan solusi dan rencanakan aksi nyata."],
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
      className="phases"
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
