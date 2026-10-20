const P: Record<string, [string, string, string]> = { see: ["SEE", "Melihat permasalahan", "Lihat masalahnya: tonton video dan temukan apa yang terjadi."], think: ["THINK", "Memikirkan dan menganalisis", "Pikirkan penyebab dari berbagai sisi."],
  connect: ["CONNECT", "Menghubungkan dengan Pancasila", "Pahami nilainya: hubungkan kasus dengan sila dan nilai Pancasila."], act: ["ACT", "Melakukan tindakan nyata", "Temukan solusinya, wujudkan aksinya."] };
const KS = ["see", "think", "connect", "act"];
export function PhaseBar({ current }: { current?: string | null }) { const i = KS.indexOf(current || "");
  return (<ol className="phases" aria-label="Empat tahap belajar">{KS.map((k, j) => <li key={k} className={"ph" + (j === i ? " on" : j < i ? " ok" : "")} aria-current={j === i ? "step" : undefined}><b>{P[k][0]}</b><small>{P[k][1]}</small></li>)}</ol>); }
export function PhaseCards() { return (<ol className="phases big">{KS.map((k, j) => <li key={k} className="ph"><b>{j + 1}. {P[k][0]}</b><small>{P[k][1]}</small><p>{P[k][2]}</p></li>)}</ol>); }
