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

  const [projectResult, submissionResult] = await Promise.all([
    admin.from("projects").select("id,is_active").eq("id", group.project_id).maybeSingle(),
    admin.from("submissions").select("id,status,video_id").eq("group_id", group.id).maybeSingle(),
  ]);

  if (projectResult.error || submissionResult.error) {
    console.error("Student content project/submission lookup failed.", {
      projectQueryFailed: Boolean(projectResult.error),
      submissionQueryFailed: Boolean(submissionResult.error),
    });
    return fail(503, "Data proyek atau pengerjaan belum dapat diverifikasi. Coba lagi nanti.");
  }
  if (!projectResult.data) return fail(409, "Proyek tidak tersedia. Hubungi guru.");

  const submission = submissionResult.data;
  const projectArchived = projectResult.data.is_active === false;
  const alreadySubmitted = submission?.status === "submitted";
  if (projectArchived && !alreadySubmitted) {
    return fail(
      403,
      "Proyek ini diarsipkan. Jawaban draft tetap tersimpan; minta guru mengaktifkan kembali proyek untuk melanjutkan."
    );
  }

  try {
    let assignedIds: Set<string>;

    if (submission?.video_id) {
      // Continue work using the video already pinned to this submission.
      assignedIds = new Set([submission.video_id]);
    } else {
      const { data: assignments, error: assignmentsError } = await admin
        .from("group_videos")
        .select("video_id")
        .eq("group_id", group.id)
        .eq("project_id", group.project_id);

      if (assignmentsError) {
        console.error("Student video assignment lookup failed:", assignmentsError.message);
        return fail(503, "Penugasan video belum dapat diverifikasi. Coba lagi nanti.");
      }
      assignedIds = new Set(
        (assignments || []).map((assignment: { video_id: string | null }) => assignment.video_id)
          .filter((id: string | null): id is string => Boolean(id))
      );
    }

    if (parsed.data.op === "list_videos") {
      if (!assignedIds.size) {
        return NextResponse.json({ data: [] }, { headers: { "Cache-Control": "no-store" } });
      }

      const { data: videos, error: videosError } = await admin
        .from("videos")
        .select("id,project_id,number,title,category,is_active")
        .eq("project_id", group.project_id)
        .eq("is_active", true)
        .in("id", [...assignedIds])
        .order("number");

      if (videosError) {
        console.error("Student video list query failed:", videosError.message);
        return fail(503, "Video kasus belum dapat dimuat. Coba lagi nanti.");
      }

      return NextResponse.json(
        { data: (videos || []).map(({ id, number, title, category }) => ({ id, number, title, category })) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const { vid } = parsed.data.args;
    if (!assignedIds.has(vid)) return fail(404, "Video tidak ditemukan atau tidak ditugaskan.");

    const { data: video, error: videoError } = await admin
      .from("videos")
      .select("id,project_id,number,title,category,description,video_url,thumbnail_url,duration,is_active")
      .eq("id", vid)
      .eq("project_id", group.project_id)
      .eq("is_active", true)
      .maybeSingle();

    if (videoError) {
      console.error("Student assigned video query failed:", videoError.message);
      return fail(503, "Video kasus belum dapat dimuat. Coba lagi nanti.");
    }
    if (!video) return fail(404, "Video tidak ditemukan atau tidak aktif.");

    let questionsQuery = admin
      .from("questions")
      .select("id,project_id,category,phase,question_text,description,question_type,placeholder,is_required,min_items,display_order,is_active,question_options(option_text,display_order)")
      .eq("project_id", group.project_id)
      .eq("is_active", true)
      .order("display_order");

    if (parsed.data.op === "video_detail") {
      questionsQuery = questionsQuery.eq("phase", "see");
    }

    const { data: questions, error: questionsError } = await questionsQuery;
    if (questionsError) {
      console.error("Student live question query failed:", questionsError.message);
      return fail(503, "Pertanyaan LKPD belum dapat dimuat. Coba lagi nanti.");
    }

    const cleanQuestions = (questions || []).map((question: any) => ({
      ...question,
      question_options: (question.question_options || [])
        .map((option: any) => ({
          option_text: option.option_text,
          display_order: option.display_order,
        }))
        .sort((a: any, b: any) => a.display_order - b.display_order),
    }));

    if (parsed.data.op === "video_detail") {
      // Expose only the assigned active video and questions for the SEE phase.
      return NextResponse.json(
        { data: { video, questions: cleanQuestions } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { data: cleanQuestions },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Student content request failed:", error instanceof Error ? error.message : "unknown");
    return fail(500);
  }
}
