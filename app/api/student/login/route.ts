import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { STUDENT_SESSION_COOKIE } from "@/lib/student/session";
export const runtime = "nodejs";
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({error:"Data tidak valid."},{status:400}); }
  const studentId = typeof body?.student_id === "string" ? body.student_id.trim() : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(studentId) || !/^\d{6}$/.test(pin))
    return NextResponse.json({error:"ID siswa atau PIN tidak valid."},{status:400});
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const {data,error} = await admin.rpc("student_login",{p_student_id:studentId,p_pin:pin,p_token_hash:tokenHash});
  if (error) { console.error("Student login failed:",error.message); return NextResponse.json({error:"Login belum dapat diproses."},{status:503}); }
  if (!data) return NextResponse.json({error:"ID siswa atau PIN salah, atau akun sedang terkunci."},{status:401});
  const response=NextResponse.json({data:{student_id:data.student_id,student_name:data.student_name}});
  response.cookies.set(STUDENT_SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:43200});
  response.headers.set("Cache-Control","no-store");
  return response;
}
