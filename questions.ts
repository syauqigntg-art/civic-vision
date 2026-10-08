import type { Q } from "@/types";
export const opts = (q: Q) => [...(q.question_options || [])].sort((a, b) => a.display_order - b.display_order).map(o => o.option_text);
export const parse = (q: Q, raw?: string | null): any => { if (raw == null) return q.question_type === "multiple_text" || q.question_type === "multi_select" ? [] : "";
  if (q.question_type === "multiple_text" || q.question_type === "multi_select") { try { return JSON.parse(raw); } catch { return []; } } return raw; };
export const filled = (q: Q, raw?: string | null) => { const v = parse(q, raw); return q.question_type === "multiple_text" ? (v as string[]).filter(s => s.trim()).length >= q.min_items : q.question_type === "multi_select" ? v.length > 0 : String(v).trim() !== ""; };
export const show = (q: Q, raw?: string | null) => { const v = parse(q, raw); return Array.isArray(v) ? v.filter(Boolean).map((s, i) => `${i + 1}. ${s}`).join("\n") || "—" : String(v) || "—"; };
export const catsOf = (qs: Q[]) => [...new Set([...qs].sort((a, b) => a.display_order - b.display_order).map(q => q.category))];
