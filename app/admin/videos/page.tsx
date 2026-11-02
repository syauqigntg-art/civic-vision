"use client";

import { Uploader } from "@/components/admin/Uploader";
import { MediaPlayer as Media } from "@/components/video/MediaPlayer";
import { videoForm } from "@/lib/validation/schemas";
import { Fragment, useMemo, useState } from "react";
import { sb } from "@/lib/supabase";
import { useAdmin, upd, pathOf } from "@/lib/admin";

type VideoForm = {
  id: string;
  number: string;
  title: string;
  category: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
};

const blank = {
  number: "",
  title: "",
  category: "",
  description: "",
  video_url: "",
  thumbnail_url: "",
};

const two = (n: number | string) => String(n ?? "").padStart(2, "0");

export default function Videos() {
  const { P, vs, gv, load, loading, error } = useAdmin(["P", "vs", "gv"]);
  const readOnly = P?.is_active === false;
  const [f, setF] = useState<any>(blank);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editForm, setEditForm] = useState<VideoForm | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editSourceType, setEditSourceType] = useState<"upload" | "link">("upload");
  const [formKey, setFormKey] = useState(0);
  const [sourceType, setSourceType] = useState<"upload" | "link">("upload");

  const set = (key: string, value: string) => setF((prev: any) => ({ ...prev, [key]: value }));

  const filteredVideos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vs.filter((v: any) => {
      const matchesSearch = !query ||
        String(v.number).includes(query) ||
        (v.title || "").toLowerCase().includes(query) ||
        (v.category || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && v.is_active !== false) ||
        (statusFilter === "inactive" && v.is_active === false);
      return matchesSearch && matchesStatus;
    }).sort((a: any, b: any) => a.number - b.number);
  }, [vs, search, statusFilter]);

  const add = async () => {
    if (readOnly) { setErr("Proyek diarsipkan. Aktifkan kembali sebelum mengubah video."); return; }
    setErr("");
    setMessage("");

    if (!P?.id) {
      setErr("Buat atau pilih project terlebih dahulu.");
      return;
    }

    const number = f.number || String(vs.length + 1);
    const parsed = videoForm.safeParse({
      title: f.title,
      category: f.category,
      description: f.description,
      number,
    });

    if (!parsed.success) {
      setErr(parsed.error.issues[0].message);
      return;
    }
    if (sourceType === "upload" && !f.video_url) {
      setErr("Unggah file video terlebih dahulu.");
      return;
    }
    if (sourceType === "link") {
      try {
        const parsedUrl = new URL(String(f.video_url || "").trim());
        if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
      } catch {
        setErr("Masukkan link video yang valid dengan awalan https:// atau http://.");
        return;
      }
    }

    setSaving(true);
    try {
      const { error: insertError } = await sb.from("videos").insert({
        project_id: P.id,
        number: +number,
        title: f.title.trim(),
        category: f.category.trim() || null,
        description: f.description.trim() || null,
        video_url: String(f.video_url).trim(),
        thumbnail_url: f.thumbnail_url || null,
      });

      if (insertError) throw insertError;

      setF(blank);
      setSourceType("upload");
      setFormKey((value) => value + 1);
      setFormOpen(false);
      setMessage("Video berhasil ditambahkan ke project.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Video gagal disimpan. Silakan coba kembali.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (v: any) => {
    setErr("");
    setMessage("");
    setEditSourceType((v.video_url || "").startsWith("http") ? "link" : "upload");
    setEditForm({
      id: v.id,
      number: String(v.number ?? ""),
      title: v.title || "",
      category: v.category || "",
      description: v.description || "",
      video_url: v.video_url || "",
      thumbnail_url: v.thumbnail_url || "",
    });
  };

  const saveEdit = async () => {
    if (readOnly) { setErr("Proyek diarsipkan. Aktifkan kembali sebelum mengubah video."); return; }
    if (!editForm) return;
    if (!editForm.video_url.trim()) { setErr(editSourceType === "link" ? "Link video wajib diisi." : "File video wajib diunggah."); return; }
    if (editSourceType === "link") {
      try { const url = new URL(editForm.video_url.trim()); if (!["http:", "https:"].includes(url.protocol)) throw new Error(); }
      catch { setErr("Masukkan link video yang valid dengan awalan https:// atau http://."); return; }
    }
    const parsed = videoForm.safeParse({
      title: editForm.title,
      category: editForm.category,
      description: editForm.description,
      number: editForm.number,
    });
    if (!parsed.success) {
      setErr(parsed.error.issues[0].message);
      return;
    }

    setEditSaving(true);
    setErr("");
    setMessage("");
    try {
      const { data, error: saveError } = await sb
        .from("videos")
        .update({
          number: +editForm.number,
          title: editForm.title.trim(),
          category: editForm.category.trim() || null,
          description: editForm.description.trim() || null,
          video_url: editForm.video_url.trim(),
          thumbnail_url: editForm.thumbnail_url.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editForm.id)
        .select("id")
        .maybeSingle();

      if (saveError) throw saveError;
      if (!data) throw new Error("Tidak ada perubahan yang tersimpan. Periksa hak akses admin.");

      setEditForm(null);
      setMessage("Perubahan video berhasil disimpan.");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Perubahan video gagal disimpan.");
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async (v: any) => {
    if (readOnly) { setErr("Proyek diarsipkan. Aktifkan kembali sebelum mengubah status video."); return; }
    setErr("");
    setMessage("");
    const { error: updateError } = await sb
      .from("videos")
      .update({ is_active: v.is_active === false, updated_at: new Date().toISOString() })
      .eq("id", v.id);
    if (updateError) {
      setErr("Status video gagal diperbarui.");
      return;
    }
    setMessage(v.is_active === false ? "Video diaktifkan." : "Video dinonaktifkan.");
    await load();
  };

  const del = async (v: any) => {
    if (readOnly) { setErr("Proyek diarsipkan. Aktifkan kembali sebelum mengarsipkan video."); return; }
    if (!confirm("Arsipkan video ini dari materi kerja terbaru? Versi terbit dan submission lama tetap menyimpan snapshot materi; file video tidak dihapus.")) return;

    setErr("");
    setMessage("");
    const { data, error: archiveError } = await sb
      .from("videos")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", v.id)
      .select("id,is_active")
      .maybeSingle();
    if (archiveError || !data || data.is_active !== false) {
      setErr("Video belum berhasil diarsipkan. Versi terbit historis harus tetap dipertahankan.");
      return;
    }

    if (editForm?.id === v.id) setEditForm(null);
    setMessage("Video diarsipkan dari materi kerja terbaru. Untuk menerapkan perubahan ke siswa, simpan draft dan terbitkan versi baru.");
    await load();
  };

  return (
    <>
      <section className="glass">
        <div className="admin-section-head">
          <div>
            <h2>Materi video</h2>
            <p>{vs.length} video terdaftar · {vs.filter((v: any) => v.is_active !== false).length} aktif</p>
          </div>
          <button
            className="btn"
            onClick={() => {
              setFormOpen((open) => !open);
              setErr("");
            }}
            type="button"
            disabled={readOnly}
          >
            {formOpen ? "Tutup formulir" : "+ Tambah video"}
          </button>
        </div>

        {formOpen && (
          <div className="admin-create-panel" key={formKey}>
            <div className="admin-section-head">
              <div>
                <h2>Tambah video kasus</h2>
                <p>Pilih upload file video atau gunakan tautan video eksternal. Thumbnail dapat diunggah sendiri.</p>
              </div>
              <span className="admin-status-pill active">Video baru</span>
            </div>
            {err && <div className="warn" role="alert">{err}</div>}

            <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div className="admin-form-grid">
              <div className="admin-span-2">
                <label>Sumber video</label>
                <div className="row" style={{ marginTop: 6 }}>
                  <button type="button" className={sourceType === "upload" ? "btn" : "btn g"} onClick={() => { setSourceType("upload"); set("video_url", ""); }}>Upload video</button>
                  <button type="button" className={sourceType === "link" ? "btn" : "btn g"} onClick={() => { setSourceType("link"); set("video_url", ""); }}>Gunakan link</button>
                </div>
              </div>
              <div className="admin-span-2">
                {sourceType === "upload" ? <>
                  <label>File video (MP4, WebM, MOV · maks. 50 MB)</label>
                  <Uploader kind="video" onUrl={(url) => set("video_url", url)} />
                  {f.video_url && <div className="admin-upload-confirm">✓ Video siap disimpan</div>}
                </> : <>
                  <label htmlFor="new-video-url">Link video eksternal *</label>
                  <input id="new-video-url" type="url" value={f.video_url} onChange={(e) => set("video_url", e.target.value)} placeholder="https://..." />
                  <p className="admin-field-hint">Siswa akan diarahkan ke tautan ini saat membuka video kasus.</p>
                </>}
              </div>
              <div className="admin-span-2">
                <label>Thumbnail (JPG, PNG, WebP · maks. 2 MB, opsional)</label>
                <Uploader kind="image" onUrl={(url) => set("thumbnail_url", url)} />
                {f.thumbnail_url && <div className="admin-upload-confirm">✓ Thumbnail siap disimpan</div>}
              </div>
              <div>
                <label htmlFor="new-video-title">Judul video <span aria-hidden="true">*</span></label>
                <input id="new-video-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Contoh: Etika berkomentar di media sosial" />
              </div>
              <div className="admin-mini-three">
                <div>
                  <label htmlFor="new-video-number">Nomor</label>
                  <input id="new-video-number" type="number" min={1} value={f.number} onChange={(e) => set("number", e.target.value)} placeholder={String(vs.length + 1)} />
                </div>
                <div>
                  <label htmlFor="new-video-category">Kategori</label>
                  <input id="new-video-category" value={f.category} onChange={(e) => set("category", e.target.value)} placeholder="Etika digital" />
                </div>
              </div>
              <div className="admin-span-2">
                <label htmlFor="new-video-description">Deskripsi singkat</label>
                <textarea id="new-video-description" rows={2} style={{ minHeight: 76 }} value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="Konteks kasus yang perlu diamati siswa." />
              </div>
            </div>
            </fieldset>

            <div className="admin-form-actions">
              <p>Pastikan file dan judul sudah benar. Maksimum video 50 MB.</p>
              <div className="row" style={{ marginTop: 0 }}>
                <button className="btn g" type="button" onClick={() => { setFormOpen(false); setErr(""); }}>Batal</button>
                <button className="btn" type="button" onClick={add} disabled={saving || readOnly}>{saving ? "Menyimpan…" : "Simpan video"}</button>
              </div>
            </div>
          </div>
        )}

        {message && <div className="admin-success-message" role="status" aria-live="polite">✓ {message}</div>}
        {err && !formOpen && <div className="warn" role="alert">{err}</div>}
      </section>

      <section className="glass">
        <div className="admin-section-head">
          <div>
            <h2>Daftar video</h2>
            <p>Cari materi dan perbarui status tanpa menelusuri daftar panjang.</p>
          </div>
          <span className="admin-status-pill active">{filteredVideos.length} hasil</span>
        </div>

        <div className="admin-filter-row">
          <input
            aria-label="Cari video"
            placeholder="Cari judul, kategori, atau nomor video…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select aria-label="Filter status video" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button className="btn g" type="button" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Reset filter</button>
        </div>

        {loading ? (
          <div className="admin-empty">Memuat daftar video…</div>
        ) : error ? (
          <div className="warn" role="alert">Daftar video belum berhasil dimuat. Muat ulang halaman.</div>
        ) : !filteredVideos.length ? (
          <div className="admin-empty">{vs.length ? "Tidak ada video yang cocok dengan filter." : "Belum ada video. Gunakan tombol Tambah video untuk mengunggah materi pertama."}</div>
        ) : (
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Video kasus</th>
                  <th>Kelompok</th>
                  <th>Status</th>
                  <th>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.map((v: any) => {
                  const assigned = gv.filter((row: any) => row.video_id === v.id).length;
                  const editing = editForm?.id === v.id;
                  return (
                    <Fragment key={v.id}>
                      <tr>
                        <td>{two(v.number)}</td>
                        <td>
                          <div className="admin-video-title">{v.title || "Tanpa judul"}</div>
                          <div style={{ color: "#8a97aa", fontSize: 11, marginTop: 4 }}>{v.category || "Tanpa kategori"}</div>
                        </td>
                        <td>{assigned} kelompok</td>
                        <td><span className={"admin-status-pill " + (v.is_active === false ? "off" : "active")}>{v.is_active === false ? "Nonaktif" : "Aktif"}</span></td>
                        <td>
                          <div className="admin-row-actions">
                            <button className="btn g" type="button" onClick={() => editing ? setEditForm(null) : startEdit(v)} disabled={readOnly}>{editing ? "Tutup" : "Edit"}</button>
                            <button className="btn g" type="button" onClick={() => toggleActive(v)} disabled={readOnly}>{v.is_active === false ? "Aktifkan" : "Nonaktifkan"}</button>
                            <button className="btn g danger" type="button" onClick={() => del(v)} disabled={readOnly}>Arsipkan</button>
                          </div>
                        </td>
                      </tr>
                      {editing && editForm && (
                        <tr key={v.id + "-edit"}>
                          <td colSpan={5}>
                            <div className="admin-edit-panel">
                              <div className="admin-section-head">
                                <div>
                                  <h3>Edit video {two(v.number)}</h3>
                                  <p>Guru dapat mengganti sumber video dan thumbnail. Perubahan akan masuk ke draft materi berikutnya.</p>
                                </div>
                                <button className="btn g" type="button" onClick={() => setEditForm(null)}>Tutup editor</button>
                              </div>
                              {err && <div className="warn" role="alert">{err}</div>}
                              <fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                              <div className="admin-form-grid">
                                <div>
                                  <label>Judul</label>
                                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                                </div>
                                <div className="admin-mini-three">
                                  <div>
                                    <label>Nomor</label>
                                    <input type="number" min={1} value={editForm.number} onChange={(e) => setEditForm({ ...editForm, number: e.target.value })} />
                                  </div>
                                  <div>
                                    <label>Kategori</label>
                                    <input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                                  </div>
                                </div>
                                <div className="admin-span-2">
                                  <label>Deskripsi</label>
                                  <textarea rows={2} style={{ minHeight: 76 }} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                                </div>
                                <div className="admin-span-2">
                                  <label>Sumber video</label>
                                  <select value={editSourceType} onChange={(e) => { setEditSourceType(e.target.value as "upload" | "link"); setEditForm({ ...editForm, video_url: "" }); }}>
                                    <option value="upload">Upload video</option>
                                    <option value="link">Link eksternal</option>
                                  </select>
                                  {editSourceType === "link" ? <input aria-label="Link video eksternal" type="url" value={editForm.video_url} onChange={(e) => setEditForm({ ...editForm, video_url: e.target.value })} placeholder="https://..." /> : <Uploader kind="video" onUrl={(url) => setEditForm({ ...editForm, video_url: url })} />}
                                </div>
                                <div className="admin-span-2">
                                  <label>Ganti thumbnail</label>
                                  <Uploader kind="image" onUrl={(url) => setEditForm({ ...editForm, thumbnail_url: url })} />
                                </div>
                              </div>
                              </fieldset>
                              <div className="admin-form-actions">
                                <p>Penggantian video akan memperbarui file yang digunakan pada halaman siswa.</p>
                                <button className="btn" type="button" onClick={saveEdit} disabled={editSaving || readOnly}>{editSaving ? "Menyimpan…" : "Simpan perubahan"}</button>
                              </div>
                              {v.video_url && <details className="admin-expand" style={{ marginTop: 12 }}>
                                <summary>Pratinjau video saat ini</summary>
                                <div className="admin-video-preview"><Media path={v.video_url} poster={v.thumbnail_url} kind="video" alt={"Video: " + v.title} /></div>
                              </details>}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
