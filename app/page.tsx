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
          <h1>Belajar Memahami Persoalan,<br />Berpikir Kritis, dan Bertindak</h1>
          <p>Civic Vision adalah platform pembelajaran digital Pendidikan Pancasila yang mengintegrasikan pendekatan Problem-Based Learning melalui kerangka STACK (SEE, THINK, ACT, CONNECT, KEEP). Peserta didik diajak mengamati persoalan kewarganegaraan, menginvestigasi dan menganalisis masalah, merancang solusi, mengomunikasikan gagasan, serta merefleksikan pembelajaran dalam kehidupan nyata.</p>
          <div className="student-hero-motto"><span>◎</span> SEE <i/> <span>⌕</span> THINK <i/> <span>✦</span> ACT <i/> <span>↗</span> CONNECT <i/> <span>⟳</span> KEEP</div>
          <Link className="student-cta" href="/lkpd/identitas">Mulai LKPD <span aria-hidden="true">→</span></Link>
        </div>
        <div className="student-hero-art" aria-hidden="true">
          <img
            className="hero-image"
            src="/images/civic-vision-hero.png"
            alt="Ilustrasi Garuda Pancasila, bendera Merah Putih pada tiang, Monumen Nasional, dan cakrawala kota Indonesia"
            width="1672"
            height="941"
            loading="eager"
            fetchPriority="high"
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
