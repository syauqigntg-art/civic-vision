import { NextResponse } from "next/server"; import { admin } from "@/lib/supabase/admin"; import { isAdminRequest } from "@/lib/auth/server"; import { mediaReq } from "@/lib/validation/schemas"; import { hit } from "@/lib/utils/ratelimit";
const fail = (s: number) => NextResponse.json({ error: "Tidak dapat memuat berkas." }, { status: s });
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim(); if (hit("m:" + ip, 600)) return fail(429);
  let body: unknown; try { body = await req.json(); } catch { return fail(400); }
  const p = mediaReq.safeParse(body); if (!p.success) return fail(400);
  const { path, code } = p.data; let ok = await isAdminRequest();
  if (!ok && code) { // siswa: kode kelompok valid DAN berkas milik video aktif
    const { data: g } = await admin.rpc("get_group", { code }); if (g?.id) { const { data: v } = await admin.from("videos").select("id").eq("is_active", true).or(`video_url.eq.${path},thumbnail_url.eq.${path}`).limit(1); ok = !!v?.length; } }
  if (!ok) return fail(401);
  const { data, error } = await admin.storage.from("videos").createSignedUrl(path, 3600); if (error || !data) return fail(404);
  return NextResponse.json({ url: data.signedUrl }, { headers: { "Cache-Control": "private, max-age=1800" } });
}
