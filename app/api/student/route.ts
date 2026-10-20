import { NextResponse } from "next/server"; import { admin } from "@/lib/supabase/admin"; import { studentOp } from "@/lib/validation/schemas"; import { hit, over } from "@/lib/utils/ratelimit";
const fail = (m: string, s: number) => NextResponse.json({ error: m }, { status: s });
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (hit("s:" + ip, 600)) return fail("Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.", 429);
  if (+(req.headers.get("content-length") || 0) > 30000) return fail("Data terlalu besar.", 413);
  let body: unknown; try { body = await req.json(); } catch { return fail("Data tidak valid.", 400); }
  const p = studentOp.safeParse(body); if (!p.success) return fail("Data tidak valid. Periksa kembali isian kalian.", 400);
  if (p.data.op === "get_group" && over("bad:" + ip, 30)) return fail("Terlalu banyak kode salah. Coba lagi beberapa menit lagi.", 429); // hanya tebakan salah yang dihitung (aman untuk sekolah satu IP)
  const { data, error } = await admin.rpc(p.data.op, p.data.args as any);
  if (error) { console.error("student rpc", p.data.op, error.message); return fail("Terjadi kesalahan. Silakan coba lagi.", 500); }
  if (p.data.op === "get_group" && !data) hit("bad:" + ip, 30);
  return NextResponse.json({ data });
}
