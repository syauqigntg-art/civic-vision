"use client"; import { useEffect, useState } from "react"; import Link from "next/link"; import { sb, getCode } from "@/lib/supabase"; import { rpcS } from "@/lib/api/student";
export default function Kasus() {
  const [v, setV] = useState<any[] | null>(null); const [err, setErr] = useState(false); const [mine, setMine] = useState<string[]>([]);
  useEffect(() => { sb.from("videos").select("id,number,title,category").eq("is_active", true).order("number").then(r => r.error ? setErr(true) : setV(r.data || []));
    if (getCode()) rpcS("get_group", { code: getCode() }).then(r => setMine(r.data?.video_ids || [])); }, []);
  if (err) return <section className="glass"><div className="warn" role="alert">Daftar video tidak dapat dimuat. Silakan muat ulang halaman.</div></section>;
  if (!v) return <section className="glass"><p>Memuat video kasus...</p></section>;
  if (!v.length) return <section className="glass"><p>Belum ada video kasus.</p></section>;
  return (<><h2>Video kasus</h2><p>Pilih video yang ditugaskan gurumu, tonton dulu, lalu lanjut ke analisis.</p><div className="grid">{v.map(x => (<div className="glass" key={x.id}>
    <span className="tag">{x.category}</span>{mine.includes(x.id) && <span className="tag" style={{ marginLeft: 6 }}>Ditugaskan untuk kelompok kalian</span>}
    <h2 style={{ marginTop: 8 }}>Kasus {String(x.number).padStart(2, "0")}: {x.title}</h2><div className="row"><Link className="btn" href={`/lkpd/kasus/${x.id}`}>Tonton Video</Link></div></div>))}</div></>);
}
