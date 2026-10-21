"use client"; import { questionForm } from "@/lib/validation/schemas"; import { useMemo, useState } from "react"; import { sb, opts, catsOf, Q } from "@/lib/supabase"; import { useAdmin } from "@/lib/admin";
const T: Record<string, string> = { text: "Text", textarea: "Textarea", multiple_text: "Multiple Text", single_select: "Single Select", multi_select: "Multi Select", scale: "Scale" };
const blank = { id: "", question_text: "", category: "", newCat: "", question_type: "textarea", is_required: true, is_active: true, phase: "", placeholder: "", description: "", display_order: 1, min_items: 2, options: [""] };
const PLACEHOLDER_BY_PHASE: Record<string, string[]> = {
  see: [
    "Tuliskan hal yang kalian amati dari video...",
    "Apa masalah yang terlihat pada kasus ini?",
    "Siapa saja yang terdampak dalam kasus tersebut?",
    "Fakta apa yang kalian temukan dari video?",
  ],
  think: [
    "Jelaskan masalah utama yang kalian temukan...",
    "Menurut kalian, apa penyebab masalah tersebut?",
    "Tuliskan fakta atau bukti yang mendukung analisis kalian...",
    "Siapa saja pihak yang terlibat dan terdampak?",
    "Apa dampak masalah tersebut bagi lingkungan sekitar?",
  ],
  connect: [
    "Nilai atau sila Pancasila apa yang berkaitan dengan kasus ini?",
    "Jelaskan hubungan kasus tersebut dengan nilai Pancasila...",
    "Mengapa nilai tersebut relevan dengan permasalahan ini?",
    "Prinsip etika atau kewarganegaraan apa yang perlu diperhatikan?",
  ],
  act: [
    "Solusi apa yang kalian usulkan untuk mengatasi masalah ini?",
    "Tuliskan tindakan nyata yang dapat dilakukan...",
    "Apa langkah pertama yang akan kalian lakukan?",
    "Siapa yang perlu dilibatkan untuk menjalankan solusi tersebut?",
    "Bagaimana cara memastikan solusi kalian dapat diterapkan?",
  ],
};

const PLACEHOLDER_BY_CATEGORY: Array<{ match: string[]; options: string[] }> = [
  {
    match: ["observasi", "pengamatan", "kasus", "identifikasi"],
    options: [
      "Tuliskan hasil pengamatan kalian...",
      "Masalah apa yang paling terlihat pada kasus ini?",
      "Siapa yang terdampak dan bagaimana kondisinya?",
      "Fakta apa yang kalian temukan dari kasus?",
    ],
  },
  {
    match: ["analisis", "masalah", "penyebab", "dampak"],
    options: [
      "Jelaskan masalah utama yang kalian temukan...",
      "Menurut kalian, apa penyebab masalah tersebut?",
      "Apa bukti atau fakta yang mendukung pendapat kalian?",
      "Apa dampak masalah tersebut bagi pihak yang terlibat?",
    ],
  },
  {
    match: ["pancasila", "sila", "nilai", "etika", "moral", "kewarganegaraan"],
    options: [
      "Sila atau nilai Pancasila apa yang relevan?",
      "Jelaskan hubungan kasus dengan nilai Pancasila...",
      "Mengapa nilai tersebut sesuai dengan kasus ini?",
      "Prinsip etika atau kewarganegaraan apa yang berkaitan?",
    ],
  },
  {
    match: ["solusi", "tindakan", "aksi", "refleksi", "kesimpulan"],
    options: [
      "Solusi apa yang kalian usulkan?",
      "Tuliskan tindakan nyata yang dapat dilakukan...",
      "Apa langkah pertama untuk menerapkan solusi tersebut?",
      "Apa pelajaran penting yang kalian peroleh?",
    ],
  },
];

function getPlaceholderOptions(category: string, phase: string) {
  const normalized = category.trim().toLocaleLowerCase("id-ID");
  const match = PLACEHOLDER_BY_CATEGORY.find((item) =>
    item.match.some((keyword) => normalized.includes(keyword))
  );
  const phaseOptions = PLACEHOLDER_BY_PHASE[phase] || [];
  const categoryOptions = match?.options || [];
  const combined = [...categoryOptions, ...phaseOptions,
    "Tuliskan jawaban kalian di sini...",
    "Jelaskan alasan kalian...",
    "Berikan contoh yang sesuai...",
  ];
  return [...new Set(combined)];
}

export default function Questions() {
  const { P, qs, ans, load, loading } = useAdmin(["P", "qs", "ans"]); const [drag, setDrag] = useState(""); const [f, setF] = useState<any>(null); const [err, setErr] = useState(""); const [search, setSearch] = useState(""); const [phaseFilter, setPhaseFilter] = useState("all"); const [statusFilter, setStatusFilter] = useState("all"); const cats = [...new Set(qs.map((q: any) => String(q?.category ?? "").trim()).filter(Boolean))];
  const filteredQs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return qs.filter((q: any) => {
      const questionText = String(q?.question_text ?? ""); const categoryText = String(q?.category ?? ""); const typeText = String(T[q?.question_type] || q?.question_type || ""); const matchesSearch = !query || questionText.toLocaleLowerCase("id-ID").includes(query) || categoryText.toLocaleLowerCase("id-ID").includes(query) || typeText.toLocaleLowerCase("id-ID").includes(query);
      const matchesPhase = phaseFilter === "all" || (q.phase || "none") === phaseFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" && q.is_active !== false) || (statusFilter === "inactive" && q.is_active === false);
      return matchesSearch && matchesPhase && matchesStatus;
    }).sort((a: any, b: any) => a.display_order - b.display_order);
  }, [qs, search, phaseFilter, statusFilter]);
  const edit = (q?: Q) => { setErr(""); setF(q ? { id: q.id, question_text: String(q.question_text || ""), category: String(q.category || ""), newCat: "", question_type: q.question_type, is_required: q.is_required, is_active: (q as any).is_active !== false, phase: (q as any).phase || "", placeholder: q.placeholder || "", description: q.description || "", display_order: q.display_order, min_items: q.min_items, options: opts(q).length ? opts(q) : [""] }
    : { ...blank, category: cats[0] || "", display_order: (qs[qs.length - 1]?.display_order || 0) + 1 }); };
  const set = (k: string, v: any) =>
    setF((previous: any) =>
      k === "category" || k === "phase"
        ? { ...previous, [k]: v, placeholder: "" }
        : { ...previous, [k]: v }
    );
  // Form is closed on the list view (f === null). Only build placeholder
  // options while a question form is open to avoid reading properties of null.
  const activeCategory = f
    ? f.category === "__new"
      ? f.newCat
      : f.category
    : "";
  const placeholderChoices = f
    ? getPlaceholderOptions(activeCategory || "", f.phase || "")
    : [];
  const placeholderOptions = f?.placeholder && !placeholderChoices.includes(f.placeholder)
    ? [f.placeholder, ...placeholderChoices]
    : placeholderChoices;
  const save = async () => { const cat = f.category === "__new" ? f.newCat.trim() : f.category; const sel = f.question_type.endsWith("select"); const o = f.options.map((s: string) => s.trim()).filter(Boolean);
    if (!f.question_text.trim() || !cat) return setErr("Pertanyaan dan kategori wajib diisi."); if (sel && o.length < 2) return setErr("Tambahkan minimal 2 pilihan jawaban.");
    const row = { question_text: f.question_text, category: cat, phase: f.phase || null, question_type: f.question_type, is_required: f.is_required, is_active: f.is_active, placeholder: f.placeholder || null, description: f.description || null, display_order: +f.display_order, min_items: +f.min_items || 1, updated_at: new Date().toISOString() };
    const pr = questionForm.safeParse(row); if (!pr.success) return setErr(pr.error.issues[0].message);
    if (qs.some(x => x.id !== f.id && x.display_order === +f.display_order)) for (const q of qs) if (q.id !== f.id && q.display_order >= +f.display_order) await sb.from("questions").update({ display_order: q.display_order + 1 }).eq("id", q.id);
    let id = f.id; if (id) await sb.from("questions").update(row).eq("id", id); else { const r = await sb.from("questions").insert({ ...row, project_id: P.id }).select("id").single(); id = r.data?.id; }
    await sb.from("question_options").delete().eq("question_id", id); if (sel) await sb.from("question_options").insert(o.map((t: string, i: number) => ({ question_id: id, option_text: t, display_order: i + 1 })));
    setF(null); load(); };
  const del = async (q: Q) => { const n = ans.filter(a => a.question_id === q.id).length;
    if (n > 0) { if (confirm(`Pertanyaan ini sudah memiliki ${n} jawaban siswa, jadi tidak dihapus permanen. Pertanyaan akan dinonaktifkan (disembunyikan dari siswa) dan jawaban lama tetap tersimpan. Lanjutkan?`)) { await sb.from("questions").update({ is_active: false }).eq("id", q.id); load(); } return; }
    if (confirm("Hapus pertanyaan ini secara permanen?")) { await sb.from("questions").delete().eq("id", q.id); load(); } };
  const reorder = async (from: string, to: string) => { if (!from || from === to) return; const a = [...qs]; const i = a.findIndex(x => x.id === from), j = a.findIndex(x => x.id === to); const [m] = a.splice(i, 1); a.splice(j, 0, m);
    await Promise.all(a.map((q, k) => q.display_order === k + 1 ? null : sb.from("questions").update({ display_order: k + 1 }).eq("id", q.id))); load(); };
  const bump = (i: number, d: number) => { const t = qs[i + d]; if (t) reorder(qs[i].id, t.id); };
  if (f) return (<section className="glass"><h2>{f.id ? "Edit Pertanyaan" : "Tambah Pertanyaan"}</h2>{err && <div className="warn" role="alert">{err}</div>}
    <label>Pertanyaan</label><textarea value={f.question_text} onChange={e => set("question_text", e.target.value)} />
    <label>Kategori</label><select value={f.category} onChange={e => set("category", e.target.value)}><option value="">Pilih kategori</option>{cats.map(c => <option key={c}>{c}</option>)}<option value="__new">+ Kategori baru...</option></select>
    {f.category === "__new" && <input style={{ marginTop: 8 }} placeholder="Nama kategori baru" value={f.newCat} onChange={e => set("newCat", e.target.value)} />}
    <label>Fase belajar</label><select value={f.phase} onChange={e => set("phase", e.target.value)}><option value="">— tanpa fase —</option><option value="see">SEE — Melihat permasalahan</option><option value="think">THINK — Memikirkan dan menganalisis</option><option value="connect">CONNECT — Menghubungkan dengan Pancasila</option><option value="act">ACT — Melakukan tindakan nyata</option></select>
    <label>Tipe Pertanyaan</label><select value={f.question_type} onChange={e => set("question_type", e.target.value)}>{Object.entries(T).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    {f.question_type === "multiple_text" && <><label>Minimal jawaban</label><input type="number" min={1} value={f.min_items} onChange={e => set("min_items", e.target.value)} /></>}
    <label><input type="checkbox" style={{ width: "auto", marginRight: 8 }} checked={f.is_required} onChange={e => set("is_required", e.target.checked)} />Required (wajib dijawab)</label>
    <label><input type="checkbox" style={{ width: "auto", marginRight: 8 }} checked={f.is_active} onChange={e => set("is_active", e.target.checked)} />Aktif (tampil untuk siswa)</label>
    <label htmlFor="question-placeholder">Placeholder jawaban</label>
    <select id="question-placeholder" value={f.placeholder} onChange={e => set("placeholder", e.target.value)}>
      <option value="">— Tanpa placeholder —</option>
      {placeholderOptions.map((value: string) => <option key={value} value={value}>{value}</option>)}
    </select>
    <small className="admin-field-hint">Pilihan otomatis menyesuaikan kategori dan fase. Ubah kategori atau fase untuk melihat rekomendasi lain.</small>
    <label htmlFor="question-description">Instruksi tambahan (opsional)</label><input id="question-description" value={f.description} onChange={e => set("description", e.target.value)} />
    <label>Urutan</label><input type="number" min={1} value={f.display_order} onChange={e => set("display_order", e.target.value)} />
    {f.question_type.endsWith("select") && <><label>Pilihan Jawaban</label>{f.options.map((o: string, i: number) => <div className="row" style={{ marginTop: 6 }} key={i}><input value={o} placeholder={`Pilihan ${i + 1}`} onChange={e => { const a = [...f.options]; a[i] = e.target.value; set("options", a); }} />
      <button className="btn g" onClick={() => set("options", f.options.filter((_: any, j: number) => j !== i))}>×</button></div>)}<div className="row"><button className="btn g" onClick={() => set("options", [...f.options, ""])}>+ Tambah pilihan</button></div></>}
    <div className="admin-form-actions"><p>Pastikan fase dan status aktif sudah sesuai.</p><div className="row" style={{ marginTop: 0 }}><button className="btn g" onClick={() => setF(null)}>Batal</button><button className="btn" onClick={save}>Simpan pertanyaan</button></div></div></section>);
  return (
    <section className="glass">
      <div className="admin-section-head">
        <div>
          <h2>Daftar pertanyaan</h2>
          <p>{qs.length} pertanyaan tersimpan · {qs.filter((q: any) => q.is_active !== false).length} aktif</p>
        </div>
        <button className="btn" type="button" onClick={() => edit()}>+ Tambah pertanyaan</button>
      </div>

      <div className="admin-filter-row">
        <input
          aria-label="Cari pertanyaan"
          placeholder="Cari teks pertanyaan, kategori, atau tipe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter fase" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}>
          <option value="all">Semua fase</option>
          <option value="see">SEE</option>
          <option value="think">THINK</option>
          <option value="connect">CONNECT</option>
          <option value="act">ACT</option>
          <option value="none">Tanpa fase</option>
        </select>
        <select aria-label="Filter status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      {loading ? (
        <div className="admin-empty">Memuat pertanyaan…</div>
      ) : !qs.length ? (
        <div className="admin-empty">
          Belum ada pertanyaan. Tambahkan pertanyaan pertama melalui tombol di atas.
        </div>
      ) : !filteredQs.length ? (
        <div className="admin-empty">Tidak ada pertanyaan yang cocok dengan filter.</div>
      ) : (
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Urutan</th>
                <th>Fase</th>
                <th>Kategori & pertanyaan</th>
                <th>Tipe</th>
                <th>Wajib</th>
                <th>Status</th>
                <th>Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredQs.map((q: any) => (
                <tr key={q.id} draggable onDragStart={() => setDrag(q.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { reorder(drag, q.id); setDrag(""); }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span title="Seret untuk mengubah urutan" style={{ color: "#9aa5b5", cursor: "grab" }}>⠿</span>
                      <span>{String(q.display_order).padStart(2, "0")}</span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <button className="admin-order-btn" type="button" onClick={() => bump(qs.findIndex((item: any) => item.id === q.id), -1)} aria-label={`Naikkan ${q.question_text}`}>↑</button>
                        <button className="admin-order-btn" type="button" onClick={() => bump(qs.findIndex((item: any) => item.id === q.id), 1)} aria-label={`Turunkan ${q.question_text}`}>↓</button>
                      </span>
                    </div>
                  </td>
                  <td><span className="admin-phase-chip">{q.phase ? q.phase.toUpperCase() : "—"}</span></td>
                  <td className="admin-question-cell">
                    <strong>{q.category}</strong>
                    <div style={{ marginTop: 4 }}>{q.question_text}</div>
                  </td>
                  <td>{T[q.question_type] || q.question_type}</td>
                  <td>{q.is_required ? "Wajib" : "Opsional"}</td>
                  <td>
                    <button className="btn g" style={{ padding: "5px 9px", minHeight: 30 }} onClick={async () => { const { error } = await sb.from("questions").update({ is_active: !q.is_active }).eq("id", q.id); if (error) { setErr("Status pertanyaan gagal diperbarui."); return; } load(); }}>
                      <span className={"admin-status-pill " + (q.is_active !== false ? "active" : "off")}>{q.is_active !== false ? "Aktif" : "Nonaktif"}</span>
                    </button>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn g" type="button" onClick={() => edit(q)}>Edit</button>
                      <button className="btn g danger" type="button" onClick={() => del(q)}>Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {err && <div className="warn" role="alert" style={{ marginTop: 12 }}>{err}</div>}
      <div className="admin-table-footer">
        <span>Menampilkan {filteredQs.length} dari {qs.length} pertanyaan.</span>
        <button className="btn g" type="button" onClick={() => { setSearch(""); setPhaseFilter("all"); setStatusFilter("all"); }}>Reset filter</button>
      </div>
    </section>
  );
}
