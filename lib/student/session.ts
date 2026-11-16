import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { admin } from "@/lib/supabase/admin";
export const STUDENT_SESSION_COOKIE = "cv_student_session";
export async function getStudentSession() {
  const store = await cookies();
  const token = store.get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await admin.rpc("student_session", { p_token_hash: tokenHash });
  if (error || !data?.group_id || !data?.access_code) return null;
  return data as { student_id:string; student_name:string; group_id:string; access_code:string };
}
