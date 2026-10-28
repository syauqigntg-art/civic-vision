import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { studentContentReq } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const fail = (status: number, message = "Konten tidak dapat dimuat.") =>
  NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });

function clientKey(req: Request) {
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
  return createHash("sha256").update(ip).digest("hex");
}

async function limit(bucket: "student" | "bad-code", keyHash: string, max: number, increment: boolean) {
  return admin.rpc("student_rate_limit", {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_max: max,
    p_window_seconds: 60,
    p_increment: increment,
  });
}

async function loadGroup(code: string) {
  return admin
    .from("groups")
    .select("id,project_id")
    .eq("access_code", code.trim().toUpperCase())
    .maybeSingle();
}

async function loadQuestions(projectId: string, phase?: "see" | "think" | "connect" | "act") {
  const { data, error } = await admin
    .from("questions")
    .select("*,question_options(*)")
    .eq("project_id", projectId)
    .order("display_order");

  if (error) return { data: null, error };

  const questions = (data || [])
    .filter((question: any) => question.is_active !== false)
    .filter((question: any) => !phase || question.phase === phase)
    .map((question: any) => ({
      ...question,
      question_options: (question.question_options || [])
        .map(({ option_text, display_order }: { option_text: string; display_order: number }) => ({
          option_text,
          display_order,
        }))
        .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order),
    }));

  return { data: questions, error: null };
}

async function loadAssignedVideo(
  groupId: string,
  projectId: string,
  videoId: string,
  pinnedVideoId?: string | null,
) {
  // Once a group starts, keep its selected video even if the teacher changes
  // assignments. Content itself is read from the current project tables.
  if (pinnedVideoId && pinnedVideoId !== videoId) {
    return { data: null, error: null };
  }

  if (!pinnedVideoId) {
    const { data: assignment, error: assignmentError } = await admin
      .from("group_videos")
      .select("id")
      .eq("group_id", groupId)
      .eq("project_id", projectId)
      .eq("video_id", videoId)
      .limit(1)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return { data: null, error: assignmentError };
    }
  }

  const { data: video, error } = await admin
    .from("videos")
    .select("*")
    .eq("id", videoId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) return { data: null, error };
  if (!video || (!pinnedVideoId && video.is_active === false)) {
    return { data: null, error: null };
  }

  return { data: video, error: null };
}

export async function POST(req: Request) {
  const keyHash = clientKey(req);
  const generalLimit = await limit("student", keyHash, 600, true);

  if (generalLimit.error) {
    console.error("Student content rate limit failed:", generalLimit.error.message);
    return fail(503, "Layanan sedang bermasalah. Coba lagi nanti.");
  }
  if (generalLimit.data !== true) {
    return fail(429, "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.");
  }

  const length = Number(req.headers.get("content-length") || 0);
  if (length > 10000) return fail(413, "Permintaan terlalu besar.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "Permintaan tidak valid.");
  }

  const parsed = studentContentReq.safeParse(body);
  if (!parsed.success) return fail(400, "Permintaan tidak valid.");

  const { code } = parsed.data.args;
  const attemptLimit = await limit("bad-code", keyHash, 30, false);
  if (attemptLimit.error) {
    console.error("Student content code limit failed:", attemptLimit.error.message);
    return fail(503, "Layanan sedang bermasalah. Coba lagi nanti.");
  }
  if (attemptLimit.data !== true) {
    return fail(429, "Terlalu banyak percobaan kode. Tunggu sebentar lalu coba lagi.");
  }

  const groupResult = await loadGroup(code);
  if (groupResult.error) {
    console.error("Student content group lookup failed:", groupResult.error.message);
    return fail(503, "Layanan sedang bermasalah. Coba lagi nanti.");
  }
  const group = groupResult.data;

  if (!group) {
    const counted = await limit("bad-code", keyHash, 30, true);
    if (counted.error) {
      console.error("Student content bad-code counter failed:", counted.error.message);
      return fail(503, "Layanan sedang bermasalah. Coba lagi nanti.");
    }
    return fail(counted.data === true ? 404 : 429);
  }

  // The working project is the source of truth. No published snapshot/version
  // is required; question edits and permanent deletion take effect directly.
  const [projectResult, submissionResult] = await Promise.all([
    admin.from("projects").select("id,is_active").eq("id", group.project_id).maybeSingle(),
    admin.from("submissions").select("status,video_id").eq("group_id", group.id).maybeSingle(),
  ]);

  if (projectResult.error || submissionResult.error) {
    console.error("Student content project/submission lookup failed.");
    return fail(503, "Konten proyek belum dapat diverifikasi. Coba lagi nanti.");
  }
  if (!projectResult.data) {
    return fail(409, "Proyek tidak tersedia. Hubungi guru.");
  }

  const project = projectResult.data;
  const submission = submissionResult.data;
  const alreadySubmitted = submission?.status === "submitted";

  if (project.is_active === false && !alreadySubmitted) {
    return fail(
      403,
      "Proyek ini diarsipkan. Jawaban draft tetap tersimpan; minta guru mengaktifkan kembali proyek untuk melanjutkan."
    );
  }

  try {
    if (parsed.data.op === "list_videos") {
      let assignedIds: string[];

      if (submission?.video_id) {
        // Existing work stays on its already-selected video.
        assignedIds = [submission.video_id];
      } else {
        const { data: assignments, error: assignmentsError } = await admin
          .from("group_videos")
          .select("video_id")
          .eq("group_id", group.id)
          .eq("project_id", group.project_id);

        if (assignmentsError) return fail(503, "Penugasan video belum dapat dimuat.");
        assignedIds = (assignments || [])
          .map((assignment: any) => assignment.video_id)
          .filter((id: unknown): id is string => typeof id === "string");
      }

      if (assignedIds.length === 0) {
        return NextResponse.json({ data: [] }, { headers: { "Cache-Control": "no-store" } });
      }

      const { data: videos, error: videosError } = await admin
        .from("videos")
        .select("id,project_id,number,title,category,is_active")
        .eq("project_id", group.project_id)
        .in("id", assignedIds)
        .order("number");

      if (videosError) return fail(503, "Video kasus belum dapat dimuat.");

      const data = (videos || [])
        .filter((video: any) => submission?.video_id === video.id || video.is_active !== false)
        .map(({ id, number, title, category }: any) => ({ id, number, title, category }));

      return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
    }

    const { vid } = parsed.data.args;
    if (!vid) return fail(400, "Video belum dipilih.");

    const videoResult = await loadAssignedVideo(
      group.id,
      group.project_id,
      vid,
      submission?.video_id,
    );
    if (videoResult.error) {
      console.error("Student assignment video lookup failed:", videoResult.error.message);
      return fail(503, "Penugasan video belum dapat diverifikasi.");
    }
    if (!videoResult.data) return fail(404);

    if (parsed.data.op === "video_detail") {
      const questionsResult = await loadQuestions(group.project_id, "see");
      if (questionsResult.error) return fail(503, "Pertanyaan belum dapat dimuat.");

      // Never expose the group record or access code in the response.
      return NextResponse.json(
        { data: { video: videoResult.data, questions: questionsResult.data } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const questionsResult = await loadQuestions(group.project_id);
    if (questionsResult.error) return fail(503, "Pertanyaan belum dapat dimuat.");

    return NextResponse.json(
      { data: questionsResult.data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Student content request failed:", error instanceof Error ? error.message : "unknown");
    return fail(500);
  }
}
