"use client"; import { useEffect, useState } from "react"; import { sb, show } from "@/lib/supabase"; import { useAdmin, upd, subOf, rawOf, groupPct } from "@/lib/admin";
export default function Panel({ tab }: { tab: "project" | "settings" }) {
  const { P, load, loading } = useAdmin(["P"]); const [t, setT] = useState("CIVIC VISION"); const [open, setOpen] = useState(""); const [email, setEmail] = useState("");
  useEffect(() => { sb.auth.getUser().then(x => setEmail(x.data.user?.email || "")); }, []);
  if (tab === "project" && loading) return <section className="glass"><p>Memuat...</p></section>;
  if (tab === "project" && !P.id) return (<section className="glass"><h2>Buat project</h2><p>Belum ada project. Beri nama project pembelajaranmu untuk memulai.</p><label htmlFor="pt">Judul project</label><input id="pt" value={t} onChange={e => setT(e.target.value)} />
    <div className="row"><button className="btn" onClick={async () => { if (!t.trim()) return; await sb.from("projects").insert({ title: t.trim(), tagline: "Menganalisis Pancasila dalam Kehidupan Sehari-hari" }); load(); }}>Buat project</button></div></section>);
  if (tab === "project") return (<section className="glass"><h2>Project</h2>{["title", "tagline", "description"].map(k => <div key={k + P[k]}><label>{k}</label>{k === "description" ? <textarea defaultValue={P[k] || ""} onBlur={e => upd("projects", P.id, { [k]: e.target.value })} /> : <input defaultValue={P[k] || ""} onBlur={e => upd("projects", P.id, { [k]: e.target.value })} />}</div>)}</section>);
  return <section className="glass"><h2>Pengaturan</h2><p>Masuk sebagai {email}</p><button className="btn g" onClick={() => sb.auth.signOut().then(() => location.reload())}>Keluar</button></section>;
}
