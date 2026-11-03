const P: Record<string, [string, string, string]> = {
  see: ["SEE", "Mengamati Masalah", "Amati video/stimulus, catat fakta, dan rumuskan masalah awal."],
  think: ["THINK", "Menganalisis Masalah", "Telusuri penyebab, bukti, dampak, dan sudut pandang pihak terkait."],
  act: ["ACT", "Melaksanakan Tindakan", "Rancang dan laksanakan solusi, serta dokumentasikan hasil tindakan kelompok."],
  connect: ["CONNECT", "Evaluasi dan Refleksi", "Evaluasi hasil solusi, proses kerja kelompok, serta hubungkan pembelajaran dengan nilai Pancasila."],
  keep: ["KEEP", "Keberlanjutan Aksi", "Susun komitmen dan rencana tindak lanjut agar perubahan positif terus dijaga."],
};

const ALL_PHASES = ["see", "think", "act", "connect", "keep"];
const ANALYSIS_PHASES = ["think", "act", "connect", "keep"];
const ICONS: Record<string, string> = { see: "◉", think: "⌕", act: "ϟ", connect: "↔", keep: "✿" };

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
    <ol className={"phases" + (includeSee ? " five" : " four") + " cv-learning-phases"} aria-label={includeSee ? "Lima tahap belajar STACK" : "Empat tahap analisis STACK"}>
      {phases.map((phase, index) => {
        const isCurrent = phase === current;
        const isComplete = !isCurrent && completed.includes(phase);
        return (
          <li key={phase} className={"ph phase-" + phase + (isCurrent ? " on" : isComplete ? " ok" : " pending")} aria-current={isCurrent ? "step" : undefined}>
            <span className="cv-phase-topline">
              <span className="cv-phase-icon" aria-hidden="true">{ICONS[phase]}</span>
              <span className="cv-phase-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="cv-phase-state">{isCurrent ? "Sedang dikerjakan" : isComplete ? "✓ Selesai" : "Belum dimulai"}</span>
            </span>
            <b>{P[phase][0]}</b>
            <small>{P[phase][1]}</small>
          </li>
        );
      })}
    </ol>
  );
}

export function PhaseCards() {
  return (
    <ol className="phases big five student-phase-cards">
      {ALL_PHASES.map((phase, index) => (
        <li key={phase} className={`ph phase-${phase}`}>
          <div className="phase-card-head">
            <span className="phase-symbol" aria-hidden="true">{ICONS[phase]}</span>
            <b>{String(index + 1).padStart(2, "0")}. {P[phase][0]}</b>
          </div>
          <strong className="phase-card-title">{P[phase][1]}</strong>
          <p>{P[phase][2]}</p>
          <span className="phase-card-art" aria-hidden="true">{["▣","▤","◉","◆","✿"][index]}</span>
        </li>
      ))}
    </ol>
  );
}
