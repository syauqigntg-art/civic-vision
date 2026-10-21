
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { sb, getCode } from "@/lib/supabase";
import { rpcS } from "@/lib/api/student";

type VideoItem = {
  id: string;
  number: number;
  title: string;
  category: string | null;
};

export default function Kasus() {
  const [videos, setVideos] = useState<VideoItem[] | null>(null);
  const [mine, setMine] = useState<string[]>([]);
  const [groupLoaded, setGroupLoaded] = useState(false);
  const [groupError, setGroupError] = useState(false);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const code = getCode();

    // Jangan tampilkan video jika kode kelompok belum tersedia.
    if (!code) {
      setVideos([]);
      setGroupError(true);
      setGroupLoaded(true);
      return;
    }

    Promise.all([
      sb
        .from("videos")
        .select("id,number,title,category")
        .eq("is_active", true)
        .order("number"),
      rpcS("get_group", { code }),
    ])
      .then(([videoResult, groupResult]) => {
        if (videoResult.error) {
          setErr(true);
        } else {
          setVideos((videoResult.data || []) as VideoItem[]);
        }

        // Jika kode tidak valid atau pemeriksaan gagal,
        // jangan tampilkan video apa pun.
        if (groupResult.error || !groupResult.data?.id) {
          setGroupError(true);
          setMine([]);
        } else {
          setMine(
            Array.isArray(groupResult.data.video_ids)
              ? groupResult.data.video_ids
              : []
          );
        }

        setGroupLoaded(true);
      })
      .catch(() => {
        setErr(true);
        setGroupLoaded(true);
      });
  }, []);

  if (err) {
    return (
      <section className="glass">
        <div className="warn" role="alert">
          Daftar video tidak dapat dimuat. Silakan muat ulang halaman.
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

  const assigned = videos.filter((video) =>
    mine.includes(video.id)
  );

  if (!videos.length) {
    return (
      <section className="glass">
        <p>Belum ada video kasus aktif.</p>
      </section>
    );
  }

  if (!assigned.length) {
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
        {assigned.map((video) => (
          <div className="glass" key={video.id}>
            <span className="tag">{video.category || "Kasus Pancasila"}</span>
            <span
              className="tag"
              style={{ marginLeft: 6 }}
            >
              Ditugaskan untuk kelompok kalian
            </span>

            <h2 style={{ marginTop: 8 }}>
              Kasus {String(video.number).padStart(2, "0")}:{" "}
              {video.title}
            </h2>

            <div className="row">
              <Link
                className="btn"
                href={`/lkpd/kasus/${video.id}`}
              >
                Tonton Video
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
