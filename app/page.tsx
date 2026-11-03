import { PhaseCards } from "@/components/lkpd/PhaseBar";
import Link from "next/link";

const features = [
  { icon: "▶", title: "Video Kasus", description: "Simak dan pahami kasus nyata yang ditugaskan guru.", href: "/lkpd/kasus", tone: "blue" },
  { icon: "♧", title: "Analisis Kelompok", description: "Diskusikan, susun gagasan, dan rumuskan solusi bersama.", href: "/lkpd/identitas", tone: "violet" },
  { icon: "✿", title: "Aksi Nyata", description: "Wujudkan solusi yang sesuai dengan nilai-nilai Pancasila.", href: "/lkpd/identitas", tone: "mint" },
];

export default function Home() {
  return (
    <div className="student-dashboard">
      <section className="student-hero">
        <div className="student-hero-copy">
          <span className="student-eyebrow">CIVIC VISION</span>
          <h1>Menganalisis Pancasila<br />dalam Kehidupan Sehari-hari</h1>
          <p>Ruang belajar digital untuk mengamati kasus, menganalisis masalah, melaksanakan solusi, mengevaluasi proses pemecahan masalah, dan menjaga keberlanjutan aksi.</p>
          <div className="student-hero-motto"><span>◎</span> Amati. <i/> <span>⌕</span> Analisis. <i/> <span>♧</span> Refleksikan. <i/> <span>⚑</span> Terapkan.</div>
          <Link className="student-cta" href="/lkpd/identitas">Mulai LKPD <span aria-hidden="true">→</span></Link>
        </div>
        <div className="student-hero-art" aria-hidden="true">
          <img
            className="student-hero-illustration"
            src="/images/pancasila-hero.svg"
            alt=""
            width="900"
            height="620"
          />
          <div className="hero-art-caption">PANCASILA · IDENTITAS KITA</div>
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
        <div className="student-stack-heading">
          <span aria-hidden="true">▤</span>
          <h2>Alur Belajar STACK</h2>
          <small>Model Project Based Learning (PBL)</small>
        </div>
        <PhaseCards />
      </section>
    </div>
  );
}
