// Pembatas sederhana di memori (per instance server). Untuk produksi besar, tambahkan Vercel Firewall / Upstash.
const m = new Map<string, { n: number; t: number }>();
const cur = (k: string, w: number) => { const x = m.get(k); return x && Date.now() - x.t <= w ? x : undefined; };
export const over = (k: string, max: number, w = 60000) => (cur(k, w)?.n ?? 0) >= max;
export const hit = (k: string, max: number, w = 60000) => { if (m.size > 5000) m.clear(); const x = cur(k, w); if (x) x.n++; else m.set(k, { n: 1, t: Date.now() }); return over(k, max, w); };
