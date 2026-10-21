"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rpcS } from "@/lib/api/student";
import { studentContent } from "@/lib/api/student-content";
import { getCode, show, Q } from "@/lib/supabase";

export default function Hasil() {
  const [qs, setQs] = useState<Q[]>([]);
  const [a, setA] = useState<Record<string, string>>({});
  const [g, setG] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      const code = getCode();
      if (!code) {
        if (active) {
          setError("Kode kelompok tidak ditemukan. Masuk kembali melalui halaman identitas.");
          setLoading(false);
        }
        return;
      }

      try {
        const [answersResult, groupResult] = await Promise.all([
          rpcS("get_answers", { code }),
          rpcS("get_group", { code }),
        ]);

        if (answersResult.error || groupResult.error || !groupResult.data?.id) {
          if (active) setError("Hasil kelompok tidak dapat dimuat. Periksa kode kelompok.");
          return;
        }

        const group = groupResult.data;
        const videoId = group.submission?.video_id ||
          (Array.isArray(group.video_ids) ? group.video_ids[0] : null);

        let questionRows: Q[] = [];
        if (videoId) {
          const questionResult = await studentContent("questions_for_video", {
            code,
            vid: videoId,
          });
          if (questionResult.error) {
            if (active) setError("Pertanyaan untuk project ini tidak dapat dimuat.");
            return;
          }
          questionRows = (questionResult.data || []) as Q[];
        }

        if (active) {
          setA(answersResult.data || {});
          setG(group);
          setQs(questionRows);
        }
      } catch {
        if (active) setError("Terjadi kesalahan saat memuat hasil. Silakan coba lagi.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const sent = g.submission?.status === "submitted";

  if (loading) {
    return <section className="glass"><p>Memuat hasil kelompok...</p></section>;
  }

  return (
    <>
      <section className="glass center">
        <h1 style={{ fontSize: 40, letterSpacing: 0 }}>
          {sent ? "ANALISIS SELESAI!" : "DRAFT TERSIMPAN"}
        </h1>
        <p>
          {sent
            ? "Kalian telah menyelesaikan analisis kasus CIVIC VISION."
            : "Hasil saat ini masih berupa draft dan belum dikirim."}
        </p>
      </section>
      {error && <section className="glass"><div role="alert" className="warn">{error}</div></section>}
      <section className="glass">
        <h2>Kelompok {g.group_number}: {g.group_name}</h2>
        {qs.map((q) => (
          <div key={q.id}>
            <p style={{ fontWeight: 700, marginBottom: 0 }}>
              {q.category}: {q.question_text}
            </p>
            <p style={{ marginTop: 2, whiteSpace: "pre-wrap" }}>
              {show(q, a[q.id])}
            </p>
          </div>
        ))}
        <div className="row">
          <button className="btn" onClick={() => window.print()}>LIHAT HASIL</button>
          <Link className="btn g" href="/">KEMBALI KE BERANDA</Link>
          {error && <Link className="btn g" href="/lkpd/identitas">Periksa kode kelompok</Link>}
        </div>
      </section>
    </>
  );
}
