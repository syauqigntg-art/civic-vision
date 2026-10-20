"use client"; import { useCallback, useEffect, useRef, useState } from "react"; import { rpcS } from "@/lib/api/student"; import { getCode } from "@/lib/utils/code";
export type SaveState = "idle" | "saving" | "saved" | "offline";
// Autosave dengan debounce. Jawaban yang belum terkirim tetap aman di localStorage (per kode kelompok) dan dicoba ulang.
export function useAutosave(onLocked: () => void) {
  const dirty = useRef<Record<string, string>>({}); const timer = useRef<any>(null); const lock = useRef(onLocked); lock.current = onLocked; const [st, setSt] = useState<SaveState>("idle");
  const k = () => "cv_dirty_" + getCode(); const persist = () => localStorage.setItem(k(), JSON.stringify(dirty.current));
  const flush = useCallback(async () => { const keys = Object.keys(dirty.current); if (!keys.length) return setSt(s => s === "idle" ? s : "saved"); setSt("saving");
    for (const q of keys) { const val = dirty.current[q]; const { data, error } = await rpcS("save_answer", { code: getCode(), qid: q, val }); if (error) return setSt("offline"); if (data === false) lock.current(); if (dirty.current[q] === val) delete dirty.current[q]; }
    persist(); setSt(Object.keys(dirty.current).length ? "saving" : "saved"); }, []);
  const change = (qid: string, val: string) => { dirty.current[qid] = val; persist(); setSt("saving"); clearTimeout(timer.current); timer.current = setTimeout(flush, 600); };
  const load = () => { try { dirty.current = JSON.parse(localStorage.getItem(k()) || "{}"); } catch { dirty.current = {}; } return { ...dirty.current }; };
  useEffect(() => { const iv = setInterval(() => { if (Object.keys(dirty.current).length) flush(); }, 5000); const on = () => flush(); window.addEventListener("online", on); return () => { clearInterval(iv); window.removeEventListener("online", on); }; }, [flush]);
  return { st, change, flush, load, hasPending: () => Object.keys(dirty.current).length > 0 };
}
