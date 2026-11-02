export type CaseVideo = {
  id: string;
  number: number;
  title: string;
  category: string | null;
  thumbnail_url?: string | null;
};

type ApiResult<T> = { data: T | null; error: { message: string } | null };

export type CaseListOutcome =
  | { kind: "missing-code" }
  | { kind: "invalid-group" }
  | { kind: "failed"; message: string }
  | { kind: "loaded"; videos: CaseVideo[] };

const FALLBACK_ERROR =
  "Daftar video tidak dapat dimuat. Periksa koneksi dan coba kembali.";

/**
 * Load the student's assigned cases through injected read-only API functions.
 * Returning a discriminated result keeps network failure, an invalid group,
 * and a valid-but-empty assignment distinct for the UI and tests.
 */
export async function loadStudentCaseList(
  code: string | null | undefined,
  listVideos: (code: string) => Promise<ApiResult<CaseVideo[]>>,
  getGroup: (code: string) => Promise<ApiResult<{ id?: string }>>,
): Promise<CaseListOutcome> {
  if (!code?.trim()) return { kind: "missing-code" };

  try {
    const [videoResult, groupResult] = await Promise.all([
      listVideos(code),
      getGroup(code),
    ]);

    if (videoResult.error) {
      return { kind: "failed", message: videoResult.error.message || FALLBACK_ERROR };
    }

    if (groupResult.error || !groupResult.data?.id) {
      return { kind: "invalid-group" };
    }

    // The server endpoint is the source of truth for assignments and pinned
    // submissions. Filtering again against current group.video_ids here can
    // hide a video that an existing submission is required to keep using.
    return { kind: "loaded", videos: videoResult.data || [] };
  } catch {
    return { kind: "failed", message: FALLBACK_ERROR };
  }
}
