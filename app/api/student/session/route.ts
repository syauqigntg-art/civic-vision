import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import {
  createGroupSession,
  GROUP_SESSION_COOKIE,
  GROUP_SESSION_MAX_AGE,
} from "@/lib/auth/group-session";
import { code as groupCodeSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clientKey(req: Request) {
  const ip = req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: Request) {
  const rate = await admin.rpc("student_rate_limit", {
    p_bucket: "student",
    p_key_hash: clientKey(req),
    p_max: 30,
    p_window_seconds: 60,
    p_increment: true,
  });
  if (rate.error) return fail("Layanan sedang bermasalah. Coba lagi nanti.", 503);
  if (rate.data !== true) return fail("Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.", 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Data login tidak valid.", 400);
  }

  const parsed = groupCodeSchema.safeParse(
    body && typeof body === "object" && "code" in body
      ? (body as { code: unknown }).code
      : ""
  );
  if (!parsed.success) return fail("Masukkan kode kelompok yang valid.", 400);

  const code = parsed.data.toUpperCase();
  const { data: group, error: groupError } = await admin
    .from("groups")
    .select("id,project_id")
    .eq("access_code", code)
    .maybeSingle();

  if (groupError) {
    console.error("Student group lookup failed:", groupError.message);
    return fail("Kode kelompok belum dapat diverifikasi. Coba lagi.", 503);
  }
  if (!group) return fail("Kode kelompok tidak ditemukan.", 401);

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id,is_active,title")
    .eq("id", group.project_id)
    .maybeSingle();

  if (projectError) {
    console.error("Student project lookup failed:", projectError.message);
    return fail("Proyek kelompok belum dapat diverifikasi. Coba lagi.", 503);
  }
  if (!project || project.is_active === false) {
    return fail("Proyek kelompok sedang diarsipkan atau dinonaktifkan. Hubungi guru.", 403);
  }

  const response = NextResponse.json({
    ok: true,
    project: { id: project.id, title: project.title },
  }, { headers: { "Cache-Control": "no-store" } });

  response.cookies.set({
    name: GROUP_SESSION_COOKIE,
    value: createGroupSession(code),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GROUP_SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: GROUP_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
