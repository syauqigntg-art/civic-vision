"use client";

import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin";

export default function Panel({ tab }: { tab: "project" | "settings" }) {
  const { P, load, loading, error: loadError } = useAdmin(["P"]);
  const [title, setTitle] = useState("CIVIC VISION");
  const [tagline, setTagline] = useState("Menganalisis Pancasila dalam Kehidupan Sehari-hari");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (P.id) {
      setTitle(P.title || "");
      setTagline(P.tagline || "");
      setDescription(P.description || "");
    }
  }, [P.id, P.title, P.tagline, P.description]);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);

  const saveProject = async () => {
    if (!title.trim()) {
      setErr("Judul project wajib diisi.");
      setMessage("");
      return;
    }

    setSaving(true);
    setErr("");
    setMessage("");

    try {
      if (P.id) {
        const { data, error } = await sb
          .from("projects")
          .update({
            title: title.trim(),
            tagline: tagline.trim() || null,
            description: description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", P.id)
          .select("id")
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error("Project tidak berubah. Periksa izin admin di database.");
        }
        setMessage("Perubahan project berhasil disimpan.");
      } else {
        const { error } = await sb.from("projects").insert({
          title: title.trim(),
          tagline: tagline.trim() || null,
          description: description.trim() || null,
        });
        if (error) throw error;
        setMessage("Project berhasil dibuat.");
      }

      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan project. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  if (tab === "settings") {
    return (
      <section className="glass">
        <div className="admin-section-head">
          <div>
            <h2>Akun guru</h2>
            <p>Informasi akun yang sedang digunakan untuk mengelola CIVIC VISION.</p>
          </div>
          <span className="admin-status-pill active">Admin terverifikasi</span>
        </div>
        <div className="admin-account-card">
          <span className="admin-user-avatar">{email.trim().charAt(0).toUpperCase() || "G"}</span>
          <div>
            <strong>{email || "Akun guru"}</strong>
            <p>Memiliki akses ke project, materi, kelompok, dan hasil analisis.</p>
          </div>
        </div>
        <div className="admin-form-actions">
          <p>Untuk mengakhiri sesi, gunakan tombol Keluar di bagian kanan atas.</p>
        </div>
      </section>
    );
  }

  if (loading) {
    return <section className="glass"><p>Memuat informasi project…</p></section>;
  }

  if (loadError) {
    return (
      <section className="glass">
        <h2>Project</h2>
        <div className="warn" role="alert">
          Gagal memuat data project. Periksa koneksi dan izin database, lalu muat ulang halaman.
        </div>
      </section>
    );
  }

  return (
    <section className="glass">
      <div className="admin-section-head">
        <div>
          <h2>{P.id ? "Informasi project" : "Buat project pembelajaran"}</h2>
          <p>Informasi ini digunakan sebagai identitas pembelajaran yang dilihat siswa.</p>
        </div>
        <span className={"admin-status-pill " + (P.id ? "active" : "draft")}>
          {P.id ? "Project tersedia" : "Belum dibuat"}
        </span>
      </div>

      {err && <div className="warn" role="alert">{err}</div>}
      {message && <div className="admin-success-message" role="status" aria-live="polite">✓ {message}</div>}

      <div className="admin-form-grid">
        <div>
          <label htmlFor="project-title">Judul project <span aria-hidden="true">*</span></label>
          <input
            id="project-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Contoh: CIVIC VISION"
            required
          />
        </div>
        <div>
          <label htmlFor="project-tagline">Tagline</label>
          <input
            id="project-tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Ringkasan tujuan pembelajaran"
          />
        </div>
        <div className="admin-span-2">
          <label htmlFor="project-description">Deskripsi project</label>
          <textarea
            id="project-description"
            rows={4}
            style={{ minHeight: 112 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan fokus, tujuan, dan konteks kegiatan analisis."
          />
          <small className="admin-field-hint">Gunakan deskripsi singkat agar siswa memahami konteks kegiatan sebelum memulai LKPD.</small>
        </div>
      </div>

      <div className="admin-form-actions">
        <p>Periksa kembali judul dan deskripsi sebelum disimpan.</p>
        <button className="btn" onClick={saveProject} disabled={saving}>
          {saving ? "Menyimpan…" : P.id ? "Simpan perubahan" : "Buat project"}
        </button>
      </div>
    </section>
  );
}
