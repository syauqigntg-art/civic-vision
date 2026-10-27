"use client"; import { questionForm } from "@/lib/validation/schemas"; import { useMemo, useState } from "react"; import { sb, opts, Q } from "@/lib/supabase"; import { useAdmin } from "@/lib/admin"; import { QuestionField } from "@/components/lkpd/QuestionField";
const T: Record<string, string> = { text: "Jawaban singkat", textarea: "Jawaban panjang", multiple_text: "Beberapa jawaban teks", single_select: "Pilih satu jawaban", multi_select: "Pilih beberapa jawaban", scale: "Skala 1–5" };
const PBL_PHASES: Record<string, { title: string; subtitle: string; instruction: string; output: string }> = {
  see: { title: "SEE", subtitle: "Mengamati masalah", instruction: "Amati stimulus/video, identifikasi fakta dan pihak yang terdampak.", output: "Fakta pengamatan dan rumusan awal masalah" },
  think: { title: "THINK", subtitle: "Menganalisis masalah", instruction: "Uraikan penyebab, bukti, dampak, dan sudut pandang berbagai pihak.", output: "Analisis masalah yang didukung bukti" },
  connect: { title: "CONNECT", subtitle: "Menghubungkan konsep", instruction: "Hubungkan kasus dengan nilai Pancasila, hak-kewajiban, keadilan, atau konsep IPS yang relevan.", output: "Argumentasi yang menghubungkan kasus dan konsep" },
  act: { title: "ACT", subtitle: "Merancang tindakan", instruction: "Rancang solusi, langkah, pembagian peran, dan cara menilai keberhasilannya.", output: "Rencana aksi dan indikator keberhasilan" },
};

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
  const { P, qs, ans, load, loading } = useAdmin(["P", "qs", "ans"]); const readOnly = P?.is_active === false; const [drag, setDrag] = useState(""); const [f, setF] = useState<any>(null); const [err, setErr] = useState(""); const [search, setSearch] = useState(""); const [phaseFilter, setPhaseFilter] = useState("all"); const [statusFilter, setStatusFilter] = useState("all"); const [previewAnswer, setPreviewAnswer] = useState<unknown>(""); const [saving, setSaving] = useState(false); const cats = [...new Set(qs.map((q: any) => String(q?.category ?? "").trim()).filter(Boolean))];
  const filteredQs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return qs.filter((q: any) => {
      const questionText = String(q?.question_text ?? ""); const categoryText = String(q?.category ?? ""); const typeText = String(T[q?.question_type] || q?.question_type || ""); const matchesSearch = !query || questionText.toLocaleLowerCase("id-ID").includes(query) || categoryText.toLocaleLowerCase("id-ID").includes(query) || typeText.toLocaleLowerCase("id-ID").includes(query);
      const matchesPhase = phaseFilter === "all" || (q.phase || "none") === phaseFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" && q.is_active !== false) || (statusFilter === "inactive" && q.is_active === false);
      return matchesSearch && matchesPhase && matchesStatus;
    }).sort((a: any, b: any) => a.display_order - b.display_order);
  }, [qs, search, phaseFilter, statusFilter]);
  const edit = (q?: Q) => { setErr(""); setPreviewAnswer(""); setF(q ? { id: q.id, question_text: String(q.question_text || ""), category: String(q.category || ""), newCat: "", question_type: q.question_type, is_required: q.is_required, is_active: (q as any).is_active !== false, phase: (q as any).phase || "", placeholder: q.placeholder || "", description: q.description || "", display_order: q.display_order, min_items: q.min_items, options: opts(q).length ? opts(q) : [""] }
    : { ...blank, category: cats[0] || "", display_order: (qs[qs.length - 1]?.display_order || 0) + 1 }); };
  const set = (k: string, v: any) => {
    if (k === "question_type") setPreviewAnswer("");
    setF((previous: any) =>
      k === "category" || k === "phase"
        ? { ...previous, [k]: v, placeholder: "" }
        : { ...previous, [k]: v }
    );
  };
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
  const previewQuestion = f ? ({
    id: f.id || "preview-question",
    question_text: f.question_text || "Pertanyaan akan tampil di sini.",
    category: (f.category === "__new" ? f.newCat : f.category) || "Kategori",
    phase: f.phase || null,
    question_type: f.question_type,
    is_required: f.is_required,
    is_active: f.is_active,
    placeholder: f.placeholder || null,
    description: f.description || null,
    display_order: Number(f.display_order) || 1,
    min_items: Number(f.min_items) || 1,
    question_options: (f.options || []).map((option_text: string, index: number) => ({ option_text, display_order: index + 1 })),
  } as Q) : null;
  const previewRaw = typeof previewAnswer === "string" ? previewAnswer : JSON.stringify(previewAnswer);

  const save = async () => {
    if (readOnly) {
      setErr("Proyek diarsipkan. Aktifkan kembali sebelum mengubah pertanyaan.");
      return;
    }
    if (saving) return;

    const cat = f.category === "__new" ? f.newCat.trim() : f.category.trim();
    const isSelect = ["single_select", "multi_select"].includes(f.question_type);
    const options = Array.isArray(f.options)
      ? f.options.map((value: string) => String(value).trim()).filter(Boolean)
      : [];

    const row = {
      question_text: String(f.question_text || "").trim(),
      category: cat,
      phase: f.phase || null,
      question_type: f.question_type,
      is_required: Boolean(f.is_required),
      is_active: Boolean(f.is_active),
      placeholder: f.placeholder || null,
      description: f.description || null,
      display_order: Number(f.display_order),
      min_items: Number(f.min_items) || 1,
    };
    const parsed = questionForm.safeParse(row);
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message || "Periksa kembali isian pertanyaan.");
      return;
    }
    if (!P?.id) {
      setErr("Proyek belum dipilih. Pilih proyek terlebih dahulu.");
      return;
    }
    if (isSelect && options.length < 2) {
      setErr("Tambahkan minimal 2 pilihan jawaban.");
      return;
    }
    if (isSelect && new Set(options).size !== options.length) {
      setErr("Setiap pilihan jawaban harus berbeda.");
      return;
    }

    setSaving(true);
    setErr("");
    try {
      const { error } = await sb.rpc("admin_save_question", {
        p_id: f.id || null,
        p_project_id: P.id,
        p_question_text: parsed.data.question_text,
        p_category: cat,
        p_phase: parsed.data.phase,
        p_question_type: parsed.data.question_type,
        p_is_required: parsed.data.is_required,
        p_is_active: parsed.data.is_active,
        p_placeholder: parsed.data.placeholder,
        p_description: parsed.data.description,
        p_display_order: parsed.data.display_order,
        p_min_items: parsed.data.min_items,
        p_options: isSelect ? options : [],
      });

      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("question_has_answers_create_new_version")) {
          setErr("Perubahan ditolak karena database belum memastikan jawaban ini terlindungi oleh snapshot historis. Jawaban tidak dihapus. Periksa status migration versioning sebelum mencoba lagi.");
        } else if (message.includes("question_has_unversioned_answers")) {
          setErr("Perubahan ditolak karena setidaknya satu jawaban belum dapat dipastikan terikat ke snapshot historis yang valid. Tidak ada jawaban yang dihapus; minta maintainer memeriksa relasi submission/version.");
        } else if (message.includes("duplicate_question_options")) {
          setErr("Pilihan jawaban tidak boleh duplikat.");
        } else if (message.includes("invalid_question_options")) {
          setErr("Pilihan jawaban tidak valid. Isi minimal 2 pilihan yang masing-masing maksimal 300 karakter.");
        } else if (message.includes("project_archived")) {
          setErr("Proyek diarsipkan. Aktifkan kembali proyek sebelum mengubah pertanyaan.");
        } else if (message.includes("admin_required") || message.includes("permission denied")) {
          setErr("Akses ditolak. Masuk kembali menggunakan akun guru/admin.");
        } else {
          setErr("Pertanyaan gagal disimpan. Perubahan belum dikonfirmasi; periksa isian, akses admin, dan status database sebelum mencoba lagi.");
        }
        return;
      }

      setF(null);
      setPreviewAnswer("");
      setErr("");
      await load();
    } catch {
      setErr("Koneksi gagal saat menyimpan. Formulir tetap terbuka dan perubahan belum dikonfirmasi.");
    } finally {
      setSaving(false);
    }
  };
  const del = async (q: Q) => {
    if (readOnly) {
      setErr("Proyek diarsipkan. Aktifkan kembali sebelum mengubah pertanyaan.");
      return;
    }
    const answerCount = ans.filter((answer: any) => answer.question_id === q.id).length;
    const answerWarning = answerCount > 0
      ? `\n\nAda ${answerCount} jawaban siswa yang sudah tersimpan.`
      : "";
    const prompt = `Hapus pertanyaan "${q.question_text}" dari bank pertanyaan aktif?${answerWarning}\n\nPertanyaan akan hilang dari dashboard dan tidak masuk ke versi LKPD baru. Jawaban siswa dan snapshot LKPD yang sudah terbit tetap disimpan untuk menjaga riwayat. Tindakan ini tidak dapat dibatalkan dari dashboard.`;
    if (!confirm(prompt)) return;

    setErr("");
    setSaving(true);
    try {
      const { data, error } = await sb.rpc("admin_delete_question", {
        p_id: q.id,
        p_project_id: P.id,
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes("project_archived")) {
          setErr("Proyek diarsipkan. Aktifkan kembali sebelum mengubah pertanyaan.");
        } else if (message.includes("admin_required") || message.includes("permission denied")) {
          setErr("Akses ditolak. Masuk kembali menggunakan akun guru/admin.");
        } else {
          setErr("Pertanyaan gagal dihapus. Belum ada perubahan yang dikonfirmasi; periksa apakah migration penghapusan sudah diterapkan pada database.");
        }
        return;
      }
      if (data === "not_found") {
        setErr("Pertanyaan tidak ditemukan pada proyek yang sedang dipilih. Muat ulang daftar.");
      } else if (data !== "deleted" && data !== "already_deleted") {
        setErr("Penghapusan belum aktif pada database. Terapkan migration terbaru terlebih dahulu; pertanyaan belum dihapus dari bank.");
      } else {
        setErr("");
      }
      await load();
    } catch {
      setErr("Koneksi gagal saat menghapus pertanyaan. Muat ulang daftar untuk memastikan status terakhir.");
    } finally {
      setSaving(false);
    }
  };
  const reorder = async (from: string, to: string) => {
    if (readOnly || !from || from === to || !P?.id) return;
    const ordered = [...qs];
    const fromIndex = ordered.findIndex((question) => question.id === from);
    const toIndex = ordered.findIndex((question) => question.id === to);
    if (fromIndex < 0 || toIndex < 0) return;
    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);

    setErr("");
    const { error } = await sb.rpc("admin_reorder_questions", {
      p_project_id: P.id,
      p_question_ids: ordered.map((question) => question.id),
    });
    if (error) {
      setErr(error.message.toLowerCase().includes("project_archived")
        ? "Proyek diarsipkan. Aktifkan kembali sebelum mengurutkan pertanyaan."
        : "Urutan pertanyaan gagal disimpan. Daftar akan tetap menggunakan urutan server.");
      await load();
      return;
    }
    await load();
  };
  const bump = (i: number, d: number) => { const t = qs[i + d]; if (t) reorder(qs[i].id, t.id); };
  if (f) return (<section className="glass">
      <p role="status" style={{ marginTop: 0, color: "#cbd5e1" }}>Perubahan soal masuk ke snapshot berikutnya setelah guru menyimpan, memvalidasi, dan menerbitkan versi. Pekerjaan siswa yang sudah berjalan tetap memakai snapshot yang dipin; jawaban historis tidak dihapus.</p><h2>{f.id ? "Edit Pertanyaan" : "Tambah Pertanyaan"}</h2>{err && <div className="warn" role="alert">{err}</div>}<fieldset disabled={readOnly} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
    <label>Pertanyaan</label><textarea value={f.question_text} onChange={e => set("question_text", e.target.value)} />
    <label>Kategori</label><select value={f.category} onChange={e => set("category", e.target.value)}><option value="">Pilih kategori</option>{cats.map(c => <option key={c}>{c}</option>)}<option value="__new">+ Kategori baru...</option></select>
    {f.category === "__new" && <input style={{ marginTop: 8 }} placeholder="Nama kategori baru" value={f.newCat} onChange={e => set("newCat", e.target.value)} />}
    <label>Fase belajar</label><select value={f.phase} onChange={e => set("phase", e.target.value)}><option value="">— tanpa fase —</option><option value="see">SEE — Mengamati masalah</option><option value="think">THINK — Menganalisis masalah</option><option value="connect">CONNECT — Menghubungkan konsep</option><option value="act">ACT — Merancang tindakan</option></select>
    <label>Tipe Pertanyaan</label><select value={f.question_type} onChange={e => set("question_type", e.target.value)}>{Object.entries(T).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    {f.question_type === "multiple_text" && <><label>Minimal jawaban</label><input type="number" min={1} value={f.min_items} onChange={e => set("min_items", e.target.value)} /></>}
    <label><input type="checkbox" style={{ width: "auto", marginRight: 8 }} checked={f.is_required} onChange={e => set("is_required", e.target.checked)} />Required (wajib dijawab)</label>
    <label><input type="checkbox" style={{ width: "auto", marginRight: 8 }} checked={f.is_active} onChange={e => set("is_active", e.target.checked)} />Aktif (tampil untuk siswa)</label>
    <label htmlFor="question-placeholder">Petunjuk/contoh jawaban</label>
    <select id="question-placeholder" value={f.placeholder} onChange={e => set("placeholder", e.target.value)}>
      <option value="">— Tanpa placeholder —</option>
      {placeholderOptions.map((value: string) => <option key={value} value={value}>{value}</option>)}
    </select>
    <small className="admin-field-hint">Pilihan otomatis menyesuaikan kategori dan fase. Ubah kategori atau fase untuk melihat rekomendasi lain.</small>
    <label htmlFor="question-description">Instruksi tambahan (opsional)</label><input id="question-description" value={f.description} onChange={e => set("description", e.target.value)} />
    <label>Posisi tampil</label><input type="number" min={1} value={f.display_order} onChange={e => set("display_order", e.target.value)} />
    {f.question_type.endsWith("select") && <><label>Pilihan Jawaban</label>{f.options.map((o: string, i: number) => <div className="row" style={{ marginTop: 6 }} key={i}><input value={o} placeholder={`Pilihan ${i + 1}`} onChange={e => { const a = [...f.options]; a[i] = e.target.value; set("options", a); }} />
      <button className="btn g" onClick={() => set("options", f.options.filter((_: any, j: number) => j !== i))}>×</button></div>)}<div className="row"><button className="btn g" onClick={() => set("options", [...f.options, ""])}>+ Tambah pilihan</button></div></>}</fieldset>
    <section className="glass" aria-label="Pratinjau soal siswa" style={{ marginTop: 18 }}>
      <h3 id="question-preview-title">Pratinjau tampilan siswa</h3>
      <p style={{ marginTop: 0, opacity: .85 }}>Pratinjau ini mengikuti fase, tipe jawaban, placeholder, instruksi, dan opsi yang sedang kamu atur. Jawaban di sini hanya contoh lokal dan tidak disimpan.</p>
      {previewQuestion && <>
        <span className="tag">{PBL_PHASES[f.phase]?.title || "TANPA FASE"} · {previewQuestion.category}</span>
        <h4 id="question-preview-prompt" style={{ marginTop: 10 }}>
          {previewQuestion.question_text}{previewQuestion.is_required ? " *" : " (opsional)"}
        </h4>
        <QuestionField q={previewQuestion} raw={previewRaw} onChange={setPreviewAnswer} labelledBy="question-preview-prompt" />
        {previewQuestion.description && <p className="hint">{previewQuestion.description}</p>}
      </>}
    </section>
    <div className="admin-form-actions"><p>Pastikan fase dan status aktif sudah sesuai.</p><div className="row" style={{ marginTop: 0 }}><button className="btn g" onClick={() => setF(null)}>Batal</button><button className="btn" onClick={save} disabled={readOnly || saving}>{saving ? "Menyimpan..." : "Simpan pertanyaan"}</button></div></div></section>);
  return (
    <section className="glass">
      <p role="status" style={{ marginTop: 0, color: "#cbd5e1" }}>Pertanyaan yang dihapus hilang dari bank kerja dan tidak masuk versi baru. Snapshot terbit dan jawaban lama tetap disimpan; perubahan versi baru berlaku setelah guru menyimpan, memvalidasi, lalu menerbitkan versi.</p>
      <div className="admin-section-head">
        <div>
          <h2>Daftar pertanyaan</h2>
          <p>{qs.length} pertanyaan tersimpan · {qs.filter((q: any) => q.is_active !== false).length} aktif</p>
        </div>
        <button className="btn" type="button" onClick={() => edit()} disabled={readOnly}>+ Tambah pertanyaan</button>
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

      <div className="admin-phase-overview" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10, margin: "16px 0" }}>
        {Object.entries(PBL_PHASES).map(([key, phase]) => {
          const phaseQuestions = qs.filter((question: any) => question.phase === key);
          const activeCount = phaseQuestions.filter((question: any) => question.is_active !== false).length;
          return (
            <article className="glass" key={key} style={{ padding: 14 }}>
              <strong>{phase.title} — {phase.subtitle}</strong>
              <p style={{ fontSize: 13, margin: "8px 0" }}>{phase.instruction}</p>
              <p style={{ fontSize: 12, margin: "6px 0" }}><b>Output:</b> {phase.output}</p>
              <p style={{ fontSize: 12, margin: "6px 0" }}>{activeCount} soal aktif · {phaseQuestions.length - activeCount} nonaktif</p>
              <button className="btn g" type="button" onClick={() => { setPhaseFilter(key); setStatusFilter("all"); }}>Kelola soal {phase.title}</button>
            </article>
          );
        })}
      </div>
      {qs.some((question: any) => question.is_active !== false && !question.phase) && (
        <div className="warn" role="status">
          Ada pertanyaan aktif tanpa fase. Pada alur siswa saat ini, pertanyaan tanpa fase masuk ke THINK. Tetapkan fase yang sesuai agar alur PBL lebih jelas.
        </div>
      )}

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
                <th>Posisi tampil</th>
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
                <tr key={q.id} draggable={!readOnly} onDragStart={() => { if (!readOnly) setDrag(q.id); }} onDragOver={(e) => { if (!readOnly) e.preventDefault(); }} onDrop={() => { if (!readOnly) reorder(drag, q.id); setDrag(""); }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <span title="Seret untuk mengubah urutan" style={{ color: "#9aa5b5", cursor: "grab" }}>⠿</span>
                      <span>{String(q.display_order).padStart(2, "0")}</span>
                      <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <button className="admin-order-btn" type="button" onClick={() => bump(qs.findIndex((item: any) => item.id === q.id), -1)} disabled={readOnly} aria-label={`Naikkan ${q.question_text}`}>↑</button>
                        <button className="admin-order-btn" type="button" onClick={() => bump(qs.findIndex((item: any) => item.id === q.id), 1)} disabled={readOnly} aria-label={`Turunkan ${q.question_text}`}>↓</button>
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
                    <button className="btn g" style={{ padding: "5px 9px", minHeight: 30 }} disabled={readOnly} onClick={async () => { if (readOnly) return; const { error } = await sb.from("questions").update({ is_active: !q.is_active }).eq("id", q.id); if (error) { setErr("Status pertanyaan gagal diperbarui."); return; } load(); }}>
                      <span className={"admin-status-pill " + (q.is_active !== false ? "active" : "off")}>{q.is_active !== false ? "Aktif" : "Nonaktif"}</span>
                    </button>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button className="btn g" type="button" onClick={() => edit(q)} disabled={readOnly}>Edit</button>
                      <button className="btn g danger" type="button" onClick={() => del(q)} disabled={readOnly}>Hapus</button>
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
