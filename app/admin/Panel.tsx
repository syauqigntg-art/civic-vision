"use client";

import { useEffect, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAdmin } from "@/lib/admin";
import { useProjectContext } from "@/components/admin/ProjectProvider";

const activeLabel = (value: boolean | null | undefined) =>
  value === false ? "Diarsipkan" : "Aktif";

export default function Panel({ tab }: { tab: "project" | "settings" }) {
  const { P, load, loading, error: loadError } = useAdmin(["P"]);
  const { projects, projectId, selectProject, refreshProjects } = useProjectContext();
  const [title, setTitle] = useState("CIVIC VISION");
  const [tagline, setTagline] = useState("Menganalisis Pancasila dalam Kehidupan Sehari-hari");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [message, setMessage] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (P?.id) {
      setTitle(P.title || "");
      setTagline(P.tagline || "");
      setDescription(P.description || "");
    } else {
      setTitle("CIVIC VISION");
      setTagline("Menganalisis Pancasila dalam Kehidupan Sehari-hari");
      setDescription("");
    }
  }, [P?.id, P?.title, P?.tagline, P?.description]);

  useEffect(() => {
    sb.auth.getUser().then(({ data }) => setEmail(data.user?.email || ""));
  }, []);

  const saveProject = async () => {
    if (!title.trim()) {
      setErr("Judul proyek wajib diisi.");
      setMessage("");
      return;
    }
    if (P?.id && P.is_active === false) {
      setErr("Proyek diarsipkan. Aktifkan kembali proyek sebelum mengubah identitasnya.");
      setMessage("");
      return;
    }

    setSaving(true);
    setErr("");
    setMessage("");

    try {
      if (P?.id) {
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
        if (!data) throw new Error("Perubahan tidak tersimpan. Periksa izin admin di database.");
        await refreshProjects();
        await load();
        setMessage("Perubahan proyek berhasil disimpan.");
      } else {
        const { data, error } = await sb
          .from("projects")
          .insert({
            title: title.trim(),
            tagline: tagline.trim() || null,
            description: description.trim() || null,
            is_active: true,
          })
          .select("id")
          .single();

        if (error) throw error;
        if (!data?.id) throw new Error("Proyek belum berhasil dibuat.");
        const refreshed = await refreshProjects();
        if (!refreshed) throw new Error("Proyek dibuat, tetapi daftar proyek gagal dimuat. Muat ulang halaman untuk memilihnya.");
        selectProject(data.id);
        setMessage("Proyek baru berhasil dibuat dan dipilih. Materi, pertanyaan, kelompok, dan hasil akan dikelola dalam lingkup proyek ini.");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan proyek. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!P?.id) {
      setErr("Pilih proyek yang ingin diubah.");
      return;
    }

    const archivingNow = P.is_active !== false;
    const confirmation = archivingNow
      ? `Arsipkan proyek “${P.title}”? Data video, pertanyaan, kelompok, pengumpulan, dan jawaban TIDAK dihapus. Guru tetap dapat meninjau hasil; siswa tidak dapat melanjutkan draft sampai proyek diaktifkan lagi.`
      : `Aktifkan kembali proyek “${P.title}”? Siswa dapat melanjutkan pengerjaan sesuai penugasan yang masih berlaku.`;

    if (!window.confirm(confirmation)) return;

    setArchiving(true);
    setErr("");
    setMessage("");
    try {
      const { data, error } = await sb
        .from("projects")
        .update({ is_active: !archivingNow, updated_at: new Date().toISOString() })
        .eq("id", P.id)
        .select("id,is_active")
        .maybeSingle();

      if (error) throw error;
      if (!data || data.is_active !== !archivingNow) {
        throw new Error("Status proyek belum berubah. Periksa izin admin lalu coba kembali.");
      }

      await refreshProjects();
      await load();
      setMessage(
        archivingNow
          ? "Proyek diarsipkan. Data tetap tersimpan dan halaman admin menjadi hanya-baca."
          : "Proyek aktif kembali. Pengelolaan dan pengerjaan siswa dapat dilanjutkan."
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Status proyek gagal diperbarui.");
    } finally {
      setArchiving(false);
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
            <p>Memiliki akses ke proyek, materi, kelompok, dan hasil analisis.</p>
          </div>
        </div>
        <div className="admin-form-actions">
          <p>Untuk mengakhiri sesi, gunakan tombol Keluar di bagian kanan atas.</p>
        </div>
      </section>
    );
  }

  if (loading && projectId) {
    return <section className="glass"><p>Memuat informasi proyek…</p></section>;
  }

  if (loadError) {
    return (
      <section className="glass">
        <h2>Kelola proyek</h2>
        <div className="warn" role="alert">Gagal memuat proyek terpilih. Periksa koneksi dan izin database.</div>
      </section>
    );
  }

  const archived = P?.id && P.is_active === false;

  return (
    <>
      <section className="glass">
        <div className="admin-section-head">
          <div>
            <h2>Daftar proyek</h2>
            <p>Pilih proyek yang akan dikelola. Setiap proyek memiliki materi, pertanyaan, kelompok, serta hasilnya sendiri.</p>
          </div>
        </div>
        {projects.length === 0 ? (
          <p>Belum ada proyek. Buat proyek baru menggunakan formulir di bawah.</p>
        ) : (
          <div className="grid">
            {projects.map((project) => (
              <article key={project.id} className="qrow" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong>{project.title || "Proyek tanpa judul"}</strong>
                  <span className={"admin-status-pill " + (project.is_active === false ? "off" : "active")}>
                    {activeLabel(project.is_active)}
                  </span>
                </div>
                {project.tagline && <p style={{ margin: "8px 0" }}>{project.tagline}</p>}
                <button
                  type="button"
                  className={project.id === projectId ? "btn" : "btn g"}
                  disabled={project.id === projectId}
                  onClick={() => {
                    selectProject(project.id);
                    setMessage("");
                    setErr("");
                  }}
                >
                  {project.id === projectId ? "Sedang dipilih" : "Pilih proyek"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="glass">
        <div className="admin-section-head">
          <div>
            <h2>{P?.id ? "Identitas proyek terpilih" : "Buat proyek baru"}</h2>
            <p>Proyek yang diarsipkan tetap menyimpan data dan hasil siswa, tetapi tidak bisa diubah sampai diaktifkan kembali.</p>
          </div>
          {P?.id && (
            <span className={"admin-status-pill " + (archived ? "off" : "active")}>
              {activeLabel(P.is_active)}
            </span>
          )}
        </div>

        {err && <div className="warn" role="alert">{err}</div>}
        {message && <div className="admin-success-message" role="status" aria-live="polite">✓ {message}</div>}
        {archived && (
          <div className="warn" role="status">
            Proyek diarsipkan. Data lama tetap tersedia untuk ditinjau. Aktifkan kembali proyek untuk mengedit identitas atau melanjutkan pekerjaan siswa.
          </div>
        )}

        <div className="admin-form-grid">
          <div>
            <label htmlFor="project-title">Judul proyek <span aria-hidden="true">*</span></label>
            <input id="project-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: CIVIC VISION" required disabled={!!archived} />
          </div>
          <div>
            <label htmlFor="project-tagline">Tagline</label>
            <input id="project-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Ringkasan tujuan pembelajaran" disabled={!!archived} />
          </div>
          <div className="admin-span-2">
            <label htmlFor="project-description">Deskripsi proyek</label>
            <textarea id="project-description" rows={4} style={{ minHeight: 112 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan fokus, tujuan, dan konteks kegiatan analisis." disabled={!!archived} />
            <small className="admin-field-hint">Gunakan deskripsi singkat agar siswa memahami konteks kegiatan sebelum memulai LKPD.</small>
          </div>
        </div>

        <div className="admin-form-actions">
          <p>{P?.id ? "Pastikan identitas proyek sudah benar sebelum disimpan." : "Buat proyek terpisah untuk kelas atau kegiatan pembelajaran yang berbeda."}</p>
          <div className="row" style={{ marginTop: 0 }}>
            {P?.id && (
              <button className={archived ? "btn" : "btn g"} type="button" onClick={toggleArchive} disabled={archiving}>
                {archiving ? "Memperbarui…" : archived ? "Aktifkan kembali proyek" : "Arsipkan proyek"}
              </button>
            )}
            <button className="btn" type="button" onClick={saveProject} disabled={saving || !!archived}>
              {saving ? "Menyimpan…" : P?.id ? "Simpan perubahan" : "Buat proyek"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
