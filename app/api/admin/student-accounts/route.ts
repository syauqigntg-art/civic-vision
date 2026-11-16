import { NextResponse } from "next/server";
import { hashPin } from "@/lib/student-auth";
import { admin } from "@/lib/supabase/admin";
import { serverClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const supabase = await serverClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Autentikasi guru diperlukan." }, { status: 401 });
  const { data: profile, error: profileError } = await admin.from("users").select("role").eq("id", auth.user.id).maybeSingle();
  if (profileError || profile?.role !== "admin") return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Data tidak valid." }, { status: 400 }); }
  const memberId = typeof body?.groupMemberId === "string" ? body.groupMemberId : "";
  const loginId = typeof body?.loginId === "string" ? body.loginId.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!/^[0-9a-f-]{36}$/i.test(memberId) || !/^[A-Za-z0-9._-]{4,32}$/.test(loginId) || !/^\d{6,12}$/.test(pin)) {
    return NextResponse.json({ error: "Anggota, ID (4–32 karakter), atau PIN (6–12 digit) tidak valid." }, { status: 400 });
  }
  const { data: member, error: memberError } = await admin.from("group_members").select("id").eq("id", memberId).maybeSingle();
  if (memberError || !member) return NextResponse.json({ error: "Anggota kelompok tidak ditemukan." }, { status: 404 });
  const pinHash = await hashPin(pin);
  const { error } = await admin.from("student_credentials").upsert({ group_member_id: memberId, login_id: loginId, pin_hash: pinHash, is_active: true, updated_at: new Date().toISOString() }, { onConflict: "group_member_id" });
  if (error) return NextResponse.json({ error: error.code === "23505" ? "ID siswa sudah digunakan." : "Kredensial gagal disimpan." }, { status: error.code === "23505" ? 409 : 500 });
  return NextResponse.json({ ok: true });
}
