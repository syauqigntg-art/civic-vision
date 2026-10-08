import { filled } from "./questions"; import type { Q } from "@/types";
export const subOf = (g: any, subs: any[]) => subs.find(s => s.group_id === g.id);
export const rawOf = (ans: any[], sid: string, qid: string) => ans.find(a => a.submission_id === sid && a.question_id === qid)?.answer_text;
export const groupPct = (g: any, subs: any[], qs: Q[], ans: any[]) => { const s = subOf(g, subs); const req = qs.filter(q => q.is_active && q.is_required); return s && req.length ? Math.round(req.filter(q => filled(q, rawOf(ans, s.id, q.id))).length / req.length * 100) : 0; };
