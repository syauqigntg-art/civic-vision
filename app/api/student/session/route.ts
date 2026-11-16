import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student/session";
export const runtime = "nodejs";
export async function GET() {
 const session=await getStudentSession();
 if(!session) return NextResponse.json({error:"Sesi berakhir. Silakan login kembali."},{status:401,headers:{"Cache-Control":"no-store"}});
 return NextResponse.json({data:{student_id:session.student_id,student_name:session.student_name,group_id:session.group_id}},{headers:{"Cache-Control":"no-store"}});
}
