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

async function loadAssignedVideo(groupId: string, projectId: string, videoId: string) {
  const { data: assignment, error: assignmentError } = await admin
    .from("group_videos")
    .select("id")
    .eq("group_id", groupId)
    .eq("video_id", videoId)
    .limit(1)
    .maybeSingle();

  if (assignmentError || !assignment) {
    return { data: null, error: assignmentError };
  }

  const { data, error } = await admin
    .from("videos")
    .select("id,project_id,number,title,category,description,video_url,thumbnail_url,is_active")
    .eq("id", videoId)
    .eq("project_id", projectId)
    .eq("is_active", true)
    .maybeSingle();

  return { data, error };
}

async function loadQuestions(projectId: string, phase?: "see") {
  let query = admin
    .from("questions")
    .select("id,category,phase,question_text,description,question_type,placeholder,is_required,min_items,display_order")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("display_order");

  if (phase) query = query.eq("phase", phase);

  const { data: questions, error } = await query;
  if (error) return { data: null, error };

  const rows = questions || [];
  if (!rows.length) return { data: [], error: null };

  const { data: options, error: optionsError } = await admin
    .from("question_options")
    .select("question_id,option_text,display_order")
    .in("question_id", rows.map((q) => q.id))
    .order("display_order");

  if (optionsError) return { data: null, error: optionsError };

  const optionRows = options || [];
  const output = rows.map((q) => ({
    ...q,
    question_options: optionRows
      .filter((o) => o.question_id === q.id)
      .map(({ option_text, display_order }) => ({ option_text, display_order })),
  }));

  return { data: output, error: null };
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

  try {
    if (parsed.data.op === "list_videos") {
      const { data: assignments, error: assignmentsError } = await admin
        .from("group_videos")
        .select("video_id")
        .eq("group_id", group.id);

      if (assignmentsError) return fail(500);
      const ids = [...new Set((assignments || []).map((x) => x.video_id).filter(Boolean))];
      if (!ids.length) {
        return NextResponse.json({ data: [] }, { headers: { "Cache-Control": "no-store" } });
      }

      const { data, error } = await admin
        .from("videos")
        .select("id,number,title,category")
        .in("id", ids)
        .eq("project_id", group.project_id)
        .eq("is_active", true)
        .order("number");

      if (error) return fail(500);
      return NextResponse.json({ data: data || [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const { vid } = parsed.data.args;
    const videoResult = await loadAssignedVideo(group.id, group.project_id, vid);
    if (videoResult.error) {
      console.error("Student assignment video lookup failed:", videoResult.error.message);
      return fail(500);
    }
    if (!videoResult.data) return fail(404);

    if (parsed.data.op === "video_detail") {
      const questionsResult = await loadQuestions(videoResult.data.project_id, "see");
      if (questionsResult.error) {
        console.error("Student SEE question lookup failed:", questionsResult.error.message);
        return fail(500);
      }
      // Do not expose the group record or access code in this response.
      return NextResponse.json(
        { data: { video: videoResult.data, questions: questionsResult.data || [] } },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const questionsResult = await loadQuestions(videoResult.data.project_id);
    if (questionsResult.error) {
      console.error("Student analysis question lookup failed:", questionsResult.error.message);
      return fail(500);
    }

    return NextResponse.json(
      { data: questionsResult.data || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Student content request failed:", error instanceof Error ? error.message : "unknown");
    return fail(500);
  }
}
