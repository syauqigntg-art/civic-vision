"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getCode } from "@/lib/supabase";
import { rpcS } from "@/lib/api/student";
import { studentContent } from "@/lib/api/student-content";
import { loadStudentCaseList } from "@/lib/student/load-case-list";

type VideoItem = {
  id: string;
  number: number;
  title: string;
  category: string | null;
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

      if (result.kind === "missing-code") {
        setVideos([]);
        setGroupError(true);
      } else if (result.kind === "invalid-group") {
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
      <section className="glass">
        <div className="warn" role="alert">
          {errMessage || "Daftar video tidak dapat dimuat. Silakan coba kembali."}
        </div>
        <div className="row">
          <button
            className="btn"
            type="button"
            onClick={() => void load()}
            disabled={!groupLoaded}
          >
            Coba lagi
          </button>
          <Link className="btn g" href="/lkpd/identitas">
            Kembali ke identitas
          </Link>
        </div>
      </section>
    );
  }

  if (!videos || !groupLoaded) {
    return (
      <section className="glass">
        <p>Memeriksa penugasan video kelompok...</p>
      </section>
    );
  }

  if (groupError) {
    return (
      <section className="glass">
        <h2>Kode kelompok belum terverifikasi</h2>
        <p>Masukkan kembali kode kelompok yang diberikan oleh guru.</p>
        <Link className="btn" href="/lkpd/identitas">
          Kembali ke identitas
        </Link>
      </section>
    );
  }

  if (!videos.length) {
    return (
      <section className="glass">
        <h2>Belum ada video yang ditugaskan</h2>
        <p>
          Guru belum menetapkan video untuk kelompok kalian.
          Silakan hubungi guru melalui dashboard CIVIC VISION.
        </p>
      </section>
    );
  }

  return (
    <>
      <h2>Video kasus kelompok kalian</h2>
      <p>
        Tonton video yang ditugaskan guru, kemudian lanjutkan
        ke analisis LKPD.
      </p>

      <div className="grid">
        {videos.map((video) => (
          <div className="glass" key={video.id}>
            <span className="tag">{video.category || "Kasus Pancasila"}</span>
            <span className="tag" style={{ marginLeft: 6 }}>
              Ditugaskan untuk kelompok kalian
            </span>
            <h2 style={{ marginTop: 8 }}>
              Kasus {String(video.number).padStart(2, "0")}: {video.title}
            </h2>
            <div className="row">
              <Link className="btn" href={`/lkpd/kasus/${video.id}`}>
                Tonton Video
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
