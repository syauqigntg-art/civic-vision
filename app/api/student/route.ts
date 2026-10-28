
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { studentOp } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

function hashClientIp(req: Request) {
  // Gunakan alamat IP yang diberikan oleh infrastruktur Vercel.
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-vercel-forwarded-for")
      ?.split(",")[0]
      .trim() ||
    "unknown";

  // Simpan hash, bukan alamat IP asli.
  return createHash("sha256").update(ip).digest("hex");
}

async function checkLimit(
  bucket: "student" | "bad-code",
  keyHash: string,
  max: number,
  increment: boolean
) {
  return admin.rpc("student_rate_limit", {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_max: max,
    p_window_seconds: 60,
    p_increment: increment,
  });
}

export async function POST(req: Request) {
  const keyHash = hashClientIp(req);

  // Batas umum: maksimal 600 permintaan per menit per IP.
  const { data: allowed, error: limitError } = await checkLimit(
    "student",
    keyHash,
    600,
    true
  );

  if (limitError) {
    console.error("Rate limit check failed:", limitError.message);
    return fail("Layanan sedang bermasalah. Coba lagi nanti.", 503);
  }

  if (allowed !== true) {
    return fail(
      "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
      429
    );
  }

  const contentLength = Number(req.headers.get("content-length") || 0);

  if (contentLength > 30000) {
    return fail("Data terlalu besar.", 413);
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return fail("Data tidak valid.", 400);
  }

  const parsed = studentOp.safeParse(body);

  if (!parsed.success) {
    return fail(
      "Data tidak valid. Periksa kembali isian kalian.",
      400
    );
  }

  // Arsip menghentikan perubahan/pekerjaan baru, tetapi tidak menghapus
  // draft maupun submission dan tetap mengizinkan operasi baca.
  if (["save_identity", "begin_submission", "save_answer", "submit_group"].includes(parsed.data.op)) {
    const code = parsed.data.args.code;
    const { data: group, error: groupError } = await admin
      .from("groups")
      .select("project_id")
      .eq("access_code", code.trim().toUpperCase())
      .maybeSingle();
    if (groupError) return fail("Project tidak dapat diverifikasi.", 503);
    if (!group) return fail("Kode kelompok tidak ditemukan.", 404);
    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("is_active")
      .eq("id", group.project_id)
      .maybeSingle();
    if (projectError) return fail("Project tidak dapat diverifikasi.", 503);
    if (!project || project.is_active === false) {
      return fail("Project telah diarsipkan. Jawaban yang tersimpan tetap aman, tetapi pengerjaan baru/perubahan dinonaktifkan.", 403);
    }
  }


  // Periksa batas percobaan kode kelompok sebelum mencari kelompok.
  if (parsed.data.op === "get_group") {
    const {
      data: badCodeAllowed,
      error: badCodeError,
    } = await checkLimit("bad-code", keyHash, 30, false);

    if (badCodeError) {
      console.error("Bad-code limit check failed:", badCodeError.message);
      return fail("Layanan sedang bermasalah. Coba lagi nanti.", 503);
    }

    if (badCodeAllowed !== true) {
      return fail(
        "Terlalu banyak percobaan kode. Tunggu sebentar lalu coba lagi.",
        429
      );
    }
  }

  const { data, error } = await admin.rpc(
    parsed.data.op,
    parsed.data.args as any
  );

  if (error) {
    console.error("Student RPC failed:", parsed.data.op, error.message);
    const normalized = error.message.toLocaleLowerCase("id-ID");
    if (normalized.includes("proyek diarsipkan")) {
      return fail("Proyek ini diarsipkan. Jawaban yang tersimpan tetap aman; minta guru mengaktifkan kembali proyek untuk melanjutkan.", 403);
    }
    if (normalized.includes("submission_video_already_pinned")) {
      return fail("Kelompok sudah memulai pengerjaan pada video tertentu. Lanjutkan video yang sama agar jawaban tetap terhubung ke video penugasan yang benar.", 409);
    }
    if (normalized.includes("video ini tidak ditugaskan") || normalized.includes("tidak ditugaskan kepada kelompok")) {
      return fail("Video ini tidak ditugaskan kepada kelompok kalian. Hubungi guru jika penugasan seharusnya tersedia.", 403);
    }
    if (normalized.includes("pengerjaan sudah terkirim")) {
      return fail("Pengerjaan sudah terkirim dan terkunci. Minta guru membuka kembali jika perlu mengubah jawaban.", 409);
    }
    return fail("Terjadi kesalahan. Silakan coba lagi.", 500);
  }

  // Hanya kode kelompok yang tidak ditemukan yang dihitung
  // sebagai percobaan kode salah.
  if (parsed.data.op === "get_group" && !data) {
    const {
      data: countAllowed,
      error: countError,
    } = await checkLimit("bad-code", keyHash, 30, true);

    if (countError) {
      console.error("Bad-code counter failed:", countError.message);
      return fail("Layanan sedang bermasalah. Coba lagi nanti.", 503);
    }

    if (countAllowed !== true) {
      return fail(
        "Terlalu banyak percobaan kode. Tunggu sebentar lalu coba lagi.",
        429
      );
    }
  }

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } }
  );
}
