import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student-auth";
export const runtime = "nodejs";
export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ authenticated: true, loginId: session.loginId }, { headers: { "Cache-Control": "no-store" } });
}
