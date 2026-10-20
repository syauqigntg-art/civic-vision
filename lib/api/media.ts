import { getCode } from "@/lib/utils/code";
const cache = new Map<string, { u: string; e: number }>(); // cache URL bertanda tangan di memori tab (50 menit)
export async function signedUrl(path: string) { const c = cache.get(path); if (c && c.e > Date.now()) return c.u;
  const r = await fetch("/api/media", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, code: getCode() || undefined }) }); if (!r.ok) throw new Error("media");
  const { url } = await r.json(); cache.set(path, { u: url, e: Date.now() + 50 * 60 * 1000 }); return url as string; }
