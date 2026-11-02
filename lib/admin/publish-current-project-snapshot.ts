import { sb } from "@/lib/supabase";

/**
 * Publishes a fresh immutable snapshot after a teacher changes video content
 * or group assignments. Existing submissions remain pinned to their original
 * project_version_id and video_id.
 */
export async function publishCurrentProjectSnapshot(projectId: string): Promise<void> {
  const { data: versionId, error: draftError } = await sb.rpc(
    "admin_save_project_version_draft",
    { p_project_id: projectId },
  );

  if (draftError || !versionId) {
    throw new Error(draftError?.message || "Snapshot materi gagal disiapkan.");
  }

  const { data: draft, error: readError } = await sb
    .from("project_versions")
    .select("updated_at")
    .eq("id", versionId)
    .eq("project_id", projectId)
    .eq("status", "draft")
    .maybeSingle();

  if (readError || !draft?.updated_at) {
    throw new Error(readError?.message || "Snapshot materi tidak dapat dibaca untuk validasi.");
  }

  const { data: validation, error: validationError } = await sb.rpc(
    "admin_validate_project_version",
    { p_project_id: projectId, p_version_id: versionId },
  );

  if (validationError) {
    throw new Error(validationError.message || "Validasi snapshot materi gagal.");
  }

  const result = validation as { valid?: boolean; errors?: string[] } | null;
  if (!result?.valid) {
    const details = Array.isArray(result?.errors) ? result.errors.join(" ") : "";
    throw new Error(details || "Snapshot materi belum memenuhi validasi.");
  }

  const { error: publishError } = await sb.rpc(
    "admin_publish_project_version",
    {
      p_project_id: projectId,
      p_version_id: versionId,
      p_expected_updated_at: draft.updated_at,
    },
  );

  if (publishError) {
    throw new Error(publishError.message || "Snapshot materi gagal diterbitkan.");
  }
}
