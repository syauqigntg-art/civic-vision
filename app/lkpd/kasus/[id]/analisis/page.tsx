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
import { GlassCard } from "@/components/glass/GlassCard";
import { ProgressBar } from "@/components/glass/ProgressBar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

const PHASES = ["think", "connect", "act"] as const;
type WorkPhase = (typeof PHASES)[number];

const PHASE_INFO: Record<WorkPhase, { title: string; instruction: string; output: string }> = {
  think: {
    title: "THINK — Menganalisis masalah",
    instruction: "Identifikasi masalah utama, telusuri penyebab, gunakan bukti, dan perhatikan sudut pandang pihak yang terdampak.",
    output: "Analisis masalah yang didukung fakta dan bukti.",
  },
  connect: {
    title: "CONNECT — Menghubungkan konsep",
    instruction: "Hubungkan hasil analisis dengan nilai Pancasila, hak dan kewajiban, keadilan, atau konsep IPS yang relevan.",
    output: "Argumentasi yang menunjukkan hubungan kasus dengan konsep atau nilai yang tepat.",
  },
  act: {
    title: "ACT — Merancang tindakan",
    instruction: "Rancang solusi yang realistis, urutan langkah, pembagian peran, serta cara menilai apakah solusi berhasil.",
    output: "Rencana aksi dengan langkah pelaksanaan dan indikator keberhasilan.",
  },
};

// Pertanyaan SEE dijawab di halaman video. Di sini hanya tampilkan
// pertanyaan THINK, CONNECT, dan ACT. Pertanyaan tanpa fase tetap masuk THINK.
function phaseForQuestion(q: Q): WorkPhase | null {
  if (q.phase === "see") return null;
  if (q.phase === "connect" || q.phase === "act") return q.phase;
  return "think";
}

export default function Analisis() {
  const { id } = useParams<{ id: string }>();
  const r = useRouter();
  const [qs, setQs] = useState<Q[]>([]);
  const [a, setA] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [warn, setWarn] = useState("");
  const [loadMessage, setLoadMessage] = useState("");
  const [locked, setLocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<"load" | "ok" | "err">("load");
  const save = useAutosave(() => setLocked(true));

  useEffect(() => {
    const c = getCode();
    if (!c) {
      r.replace("/lkpd/identitas");
      return;
    }

    const pending = save.load();

    Promise.all([
      studentContent("questions_for_video", { code: c, vid: id }),
      rpcS("get_answers", { code: c }),
      rpcS("get_group", { code: c }),
    ])
      .then(([q, ans, g]) => {
        if (q.error || ans.error || g.error) {
          setLoadMessage(q.error?.message || ans.error?.message || g.error?.message || "LKPD tidak dapat dimuat. Periksa koneksi.");
          setView("err");
          return;
        }
        if (!g.data?.id) {
          r.replace("/lkpd/identitas");
          return;
        }

        const isSubmitted = g.data?.submission?.status === "submitted";
        setQs((q.data || []) as unknown as Q[]);

        if (isSubmitted) {
          // Do not resurrect browser-queued edits after the server has locked
          // this submission. The server's saved answers are authoritative.
          save.clearPending(true);
          setA(ans.data || {});
        } else {
          setA({ ...(ans.data || {}), ...pending });
          if (Object.keys(pending).length > 0) void save.flush();
        }

        setLocked(isSubmitted);
        setView("ok");
      })
      .catch(() => setView("err"));
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const activePhase: WorkPhase = PHASES[step] ?? "think";
  const cur = qs.filter((q) => phaseForQuestion(q) === activePhase);
  const req = qs.filter((q) => q.is_required);

  // Persentase global dihitung dari semua jawaban wajib, bukan dari jumlah halaman.
  const pct = req.length
    ? Math.round(
        (req.filter((q) => filled(q, a[q.id])).length / req.length) * 100
      )
    : 0;

  const phaseDone = (phase: WorkPhase) =>
    qs
      .filter((q) => phaseForQuestion(q) === phase && q.is_required)
      .every((q) => filled(q, a[q.id]));

  const seeDone = qs
    .filter((q) => q.phase === "see" && q.is_required)
    .every((q) => filled(q, a[q.id]));
  const donePhases = PHASES.slice(0, step).filter((phase) => phaseDone(phase));
  const completedPhases = [...(seeDone ? ["see"] : []), ...donePhases];
  const left = PHASES.length - step - 1;

  const change = (q: Q, v: unknown) => {
    const value = typeof v === "string" ? v : JSON.stringify(v);
    setA((previous) => ({ ...previous, [q.id]: value }));
    save.change(q.id, value);
    setWarn("");
  };

  const next = async () => {
    setWarn("");

    if (!locked) {
      const missing = cur.filter(
        (q) => q.is_required && !filled(q, a[q.id])
      );
      if (missing.length) {
        setWarn(
          `Tahap ${activePhase.toUpperCase()} belum lengkap. Lengkapi ${missing.length} pertanyaan wajib sebelum melanjutkan.`
        );
        return;
      }

      const saveResult = await save.flush();
      if (saveResult === "locked") {
        setLocked(true);
        setWarn("Pengerjaan sudah terkunci. Perubahan belum tersimpan dan tidak dapat dilanjutkan.");
        return;
      }
      if (
        (saveResult !== "idle" && saveResult !== "saved") ||
        save.hasPending()
      ) {
        setWarn(
          "Masih ada jawaban yang belum tersimpan ke server. Periksa status penyimpanan sebelum melanjutkan."
        );
        return;
      }
    }

    setStep((current) => Math.min(current + 1, PHASES.length - 1));
  };

  const send = async () => {
    if (sending || locked) return;
    setWarn("");

    const missing = req.filter((q) => !filled(q, a[q.id]));
    if (missing.length) {
      if (missing.some((q) => q.phase === "see")) {
        setWarn(
          "Tahap SEE belum lengkap. Kembali ke halaman video untuk menjawab pertanyaan pengamatan."
        );
        return;
      }

      const firstMissingPhase = phaseForQuestion(missing[0]) ?? "think";
      setStep(PHASES.indexOf(firstMissingPhase));
      setWarn(
        `Masih ada ${missing.length} pertanyaan wajib yang belum dijawab. Lengkapi dahulu sebelum mengirim hasil.`
      );
      return;
    }

    setSending(true);
    try {
      // Submit is allowed only after every queued answer is confirmed saved.
      const saveResult = await save.flush();
      if (saveResult === "locked") {
        setLocked(true);
        setWarn("Pengerjaan sudah terkunci di server. Buka halaman hasil untuk melihat kiriman sebelumnya.");
        return;
      }

      if (
        (saveResult !== "idle" && saveResult !== "saved") ||
        save.hasPending()
      ) {
        setWarn(
          "Pengiriman dibatalkan karena masih ada jawaban yang belum tersimpan. Periksa status penyimpanan dan coba lagi."
        );
        return;
      }

      if (
        !confirm(
          "Apakah kalian yakin ingin mengirim hasil analisis? Setelah dikirim, jawaban tidak dapat diubah sampai guru membukanya kembali."
        )
      ) {
        return;
      }

      const { data, error } = await rpcS("submit_group", { code: getCode() });
      if (error) {
        setWarn(
          "Hasil belum berhasil dikirim. Periksa koneksi dan status penyimpanan, lalu coba kembali."
        );
        return;
      }

      if (data === "ok" || data === "sudah terkirim") {
        save.clearPending(true);
        setLocked(true);
        r.push("/lkpd/hasil");
        return;
      }

      if (data === "proyek diarsipkan") {
        setWarn("Proyek ini telah diarsipkan. Jawaban draft tetap aman; minta guru mengaktifkan kembali proyek untuk melanjutkan.");
      } else if (data === "belum lengkap") {
        setWarn(
          "Server menolak pengiriman karena masih ada jawaban wajib yang belum lengkap. Periksa setiap tahap, lalu simpan kembali."
        );
      } else if (data === "identitas belum lengkap") {
        setWarn("Nama kelompok dan ketua kelompok wajib diisi sebelum mengirim.");
      } else {
        setWarn(
          "Pengiriman belum berhasil. Periksa jawaban wajib, identitas kelompok, dan status pengerjaan."
        );
      }
    } finally {
      setSending(false);
    }
  };

  if (view === "load") {
    return (
      <GlassCard aria-busy="true">
        <p>Memuat LKPD...</p>
      </GlassCard>
    );
  }

  if (view === "err") {
    return (
      <GlassCard>
        <Alert>{loadMessage || "LKPD tidak dapat dimuat. Periksa koneksi lalu coba kembali."}</Alert>
        <div className="row">
          <button
            className="btn"
            type="button"
            onClick={() => window.location.reload()}
          >
            Coba lagi
          </button>
          <Link className="btn g" href={`/lkpd/kasus/${id}`}>
            Kembali ke video
          </Link>
        </div>
      </GlassCard>
    );
  }

  if (!qs.length) {
    return (
      <GlassCard>
        <p>
          Belum ada pertanyaan LKPD. Guru dapat menambahkan pertanyaan melalui
          Admin Dashboard.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <PhaseBar
        current={activePhase}
        completed={completedPhases}
      />

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
        <b>Progress Jawaban Wajib</b>
        <SaveStatus st={save.st} />
      </div>
      <ProgressBar pct={pct} />

      <p>
        <b style={{ color: "#fff" }}>
          Tahap {step + 1} dari {PHASES.length}: {PHASE_INFO[activePhase].title}
        </b>
        {" · "}
        {left ? `sisa ${left} tahap` : "tahap terakhir"}
      </p>
      <p>{PHASE_INFO[activePhase].instruction}</p>
      <div className="hint" style={{ marginTop: 8 }}>
        <b>Hasil yang diharapkan:</b> {PHASE_INFO[activePhase].output}
      </div>

      {locked && (
        <Alert>
          Hasil sudah dikirim dan terkunci. Minta guru membuka kembali jika
          perlu mengubah.{" "}
          <Link href="/lkpd/hasil" style={{ color: "#fff" }}>
            Lihat hasil
          </Link>
        </Alert>
      )}
      {warn && (
        <Alert>
          {warn}{" "}
          {warn.startsWith("Tahap SEE") && (
            <Link href={`/lkpd/kasus/${id}`} style={{ color: "#fff", textDecoration: "underline" }}>
              Kembali ke video
            </Link>
          )}
        </Alert>
      )}

      {cur.length === 0 && (
        <div className="hint" role="status">
          <b>Belum ada pertanyaan aktif pada fase {PHASE_INFO[activePhase].title}.</b>
          <p style={{ marginBottom: 6 }}>Gunakan panduan fase dan hasil yang diharapkan di atas untuk memahami tujuan kegiatan.</p>
          <p style={{ marginBottom: 0 }}>Fase tetap menjadi bagian urutan PBL. Guru perlu memastikan fase ini memang sengaja dibiarkan tanpa soal sebelum LKPD digunakan.</p>
        </div>
      )}

      <fieldset
        disabled={locked}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        {cur.map((q) => (
          <div key={q.id}>
            <span className="tag">{q.category}</span>
            <h2 id={`q-${q.id}`} style={{ marginTop: 12 }}>
              {q.question_text}
              {q.is_required ? "" : " (opsional)"}
            </h2>
            <QuestionField
              q={q}
              raw={a[q.id]}
              onChange={(value) => change(q, value)}
              labelledBy={`q-${q.id}`}
            />
            {q.description && <div className="hint">{q.description}</div>}
          </div>
        ))}
      </fieldset>

      <div className="row">
        {step > 0 && (
          <Button
            variant="ghost"
            onClick={() => {
              setWarn("");
              setStep((current) => Math.max(current - 1, 0));
            }}
          >
            ← Sebelumnya
          </Button>
        )}

        {!locked && (
          <Button variant="ghost" disabled={sending} onClick={() => { void save.flush(); }}>
            Simpan draft
          </Button>
        )}

        {left > 0 ? (
          <Button disabled={sending} onClick={next}>
            Selanjutnya →
          </Button>
        ) : (
          !locked && (
            <Button disabled={sending} onClick={send}>
              {sending ? "MENGIRIM..." : "KIRIM HASIL ANALISIS →"}
            </Button>
          )
        )}
      </div>
    </GlassCard>
  );
}
