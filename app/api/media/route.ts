
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/auth/server";
import { mediaReq } from "@/lib/validation/schemas";
import { hit } from "@/lib/utils/ratelimit";

const fail = (status: number) =>
  NextResponse.json(
    { error: "Tidak dapat memuat berkas." },
    { status }
  );

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "local")
    .split(",")[0]
    .trim();

  if (hit("m:" + ip, 600)) return fail(429);

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return fail(400);
  }

  const parsed = mediaReq.safeParse(body);
  if (!parsed.success) return fail(400);

  const { path, code } = parsed.data;

  // Guru yang sudah terverifikasi boleh mengakses media.
  let allowed = await isAdminRequest();

  // Siswa harus memiliki kode kelompok yang valid
  // dan media harus berasal dari video yang ditugaskan.
  if (!allowed && code) {
    const { data: group, error: groupError } =
      await admin.rpc("get_group", { code });

    if (!groupError && group?.id) {
      const { data: videos, error: videoError } =
        await admin
          .from("videos")
          .select("id")
          .eq("is_active", true)
          .or(
            `video_url.eq.${path},thumbnail_url.eq.${path}`
          );

      if (!videoError && videos?.length) {
        const videoIds = videos.map((video) => video.id);

        const { data: assignments, error: assignmentError } =
          await admin
            .from("group_videos")
            .select("id")
            .eq("group_id", group.id)
            .in("video_id", videoIds)
            .limit(1);

        allowed =
          !assignmentError && !!assignments?.length;
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
