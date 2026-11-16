import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { admin } from "@/lib/supabase/admin";
export const runtime = "nodejs";
async function authorized() {
 const sb=await serverClient(); const {data:{user}}=await sb.auth.getUser();
 if(!user) return false;
 const {data}=await sb.from("users").select("role").eq("id",user.id).single();
 return data?.role==="admin";
}
export async function POST(req:Request) {
 if(!await authorized()) return NextResponse.json({error:"Tidak memiliki akses."},{status:403});
 let body:any; try{body=await req.json();}catch{return NextResponse.json({error:"Data tidak valid."},{status:400});}
 const memberId=typeof body?.member_id==="string"?body.member_id:"";
 const studentId=typeof body?.student_id==="string"?body.student_id.trim():"";
 const pin=typeof body?.pin==="string"?body.pin:"";
 if(!/^[0-9a-f-]{36}$/i.test(memberId)||!/^[A-Za-z0-9_-]{4,32}$/.test(studentId)||!/^[0-9]{6}$/.test(pin))
  return NextResponse.json({error:"Periksa ID siswa dan PIN. PIN harus 6 digit."},{status:400});
 const {data,error}=await admin.rpc("admin_set_student_credential",{p_member_id:memberId,p_student_id:studentId,p_pin:pin});
 if(error){console.error("Credential provisioning failed:",error.message);return NextResponse.json({error:"Kredensial gagal disimpan. Pastikan ID belum digunakan."},{status:400});}
 return NextResponse.json({data},{headers:{"Cache-Control":"no-store"}});
}
