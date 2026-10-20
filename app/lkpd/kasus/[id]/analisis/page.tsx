"use client"; import { useEffect, useState } from "react"; import Link from "next/link"; import { useRouter } from "next/navigation";
import { sb, getCode, filled, catsOf } from "@/lib/supabase"; import { rpcS } from "@/lib/api/student"; import type { Q } from "@/types";
import { useAutosave } from "@/hooks/useAutosave"; import { QuestionField } from "@/components/lkpd/QuestionField"; import { StepIndicator } from "@/components/lkpd/StepIndicator"; import { PhaseBar } from "@/components/lkpd/PhaseBar"; import { SaveStatus } from "@/components/lkpd/SaveStatus";
import { GlassCard } from "@/components/glass/GlassCard"; import { ProgressBar } from "@/components/glass/ProgressBar"; import { Alert } from "@/components/ui/Alert"; import { Button } from "@/components/ui/Button";
const COLS = "id,category,phase,question_text,description,question_type,placeholder,is_required,min_items,display_order,question_options(option_text,display_order)";
export default function Analisis() {
  const r = useRouter(); const [qs, setQs] = useState<Q[]>([]); const [a, setA] = useState<Record<string, string>>({}); const [step, setStep] = useState(0); const [warn, setWarn] = useState(""); const [locked, setLocked] = useState(false); const [view, setView] = useState<"load" | "ok" | "err">("load");
  const save = useAutosave(() => setLocked(true));
  useEffect(() => { const c = getCode(); if (!c) { r.replace("/lkpd/identitas"); return; } const pending = save.load();
    Promise.all([sb.from("questions").select(COLS).eq("is_active", true).order("display_order"), rpcS("get_answers", { code: c }), rpcS("get_group", { code: c })]).then(([q, ans, g]) => {
      if (q.error || g.error) return setView("err"); if (!g.data?.id) { r.replace("/lkpd/identitas"); return; }
      setQs((q.data || []) as unknown as Q[]); setA({ ...(ans.data || {}), ...pending }); setLocked(g.data?.submission?.status === "submitted"); setView("ok"); save.flush(); }); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);
  const cats = catsOf(qs), cur = qs.filter(q => q.category === cats[step]), req = qs.filter(q => q.is_required);
  const pct = req.length ? Math.round(req.filter(q => filled(q, a[q.id])).length / req.length * 100) : 0;
  const done = (c: string) => qs.filter(q => q.category === c && q.is_required).every(q => filled(q, a[q.id]));
  const change = (q: Q, v: any) => { const s = typeof v === "string" ? v : JSON.stringify(v); setA(p => ({ ...p, [q.id]: s })); save.change(q.id, s); };
  const send = async () => { await save.flush(); if (save.hasPending()) return setWarn("Jawaban belum berhasil disimpan. Periksa koneksi internet kalian, lalu coba lagi.");
    if (!confirm("Apakah kalian yakin ingin mengirim hasil analisis? Setelah dikirim, jawaban tidak dapat diubah sampai guru membukanya kembali.")) return;
    const { data } = await rpcS("submit_group", { code: getCode() }); if (data === "ok") r.push("/lkpd/hasil"); else setWarn("Masih ada bagian yang belum lengkap. Silakan periksa kembali jawaban kelompok kalian."); };
  if (view === "load") return <GlassCard aria-busy="true"><p>Memuat LKPD...</p></GlassCard>;
  if (view === "err") return <GlassCard><Alert>LKPD tidak dapat dimuat. Silakan muat ulang halaman.</Alert></GlassCard>;
  if (!qs.length) return <GlassCard><p>Belum ada pertanyaan LKPD. Guru dapat menambahkan pertanyaan melalui Admin Dashboard.</p></GlassCard>;
  const left = cats.length - step - 1;
  return (<GlassCard><PhaseBar current={cur[0]?.phase} />
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><b>Progress Analisis</b><SaveStatus st={save.st} /></div><ProgressBar pct={pct} />
    <StepIndicator cats={cats} step={step} done={done} onSelect={setStep} />
    <p><b style={{ color: "#fff" }}>Tahap {step + 1} dari {cats.length}: {cats[step]}</b> · {left ? `sisa ${left} tahap` : "tahap terakhir"}. {left ? "Jawab pertanyaan di bawah, lalu tekan Selanjutnya." : "Periksa jawaban, lalu tekan Kirim Hasil Analisis."} Jawaban tersimpan otomatis.</p>
    {locked && <Alert>Hasil sudah dikirim dan terkunci. Minta guru membuka kembali jika perlu mengubah. <Link href="/lkpd/hasil" style={{ color: "#fff" }}>Lihat hasil</Link></Alert>}{warn && <Alert>{warn}</Alert>}
    <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }}>{cur.map(q => <div key={q.id}><h2 id={`q-${q.id}`} style={{ marginTop: 16 }}>{q.question_text}{q.is_required ? "" : " (opsional)"}</h2>
      <QuestionField q={q} raw={a[q.id]} onChange={v => change(q, v)} labelledBy={`q-${q.id}`} />{q.description && <div className="hint">{q.description}</div>}</div>)}</fieldset>
    <div className="row">{step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>← Sebelumnya</Button>}{!locked && <Button variant="ghost" onClick={save.flush}>Simpan draft</Button>}
      {left > 0 ? <Button onClick={() => setStep(step + 1)}>Selanjutnya →</Button> : !locked && <Button onClick={send}>KIRIM HASIL ANALISIS →</Button>}</div></GlassCard>);
}
