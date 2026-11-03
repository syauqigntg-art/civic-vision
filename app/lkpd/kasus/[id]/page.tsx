"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getCode, filled } from "@/lib/supabase";
import { rpcS } from "@/lib/api/student";
import { studentContent } from "@/lib/api/student-content";
import type { Q } from "@/types";
import { useAutosave } from "@/hooks/useAutosave";
import { QuestionField } from "@/components/lkpd/QuestionField";
import { PhaseBar } from "@/components/lkpd/PhaseBar";
import { SaveStatus } from "@/components/lkpd/SaveStatus";
import { ProgressBar } from "@/components/glass/ProgressBar";
import { GlassCard } from "@/components/glass/GlassCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { MediaPlayer as Media } from "@/components/video/MediaPlayer";

export default function Video() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();

  const [v, setV] = useState<any>(null);
  const [seeQs, setSeeQs] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [st, setSt] = useState<"load" | "ok" | "err" | "none">("load");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [msg, setMsg] = useState("");
  const save = useAutosave(() => setLocked(true));

  useEffect(() => {
    const load = async () => {
      const code = getCode();
      if (!code) {
        r.replace("/lkpd/identitas");
        return;
      }

      try {
        const [contentResult, groupResult] = await Promise.all([
          studentContent("video_detail", { code, vid: id }),
          rpcS("get_group", { code }),
        ]);

        if (contentResult.error || groupResult.error) {
          setMsg(contentResult.error?.message || groupResult.error?.message || "Data video atau kelompok tidak dapat diperiksa. Muat ulang halaman.");
          setSt("err");
          return;
        }
        const video = contentResult.data?.video;
        if (!video) {
          setMsg("Video ini tidak ditugaskan kepada kelompok kalian atau sudah tidak aktif.");
          setSt("none");
          return;
        }
        if (!groupResult.data?.id) {
          r.replace("/lkpd/identitas");
          return;
        }

        const assignedIds = Array.isArray(groupResult.data.video_ids)
          ? groupResult.data.video_ids
          : [];
        const pinnedVideoId = groupResult.data.submission?.video_id;
        const allowedForGroup = pinnedVideoId
          ? pinnedVideoId === id
          : assignedIds.includes(id);
        if (!allowedForGroup) {
          setMsg("Video ini tidak ditugaskan kepada kelompok kalian atau bukan video dari pengerjaan yang sudah dimulai.");
          setSt("none");
          return;
        }

        const phaseQuestions = (contentResult.data.questions || []) as unknown as Q[];
        const isSubmitted = groupResult.data.submission?.status === "submitted";

        if (phaseQuestions.length && !isSubmitted) {
          const { error } = await rpcS("begin_submission", { code, vid: id });
          if (error) {
            setMsg("Sesi pengerjaan tidak dapat dimulai. Pastikan video ini ditugaskan oleh guru.");
            setSt("err");
            return;
          }
        }

        let savedAnswers: Record<string, string> = {};
        if (phaseQuestions.length) {
          const result = await rpcS("get_answers", { code });
          if (result.error) {
            setMsg("Jawaban tahap SEE tidak dapat dimuat. Muat ulang halaman.");
            setSt("err");
            return;
          }
          savedAnswers = result.data || {};
        }

        if (isSubmitted) save.clearPending(true);
        const pending = isSubmitted || !phaseQuestions.length ? {} : save.load();
        setAnswers({ ...savedAnswers, ...pending });
        setSeeQs(phaseQuestions);
        setLocked(isSubmitted);
        setV(video);
        setSt("ok");
      } catch {
        setMsg("Terjadi kesalahan saat memuat video. Silakan coba lagi.");
        setSt("err");
      }
    };

    load();
  }, [id, r]);

  const change = (q: Q, value: unknown) => {
    const serialized = typeof value === "string" ? value : JSON.stringify(value);
    setAnswers((current) => ({ ...current, [q.id]: serialized }));
    save.change(q.id, serialized);
    setMsg("");
  };

  const next = async () => {
    if (locked) {
      r.push("/lkpd/hasil");
      return;
    }

    setMsg("");
    const missing = seeQs.filter(
      (q) => q.is_required && !filled(q, answers[q.id])
    );
    if (missing.length) {
      setMsg(`Tahap SEE belum lengkap. Lengkapi ${missing.length} pertanyaan wajib sebelum melanjutkan.`);
      return;
    }

    setBusy(true);
    try {
      const saveResult = await save.flush();
      if (saveResult === "locked") {
        setLocked(true);
        setMsg("Pengerjaan sudah terkunci di server. Jawaban yang belum tersimpan tidak dapat diubah.");
        return;
      }
      if (
        (saveResult !== "idle" && saveResult !== "saved") ||
        save.hasPending()
      ) {
        setMsg("Jawaban SEE belum berhasil disimpan ke server. Periksa status penyimpanan dan coba lagi.");
        return;
      }

      const { error } = await rpcS("begin_submission", {
        code: getCode(),
        vid: id,
      });
      if (error) {
        setMsg("Tidak dapat membuka tahap berikutnya. Periksa penugasan video kelompok kalian.");
        return;
      }
      r.push(`/lkpd/kasus/${id}/analisis`);
    } finally {
      setBusy(false);
    }
  };

  if (st === "load") {
    return <div className="case-detail-page"><GlassCard className="case-detail-state" aria-busy="true"><span className="case-detail-kicker">CIVIC VISION · RUANG BELAJAR</span><h1>Menyiapkan ruang pengamatan</h1><p>Memuat video dan pertanyaan tahap SEE...</p></GlassCard></div>;
  }

  if (st === "err" || st === "none") {
    return (
      <div className="case-detail-page">
        <GlassCard className="case-detail-state">
          <span className="case-detail-kicker">{st === "none" ? "PENUGASAN VIDEO" : "KONEKSI PEMBELAJARAN"}</span>
          <h1>{st === "none" ? "Video tidak tersedia untuk kelompokmu" : "Video kasus belum dapat dimuat"}</h1>
          <Alert>{msg || "Video tidak dapat dimuat. Silakan coba kembali."}</Alert>
          <div className="case-detail-actions">
            <Link className="case-glass-button secondary" href="/lkpd/kasus">← Kembali ke Video Kasus</Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  const requiredSee = seeQs.filter((q) => q.is_required);
  const seePct = requiredSee.length
    ? Math.round(
        (requiredSee.filter((q) => filled(q, answers[q.id])).length /
          requiredSee.length) *
          100
      )
    : 100;

  return (
    <div className="case-detail-page">
      <div className="case-detail-heading">
        <div className="case-detail-breadcrumb">
          <Link href="/lkpd">LKPD</Link><span aria-hidden="true">/</span><Link href="/lkpd/kasus">Video Kasus</Link><span aria-hidden="true">/</span><span aria-current="page">Detail Kasus</span>
        </div>
        <div className="case-detail-heading-row">
          <div><span className="case-detail-kicker">RUANG PENGAMATAN · TAHAP 01</span><h1>Detail Video Kasus</h1><p>Amati situasi dalam video, kenali fakta, dan catat masalah yang perlu diselidiki.</p></div>
          <Link className="case-glass-button secondary" href="/lkpd/kasus">← Daftar Video</Link>
        </div>
      </div>

      <section className="case-detail-panel" aria-label="Informasi kasus dan pemutar video">
        <div className="case-detail-meta">
          <span className="case-detail-kicker">KASUS {String(v.number).padStart(2, "0")}</span>
          {v.category && <span className="case-detail-category">{v.category}</span>}
        </div>
        <h2>Kasus {String(v.number).padStart(2, "0")}: {v.title}</h2>
        {v.description && <p className="case-detail-description">{v.description}</p>}
        <div className="case-video-player-frame">
          {typeof v.video_url === "string" && /^https?:\/\//i.test(v.video_url) && v.thumbnail_url && <Media path={v.thumbnail_url} kind="image" alt={`Thumbnail kasus: ${v.title}`} />}
          {typeof v.video_url === "string" && /^https?:\/\//i.test(v.video_url) ? (
            <div className="case-external-video-note">
              <span className="case-player-icon" aria-hidden="true">↗</span>
              <b>Video kasus tersedia melalui tautan eksternal</b>
              <p>Buka video pada tab baru. Setelah selesai menonton, kembali ke halaman ini untuk melanjutkan pengamatan.</p>
              <a className="case-glass-button primary" href={v.video_url} target="_blank" rel="noopener noreferrer">Buka Video Kasus ↗</a>
            </div>
          ) : v.video_url ? (
            <Media path={v.video_url} poster={v.thumbnail_url} kind="video" alt={`Video kasus: ${v.title}`} />
          ) : <div className="case-video-unavailable">Video belum tersedia dari guru.</div>}
        </div>
      </section>

      <section className="case-detail-progress" aria-label="Tahapan pembelajaran">
        <div className="case-section-heading"><div><span className="case-detail-kicker">ALUR PEMBELAJARAN</span><h2>Lima Tahap Pembelajaran</h2></div><span className="case-current-stage">TAHAP AKTIF · SEE</span></div>
        <PhaseBar current="see" />
      </section>

      <section className="case-detail-instruction">
        <div className="case-instruction-mark" aria-hidden="true">◎</div>
        <div><span className="case-detail-kicker">PANDUAN AKTIVITAS · SEE</span><h2>Mengamati permasalahan</h2><p>Perhatikan video dengan saksama. Catat fakta yang benar-benar terlihat, siapa yang terdampak, dan masalah awal yang perlu diselidiki. Bedakan fakta dari dugaan.</p><div className="case-learning-outcome"><b>Hasil yang diharapkan</b><span>Catatan fakta pengamatan dan rumusan awal masalah.</span></div></div>
      </section>

      <section className="case-detail-workspace" aria-labelledby="case-workspace-title">
        <div className="case-workspace-header">
          <div><span className="case-detail-kicker">LEMBAR KERJA PESERTA DIDIK</span><h2 id="case-workspace-title">Workspace Pengamatan</h2><p>Isi jawaban berdasarkan hasil pengamatan video kasus.</p></div>
          <div className="case-workspace-progress"><strong>{seePct}%</strong><span>Progres SEE</span></div>
        </div>
        <div className="case-workspace-status"><div><b>Progress jawaban wajib</b><span>{requiredSee.filter((q) => filled(q, answers[q.id])).length} dari {requiredSee.length} pertanyaan selesai</span></div><SaveStatus st={save.st} /></div>
        <ProgressBar pct={seePct} />
        {locked && <Alert>Hasil telah dikirim dan dikunci. Jawaban pada tahap SEE hanya dapat diubah setelah guru membuka kembali pengerjaan.</Alert>}
        {seeQs.length > 0 ? (
          <fieldset className="case-question-list" disabled={locked}>
            {seeQs.map((q, index) => (
              <article className="case-question-card" key={q.id}>
                <div className="case-question-number">PERTANYAAN {String(index + 1).padStart(2, "0")}</div>
                <span className="tag">{q.category}</span>
                <h3 id={`q-${q.id}`}>{q.question_text}{q.is_required ? "" : " (opsional)"}</h3>
                <QuestionField q={q} raw={answers[q.id]} onChange={(value) => change(q, value)} labelledBy={`q-${q.id}`} />
                {q.description && <p className="case-question-help">{q.description}</p>}
              </article>
            ))}
          </fieldset>
        ) : (
          <div className="case-no-questions"><b>Belum ada pertanyaan pengamatan.</b><p>Guru belum menambahkan pertanyaan SEE untuk video ini. Kamu tetap dapat melanjutkan ke tahap berikutnya.</p></div>
        )}
        {msg && <Alert>{msg}</Alert>}
        <div className="case-detail-actions">
          <Link className="case-glass-button secondary" href="/lkpd/kasus">← Sebelumnya</Link>
          <Button disabled={busy} onClick={next}>{busy ? "Menyimpan jawaban..." : locked ? "LIHAT HASIL →" : "Selanjutnya · THINK →"}</Button>
        </div>
        <p className="case-autosave-note">Jawaban tahap SEE tersimpan otomatis. Pastikan status penyimpanan berhasil sebelum melanjutkan ke THINK.</p>
      </section>
    </div>
  );
}
