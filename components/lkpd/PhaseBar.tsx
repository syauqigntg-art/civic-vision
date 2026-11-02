const P: Record<string, [string, string, string]> = {
  see: ["SEE", "Mengamati masalah", "Amati video/stimulus, catat fakta, dan rumuskan masalah awal."],
  think: ["THINK", "Menganalisis masalah", "Telusuri penyebab, bukti, dampak, dan sudut pandang pihak terkait."],
  act: ["ACT", "Melaksanakan tindakan", "Laksanakan solusi dan dokumentasikan hasil tindakan kelompok."],
  connect: ["CONNECT", "Evaluasi dan refleksi", "Evaluasi hasil solusi, proses kerja kelompok, serta hubungkan pembelajaran dengan nilai Pancasila."],
  keep: ["KEEP", "Keberlanjutan aksi", "Susun komitmen dan rencana tindak lanjut agar perubahan positif terus dijaga."],
};

const ALL_PHASES = ["see", "think", "act", "connect", "keep"];
const ANALYSIS_PHASES = ["think", "act", "connect", "keep"];

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
      className={"phases" + (includeSee ? " five" : " four")}
      aria-label={includeSee ? "Lima tahap belajar STACK" : "Empat tahap analisis STACK"}
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
    <ol className="phases big five">
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
