
"use client";

import { PhaseCards } from "@/components/lkpd/PhaseBar";
import { useEffect, useState } from "react";
import Link from "next/link";
import { sb } from "@/lib/supabase";

export default function Home() {
  const [s, setS] = useState({
    videos: 0,
    questions: 0,
    groups: 0,
  });

  const [t, setT] = useState({
    title: "CIVIC VISION",
    tagline: "",
    description: "",
  });

  useEffect(() => {
    sb.rpc("stats").then((r) => {
      if (r.error) {
        console.error("Gagal mengambil stats:", r.error);
        return;
      }

      if (r.data) setS(r.data);
    });

    sb.from("projects")
      .select("title, tagline, description")
      .limit(1)
      .then((r) => {
        if (r.error) {
          console.error("Gagal mengambil project:", r.error);
          return;
        }

        if (r.data?.[0]) setT(r.data[0]);
      });
  }, []);

  return (
    <>
      <section
        className="glass center"
        style={{ padding: "48px 24px" }}
      >
        <h1>{t.title}</h1>
        <h2>{t.tagline || "Menganalisis Pancasila dalam Kehidupan Sehari-hari"}</h2>

        <p style={{ maxWidth: 520, margin: "12px auto" }}>
          {t.description}
        </p>

        <p style={{ color: "#fff", fontWeight: 600 }}>
          Amati. Analisis. Refleksikan. Terapkan.
        </p>

        <Link className="btn" href="/lkpd/identitas">
          MULAI LKPD →
        </Link>
      </section>

      <div className="grid">
        <div className="glass">
          <h2>{s.videos} Video Kasus</h2>
          <p>Berbagai permasalahan yang dekat dengan kehidupan siswa.</p>
        </div>

        <div className="glass">
          <h2>{s.groups} Kelompok</h2>
          <p>Belajar bersama dan berpikir kritis.</p>
        </div>

        <div className="glass">
          <h2>{s.questions} Pertanyaan Analisis</h2>
          <p>Dari identifikasi masalah hingga aksi nyata.</p>
        </div>
      </div>

      <section className="glass">
        <h2>Alur belajar: SEE → THINK → CONNECT → ACT</h2>
        <PhaseCards />
      </section>
    </>
  );
}
