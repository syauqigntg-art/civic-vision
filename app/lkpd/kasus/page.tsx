"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function CaseHero() {
  return (
    <section className="case-hero" aria-labelledby="case-page-title">
      <div className="case-hero-copy">
        <nav className="case-breadcrumb" aria-label="Breadcrumb">
          <Link href="/lkpd">LKPD</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">Video Kasus</span>
        </nav>
        <div className="case-hero-title-row">
          <span className="case-hero-icon" aria-hidden="true">▶</span>
          <h1 id="case-page-title">Video Kasus</h1>
        </div>
        <p>
          Tonton dan pahami berbagai kasus nyata dalam kehidupan bermasyarakat,
          kemudian gunakan sebagai dasar mengerjakan LKPD.
        </p>
        <span className="case-hero-eyebrow">CIVIC VISION · RUANG PENGAMATAN</span>
      </div>
      <div className="case-hero-art">
        <img
          src="/images/video-kasus-hero.png"
          alt="Garuda Pancasila, bendera Merah Putih, Monumen Nasional, dan skyline Indonesia"
          loading="eager"
          fetchPriority="high"
        />
      </div>
    </section>
  );
}

export default function Kasus() {
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [groupError, setGroupError] = useState(false);
  const [err, setErr] = useState(false);
  const [errMessage, setErrMessage] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
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

  const categories = useMemo(
    () => Array.from(new Set((videos ?? []).map((video) => video.category).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, "id")),
    [videos],
  );

  const visibleVideos = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    return [...(videos ?? [])]
      .filter((video) => category === "all" || video.category === category)
      .filter((video) => !query || video.title.toLocaleLowerCase("id").includes(query) || (video.category ?? "").toLocaleLowerCase("id").includes(query))
      .sort((a, b) => sortOrder === "newest" ? b.number - a.number : a.number - b.number);
  }, [videos, search, category, sortOrder]);

  if (err) {
    return (
      <section className="case-dashboard">
        <CaseHero />
        <div className="case-state case-state-error" role="alert">
          <span className="case-state-icon" aria-hidden="true">!</span>
          <h2>Video kasus belum dapat dimuat</h2>
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
        <CaseHero />
        <div className="case-loading-panel" aria-live="polite">
          <div className="case-loading-heading">
            <span className="case-loading-indicator" />
            <div><strong>Memeriksa penugasan kelompok</strong><p>Memuat video yang ditugaskan guru untuk kelompokmu.</p></div>
          </div>
          <div className="case-video-grid case-skeleton-grid" aria-hidden="true">
            {[0, 1, 2].map((item) => <div className="case-skeleton-card" key={item}><span /><i /><b /></div>)}
          </div>
        </div>
      </section>
    );
  }

  if (groupError) {
    return (
      <section className="case-dashboard">
        <CaseHero />
        <div className="case-state case-group-state">
          <span className="case-state-icon" aria-hidden="true">⌁</span>
          <span className="case-state-kicker">VERIFIKASI KELOMPOK</span>
          <h2>Kode kelompok belum terverifikasi</h2>
          <p>Masukkan kembali kode kelompok yang diberikan oleh guru untuk melihat video yang ditugaskan kepada kelompokmu.</p>
          <Link className="case-primary-button" href="/lkpd/identitas">Kembali ke identitas <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    );
  }

  if (!videos.length) {
    return (
      <section className="case-dashboard">
        <CaseHero />
        <div className="case-state case-empty-state">
          <span className="case-state-icon" aria-hidden="true">▶</span>
          <span className="case-state-kicker">PENUGASAN VIDEO</span>
          <h2>Belum ada video yang ditugaskan</h2>
          <p>Video yang ditetapkan guru untuk kelompokmu akan muncul di halaman ini. Silakan hubungi guru jika penugasan belum tersedia.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="case-dashboard">
      <CaseHero />

      <section className="case-library-panel" aria-label="Daftar video kasus">
        <div className="case-tools">
          <label className="case-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari video kasus..."
              aria-label="Cari video kasus berdasarkan judul atau kategori"
            />
          </label>
          <label className="case-filter">
            <span aria-hidden="true">▤</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter kategori video">
              <option value="all">Semua Kategori</option>
              {categories.map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
            <span aria-hidden="true">⌄</span>
          </label>
          <label className="case-filter case-sort">
            <span aria-hidden="true">☷</span>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")} aria-label="Urutkan video berdasarkan nomor kasus">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
            <span aria-hidden="true">⌄</span>
          </label>
        </div>

        <div className="case-results-heading">
          <div><h2>Video yang Ditugaskan</h2><p>{visibleVideos.length} dari {videos.length} video untuk kelompokmu</p></div>
          <span className="case-count-pill">{videos.length} {videos.length === 1 ? "Video" : "Video"} Ditugaskan</span>
        </div>

        {visibleVideos.length ? (
          <div className="case-video-grid">
            {visibleVideos.map((video) => (
              <article className="case-video-card" key={video.id}>
                <Link className="case-video-visual" href={`/lkpd/kasus/${video.id}`} aria-label={`Tonton video kasus ${video.title}`}>
                  {video.thumbnail_url ? (
                    <Media path={video.thumbnail_url} kind="image" alt={`Thumbnail kasus: ${video.title}`} />
                  ) : (
                    <div className="case-video-placeholder" aria-hidden="true">
                      <span className="case-placeholder-orbit" />
                      <span className="case-placeholder-play">▶</span>
                      <small>CIVIC VISION · VIDEO KASUS</small>
                    </div>
                  )}
                  <span className="case-play-overlay" aria-hidden="true">▶</span>
                  <span className="case-number">KASUS {String(video.number).padStart(2, "0")}</span>
                </Link>
                <div className="case-video-content">
                  {video.category ? <span className="case-category">{video.category}</span> : null}
                  <h3>{video.title}</h3>
                  <Link className="case-watch-button" href={`/lkpd/kasus/${video.id}`}>
                    <span>Tonton Video</span><span className="case-watch-arrow" aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="case-filter-empty">
            <strong>Tidak ada video yang cocok</strong>
            <p>Coba kata kunci atau kategori lain.</p>
            <button type="button" className="case-secondary-button" onClick={() => { setSearch(""); setCategory("all"); }}>Hapus filter</button>
          </div>
        )}
      </section>
    </section>
  );
}
