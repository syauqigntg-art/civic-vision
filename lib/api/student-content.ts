export type StudentContentOperation =
  | "list_videos"
  | "video_detail"
  | "questions_for_video";

export async function studentContent(
  op: StudentContentOperation,
  args: { code: string; vid?: string }
): Promise<{ data: any; error: { message: string } | null }> {
  try {
    const response = await fetch("/api/student-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ op, args }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: { message: result.error || "Konten tidak dapat dimuat." },
      };
    }

    return { data: result.data ?? null, error: null };
  } catch {
    return {
      data: null,
      error: { message: "Tidak dapat terhubung. Periksa koneksi internet." },
    };
  }
}
