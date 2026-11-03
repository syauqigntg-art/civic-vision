import { PhaseCards } from "@/components/lkpd/PhaseBar";
import Link from "next/link";

const features = [
  { icon: "▶", title: "Video Kasus", description: "Siswa melihat materi yang telah ditugaskan guru untuk kelompoknya.", href: "/lkpd/kasus", tone: "blue" },
  { icon: "♧", title: "Analisis Kelompok", description: "Jawaban disimpan per kelompok dan tidak dibagikan kepada kelompok lain.", href: "/lkpd/identitas", tone: "violet" },
  { icon: "✿", title: "Aksi Nyata", description: "Hasil pembelajaran mengarah pada solusi yang sesuai dengan nilai Pancasila.", href: "/lkpd/identitas", tone: "mint" },
];

export default function Home() {
  return (
    <div className="student-dashboard">
      <section className="student-hero">
        <div className="student-hero-copy">
          <span className="student-eyebrow">CIVIC VISION</span>
          <h1>Menganalisis Pancasila<br />dalam Kehidupan Sehari-hari</h1>
          <p>Ruang belajar digital untuk mengamati kasus, menganalisis masalah, melaksanakan solusi, mengevaluasi proses pemecahan masalah, dan menjaga keberlanjutan aksi.</p>
          <strong>Amati. Analisis. Refleksikan. Terapkan.</strong>
          <Link className="student-cta" href="/lkpd/identitas">Mulai LKPD <span aria-hidden="true">→</span></Link>
        </div>
        <div className="student-hero-art" aria-hidden="true">
          <div className="hero-sun" />
          <div className="hero-skyline"><i/><i/><i/><i/><i/><i/><i/></div>
          <div className="hero-garuda">✦</div>
          <div className="hero-flag"><span/><span/></div>
          <div className="hero-monument"><i/></div>
          <div className="hero-cloud cloud-one"/><div className="hero-cloud cloud-two"/>
        </div>
      </section>

      <section className="student-feature-grid" aria-label="Fitur pembelajaran">
        {features.map((feature) => (
          <Link className={`student-feature-card ${feature.tone}`} href={feature.href} key={feature.title}>
            <span className="student-feature-icon" aria-hidden="true">{feature.icon}</span>
            <span className="student-feature-copy"><strong>{feature.title}</strong><small>{feature.description}</small></span>
            <span className="student-feature-arrow" aria-hidden="true">→</span>
          </Link>
        ))}
      </section>

      <section className="student-stack-panel">
        <div className="student-stack-heading"><span aria-hidden="true">▤</span><h2>Alur Belajar STACK</h2></div>
        <PhaseCards />
      </section>
    </div>
  );
}
