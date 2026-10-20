// Semua permintaan siswa lewat /api/student (divalidasi Zod di server). Bentuk hasil sama dengan sb.rpc.
export async function rpcS(op: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }> {
  try { const r = await fetch("/api/student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op, args }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) return { data: null, error: { message: j.error || "Terjadi kesalahan. Silakan coba lagi." } }; return { data: j.data ?? null, error: null };
  } catch { return { data: null, error: { message: "Tidak dapat terhubung. Periksa koneksi internet kalian." } }; }
}
