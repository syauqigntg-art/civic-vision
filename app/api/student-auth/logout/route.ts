import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { admin } from "@/lib/supabase/admin";
import { hashSessionToken, STUDENT_SESSION_COOKIE } from "@/lib/student-auth";
export const runtime = "nodejs";
export async function POST() {
  const jar = await cookies();
  const token = jar.get(STUDENT_SESSION_COOKIE)?.value;
  if (token) await admin.from("student_sessions").delete().eq("token_hash", hashSessionToken(token));
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STUDENT_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
