import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const student = read("../app/api/student/route.ts");
const studentContent = read("../app/api/student-content/route.ts");
const autosave = read("../hooks/useAutosave.ts");
const editor = read("../app/admin/questions/page.tsx");
const submissionHistory = read("../app/admin/submissions/page.tsx");
const phaseBar = read("../components/lkpd/PhaseBar.tsx");
const analysis = read("../app/lkpd/kasus/[id]/analisis/page.tsx");
const cases = read("../app/lkpd/kasus/page.tsx");
const identity = read("../app/lkpd/identitas/page.tsx");
const identityController = read("../lib/utils/identity-save-controller.ts");
const caseLoader = read("../lib/student/load-case-list.ts");
const analysisLoader = read("../lib/student/load-analysis-snapshot.ts");
const helperMigration = read("../supabase/migrations/20261022152719_secure_admin_helper_and_transactional_question_editor.sql");
const deletionMigration = read("../supabase/migrations/20261022153005_add_safe_question_deletion_rpc.sql");
const orderMigration = read("../supabase/migrations/20261022153051_add_transactional_question_order_and_delete.sql");
const answerSaveMigration = read("../supabase/migrations/20261023010223_serialize_answer_saves_with_submission.sql");
const submitGroupMigration = read("../supabase/migrations/20261023030000_serialize_submit_group_with_answer_saves.sql");

assert.match(student, /studentOp\.safeParse\(body\)/, "Student API validates operations");
assert.match(student, /checkLimit\(\s*"student"/, "Student API uses a request limit");
assert.match(student, /parsed\.data\.op === "get_group"/, "Student API checks invalid group-code attempts");
assert.match(studentContent, /studentContentReq\.safeParse\(body\)/, "Student content API validates requests");
assert.match(studentContent, /\.eq\("group_id", group\.id\)/, "Assigned content is scoped to a group");
assert.match(studentContent, /\.eq\("project_id", projectId\)/, "Assigned content is scoped to a project");
assert.match(autosave, /flushPromise\.current/, "Autosave shares an in-flight flush promise");
assert.match(autosave, /persist\(\)/, "Autosave persists pending values");
assert.match(autosave, /result\.data !== true/, "Autosave checks server acceptance");
assert.match(editor, /admin_save_question/, "Editor uses transactional save");
assert.match(editor, /admin_delete_question/, "Editor uses guarded deletion");
assert.match(editor, /admin_reorder_questions/, "Editor uses transactional reorder");
assert.match(editor, /Pratinjau tampilan siswa/, "Editor shows student preview");
assert.match(editor, /PBL_PHASES/, "Editor presents phase guidance");
assert.match(editor, /question_has_answers_create_new_version/, "Answered questions are protected from semantic edits");
assert.doesNotMatch(editor, /from\("question_options"\)\.delete\(\)/, "Options are not deleted through a separate client call");
assert.match(phaseBar, /see.*think.*connect.*act/s, "Phase navigation preserves all four phases");
assert.match(analysis, /Hasil yang diharapkan/, "Student page explains phase outcomes");
assert.match(analysis, /Belum ada pertanyaan aktif pada fase/, "Empty phases are explained");
assert.match(analysis, /Coba lagi/, "Analysis load errors expose an explicit retry action");
assert.match(analysis, /onClick=\{\(\) => void load\(\)\}/, "Analysis retry invokes the tested loader");
assert.match(analysis, /loadAnalysisSnapshot/, "Analysis page uses the testable snapshot loader");
assert.match(analysis, /pendingAtLoad\.current === null/, "Analysis retry preserves the initially loaded pending queue");
assert.match(analysisLoader, /input\.pending/, "Analysis snapshot receives queued draft values");
assert.match(analysis, /Kembali ke video/, "Analysis load errors expose a safe back action");
assert.match(cases, /Coba lagi/, "Case list errors expose an explicit retry action");
assert.match(cases, /onClick=\{\(\) => void load\(\)\}/, "Case-list retry invokes the tested loader");
assert.match(cases, /loadStudentCaseList/, "Case list page uses the testable loader");
assert.match(caseLoader, /kind: "loaded"/, "Case list distinguishes a valid empty/success result from an error");
assert.match(cases, /Kembali ke identitas/, "Case list errors expose a safe identity path");
assert.match(identity, /createIdentitySaveController/, "Identity page uses the single-flight save controller");
assert.match(identity, /disabled=\{saving\}/, "Identity save button reflects the in-flight state");
assert.match(identityController, /if \(pending\) return \{ kind: "busy" \}/, "Identity controller prevents duplicate in-flight requests");
assert.match(identityController, /finally \{\s*pending = false/s, "Identity controller releases the in-flight gate after failures");
assert.match(helperMigration, /CREATE OR REPLACE FUNCTION private\.is_admin\(\)/, "Admin helper lives in private schema");
assert.match(helperMigration, /DROP FUNCTION IF EXISTS public\.is_admin\(\)/, "Old public helper is removed");
assert.match(helperMigration, /question_has_answers_create_new_version/, "SQL protects existing response meaning");
assert.match(deletionMigration, /RETURN 'deactivated'/, "Answered questions are deactivated");
assert.match(orderMigration, /invalid_question_order/, "Question order input is validated");

// Source-level guardrails for the P0 autosave/submit serialization protocol.
// These checks catch accidental migration edits; they do not replace a staging
// database concurrency test against the exact deployed functions.
assert.match(answerSaveMigration, /CREATE OR REPLACE FUNCTION public\.save_answer\(code text, qid uuid, val text\)/, "Autosave migration defines the expected RPC");
assert.match(submitGroupMigration, /CREATE OR REPLACE FUNCTION public\.submit_group\(code text\)/, "Submit migration defines the expected RPC");
for (const [name, sql] of [
  ["save_answer", answerSaveMigration],
  ["submit_group", submitGroupMigration],
]) {
  assert.match(sql, /SECURITY DEFINER/, `${name} runs with controlled database privileges`);
  assert.match(sql, /SET search_path = ''/, `${name} uses an empty search_path`);
  assert.match(
    sql,
    /FROM public\.submissions AS s[\s\S]*?WHERE s\.group_id = v_group_id\s+AND s\.project_id = v_project_id\s+FOR UPDATE;/,
    `${name} locks the submission row for the same group and project`,
  );
  assert.match(sql, /REVOKE ALL ON FUNCTION public\./, `${name} revokes default function execution`);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.[\s\S]*?TO service_role;/, `${name} grants execution only to the server role`);
}
assert.match(answerSaveMigration, /v_submission_status IS DISTINCT FROM 'draft'/, "Autosave rejects writes unless the submission remains a draft");
assert.match(submitGroupMigration, /SET status = 'submitted'[\s\S]*?WHERE id = v_submission_id\s+AND status = 'draft'/, "Submit transitions only a draft submission");

const versioningMigration = read("../supabase/migrations/20261026090535_add_project_content_versioning.sql");
const versioningCasMigration = read("../supabase/migrations/20261026093943_version_publish_compare_and_swap.sql");
const versioningSecurityTest = read("../supabase/p1-versioning-security-test.sql");
const versioningV1V2Test = read("../supabase/p1-versioning-v1-v2-integration-test.sql");
const versionManager = read("../app/admin/versions/page.tsx");
const submissionResults = read("../app/admin/submissions/page.tsx");
const studentResults = read("../app/lkpd/hasil/page.tsx");
const videoAdmin = read("../app/admin/videos/page.tsx");

// Project/LKPD publication invariants. These are source-level guards; the
// migration still requires a reviewed database migration and runtime tests.
assert.match(versioningMigration, /CREATE TABLE public\.project_versions/, "Version history has a dedicated table");
assert.match(versioningMigration, /ADD COLUMN active_version_id uuid/, "Projects reference the active published snapshot");
assert.match(versioningMigration, /ADD COLUMN project_version_id uuid/, "Submissions pin a specific project version");
assert.match(versioningMigration, /INSERT INTO public\.project_versions[\s\S]*?SELECT p\.id, 1, 'published'/, "Existing projects receive a baseline published snapshot");
assert.match(versioningMigration, /UPDATE public\.submissions[\s\S]*?SET project_version_id = p\.active_version_id/, "Existing submissions are backfilled to their baseline version");
assert.match(versioningMigration, /published_project_version_is_immutable/, "Published snapshots cannot be edited or deleted");
assert.match(versioningMigration, /admin_save_project_version_draft/, "Database exposes draft snapshot workflow");
assert.match(versioningMigration, /admin_validate_project_version/, "Database exposes server-side version validation");
assert.match(versioningMigration, /admin_publish_project_version/, "Database exposes server-side publication");
assert.match(versioningMigration, /REVOKE ALL ON TABLE public\.project_versions FROM PUBLIC, anon, authenticated, service_role;[\s\S]*?GRANT SELECT ON TABLE public\.project_versions TO authenticated;[\s\S]*?GRANT SELECT ON TABLE public\.project_versions TO service_role;/, "Direct version table writes are revoked from authenticated sessions");
assert.doesNotMatch(versioningMigration, /GRANT SELECT, INSERT, UPDATE ON TABLE public\.project_versions TO authenticated/, "Authenticated sessions cannot directly create or mutate version rows");
const draftRpcDefinition = versioningMigration.split("CREATE OR REPLACE FUNCTION public.admin_save_project_version_draft(p_project_id uuid)")[1]?.split("$function$;")[0] ?? "";
const publishRpcDefinition = versioningMigration.split("CREATE OR REPLACE FUNCTION public.admin_publish_project_version(")[1]?.split("$function$;")[0] ?? "";
assert.match(draftRpcDefinition, /SECURITY DEFINER[\s\S]*?SET search_path = ''/, "Draft writes are mediated by a fixed-search-path SECURITY DEFINER RPC");
assert.match(publishRpcDefinition, /SECURITY DEFINER[\s\S]*?SET search_path = ''/, "Publication writes are mediated by a fixed-search-path SECURITY DEFINER RPC");
assert.match(versioningMigration, /CREATE OR REPLACE FUNCTION private\.guard_active_project_version_pointer\(\)[\s\S]*?active_project_version_must_use_publish_rpc[\s\S]*?active_project_version_must_be_published_for_project/, "Active version pointer only moves through the official publication RPC to a same-project published version");
assert.match(versioningMigration, /CREATE TRIGGER projects_active_version_publish_guard[\s\S]*?BEFORE UPDATE OF active_version_id ON public\.projects/, "Project active-version pointer guard is installed");
assert.match(versioningCasMigration, /ALTER COLUMN project_id SET NOT NULL/, "Submission project_id is required so composite FKs cannot be bypassed with NULL");
assert.match(versioningCasMigration, /project_version_validation_stale/, "Publication rejects a draft modified after validation");
assert.match(versioningCasMigration, /p_expected_updated_at timestamptz/, "Publication RPC requires the validated draft timestamp");
assert.match(versioningCasMigration, /updated_at = p_expected_updated_at/, "Publication uses compare-and-swap to ensure it publishes the validated snapshot");
assert.match(versioningCasMigration, /admin_publish_project_version\(uuid,uuid,timestamptz\)/, "Pointer guard resolves the CAS-protected publication RPC signature");
assert.match(versioningSecurityTest, /stale validated draft publication rejected/, "SQL integration test attempts to publish a stale validated draft");
assert.match(versioningV1V2Test, /Group A stayed on v1/i, "Integration test confirms existing Group A submission stays pinned to v1");
assert.match(versioningV1V2Test, /Group B used v2/i, "Integration test confirms new Group B submission pins to v2");
assert.match(versioningV1V2Test, /late autosave was rejected/i, "Integration test verifies late autosave after submit is rejected");
assert.match(versioningV1V2Test, /question_referenced_by_published_version_deactivate_instead/, "Integration test verifies published question cannot be physically deleted");
assert.match(versioningV1V2Test, /video_referenced_by_published_version_deactivate_instead/, "Integration test verifies published video cannot be physically deleted");
assert.match(versioningV1V2Test, /ROLLBACK;/, "V1/V2 integration test rolls all synthetic fixtures back");
assert.match(versionManager, /p_expected_updated_at: latestDraft\.updated_at/, "Admin UI sends the draft timestamp it checked to the publish RPC");
assert.match(versionManager, /project_version_validation_stale/, "Admin UI reports a stale-draft CAS rejection and asks for revalidation");
assert.match(versioningSecurityTest, /direct published INSERT was accepted/, "SQL negative test attempts to forge a published version");
assert.match(versioningSecurityTest, /direct project_versions UPDATE was accepted/, "SQL negative test attempts direct version mutation");
assert.match(versioningSecurityTest, /direct active_version_id change was accepted/, "SQL negative test attempts direct active-pointer mutation");
assert.match(versioningSecurityTest, /invalid draft publication was accepted/, "SQL negative test confirms invalid snapshots cannot be published");
assert.match(versioningSecurityTest, /active version changed after invalid publication/, "SQL negative test checks the active pointer remains stable after rejected publication");
assert.match(versioningMigration, /v_existing_content IS DISTINCT FROM v_content/, "Draft timestamps change only when the snapshot content changes");
assert.match(versionManager, /latestDraft\.updated_at !== draft\.updated_at/, "Publication requires revalidation when the working snapshot changed");
assert.match(versioningMigration, /INSERT INTO public\.submissions\(project_id, group_id, video_id, project_version_id\)/, "New submissions pin the active version");
assert.match(versioningMigration, /FOR UPDATE OF s/, "Versioned save/submit functions lock the submission row");
assert.match(versioningMigration, /jsonb_array_elements\(v_version_content->'questions'\)/, "Submit validation uses the submission's content snapshot");
assert.match(versioningMigration, /question_referenced_by_published_version_deactivate_instead/, "Published questions are protected against physical deletion");
assert.match(versioningMigration, /video_referenced_by_published_version_deactivate_instead/, "Published videos are protected against physical deletion");

assert.match(versionManager, /admin_save_project_version_draft/, "Admin UI can save a version draft");
assert.match(versionManager, /Pratinjau snapshot draft/, "Admin UI previews stored draft snapshot content");
assert.match(versionManager, /admin_validate_project_version/, "Admin UI invokes server validation");
assert.match(versionManager, /admin_publish_project_version/, "Admin UI publishes only after validation");
assert.match(versionManager, /VERSI AKTIF/, "Admin UI distinguishes current and historical versions");
assert.match(submissionResults, /project_version_id/, "Teacher result view loads each submission's pinned version");
assert.match(submissionResults, /Versi LKPD/, "Teacher result view displays and exports the version label");
assert.match(studentResults, /project_version_number/, "Student result page identifies its historical LKPD version");
assert.match(studentContent, /from\("project_versions"\)/, "Student content reads the published snapshot");
assert.doesNotMatch(studentContent, /from\("questions"\)/, "Student content does not read mutable live question rows");
assert.doesNotMatch(studentContent, /from\("videos"\)/, "Student content does not read mutable live video rows");
assert.match(videoAdmin, /update\(\{ is_active: false/, "Video removal archives working content instead of deleting historical media");
assert.doesNotMatch(videoAdmin, /storage\.from\("videos"\)\.remove\(paths\)/, "Video archive does not remove file storage needed by old snapshots");
assert.match(versionManager, /admin_save_project_version_draft[\s\S]*?admin_validate_project_version/, "Draft snapshot is refreshed before validation");
assert.match(versioningMigration, /FOR UPDATE OF p/, "Starting new work serializes with version publication");
assert.match(versioningMigration, /submission_video_already_pinned/, "A submission cannot silently switch to a different video");
assert.match(studentContent, /pinnedVideoId !== videoId/, "Existing submissions cannot switch to another video's content");
assert.match(studentContent, /assignedIds = new Set\(\[submission\.video_id\]\)/, "Existing work remains discoverable if live assignment changes");
console.log("CIVIC VISION PBL/security/versioning source invariants: PASS");


const questionVersionHotfix = read("../supabase/migrations/20261026112425_allow_versioned_question_edits.sql");
const questionVersionHotfixTest = read("../supabase/p1-question-versioning-hotfix-test.sql");
const versioningErrors = read("../lib/utils/versioning-error.ts");
assert.match(questionVersionHotfix, /private\.is_admin\(\)/, "Question edit hotfix retains the admin guard");
assert.match(questionVersionHotfix, /WHERE p\.id = p_project_id\s+FOR UPDATE/, "Question edits serialize with snapshot creation/publication on the project row");
assert.match(questionVersionHotfix, /project_archived/, "Question edit hotfix retains archived-project protection");
assert.match(questionVersionHotfix, /invalid_question_fields/, "Question edit hotfix retains payload validation");
assert.match(questionVersionHotfix, /duplicate_question_options/, "Question edit hotfix retains duplicate-option validation");
assert.match(questionVersionHotfix, /question_has_unversioned_answers/, "Question edits fail closed when any historical answer lacks snapshot coverage");
assert.match(questionVersionHotfix, /project_versions[\s\S]*?pv\.status = 'published'[\s\S]*?item\.value->>'id' = p_id::text/, "Question edits require published snapshots containing the answered question");
assert.doesNotMatch(questionVersionHotfix, /DELETE\s+FROM\s+public\.answers/i, "Question edit hotfix never deletes historical answers");
assert.match(questionVersionHotfix, /OR EXISTS \([\s\S]*?project_versions[\s\S]*?RETURN 'deactivated'/, "Question deletion archives content referenced by published snapshots");
assert.match(questionVersionHotfixTest, /resaving an unchanged draft created a duplicate/, "SQL regression covers resaving a draft");
assert.match(questionVersionHotfixTest, /question v1/i, "SQL regression preserves v1 historical question text");
assert.match(questionVersionHotfixTest, /v2 accepted a choice that exists only in v1/, "SQL regression validates new answers against v2 options");
assert.match(questionVersionHotfixTest, /stale validated draft was published/, "SQL regression covers stale publication rejection");
assert.match(questionVersionHotfixTest, /non-admin called admin_save_question/, "SQL regression preserves non-admin RPC denial");
assert.match(questionVersionHotfixTest, /non-admin called admin_delete_question/, "SQL regression preserves non-admin deletion denial");
assert.match(questionVersionHotfixTest, /ROLLBACK;/, "SQL regression rolls back synthetic fixtures");
assert.match(versioningErrors, /table_missing[\s\S]*table_schema_cache[\s\S]*rpc_unavailable[\s\S]*schema_cache_mismatch[\s\S]*permission[\s\S]*network/, "Versioning UI distinguishes database failure classes");
assert.match(submissionResults, /if \(!Array\.isArray\(snapshot\)\) return \[\];/, "Historical results fail closed when the pinned snapshot is unavailable");
assert.doesNotMatch(submissionResults, /Array\.isArray\(snapshot\) \? snapshot : qs/, "Historical results never fall back to mutable current questions");
assert.match(submissionResults, /s \? historicalVideo : vs\.find/, "Historical submissions never fall back to the current video row");


const adminHook = read("../hooks/useAdmin.ts");
const questionRemovalMigration = read("../supabase/migrations/20261027170000_admin_question_logical_delete_preserve_history.sql");
const permanentDeleteMigration = read("../supabase/migrations/20261027210000_admin_question_permanent_delete.sql");
assert.match(permanentDeleteMigration, /DELETE FROM public\.answers[\s\S]*?DELETE FROM public\.question_options[\s\S]*?DELETE FROM public\.questions/i, "Permanent deletion removes answers, options, then the question in one RPC transaction");
assert.match(permanentDeleteMigration, /private\.is_admin\(\)/, "Permanent deletion validates admin identity");
assert.match(permanentDeleteMigration, /WHERE q\.id = p_id\s+AND q\.project_id = p_project_id\s+FOR UPDATE/i, "Permanent deletion locks and scopes the question to the selected project");
assert.match(permanentDeleteMigration, /FROM public\.projects AS p[\s\S]*?WHERE p\.id = p_project_id\s+FOR UPDATE/i, "Permanent deletion locks the selected project");
assert.doesNotMatch(permanentDeleteMigration, /deleted_at|deactivated|already_deleted/i, "Permanent deletion does not use soft-delete state or deactivation results");
assert.doesNotMatch(permanentDeleteMigration, /UPDATE public\.project_versions|DELETE FROM public\.project_versions|admin_publish_project_version|admin_save_project_version_draft/i, "Permanent deletion never mutates or republishes snapshots");
assert.match(permanentDeleteMigration, /DROP TRIGGER IF EXISTS questions_published_version_delete_guard/i, "Question snapshot guard is removed without removing the video guard");
assert.match(permanentDeleteMigration, /TG_TABLE_NAME = 'videos'/i, "Published video deletion remains protected");
assert.doesNotMatch(permanentDeleteMigration, /project_archived/i, "Admin can permanently delete a question from an archived project");
assert.doesNotMatch(adminHook, /is\("deleted_at", null\)/, "Previously inactive/deactivated questions remain discoverable for cleanup");
assert.match(editor, /Hapus pertanyaan secara permanen/,"Delete confirmation explicitly describes permanent deletion");
assert.match(editor, /Snapshot LKPD lama tidak diubah/,"Delete confirmation says existing snapshots are not modified");
assert.match(editor, /setSuccessMessage\([\s\S]*?dihapus permanen/i, "UI only announces deletion after server confirmation");
assert.match(editor, /onClick=\{\(\) => del\(q\)\} disabled=\{saving\}/, "Delete remains available for archived projects and non-active questions");

assert.match(submissionHistory, /Jawaban tidak tersedia — pertanyaan ini telah dihapus permanen/, "Historical snapshot renders an explicit missing-answer state after permanent deletion");
assert.match(submissionHistory, /status pertanyaan saat ini tidak dapat diverifikasi/, "History lookup failures do not falsely claim an answer was deleted");
assert.match(submissionHistory, /answerFor\(q\.s, q\)|answerFor\(r\.s, q\)/, "Submission history and export use the missing-answer-aware renderer");
