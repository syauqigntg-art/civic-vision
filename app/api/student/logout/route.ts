import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { admin } from "@/lib/supabase/admin";
import { STUDENT_SESSION_COOKIE } from "@/lib/student/session";
export const runtime = "nodejs";
export async function POST() {
 const store=await cookies(); const token=store.get(STUDENT_SESSION_COOKIE)?.value;
 if(token) await admin.rpc("student_logout",{p_token_hash:createHash("sha256").update(token).digest("hex")});
 const response=NextResponse.json({ok:true});
 response.cookies.set(STUDENT_SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
 return response;
}
