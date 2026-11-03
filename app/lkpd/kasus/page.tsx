"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCode } from "@/lib/supabase";
import { rpcS } from "@/lib/api/student";
import { studentContent } from "@/lib/api/student-content";
import { loadStudentCaseList } from "@/lib/student/load-case-list";
import { MediaPlayer as Media } from "@/components/video/MediaPlayer";

type VideoItem = {
  id: string;
  number: number;
  title: string;
  category: string | null;
  thumbnail_url?: string | null;
};

export default function Kasus() {
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [groupError, setGroupError] = useState(false);
  const [err, setErr] = useState(false);
  const [errMessage, setErrMessage] = useState("");
  const loadInFlight = useRef(false);

  const load = async () => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    setVideos(null);
    setGroupLoaded(false);
    setGroupError(false);
    setErr(false);
    setErrMessage("");

    try {
      const result = await loadStudentCaseList(
        getCode(),
        (code) => studentContent("list_videos", { code }),
        (code) => rpcS("get_group", { code }),
      );

      if (result.kind === "missing-code" || result.kind === "invalid-group") {
        setVideos([]);
        setGroupError(true);
      } else if (result.kind === "failed") {
        setVideos([]);
        setErr(true);
        setErrMessage(result.message);
      } else {
        setVideos(result.videos);
      }
    } finally {
      loadInFlight.current = false;
      setGroupLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (err) {
    return (
      <section className="case-dashboard">
        <div className="case-state case-state-error" role="alert">
          <span className="case-state-icon" aria-hidden="true">!</span>
          <p>{errMessage || "Daftar video tidak dapat dimuat. Silakan coba kembali."}</p>
          <div className="case-state-actions">
            <button className="case-primary-button" type="button" onClick={() => void load()} disabled={!groupLoaded}>Coba lagi</button>
            <Link className="case-secondary-button" href="/lkpd/identitas">Kembali ke identitas</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!videos || !groupLoaded) {
    return (
      <section className="case-dashboard">
        <header className="case-page-heading">
          <span className="case-eyebrow">RUANG BELAJAR · SEE</span>
          <h1>Video Kasus</h1>
          <p>Siapkan pengamatanmu sebelum memulai analisis LKPD.</p>
        </header>
        <div className="case-loading-card" aria-live="polite">
          <span className="case-loading-indicator" />
          <div><strong>Memeriksa penugasan kelompok</strong><p>Mohon tunggu, kami sedang memuat video untuk kelompokmu.</p></div>
        </div>
      </section>
    );
  }

  if (groupError) {
    return (
      <section className="case-dashboard">
        <header className="case-page-heading">
          <span className="case-eyebrow">RUANG BELAJAR · SEE</span>
          <h1>Video Kasus</h1>
        </header>
        <div className="case-state">
          <span className="case-state-icon" aria-hidden="true">⌁</span>
          <h2>Kode kelompok belum terverifikasi</h2>
          <p>Masukkan kembali kode kelompok yang diberikan oleh guru untuk melihat video yang ditugaskan.</p>
          <Link className="case-primary-button" href="/lkpd/identitas">Kembali ke identitas</Link>
        </div>
      </section>
    );
  }

  if (!videos.length) {
    return (
      <section className="case-dashboard">
        <header className="case-page-heading">
          <span className="case-eyebrow">RUANG BELAJAR · SEE</span>
          <h1>Video Kasus</h1>
          <p>Video pembelajaran yang ditugaskan guru akan muncul di sini.</p>
        </header>
        <div className="case-state">
          <span className="case-state-icon" aria-hidden="true">▶</span>
          <h2>Belum ada video yang ditugaskan</h2>
          <p>Guru belum menetapkan video untuk kelompok kalian. Silakan hubungi guru melalui dashboard CIVIC VISION.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="case-dashboard">
      <header className="case-page-heading">
        <div>
          <span className="case-eyebrow">RUANG BELAJAR · TAHAP 01</span>
          <h1>Video Kasus</h1>
          <p>Tonton dan amati kasus yang ditugaskan guru, lalu lanjutkan ke analisis LKPD bersama kelompokmu.</p>
        </div>
        <div className="case-assignment-summary" aria-label={`${videos.length} video ditugaskan`}>
          <span className="case-summary-icon" aria-hidden="true">▣</span>
          <span><strong>{videos.length}</strong><small>{videos.length === 1 ? "Video ditugaskan" : "Video ditugaskan"}</small></span>
        </div>
      </header>

      <div className="case-instruction">
        <span className="case-instruction-icon" aria-hidden="true">i</span>
        <p><strong>Petunjuk:</strong> Perhatikan peristiwa, tokoh, dan masalah utama dalam video. Catat fakta penting sebagai bahan diskusi kelompok.</p>
      </div>

      <div className="case-list-heading">
        <div><h2>Penugasan kelompok</h2><p>{videos.length} materi tersedia untuk kelompokmu</p></div>
        <span className="case-stage-pill">SEE · AMATI</span>
      </div>

      <div className="case-video-grid">
        {videos.map((video) => (
          <article className="case-video-card" key={video.id}>
            <div className="case-video-visual">
              {video.thumbnail_url ? (
                <Media path={video.thumbnail_url} kind="image" alt={`Thumbnail kasus: ${video.title}`} />
              ) : (
                <div className="case-video-placeholder" aria-hidden="true">
                  <span className="case-placeholder-orbit" />
                  <span className="case-placeholder-play">▶</span>
                  <small>CIVIC VISION · VIDEO KASUS</small>
                </div>
              )}
              <span className="case-number">KASUS {String(video.number).padStart(2, "0")}</span>
            </div>
            <div className="case-video-content">
              <div className="case-video-meta">
                <span className="case-category">{video.category || "Kasus Pancasila"}</span>
                <span className="case-assigned"><span aria-hidden="true">✓</span> Untuk kelompokmu</span>
              </div>
              <h3>{video.title}</h3>
              <p>Amati isi video dan identifikasi persoalan yang berkaitan dengan nilai-nilai Pancasila.</p>
              <Link className="case-watch-button" href={`/lkpd/kasus/${video.id}`}>
                <span>Tonton video</span><span className="case-watch-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
      <footer className="case-next-step">
        <span className="case-next-icon" aria-hidden="true">✎</span>
        <div><strong>Setelah menonton</strong><p>Lanjutkan ke LKPD untuk mencatat hasil pengamatan dan menganalisis kasus bersama kelompok.</p></div>
        <Link href="/lkpd" aria-label="Buka LKPD">Buka LKPD <span aria-hidden="true">→</span></Link>
      </footer>
    </section>
  );
}
