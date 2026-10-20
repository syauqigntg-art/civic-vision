"use client"; import { opts, parse } from "@/lib/utils/questions"; import type { Q } from "@/types";
export function QuestionField({ q, raw, onChange, labelledBy }: { q: Q; raw?: string; onChange: (x: any) => void; labelledBy: string }) {
  const v = parse(q, raw), ph = q.placeholder || "", o = opts(q);
  switch (q.question_type) {
    case "text": return <input aria-labelledby={labelledBy} value={v} placeholder={ph} onChange={e => onChange(e.target.value)} />;
    case "multiple_text": { const n = Math.max(q.min_items, v.length), a = [...v]; while (a.length < n) a.push("");
      return <>{a.map((x: string, i: number) => <textarea key={i} style={{ marginTop: 8 }} aria-label={`${q.question_text} — jawaban ${i + 1}`} value={x} placeholder={`${ph} (${i + 1})`} onChange={e => { const b = [...a]; b[i] = e.target.value; onChange(b); }} />)}
        <div className="row"><button type="button" className="btn g" onClick={() => onChange([...a, ""])}>+ Tambah jawaban</button></div></>; }
    case "single_select": return <select aria-labelledby={labelledBy} value={v} onChange={e => onChange(e.target.value)}><option value="">Pilih...</option>{o.map(x => <option key={x}>{x}</option>)}</select>;
    case "multi_select": return <div role="group" aria-labelledby={labelledBy}>{o.map(x => <label key={x}><input type="checkbox" style={{ width: "auto", minHeight: 0, marginRight: 8 }} checked={v.includes(x)} onChange={e => onChange(e.target.checked ? [...v, x] : v.filter((y: string) => y !== x))} />{x}</label>)}</div>;
    case "scale": return <div className="row" role="group" aria-labelledby={labelledBy}>{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-pressed={+v === n} className={"btn" + (+v === n ? "" : " g")} onClick={() => onChange(String(n))}>{n}</button>)}</div>;
    default: return <textarea aria-labelledby={labelledBy} value={v} placeholder={ph} onChange={e => onChange(e.target.value)} />;
  }
}
