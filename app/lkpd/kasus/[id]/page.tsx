"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { sb, getCode, filled } from "@/lib/supabase";
import { rpcS } from "@/lib/api/student";
import type { Q } from "@/types";
import { useAutosave } from "@/hooks/useAutosave";
import { QuestionField } from "@/components/lkpd/QuestionField";
import { PhaseBar } from "@/components/lkpd/PhaseBar";
import { SaveStatus } from "@/components/lkpd/SaveStatus";
import { ProgressBar } from "@/components/glass/ProgressBar";
import { MediaPlayer as Media } from "@/components/video/MediaPlayer";
import { GlassCard } from "@/components/glass/GlassCard";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

const QUESTION_COLS =
  "id,category,phase,question_text,description,question_type,placeholder,is_required,min_items,display_order,question_options(option_text,display_order)";

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
        const [videoResult, groupResult] = await Promise.all([
          sb.from("videos").select("*").eq("id", id).eq("is_active", true).maybeSingle(),
          rpcS("get_group", { code }),
        ]);

        if (videoResult.error || groupResult.error) {
          setMsg("Data video atau kelompok tidak dapat diperiksa. Muat ulang halaman.");
          setSt("err");
          return;
        }
        if (!videoResult.data) {
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
        if (!assignedIds.includes(id)) {
          setMsg("Video ini tidak ditugaskan kepada kelompok kalian.");
          setSt("none");
          return;
        }

        const questionResult = await sb
          .from("questions")
          .select(QUESTION_COLS)
          .eq("project_id", videoResult.data.project_id)
          .eq("phase", "see")
          .eq("is_active", true)
          .order("display_order");

        if (questionResult.error) {
          setMsg("Pertanyaan tahap SEE tidak dapat dimuat. Muat ulang halaman.");
          setSt("err");
          return;
        }

        const phaseQuestions = (questionResult.data || []) as unknown as Q[];
        const isSubmitted = groupResult.data.submission?.status === "submitted";

        // Jika ada pertanyaan SEE, siapkan draft agar jawaban di halaman video
        // dapat disimpan melalui RPC yang sama seperti jawaban tahap berikutnya.
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

        const pending = isSubmitted || !phaseQuestions.length ? {} : save.load();
        setAnswers({ ...savedAnswers, ...pending });
        setSeeQs(phaseQuestions);
        setLocked(isSubmitted);
        setV(videoResult.data);
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
      setMsg(
        `Tahap SEE belum lengkap. Lengkapi ${missing.length} pertanyaan wajib sebelum melanjutkan.`
      );
      return;
    }

    setBusy(true);
    try {
      await save.flush();
      if (save.hasPending()) {
        setMsg("Jawaban SEE belum berhasil disimpan. Periksa koneksi internet, lalu coba lagi.");
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
    return (
      <GlassCard aria-busy="true">
        <p>Memuat video dan pertanyaan tahap SEE...</p>
      </GlassCard>
    );
  }

  if (st === "err") {
    return (
      <GlassCard>
        <Alert>{msg || "Video tidak dapat dimuat. Silakan coba kembali."}</Alert>
        <Link className="btn g" href="/lkpd/kasus">← Sebelumnya</Link>
      </GlassCard>
    );
  }

  if (st === "none") {
    return (
      <GlassCard>
        <Alert>{msg || "Video kasus tidak ditemukan."}</Alert>
        <Link className="btn g" href="/lkpd/kasus">← Sebelumnya</Link>
      </GlassCard>
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
    <GlassCard>
      <PhaseBar current="see" />
      <span className="tag">{v.category || "Kasus Pancasila"}</span>
      <h2 style={{ marginTop: 8 }}>
        Kasus {String(v.number).padStart(2, "0")}: {v.title}
      </h2>
      <Media
        path={v.video_url}
        poster={v.thumbnail_url}
        kind="video"
        alt={`Video kasus: ${v.title}`}
      />
      {!v.video_url && <p>Video belum diunggah oleh guru.</p>}
      {v.description && <p>{v.description}</p>}
      <div className="hint">
        Perhatikan video dengan saksama. Catat apa yang terjadi, siapa yang
        terdampak, dan masalah apa yang perlu diperhatikan.
      </div>

      {seeQs.length > 0 && (
        <section
          style={{
            marginTop: 20,
            paddingTop: 18,
            borderTop: "1px solid rgba(255,255,255,.18)",
          }}
        >
          <h2>SEE — Mengamati permasalahan</h2>
          <p>
            Jawab pertanyaan pengamatan terlebih dahulu. Setelah tahap SEE
            selesai, kalian akan melanjutkan ke THINK, CONNECT, dan ACT.
          </p>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 13,
            }}
          >
            <b>Progress pengamatan: {seePct}%</b>
            <SaveStatus st={save.st} />
          </div>
          <ProgressBar pct={seePct} />

          {locked && (
            <Alert>
              Hasil telah dikirim dan dikunci. Jawaban pada tahap SEE hanya dapat
              diubah setelah guru membuka kembali pengerjaan.
            </Alert>
          )}

          <fieldset
            disabled={locked}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            {seeQs.map((q) => (
              <div key={q.id} style={{ marginTop: 16 }}>
                <span className="tag">{q.category}</span>
                <h3 id={`q-${q.id}`} style={{ marginTop: 10 }}>
                  {q.question_text}
                  {q.is_required ? "" : " (opsional)"}
                </h3>
                <QuestionField
                  q={q}
                  raw={answers[q.id]}
                  onChange={(value) => change(q, value)}
                  labelledBy={`q-${q.id}`}
                />
                {q.description && <div className="hint">{q.description}</div>}
              </div>
            ))}
          </fieldset>
        </section>
      )}

      {msg && <Alert>{msg}</Alert>}
      <div className="row">
        <Link className="btn g" href="/lkpd/kasus">← Sebelumnya</Link>
        <Button disabled={busy} onClick={next}>
          {busy
            ? "Menyimpan..."
            : locked
              ? "LIHAT HASIL →"
              : "Selanjutnya →"}
        </Button>
      </div>
      <p style={{ fontSize: 13 }}>
        Jawaban tahap SEE tersimpan otomatis. Lanjutkan ke THINK setelah
        pertanyaan pengamatan yang wajib terisi.
      </p>
    </GlassCard>
  );
}
