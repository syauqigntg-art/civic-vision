"use client"; import { MediaPlayer as Media } from "@/components/video/MediaPlayer"; import { useState } from "react"; import { show } from "@/lib/supabase"; import { useAdmin, subOf, rawOf } from "@/lib/admin"; import { toCsv, toXlsx, saveBlob, stamp } from "@/lib/utils/export";
const two = (n: any) => String(n ?? "").padStart(2, "0");
export default function Submissions() {
  const { P, gs, vs, qs, gv, gm, subs, ans, loading, error } = useAdmin();
  const readOnly = P?.is_active === false; const [fl, setFl] = useState({ g: "", v: "", s: "", c: "", from: "", to: "" }); const [sel, setSel] = useState("");
  const set = (k: string, v: string) => setFl({ ...fl, [k]: v });
  const rows = gs.map(g => { const s = subOf(g, subs); const vid = s?.video_id || gv.find(x => x.group_id === g.id)?.video_id; return { g, s, v: vs.find(x => x.id === vid), status: s?.status || "belum mulai", date: (s?.submitted_at || s?.updated_at || "").slice(0, 10) }; })
    .filter(r => (!fl.g || r.g.id === fl.g) && (!fl.v || r.v?.id === fl.v) && (!fl.s || r.status === fl.s) && (!fl.c || r.g.class_name === fl.c) && (!fl.from || (r.date && r.date >= fl.from)) && (!fl.to || (r.date && r.date <= fl.to)));
  const qsFor = (sid?: string) => qs.filter((q: any) => q.is_active || (sid && ans.some(a => a.submission_id === sid && a.question_id === q.id)));
  const exportRows = () => [["Kelompok", "Video", "Pertanyaan", "Jawaban"], ...rows.filter(r => r.s).flatMap(r => qsFor(r.s.id).map(q => [`Kelompok ${two(r.g.group_number)}${r.g.group_name ? " — " + r.g.group_name : ""}`, r.v?.title || "", q.question_text, show(q, rawOf(ans, r.s.id, q.id)).replace(/\n/g, " | ")]))];
  const cur = rows.find(r => r.g.id === sel);
  if (cur) { const { g, s, v } = cur; const list = qsFor(s?.id); const cats = [...new Set(list.map(q => q.category))];
    return (<section className="glass"><button className="btn g" onClick={() => setSel("")}>← Semua hasil</button><h2 style={{ marginTop: 14 }}>Kelompok {two(g.group_number)} — {v?.title || "Video belum ditentukan"}</h2>
      <p>Status: <b style={{ color: "#fff" }}>{cur.status === "draft" ? "Draf" : cur.status === "submitted" ? "Sudah dikirim" : "Belum mulai"}</b>{cur.date && ` · ${cur.date}`}</p>
      <div className="qrow"><b>Identitas kelompok</b><p style={{ margin: "6px 0 0" }}>{g.group_name || "—"} · Kelas {g.class_name || "—"} · Ketua: {g.leader_name || "—"}<br />Anggota: {gm.filter(m => m.group_id === g.id).map(m => m.name).join(", ") || "—"}</p></div>
      {v?.video_url && <Media path={v.video_url} kind="video" />}
      {!s ? <p>Kelompok ini belum memulai analisis.</p> : cats.map(c => <div key={c} className="qrow" style={{ marginTop: 12 }}><b style={{ color: "#38bdf8" }}>{c}</b>{list.filter(q => q.category === c).map((q: any) => <div key={q.id} style={{ marginTop: 8 }}>
        <div style={{ fontSize: 14, opacity: .8 }}>{q.question_text}{q.is_active ? "" : " (nonaktif)"}</div><div style={{ whiteSpace: "pre-wrap" }}>{show(q, rawOf(ans, s.id, q.id))}</div></div>)}</div>)}</section>); }
  return (<section className="glass"><h2>Hasil Siswa</h2>
    <div className="mini"><select value={fl.g} onChange={e => set("g", e.target.value)}><option value="">Semua kelompok</option>{gs.map(g => <option key={g.id} value={g.id}>Kelompok {two(g.group_number)}</option>)}</select>
      <select value={fl.v} onChange={e => set("v", e.target.value)}><option value="">Semua video</option>{vs.map(v => <option key={v.id} value={v.id}>Video {two(v.number)} — {v.title}</option>)}</select>
      <select value={fl.s} onChange={e => set("s", e.target.value)}><option value="">Semua status</option><option value="draft">Draf</option><option value="submitted">Sudah dikirim</option><option value="belum mulai">Belum mulai</option></select>
      <select value={fl.c} onChange={e => set("c", e.target.value)}><option value="">Semua kelas</option>{[...new Set(gs.map(g => g.class_name).filter(Boolean))].map(c => <option key={c}>{c}</option>)}</select>
      <input type="date" aria-label="Dari tanggal" value={fl.from} onChange={e => set("from", e.target.value)} /><input type="date" aria-label="Sampai tanggal" value={fl.to} onChange={e => set("to", e.target.value)} /></div>
    <div style={{ overflowX: "auto", marginTop: 12 }}><table><thead><tr><th>Kelompok</th><th>Video</th><th>Kelas</th><th>Status</th><th>Tanggal</th><th /></tr></thead><tbody>{rows.map(r => <tr key={r.g.id}><td>Kelompok {two(r.g.group_number)}</td><td>{r.v?.title || "—"}</td><td>{r.g.class_name || "—"}</td><td>{r.status === "draft" ? "Draf" : r.status === "submitted" ? "Sudah dikirim" : "Belum mulai"}</td><td>{r.date || "—"}</td>
      <td style={{ whiteSpace: "nowrap" }}><button className="btn g" style={{ padding: "4px 12px" }} onClick={() => setSel(r.g.id)}>Buka</button>{r.status === "submitted" && <> <button className="btn g" style={{ padding: "4px 12px" }} onClick={async () => {
          const groupLabel = `Kelompok ${two(r.g.group_number)}${r.g.group_name ? " — " + r.g.group_name : ""}`;
          if (readOnly) { window.alert("Proyek diarsipkan. Aktifkan kembali proyek sebelum membuka pengerjaan."); return; }
          if (!window.confirm(`Buka kembali pengerjaan ${groupLabel}? Jawaban yang sudah ada tetap tersimpan.`)) return;
          try {
            const { upd } = await import("@/lib/admin");
            const { data, error } = await upd("submissions", r.s.id, {
              status: "draft",
              submitted_at: null,
            }).select("id,status,submitted_at").maybeSingle();

            if (error) {
              window.alert(`Gagal membuka kembali pengerjaan: ${error.message}`);
              return;
            }
            if (!data || data.status !== "draft" || data.submitted_at !== null) {
              window.alert("Status belum berubah menjadi draft. Periksa izin akun guru dan kebijakan RLS Supabase, lalu coba lagi.");
              return;
            }

            window.alert("Pengerjaan berhasil dibuka kembali. Jawaban yang tersimpan tetap ada.");
            window.location.reload();
          } catch (e) {
            window.alert(e instanceof Error ? e.message : "Terjadi kesalahan saat membuka kembali pengerjaan.");
          }
        }} disabled={readOnly}>Buka kembali</button></>}</td></tr>)}</tbody></table></div>
    {loading ? <p>Memuat data...</p> : error ? <p role="alert">Data tidak dapat dimuat. Silakan muat ulang halaman.</p> : !subs.length ? <p>Belum ada hasil analisis yang dikirim.</p> : !rows.length && <p>Tidak ada hasil untuk filter ini.</p>}
    <div className="row"><button className="btn" onClick={() => saveBlob(`hasil-civic-vision-${stamp()}.csv`, new Blob([toCsv(exportRows())], { type: "text/csv;charset=utf-8" }))}>Unduh CSV</button><button className="btn" onClick={() => toXlsx(exportRows(), `hasil-civic-vision-${stamp()}.xlsx`)}>Unduh Excel</button></div>
    <p style={{ fontSize: 13 }}>Export mengikuti filter yang aktif dan hanya membaca data, tidak mengubah jawaban asli.</p></section>);
}
