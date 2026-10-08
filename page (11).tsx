"use client"; import { rpcS } from "@/lib/api/student"; import { useEffect, useState } from "react"; import { useRouter } from "next/navigation"; import { sb, getCode, setCode } from "@/lib/supabase";
export default function Identitas() {
  const r = useRouter(); const [code, setC] = useState(""); const [ok, setOk] = useState(false); const [err, setErr] = useState("");
  const [f, setF] = useState<any>({ name: "", number: "", class_name: "", leader: "", members: ["", "", "", "", ""] });
  const load = async (c: string) => { const { data, error } = await rpcS("get_group", { code: c }); if (error) return setErr(error.message);
    if (!data?.id) return setErr("Kode akses tidak ditemukan. Tanyakan kode kelompok ke gurumu.");
    setCode(c); setOk(true); setErr("");
    setF({ name: data.group_name || "", number: data.group_number ?? "", class_name: data.class_name || "", leader: data.leader_name || "", members: [...(data.members || []), "", "", "", "", ""].slice(0, 5) }); };
  useEffect(() => { const c = getCode(); if (c) { setC(c); load(c); } }, []);
  const save = async () => {
    if (!f.name.trim() || !f.number || !f.class_name.trim() || !f.leader.trim()) return setErr("Nama kelompok, nomor, kelas, dan nama ketua wajib diisi.");
    await rpcS("save_identity", { code: getCode(), p_name: f.name, p_number: +f.number, p_class: f.class_name, p_leader: f.leader, p_members: f.members }); r.push("/lkpd/kasus"); };
  const set = (k: string, v: any) => setF({ ...f, [k]: v });
  if (!ok) return (<section className="glass"><h2>Masuk dengan kode kelompok</h2><p>Guru membagikan kode, misalnya K3-7QX2.</p>
    {err && <div className="warn" role="alert">{err}</div>}<input value={code} onChange={e => setC(e.target.value)} placeholder="Kode kelompok" aria-label="Kode kelompok" autoComplete="off" />
    <div className="row"><button className="btn" onClick={() => load(code)}>LANJUTKAN →</button></div></section>);
  return (<section className="glass"><h2>Identitas kelompok</h2>{err && <div className="warn" role="alert">{err}</div>}
    <label htmlFor="f-name">Nama kelompok</label><input id="f-name" value={f.name} onChange={e => set("name", e.target.value)} />
    <label htmlFor="f-no">Nomor kelompok</label><input id="f-no" type="number" min={1} value={f.number} onChange={e => set("number", e.target.value)} />
    <label htmlFor="f-class">Kelas</label><input id="f-class" value={f.class_name} onChange={e => set("class_name", e.target.value)} placeholder="mis. X-3" />
    <label htmlFor="f-lead">Nama ketua</label><input id="f-lead" value={f.leader} onChange={e => set("leader", e.target.value)} />
    {f.members.map((m: string, i: number) => (<div key={i}><label htmlFor={`f-m${i}`}>Anggota {i + 1}</label><input id={`f-m${i}`} value={m} onChange={e => { const a = [...f.members]; a[i] = e.target.value; set("members", a); }} /></div>))}
    <div className="row"><button className="btn" onClick={save}>LANJUTKAN →</button></div></section>);
}
