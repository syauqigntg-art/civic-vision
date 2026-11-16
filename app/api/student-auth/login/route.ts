import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createStudentSession, STUDENT_SESSION_COOKIE, STUDENT_SESSION_MAX_AGE, verifyPin } from "@/lib/student-auth";
import { admin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Data login tidak valid." }, { status: 400 }); }
  const ip = req.headers.get("x-real-ip")?.trim() || req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");
  const { data: allowed, error: limitError } = await admin.rpc("student_rate_limit", { p_bucket: "bad-code", p_key_hash: ipHash, p_max: 30, p_window_seconds: 60, p_increment: false });
  if (limitError || allowed !== true) return NextResponse.json({ error: "Terlalu banyak percobaan login. Tunggu sebentar." }, { status: limitError ? 503 : 429 });
  const loginId = typeof body?.loginId === "string" ? body.loginId.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!/^[A-Za-z0-9._-]{4,32}$/.test(loginId) || !/^\d{6,12}$/.test(pin)) {
    return NextResponse.json({ error: "ID atau PIN tidak sesuai." }, { status: 400 });
  }
  const { data: credential, error } = await admin.from("student_credentials")
    .select("id,pin_hash,is_active").ilike("login_id", loginId).maybeSingle();
  if (error) return NextResponse.json({ error: "Layanan login belum tersedia. Hubungi guru." }, { status: 503 });
  const valid = !!credential && credential.is_active && await verifyPin(pin, credential.pin_hash);
  if (!valid) { await admin.rpc("student_rate_limit", { p_bucket: "bad-code", p_key_hash: ipHash, p_max: 30, p_window_seconds: 60, p_increment: true }); return NextResponse.json({ error: "ID atau PIN tidak sesuai." }, { status: 401 }); }
  try {
    const session = await createStudentSession(credential.id);
    const response = NextResponse.json({ ok: true, redirectTo: "/lkpd/identitas" }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(STUDENT_SESSION_COOKIE, session.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: STUDENT_SESSION_MAX_AGE });
    return response;
  } catch {
    return NextResponse.json({ error: "Sesi tidak dapat dibuat. Coba lagi." }, { status: 503 });
  }
}
