"use client"; import { useState } from "react"; import { sb } from "@/lib/supabase"; import { useAdmin, upd } from "@/lib/admin";
function Members({ init, onSave }: { init: string[]; onSave: (a: string[]) => void }) {
  const [m, setM] = useState([...init, "", "", "", "", ""].slice(0, Math.max(5, init.length)));
  return (<><label>Anggota</label>{m.map((x, i) => <input key={i} style={{ marginTop: 6 }} value={x} placeholder={`Anggota ${i + 1}`} onChange={e => { const a = [...m]; a[i] = e.target.value; setM(a); }} />)}
    <div className="row"><button className="btn g" onClick={() => setM([...m, ""])}>+ Anggota</button><button className="btn g" onClick={() => onSave(m)}>Simpan anggota</button></div></>);
}
export default function Groups() {
  const { P, gs, vs, gv, gm, subs, load } = useAdmin(["P", "gs", "vs", "gv", "gm", "subs"]);
  const setVideo = async (gid: string, vid: string) => { await sb.from("group_videos").delete().eq("group_id", gid); if (vid) await sb.from("group_videos").insert({ group_id: gid, video_id: vid }); };
  const members = async (gid: string, a: string[]) => { await sb.from("group_members").delete().eq("group_id", gid); const rows = a.map(s => s.trim()).filter(Boolean).map((name, i) => ({ group_id: gid, name, member_order: i + 1 })); if (rows.length) await sb.from("group_members").insert(rows); load(); };
  const auto = async () => { if (!confirm("Tetapkan Kelompok n → Video n untuk semua kelompok? Penugasan yang ada akan diganti.")) return; for (const g of gs) { const v = vs.find(x => x.number === g.group_number); await setVideo(g.id, v?.id || ""); } load(); };
  const add = async () => { const n = Math.max(0, ...gs.map(g => g.group_number || 0)) + 1; await sb.from("groups").insert({ project_id: P.id, group_number: n, access_code: `K${n}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}` }); load(); };
  const del = async (g: any) => { const has = subs.some(s => s.group_id === g.id); if (confirm(has ? "Kelompok ini sudah punya hasil analisis. Menghapusnya ikut menghapus semua jawabannya secara permanen. Lanjutkan?" : "Hapus kelompok ini?")) { await sb.from("groups").delete().eq("id", g.id); load(); } };
  return (<section className="glass"><h2>Kelompok</h2><div className="row" style={{ marginTop: 0 }}><button className="btn" onClick={add}>+ Buat Kelompok</button><button className="btn g" onClick={auto}>Kelompok n → Video n</button></div>
    {gs.map(g => { const cur = gv.find(x => x.group_id === g.id); return (<div className="qrow" key={g.id + gm.length} style={{ marginTop: 14 }}>
      <p style={{ margin: "0 0 8px" }}>Kode akses: <b style={{ color: "#fff" }}>{g.access_code}</b></p>
      <div className="mini"><input type="number" placeholder="Nomor" defaultValue={g.group_number ?? ""} onBlur={e => upd("groups", g.id, { group_number: +e.target.value || null }).then(load)} /><input placeholder="Nama kelompok" defaultValue={g.group_name || ""} onBlur={e => upd("groups", g.id, { group_name: e.target.value }).then(load)} />
        <input placeholder="Kelas" defaultValue={g.class_name || ""} onBlur={e => upd("groups", g.id, { class_name: e.target.value }).then(load)} /><input placeholder="Ketua" defaultValue={g.leader_name || ""} onBlur={e => upd("groups", g.id, { leader_name: e.target.value }).then(load)} /></div>
      <label>Video yang ditugaskan</label><select value={cur?.video_id || ""} onChange={async e => { await setVideo(g.id, e.target.value); load(); }}><option value="">— belum ditentukan —</option>{vs.map(v => <option key={v.id} value={v.id}>Video {String(v.number).padStart(2, "0")} — {v.title}</option>)}</select>
      <Members init={gm.filter(m => m.group_id === g.id).map(m => m.name)} onSave={a => members(g.id, a)} />
      <div className="row"><button className="btn g" onClick={() => del(g)}>Hapus kelompok</button></div></div>); })}</section>);
}
