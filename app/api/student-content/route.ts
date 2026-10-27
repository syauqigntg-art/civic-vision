import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { safeSupabaseDiagnostic } from "@/lib/supabase/diagnostics";
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

type SnapshotVideo = {
  id: string;
  project_id: string;
  number: number;
  title: string;
  category: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  is_active: boolean | null;
};

type SnapshotQuestion = {
  id: string;
  category: string;
  phase: "see" | "think" | "connect" | "act" | null;
  question_text: string;
  description: string | null;
  question_type: string;
  placeholder: string | null;
  is_required: boolean | null;
  min_items: number | null;
  display_order: number;
  is_active: boolean | null;
  question_options?: Array<{ option_text: string; display_order: number }>;
};

type ProjectContentSnapshot = {
  schema_version: number;
  project: {
    id: string;
    title: string;
    tagline: string | null;
    description: string | null;
    subject: string | null;
    grade: string | null;
    phase: string | null;
    duration: string | null;
  };
  videos: SnapshotVideo[];
  questions: SnapshotQuestion[];
};

async function loadGroup(code: string) {
  return admin
    .from("groups")
    .select("id,project_id")
    .eq("access_code", code.trim().toUpperCase())
    .maybeSingle();
}

async function loadAssignedVideo(
  groupId: string,
  projectId: string,
  videoId: string,
  content: ProjectContentSnapshot,
  pinnedVideoId?: string | null,
) {
  // Existing work must remain reachable even if a teacher later changes the
  // current group assignment. A group with a submission is restricted to its
  // pinned video, never to a new assignment/version.
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

  const video = (content.videos || []).find(
    (item) =>
      item.id === videoId &&
      item.project_id === projectId &&
      item.is_active !== false
  );

  return { data: video || null, error: null };
}

function loadQuestions(content: ProjectContentSnapshot, phase?: SnapshotQuestion["phase"]) {
  const questions = (content.questions || [])
    .filter((question) => question.is_active !== false)
    .filter((question) => !phase || question.phase === phase)
    .sort((a, b) => a.display_order - b.display_order)
    .map((question) => ({
      ...question,
      question_options: (question.question_options || [])
        .map(({ option_text, display_order }) => ({ option_text, display_order }))
        .sort((a, b) => a.display_order - b.display_order),
    }));

  return { data: questions, error: null };
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

  // A group with a submission stays pinned to that exact immutable snapshot.
  // Only groups without a submission resolve to the currently active publication.
  const [projectResult, submissionResult] = await Promise.all([
    admin.from("projects").select("is_active,active_version_id").eq("id", group.project_id).maybeSingle(),
    admin.from("submissions").select("status,project_version_id,video_id").eq("group_id", group.id).maybeSingle(),
  ]);
  if (projectResult.error) {
    console.error("[student-content] project version lookup failed", {
      stage: "projects",
      ...safeSupabaseDiagnostic(projectResult.error),
    });
    return fail(503, "Versi proyek belum dapat diverifikasi. Coba lagi nanti.");
  }
  if (submissionResult.error) {
    console.error("[student-content] project version lookup failed", {
      stage: "submissions",
      ...safeSupabaseDiagnostic(submissionResult.error),
    });
    return fail(503, "Versi proyek belum dapat diverifikasi. Coba lagi nanti.");
  }
  if (!projectResult.data) {
    // A missing row is distinct from a failed query/schema lookup. Do not log
    // project IDs, group codes, student identity, or database row contents.
    console.error("[student-content] project version lookup returned no row", {
      stage: "projects",
      category: "project_not_found",
    });
    return fail(409, "Proyek tidak tersedia. Hubungi guru.");
  }

  const project = projectResult.data;
  const submission = submissionResult.data;
  const projectArchived = project.is_active === false;
  const alreadySubmitted = submission?.status === "submitted";
  if (projectArchived && !alreadySubmitted) {
    return fail(
      403,
      "Proyek ini diarsipkan. Jawaban draft tetap tersimpan; minta guru mengaktifkan kembali proyek untuk melanjutkan."
    );
  }

  const versionId = submission?.project_version_id || project.active_version_id;
  if (!versionId) {
    return fail(409, "Proyek ini belum memiliki versi LKPD yang diterbitkan. Hubungi guru.");
  }

  const versionResult = await admin
    .from("project_versions")
    .select("id,project_id,version_number,status,content")
    .eq("id", versionId)
    .eq("project_id", group.project_id)
    .maybeSingle();

  if (versionResult.error) {
    console.error("[student-content] project version snapshot lookup failed", {
      stage: "project_versions",
      ...safeSupabaseDiagnostic(versionResult.error),
    });
    return fail(503, "Versi materi belum dapat diverifikasi. Coba lagi nanti.");
  }
  const version = versionResult.data;
  if (!version || version.status !== "published" || !version.content) {
    return fail(409, "Versi LKPD kelompok tidak tersedia. Hubungi guru.");
  }

  const content = version.content as ProjectContentSnapshot;
  if (!Array.isArray(content.videos) || !Array.isArray(content.questions)) {
    console.error("Published project version content shape is invalid.");
    return fail(500);
  }

  try {
    if (parsed.data.op === "list_videos") {
      let assignedIds: Set<string>;

      if (submission?.video_id) {
        // Continue the exact work already started; never switch the pinned
        // video or version merely because assignments changed after starting.
        assignedIds = new Set([submission.video_id]);
      } else {
        const { data: assignments, error: assignmentsError } = await admin
          .from("group_videos")
          .select("video_id")
          .eq("group_id", group.id)
          .eq("project_id", group.project_id);

        if (assignmentsError) return fail(500);
        assignedIds = new Set(
          (assignments || []).map((assignment) => assignment.video_id).filter(Boolean)
        );
      }

      const data = content.videos
        .filter((video) =>
          assignedIds.has(video.id) &&
          video.project_id === group.project_id &&
          video.is_active !== false
        )
        .sort((a, b) => a.number - b.number)
        .map(({ id, number, title, category }) => ({ id, number, title, category }));

      return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
    }

    const { vid } = parsed.data.args;
    const videoResult = await loadAssignedVideo(
      group.id,
      group.project_id,
      vid,
      content,
      submission?.video_id,
    );
    if (videoResult.error) {
      console.error("Student assignment video lookup failed:", videoResult.error.message);
      return fail(500);
    }
    if (!videoResult.data) return fail(404);

    if (parsed.data.op === "video_detail") {
      const questionsResult = loadQuestions(content, "see");
      // Do not expose the group record or access code in this response.
      return NextResponse.json(
        { data: { video: videoResult.data, questions: questionsResult.data } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const questionsResult = loadQuestions(content);
    return NextResponse.json(
      { data: questionsResult.data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Student content request failed:", error instanceof Error ? error.message : "unknown");
    return fail(500);
  }
}
