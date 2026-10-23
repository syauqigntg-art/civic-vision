export type AnalysisQuestion = { id: string; [key: string]: unknown };
export type StoredAnswers = Record<string, string>;

type ApiResult<T> = { data: T | null; error: { message: string } | null };

type GroupSnapshot = {
  id?: string;
  submission?: { status?: string | null } | null;
};

export type AnalysisSnapshotOutcome =
  | { kind: "missing-code" }
  | { kind: "missing-group" }
  | { kind: "failed"; message: string }
  | {
      kind: "ready";
      questions: AnalysisQuestion[];
      answers: StoredAnswers;
      isSubmitted: boolean;
      shouldFlushPending: boolean;
    };

const FALLBACK_ERROR =
  "LKPD tidak dapat dimuat. Periksa koneksi lalu coba kembali.";

/**
 * Read-only load orchestration for the analysis page. Draft local edits take
 * precedence over older server answers. After submission, server answers are
 * authoritative and queued browser edits must never be resurrected.
 */
export async function loadAnalysisSnapshot(input: {
  code: string | null | undefined;
  videoId: string;
  pending: StoredAnswers;
  fetchQuestions: (code: string, videoId: string) => Promise<ApiResult<AnalysisQuestion[]>>;
  getAnswers: (code: string) => Promise<ApiResult<StoredAnswers>>;
  getGroup: (code: string) => Promise<ApiResult<GroupSnapshot>>;
}): Promise<AnalysisSnapshotOutcome> {
  if (!input.code?.trim()) return { kind: "missing-code" };

  try {
    const [questionResult, answerResult, groupResult] = await Promise.all([
      input.fetchQuestions(input.code, input.videoId),
      input.getAnswers(input.code),
      input.getGroup(input.code),
    ]);

    const error =
      questionResult.error?.message ||
      answerResult.error?.message ||
      groupResult.error?.message;
    if (error) return { kind: "failed", message: error };

    if (!groupResult.data?.id) return { kind: "missing-group" };

    const isSubmitted = groupResult.data.submission?.status === "submitted";
    const serverAnswers = answerResult.data || {};
    const queued = input.pending || {};
    const hasPending = Object.keys(queued).length > 0;

    return {
      kind: "ready",
      questions: questionResult.data || [],
      answers: isSubmitted ? serverAnswers : { ...serverAnswers, ...queued },
      isSubmitted,
      shouldFlushPending: !isSubmitted && hasPending,
    };
  } catch {
    return { kind: "failed", message: FALLBACK_ERROR };
  }
}
