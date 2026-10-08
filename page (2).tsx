"use client"; import { useAdmin, groupPct } from "@/lib/admin";
export default function Overview() {
  const { gs, vs, qs, subs, ans } = useAdmin(["gs", "vs", "qs", "subs", "ans"]);
  const cards: [string, number][] = [["Total Kelompok", gs.length], ["Total Video", vs.length], ["Total Pertanyaan", qs.length], ["Submission", subs.length], ["Draft", subs.filter(s => s.status === "draft").length], ["Selesai", subs.filter(s => s.status === "submitted").length]];
  return (<><div className="grid" style={{ marginBottom: 16 }}>{cards.map(([l, n]) => <div className="glass" key={l} style={{ marginBottom: 0 }}><p style={{ margin: 0 }}>{l}</p><h1 style={{ fontSize: 44, margin: 0, letterSpacing: 0 }}>{n}</h1></div>)}</div>
    <section className="glass"><h2>Progress Kelas</h2>{gs.map(g => { const p = groupPct(g, subs, qs, ans); return <div key={g.id}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>Kelompok {g.group_number}{g.group_name ? ` (${g.group_name})` : ""}</span><b>{p}%</b></div><div className="bar"><i style={{ width: p + "%" }} /></div></div>; })}</section></>);
}
