import { createHmac, timingSafeEqual } from "node:crypto";

export const GROUP_SESSION_COOKIE = "cv_group_session";
export const GROUP_SESSION_MAX_AGE = 7 * 24 * 60 * 60;

function secret() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Student session signing is not configured.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createGroupSession(code: string) {
  const payload = Buffer.from(
    JSON.stringify({
      code: code.trim().toUpperCase(),
      exp: Math.floor(Date.now() / 1000) + GROUP_SESSION_MAX_AGE,
    })
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function readGroupSession(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const entry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${GROUP_SESSION_COOKIE}=`));
  if (!entry) return null;

  const token = entry.slice(GROUP_SESSION_COOKIE.length + 1);
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;

  try {
    const expected = signature(payload);
    const supplied = Buffer.from(suppliedSignature);
    const expectedBuffer = Buffer.from(expected);
    if (
      supplied.length !== expectedBuffer.length ||
      !timingSafeEqual(supplied, expectedBuffer)
    ) return null;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      typeof session.code !== "string" ||
      typeof session.exp !== "number" ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return session.code;
  } catch {
    return null;
  }
}
