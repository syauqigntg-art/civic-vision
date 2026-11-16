import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { admin } from "@/lib/supabase/admin";

const scrypt = promisify(scryptCallback);
export const STUDENT_SESSION_COOKIE = "cv_student_session";
const SESSION_SECONDS = 60 * 60 * 12;

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function hashPin(pin: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}
export async function verifyPin(pin: string, stored: string) {
  const [kind, saltHex, hashHex] = stored.split(":");
  if (kind !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(pin, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function getStudentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const { data, error } = await admin
    .from("student_sessions")
    .select("credential_id,expires_at,student_credentials!inner(id,group_member_id,is_active,login_id,group_members!inner(id,group_id,groups!inner(id,access_code,project_id)))")
    .eq("token_hash", hashSessionToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  const credential = data.student_credentials as any;
  if (!credential?.is_active) return null;
  const member = credential.group_members;
  const group = member?.groups;
  if (!group?.access_code) return null;
  return { credentialId: credential.id as string, memberId: member.id as string, loginId: credential.login_id as string, groupId: group.id as string, projectId: group.project_id as string, code: group.access_code as string };
}
export async function createStudentSession(credentialId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  const { error } = await admin.from("student_sessions").insert({
    token_hash: hashSessionToken(token), credential_id: credentialId, expires_at: expiresAt,
  });
  if (error) throw new Error("Sesi tidak dapat dibuat.");
  return { token, expiresAt };
}
export const STUDENT_SESSION_MAX_AGE = SESSION_SECONDS;
