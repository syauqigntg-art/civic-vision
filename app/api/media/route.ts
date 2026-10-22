import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/auth/server";
import { mediaReq } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const fail = (status: number) =>
  NextResponse.json(
    { error: "Tidak dapat memuat berkas." },
    { status, headers: { "Cache-Control": "no-store" } }
  );

function clientKey(req: Request) {
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

export async function POST(req: Request) {
  const keyHash = clientKey(req);
  const rate = await admin.rpc("student_rate_limit", {
    p_bucket: "student",
    p_key_hash: keyHash,
    p_max: 600,
    p_window_seconds: 60,
    p_increment: true,
  });

  if (rate.error) {
    console.error("Media rate limit failed:", rate.error.message);
    return fail(503);
  }
  if (rate.data !== true) return fail(429);

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 10000) return fail(413);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400);
  }

  const parsed = mediaReq.safeParse(body);
  if (!parsed.success) return fail(400);

  const { path, code } = parsed.data;

  // Guru terverifikasi dapat membaca materi untuk pengelolaan.
  let allowed = await isAdminRequest();

  // Permintaan siswa harus dibuktikan dengan kode valid dan penugasan aktual.
  if (!allowed && code) {
    const { data: group, error: groupError } = await admin
      .from("groups")
      .select("id,project_id")
      .eq("access_code", code.trim().toUpperCase())
      .maybeSingle();

    if (!groupError && group) {
      const [projectResult, submissionResult] = await Promise.all([
        admin.from("projects").select("is_active").eq("id", group.project_id).maybeSingle(),
        admin.from("submissions").select("status").eq("group_id", group.id).maybeSingle(),
      ]);
      const canReadArchived = projectResult.data?.is_active === false &&
        submissionResult.data?.status === "submitted";
      const projectCanServeContent = projectResult.data?.is_active !== false || canReadArchived;

      if (!projectResult.error && !submissionResult.error && projectCanServeContent) {
        const { data: videos, error: videoError } = await admin
          .from("videos")
          .select("id")
          .eq("project_id", group.project_id)
          .eq("is_active", true)
          .or(`video_url.eq.${path},thumbnail_url.eq.${path}`);

        if (!videoError && videos?.length) {
          const ids = videos.map((video) => video.id);
          const { data: assignments, error: assignmentError } = await admin
            .from("group_videos")
            .select("id")
            .eq("group_id", group.id)
            .in("video_id", ids)
            .limit(1);

          allowed = !assignmentError && !!assignments?.length;
        }
      }
    }
  }

  if (!allowed) return fail(401);

  const { data, error } = await admin.storage
    .from("videos")
    .createSignedUrl(path, 3600);

  if (error || !data) return fail(404);

  return NextResponse.json(
    { url: data.signedUrl },
    {
      headers: {
        "Cache-Control": "private, max-age=1800",
      },
    }
  );
}
