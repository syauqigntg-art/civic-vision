"use client";

import { PhaseCards } from "@/components/lkpd/PhaseBar";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <section
        className="glass center"
        style={{ padding: "48px 24px" }}
      >
        <h1>CIVIC VISION</h1>
        <h2>Menganalisis Pancasila dalam Kehidupan Sehari-hari</h2>
        <p style={{ maxWidth: 520, margin: "12px auto" }}>
          Ruang belajar digital untuk mengamati kasus, menganalisis masalah,
          menghubungkannya dengan nilai Pancasila, dan merancang tindakan nyata.
        </p>
        <p style={{ fontWeight: 600 }}>
          Amati. Analisis. Refleksikan. Terapkan.
        </p>
        <Link className="btn" href="/lkpd/identitas">
          MULAI LKPD →
        </Link>
      </section>

      <div className="grid">
        <div className="glass">
          <h2>Video Kasus</h2>
          <p>Siswa melihat materi yang telah ditugaskan guru untuk kelompoknya.</p>
        </div>
        <div className="glass">
          <h2>Analisis Kelompok</h2>
          <p>Jawaban disimpan per kelompok dan tidak dibagikan kepada kelompok lain.</p>
        </div>
        <div className="glass">
          <h2>Aksi Nyata</h2>
          <p>Hasil pembelajaran mengarah pada solusi yang sesuai dengan nilai Pancasila.</p>
        </div>
      </div>

      <section className="glass">
        <h2>Alur belajar: SEE → THINK → CONNECT → ACT</h2>
        <PhaseCards />
      </section>
    </>
  );
}
