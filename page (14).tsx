"use client"; import { useEffect, useState } from "react"; import Link from "next/link"; import { useParams, useRouter } from "next/navigation"; import { sb, getCode } from "@/lib/supabase"; import { rpcS } from "@/lib/api/student"; import { PhaseBar } from "@/components/lkpd/PhaseBar"; import { MediaPlayer as Media } from "@/components/video/MediaPlayer";
export default function Video() {
  const { id } = useParams<{ id: string }>(); const r = useRouter(); const [v, setV] = useState<any>(null); const [st, setSt] = useState<"load" | "ok" | "err" | "none">("load"); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  useEffect(() => { if (!getCode()) { r.replace("/lkpd/identitas"); return; } sb.from("videos").select("*").eq("id", id).eq("is_active", true).maybeSingle().then(x => { if (x.error) setSt("err"); else if (!x.data) setSt("none"); else { setV(x.data); setSt("ok"); } }); }, [id, r]);
  const next = async () => { setBusy(true); const { error } = await rpcS("begin_submission", { code: getCode(), vid: id }); if (error) { setBusy(false); return setMsg(error.message); } r.push(`/lkpd/kasus/${id}/analisis`); };
  if (st === "load") return <section className="glass"><p>Memuat video...</p></section>;
  if (st === "err") return <section className="glass"><div className="warn" role="alert">Video tidak dapat dimuat. Silakan coba kembali.</div><Link className="btn g" href="/lkpd/kasus">← Sebelumnya</Link></section>;
  if (st === "none") return <section className="glass"><p>Video kasus tidak ditemukan.</p><Link className="btn g" href="/lkpd/kasus">← Sebelumnya</Link></section>;
  return (<section className="glass"><PhaseBar current="see" /><span className="tag">{v.category}</span><h2 style={{ marginTop: 8 }}>Kasus {String(v.number).padStart(2, "0")}: {v.title}</h2><Media path={v.video_url} poster={v.thumbnail_url} kind="video" alt={`Video kasus: ${v.title}`} />{!v.video_url && <p>Video belum diunggah oleh guru.</p>}
    {v.description && <p>{v.description}</p>}<div className="hint">Perhatikan video dengan saksama. Jangan langsung menentukan sila Pancasila. Temukan masalah yang terjadi terlebih dahulu.</div>
    {msg && <div className="warn" role="alert">{msg}</div>}<div className="row"><Link className="btn g" href="/lkpd/kasus">← Sebelumnya</Link><button className="btn" disabled={busy} onClick={next}>{busy ? "Membuka LKPD..." : "Selanjutnya →"}</button></div>
    <p style={{ fontSize: 13 }}>Selanjutnya: kalian mengisi LKPD tahap demi tahap. Jawaban tersimpan otomatis.</p></section>);
}
