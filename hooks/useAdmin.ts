"use client"; import { useCallback, useEffect, useState } from "react"; import { sb } from "@/lib/supabase/client"; import type { Q } from "@/types";
type Part = "P" | "gs" | "vs" | "qs" | "gv" | "gm" | "subs" | "ans";
const ALL: Part[] = ["P", "gs", "vs", "qs", "gv", "gm", "subs", "ans"];
const QUERY: Record<Part, () => PromiseLike<any>> = { P: () => sb.from("projects").select("*").limit(1), gs: () => sb.from("groups").select("*").order("group_number"), vs: () => sb.from("videos").select("*").order("number"),
  qs: () => sb.from("questions").select("*,question_options(*)").order("display_order"), gv: () => sb.from("group_videos").select("*"), gm: () => sb.from("group_members").select("*").order("member_order"),
  subs: () => sb.from("submissions").select("*"), ans: () => sb.from("answers").select("submission_id,question_id,answer_text") }; // hanya kolom yang dipakai
export interface AdminData { P: any; gs: any[]; vs: any[]; qs: Q[]; gv: any[]; gm: any[]; subs: any[]; ans: any[]; loading: boolean; error: boolean; load: () => Promise<void> }
export function useAdmin(parts: Part[] = ALL): AdminData { // muat hanya bagian yang dibutuhkan halaman
  const [d, setD] = useState<any>({ P: {}, gs: [], vs: [], qs: [], gv: [], gm: [], subs: [], ans: [] }); const [loading, setLoading] = useState(true); const [error, setError] = useState(false); const key = parts.join(",");
  const load = useCallback(async () => { const ks = key.split(",") as Part[]; const rs = await Promise.all(ks.map(k => QUERY[k]())); const next: any = {}; let bad = false;
    ks.forEach((k, i) => { if (rs[i].error) bad = true; next[k] = k === "P" ? rs[i].data?.[0] || {} : rs[i].data || []; }); setD((p: any) => ({ ...p, ...next })); setError(bad); setLoading(false); }, [key]);
  useEffect(() => { load(); }, [load]); return { ...d, loading, error, load };
}
