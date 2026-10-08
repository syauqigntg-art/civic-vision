"use client"; import { rpcS } from "@/lib/api/student"; import { useEffect, useState } from "react"; import Link from "next/link"; import { sb, getCode, show, Q } from "@/lib/supabase";
export default function Hasil() {
  const [qs, setQs] = useState<Q[]>([]); const [a, setA] = useState<any>({}); const [g, setG] = useState<any>({});
  useEffect(() => { const c = getCode(); sb.from("questions").select("*,question_options(*)").eq("is_active", true).order("display_order").then(x => setQs((x.data || []) as Q[]));
    rpcS("get_answers", { code: c }).then(x => setA(x.data || {})); rpcS("get_group", { code: c }).then(x => setG(x.data || {})); }, []);
  const sent = g.submission?.status === "submitted";
  return (<><section className="glass center"><h1 style={{ fontSize: 40, letterSpacing: 0 }}>{sent ? "ANALISIS SELESAI!" : "DRAFT TERSIMPAN"}</h1><p>{sent ? "Kalian telah menyelesaikan analisis kasus CIVIC VISION." : "Hasil belum dikirim."}</p></section>
    <section className="glass"><h2>Kelompok {g.group_number}: {g.group_name}</h2>{qs.map(q => <div key={q.id}><p style={{ color: "#38bdf8", fontWeight: 700, marginBottom: 0 }}>{q.category}: {q.question_text}</p>
      <p style={{ marginTop: 2, whiteSpace: "pre-wrap", color: "#fff" }}>{show(q, a[q.id])}</p></div>)}
      <div className="row"><button className="btn" onClick={() => window.print()}>LIHAT HASIL</button><Link className="btn g" href="/">KEMBALI KE BERANDA</Link></div></section></>);
}
