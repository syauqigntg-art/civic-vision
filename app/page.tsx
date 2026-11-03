import { PhaseCards } from "@/components/lkpd/PhaseBar";
import Link from "next/link";

const features = [
  { icon: "▶", title: "Video Kasus", description: "Amati materi dan fenomena yang telah ditugaskan guru untuk kelompokmu.", href: "/lkpd/kasus", tone: "blue", number: "01" },
  { icon: "♧", title: "Analisis Kelompok", description: "Bangun pemahaman dan susun jawaban bersama kelompok secara kolaboratif.", href: "/lkpd/identitas", tone: "violet", number: "02" },
  { icon: "✿", title: "Aksi Nyata", description: "Hubungkan pembelajaran dengan tindakan yang mencerminkan nilai Pancasila.", href: "/lkpd/identitas", tone: "mint", number: "03" },
];

export default function Home() {
  return (
    <div className="student-dashboard">
      <section className="student-hero">
        <div className="student-hero-copy">
          <span className="student-eyebrow"><i /> RUANG BELAJAR DIGITAL PANCASILA</span>
          <h1>Menganalisis Pancasila <em>dalam Kehidupan Sehari-hari</em></h1>
          <p>Amati persoalan di sekitar, telusuri akar masalah, lakukan aksi nyata, lalu refleksikan dampaknya bersama kelompokmu.</p>
          <div className="student-hero-motto">Amati <b>·</b> Analisis <b>·</b> Refleksikan <b>·</b> Terapkan</div>
          <Link className="student-cta" href="/lkpd/identitas">Mulai perjalanan LKPD <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="student-hero-art" aria-hidden="true">
          <div className="hero-art-label"><span>INDONESIA</span><b>Beragam dalam persatuan</b></div>
          <div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/>
          <div className="hero-sun" />
          <div className="hero-skyline"><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
          <div className="hero-garuda"><span>✦</span><small>B H I N N E K A</small></div>
          <div className="hero-flag"><span/><span/></div>
          <div className="hero-monument"><i/></div>
          <div className="hero-cloud cloud-one"/><div className="hero-cloud cloud-two"/>
          <div className="hero-art-caption"><span>✦</span> PANCASILA · IDENTITAS KITA</div>
        </div>
        <div className="hero-glass-reflection" />
      </section>

      <section className="student-stack-panel">
        <div className="student-stack-topline">
          <div><span className="student-section-kicker">PERJALANAN BELAJARMU</span><h2>Jelajahi 5 Tahap STACK</h2><p>Setiap tahap membawamu dari memahami masalah hingga menjaga perubahan.</p></div>
          <span className="stack-count">05 <small>TAHAP</small></span>
        </div>
        <PhaseCards />
        <div className="stack-footer"><span>01 — 05</span><span>Mulai dari pengamatan, akhiri dengan keberlanjutan aksi.</span></div>
      </section>

      <section className="student-features-section">
        <div className="student-section-heading"><div><span className="student-section-kicker">FASILITAS PEMBELAJARAN</span><h2>Belajar, berdiskusi, dan bergerak</h2></div><span className="feature-heading-note">Pilih aktivitas untuk melanjutkan</span></div>
        <div className="student-feature-grid" aria-label="Fitur pembelajaran">
          {features.map((feature) => (
            <Link className={`student-feature-card ${feature.tone}`} href={feature.href} key={feature.title}>
              <span className="feature-card-top"><span>{feature.number}</span><span className="student-feature-arrow" aria-hidden="true">↗</span></span>
              <span className="student-feature-icon" aria-hidden="true">{feature.icon}</span>
              <span className="student-feature-copy"><strong>{feature.title}</strong><small>{feature.description}</small></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
