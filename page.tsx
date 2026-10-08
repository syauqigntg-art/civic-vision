"use client"; import { Uploader } from "@/components/admin/Uploader"; import { MediaPlayer as Media } from "@/components/video/MediaPlayer"; import { videoForm } from "@/lib/validation/schemas"; import { useState } from "react"; import { sb } from "@/lib/supabase"; import { useAdmin, upd, uploadFile, checkFile, pathOf } from "@/lib/admin";
const Upl = Uploader;
export default function Videos() {
  const { P, vs, load, loading } = useAdmin(["P", "vs"]); const [f, setF] = useState<any>({ number: "", title: "", category: "", description: "", video_url: "", thumbnail_url: "" }); const [err, setErr] = useState(""); const [k, setK] = useState(0);
  const add = async () => { const pr = videoForm.safeParse({ title: f.title, category: f.category, description: f.description, number: f.number || vs.length + 1 }); if (!pr.success) return setErr(pr.error.issues[0].message); if (!f.video_url) return setErr("Unggah video terlebih dahulu.");
    await sb.from("videos").insert({ project_id: P.id, number: +f.number || vs.length + 1, title: f.title, category: f.category, description: f.description, video_url: f.video_url, thumbnail_url: f.thumbnail_url || null });
    setF({ number: "", title: "", category: "", description: "", video_url: "", thumbnail_url: "" }); setErr(""); setK(k + 1); load(); };
  const del = async (v: any) => { if (!confirm("Hapus video ini? Jawaban kelompok yang sudah ada tetap tersimpan, hanya tautan videonya yang dilepas.")) return;
    const ps = [pathOf(v.video_url), pathOf(v.thumbnail_url)].filter(Boolean); if (ps.length) await sb.storage.from("videos").remove(ps); await sb.from("videos").delete().eq("id", v.id); load(); };
  const set = (x: string, val: string) => setF({ ...f, [x]: val });
  return (<><section className="glass" key={k}><h2>Upload Video</h2>{err && <div className="warn" role="alert">{err}</div>}
    <label>Video (mp4, webm, mov; maks. 50 MB)</label><Upl kind="video" onUrl={u => set("video_url", u)} />
    <div className="mini" style={{ marginTop: 8 }}><div><label>Judul</label><input value={f.title} onChange={e => set("title", e.target.value)} /></div><div><label>Nomor</label><input type="number" value={f.number} onChange={e => set("number", e.target.value)} placeholder={String(vs.length + 1)} /></div><div><label>Kategori</label><input value={f.category} onChange={e => set("category", e.target.value)} /></div></div>
    <label>Deskripsi</label><textarea style={{ minHeight: 70 }} value={f.description} onChange={e => set("description", e.target.value)} /><label>Thumbnail (jpg, png, webp; maks. 2 MB)</label><Upl kind="image" onUrl={u => set("thumbnail_url", u)} />
    <div className="row"><button className="btn" onClick={add}>Simpan video</button></div></section>
    <section className="glass"><h2>Daftar Video</h2>{!loading && !vs.length && <p>Belum ada video kasus. Unggah video pertama lewat form di atas.</p>}{vs.map(v => <div className="qrow" key={v.id}>
      <div className="mini"><input type="number" defaultValue={v.number} onBlur={e => upd("videos", v.id, { number: +e.target.value })} /><input defaultValue={v.title} onBlur={e => upd("videos", v.id, { title: e.target.value })} /><input defaultValue={v.category || ""} onBlur={e => upd("videos", v.id, { category: e.target.value })} /></div>
      <textarea style={{ marginTop: 8, minHeight: 60 }} placeholder="Deskripsi" defaultValue={v.description || ""} onBlur={e => upd("videos", v.id, { description: e.target.value })} />
      {v.video_url ? <Media path={v.video_url} poster={v.thumbnail_url} kind="video" alt={`Video: ${v.title}`} /> : <p>Belum ada video.</p>}
      <label>Ganti video</label><Upl kind="video" onUrl={async u => { const old = pathOf(v.video_url); await upd("videos", v.id, { video_url: u }); if (old) await sb.storage.from("videos").remove([old]); load(); }} />
      <div className="row"><button className="btn g" onClick={() => upd("videos", v.id, { is_active: !v.is_active }).then(load)}>{v.is_active ? "Aktif" : "Nonaktif"}</button><button className="btn g" onClick={() => del(v)}>Hapus</button></div></div>)}</section></>);
}
