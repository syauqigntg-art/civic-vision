"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCode } from "@/lib/supabase";
import { rpcS } from "@/lib/api/student";
import { studentContent } from "@/lib/api/student-content";
import { loadStudentCaseList, type CaseVideo } from "@/lib/student/load-case-list";
import { MediaPlayer as Media } from "@/components/video/MediaPlayer";

type VideoItem = CaseVideo & {
  description?: string | null;
  duration?: string | null;
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

  useEffect(() => { void load(); }, []);

  if (err || !videos || !groupLoaded || groupError || videos.length === 0) {
    const loading = !videos || !groupLoaded;
    return (
      <section className="case-dashboard">
        <div className="case-hero case-hero-compact">
          <div className="case-hero-copy">
            <span className="case-hero-icon" aria-hidden="true">▷</span>
            <div>
              <p className="case-kicker">CIVIC VISION · RUANG PENGAMATAN</p>
              <h1>Video Kasus</h1>
              <p className="case-hero-description">Tonton video yang ditugaskan guru, kemudian lanjutkan ke analisis LKPD.</p>
            </div>
          </div>
          <div className="case-hero-art" aria-hidden="true">
            <img src="/images/civic-vision-hero.png" alt="" />
          </div>
        </div>
        {loading ? (
          <section className="case-state" role="status" aria-live="polite" aria-busy="true">
            <span className="case-state-symbol" aria-hidden="true">◌</span>
            <h2>Memeriksa penugasan video kelompok...</h2>
            <p>Sebentar, kami sedang memuat daftar video dari guru.</p>
          </section>
        ) : err ? (
          <section className="case-state" role="alert">
            <span className="case-state-symbol" aria-hidden="true">!</span>
            <h2>Video belum dapat dimuat</h2>
            <p>{errMessage || "Daftar video tidak dapat dimuat. Silakan coba kembali."}</p>
            <div className="case-state-actions">
              <button className="case-button" type="button" onClick={() => void load()}>Coba lagi</button>
              <Link className="case-button case-button-secondary" href="/lkpd/identitas">Kembali ke identitas</Link>
            </div>
          </section>
        ) : groupError ? (
          <section className="case-state" role="alert">
            <span className="case-state-symbol" aria-hidden="true">⌑</span>
            <h2>Kode kelompok belum terverifikasi</h2>
            <p>Masukkan kembali kode kelompok yang diberikan oleh guru untuk melihat penugasan.</p>
            <div className="case-state-actions">
              <Link className="case-button" href="/lkpd/identitas">Kembali ke identitas</Link>
            </div>
          </section>
        ) : (
          <section className="case-state">
            <span className="case-state-symbol" aria-hidden="true">▷</span>
            <h2>Belum ada video yang ditugaskan</h2>
            <p>Guru belum menetapkan video untuk kelompok kalian. Silakan hubungi guru melalui dashboard CIVIC VISION.</p>
            <div className="case-state-actions">
              <button className="case-button case-button-secondary" type="button" onClick={() => void load()}>Periksa kembali</button>
            </div>
          </section>
        )}
      </section>
    );
  }

  return (
    <section className="case-dashboard">
      <section className="case-hero" aria-labelledby="case-page-title">
        <div className="case-hero-copy">
          <span className="case-hero-icon" aria-hidden="true">▷</span>
          <div className="case-hero-text">
            <p className="case-kicker">CIVIC VISION · RUANG PENGAMATAN</p>
            <h1 id="case-page-title">Video Kasus</h1>
            <p className="case-hero-description">Tonton video yang ditugaskan guru, kemudian lanjutkan ke analisis LKPD.</p>
          </div>
        </div>
        <div className="case-hero-art" aria-hidden="true">
          <img src="/images/civic-vision-hero.png" alt="" />
        </div>
      </section>

      <section className="case-instruction" aria-label="Petunjuk tahap SEE">
        <div className="case-see-pill"><span aria-hidden="true">◎</span><span>TAHAP SEE – AMATI</span></div>
        <span className="case-instruction-divider" aria-hidden="true" />
        <span className="case-info-icon" aria-hidden="true">i</span>
        <p>Simak video dengan saksama. Amati peristiwa, tokoh, dan masalah utama yang terjadi sebagai dasar analisis pada LKPD.</p>
      </section>

      <section className="case-list-section" aria-labelledby="case-list-title">
        <div className="case-list-heading">
          <h2 id="case-list-title">Daftar Video Kasus</h2>
          <span className="case-assignment-count"><span aria-hidden="true">▷</span>{videos.length} Video Ditugaskan</span>
        </div>
        <div className="case-video-list">
          {videos.map((video) => (
            <article className="case-video-card" key={video.id}>
              <div className="case-video-thumbnail">
                {video.thumbnail_url ? (
                  <Media path={video.thumbnail_url} kind="image" alt={`Thumbnail kasus: ${video.title}`} />
                ) : (
                  <div className="case-thumbnail-fallback" aria-label="Thumbnail belum tersedia">
                    <span aria-hidden="true">▷</span>
                    <small>CIVIC VISION</small>
                  </div>
                )}
                {video.duration && <span className="case-video-duration">{video.duration}</span>}
              </div>
              <div className="case-video-copy">
                <div className="case-video-tags">
                  <span className="case-number">Kasus {String(video.number).padStart(2, "0")}</span>
                  <span className="case-category"><span aria-hidden="true">♧</span>{video.category || "Kasus Pancasila"}</span>
                </div>
                <h3>{video.title}</h3>
                {video.description && <p>{video.description}</p>}
              </div>
              <div className="case-video-action">
                <Link className="case-watch-button" href={`/lkpd/kasus/${video.id}`}>
                  <span>Tonton Video</span><span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
