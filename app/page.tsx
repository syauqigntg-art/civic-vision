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
          <svg className="hero-landscape" viewBox="0 0 800 460" role="img" aria-label="Ilustrasi Garuda Pancasila, bendera Indonesia, Monas, dan cakrawala kota">
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9bd4ff"/><stop offset=".58" stopColor="#4d9ce4"/><stop offset="1" stopColor="#1c579c"/></linearGradient>
              <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff0bd"/><stop offset=".48" stopColor="#d6a64d"/><stop offset="1" stopColor="#805323"/></linearGradient>
              <linearGradient id="redFlag" x1="0" y1="0" x2="1" y2=".3"><stop stopColor="#c90020"/><stop offset=".5" stopColor="#f52b3c"/><stop offset="1" stopColor="#a9001c"/></linearGradient>
              <linearGradient id="whiteFlag" x1="0" y1="0" x2="1" y2=".3"><stop stopColor="#dceeff"/><stop offset=".5" stopColor="#fff"/><stop offset="1" stopColor="#b8d6f0"/></linearGradient>
              <linearGradient id="city" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#285f9b"/><stop offset=".5" stopColor="#d8efff"/><stop offset="1" stopColor="#397ab4"/></linearGradient>
              <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
            </defs>
            <rect width="800" height="460" fill="url(#sky)" opacity=".2"/>
            <circle cx="535" cy="95" r="92" fill="#fff4d5" opacity=".48" filter="url(#softShadow)"/>
            <g fill="#fff" opacity=".3"><path d="M40 100q28-38 68-5 35-22 62 9-9 23-45 18H62q-27 0-22-22Z"/><path d="M460 55q26-32 58-3 28-20 50 7-8 20-37 17h-55q-23 0-16-21Z"/></g>
            <g fill="url(#city)" opacity=".76">
              <path d="M0 354V270h36v-30h28v114H0Zm70 0V218h42v-24h24v160H70Zm76 0V264h34v-44h29v134h-63Zm74 0V234h55v120h-55Zm66 0V280h30v-78h36v152h-66Zm78 0V246h46v-34h22v142h-68Zm78 0V280h30v-58h35v132h-65Zm74 0V230h48v124h-48Zm58 0V270h32v-67h32v151h-64Zm77 0V240h54v114h-54Zm65 0V278h38v-49h29v125h-67Z"/>
              <path d="M0 354h800v106H0Z" fill="#1e5288" opacity=".6"/>
            </g>
            <g stroke="#d9efff" strokeWidth="3" opacity=".42"><path d="M92 238v-12m15 12v-12m71 54v-12m17 12v-12m125 28v-14m17 14v-14m143 10v-14m18 14v-14m132-6v-14m18 14v-14m75 31v-13"/></g>
            <!-- Garuda Pancasila: spread wings, crowned head, body, and shield -->
            <g transform="translate(205 86)" fill="url(#gold)" stroke="#805a2b" strokeWidth="3" strokeLinejoin="round">
              <path d="M0 76Q-45 24-111 10q22 38 15 65-24-27-61-31 28 43 21 78-18-15-43-14 37 45 93 50 36 4 66-13l20-34Z"/>
              <path d="M0 76Q45 24 111 10q-22 38-15 65 24-27 61-31-28 43-21 78 18-15 43-14-37 45-93 50-36 4-66-13l-20-34Z"/>
              <path d="M-10 52Q-22 20-5 0L0-23 5 0Q22 20 10 52l18 46-28 34-28-34Z"/>
              <path d="M-8-14Q-28-31-16-49L0-39 16-49Q28-31 8-14L0-4Z"/>
              <path d="M-9 127Q-44 144-72 131q20 31 72 24 52 7 72-24-28 13-63-4l-9-22Z"/>
              <path d="M-28 61 0 49 28 61 23 112 0 130-23 112Z" fill="#b92732"/>
              <path d="M-20 71 0 62 20 71 17 105 0 119-17 105Z" fill="#f3d47e"/>
              <path d="M-12 82 0 76 12 82 9 99 0 106-9 99Z" fill="#1c4d8a"/>
              <path d="M-30 147q30 15 60 0l22 20-52-5-52 5Z"/>
            </g>
            <!-- Indonesian flag with visible pole, finial and waving cloth -->
            <g transform="translate(470 82)">
              <path d="M0 0V310" stroke="#eaf5ff" strokeWidth="7" strokeLinecap="round"/>
              <path d="M0 0v310" stroke="#7696b6" strokeWidth="2"/>
              <path d="M-7 0q7-13 14 0Z" fill="url(#gold)"/>
              <path d="M4 20Q65 5 133 31q-19 20 0 42Q67 48 4 68Z" fill="url(#redFlag)" stroke="#a51b2c" strokeWidth="1.5"/>
              <path d="M4 68Q67 48 133 73q-19 20 0 42Q67 91 4 116Z" fill="url(#whiteFlag)" stroke="#b7d4ec" strokeWidth="1.5"/>
              <path d="M5 23q58-13 112 5M5 70q58-13 112 5" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="3"/>
              <path d="M-9 310h18l12 12h-42Z" fill="#dcecff"/>
            </g>
            <!-- Monas silhouette at right -->
            <g transform="translate(685 95)">
              <path d="M-10 325h64l-8-20h-48Z" fill="#d9eafa" stroke="#7b9fbd" strokeWidth="2"/>
              <path d="M-3 305 3 108h38l6 197Z" fill="#e9f5ff" stroke="#91b1cc" strokeWidth="2"/>
              <path d="M0 108 22 71 44 108Z" fill="#fff" stroke="#9dbbd2" strokeWidth="2"/>
              <path d="M8 72 22 35 36 72Z" fill="url(#gold)" stroke="#9c7132" strokeWidth="2"/>
              <path d="M22 35V10" stroke="#f9d16e" strokeWidth="5" strokeLinecap="round"/>
              <path d="M-4 143h46M-5 288h48" stroke="#b4d0e7" strokeWidth="3"/>
            </g>
            <path d="M0 372q110-36 205-5t200-4q120-30 210 3t185-3v97H0Z" fill="#c9e9ff" opacity=".35"/>
          </svg>
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
