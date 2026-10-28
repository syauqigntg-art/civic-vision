import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const student = read("../app/api/student/route.ts");
const studentContent = read("../app/api/student-content/route.ts");
const autosave = read("../hooks/useAutosave.ts");
const editor = read("../app/admin/questions/page.tsx");
const submissionHistory = read("../app/admin/submissions/page.tsx");
const permanentDeleteRegressionSql = read("../supabase/tests/admin-question-hard-delete-no-versioning.sql");
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
assert.match(editor, /await toXlsx\(exportRows, "salinan-jawaban-soal-"/, "Deleting a question exports its answers to Excel first");
assert.doesNotMatch(editor, /question_has_answers_create_new_version|question_has_unversioned_answers|Versi Proyek & LKPD|snapshot/i, "Question editor no longer depends on project versioning");
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

const adminLayout = read("../app/admin/layout.tsx");
const projectPanel = read("../app/admin/Panel.tsx");
const studentResults = read("../app/lkpd/hasil/page.tsx");
const liveHardDeleteMigration = read("../supabase/migrations/20261027230000_admin_question_hard_delete_archive_guard.sql");

assert.doesNotMatch(adminLayout, /\/admin\/versions|Versi Proyek & LKPD/, "Project version management is removed from admin navigation");
assert.doesNotMatch(projectPanel, /Versi Proyek & LKPD|snapshot LKPD|terbitkan versi baru/i, "Project editing no longer directs teachers to publish versions");
assert.equal(
  existsSync(new URL("../app/admin/versions/page.tsx", import.meta.url)),
  false,
  "Project version management route is removed",
);
assert.match(studentContent, /\.from\("questions"\)/, "Student content is read from the live questions table");
assert.match(studentContent, /\.from\("videos"\)/, "Student content is read from the live videos table");
assert.match(studentContent, /\.from\("group_videos"\)/, "Student content remains scoped to assigned videos");
assert.doesNotMatch(studentContent, /project_versions|active_version_id|project_version_id|admin_save_project_version|admin_publish_project_version/i, "Student content has no project-version database dependency");
assert.doesNotMatch(submissionHistory, /project_version_id|project_version_number|pvs|Versi LKPD|snapshotMissing/i, "Teacher results use current project questions/videos and no version labels");
assert.doesNotMatch(studentResults, /project_version_number|Versi LKPD|snapshot/i, "Student results do not depend on project versions");

assert.match(liveHardDeleteMigration, /SECURITY DEFINER[\s\S]*?private\.is_admin\(\)/, "Hard-delete RPC validates the admin and uses controlled privileges");
assert.match(liveHardDeleteMigration, /SET search_path = ''/, "Hard-delete RPC has a fixed empty search path");
assert.match(liveHardDeleteMigration, /DELETE FROM public\.answers[\s\S]*?DELETE FROM public\.question_options[\s\S]*?DELETE FROM public\.questions/i, "Hard-delete removes answers, options, then the question in one transaction");
assert.match(liveHardDeleteMigration, /civic_vision\.admin_question_hard_delete/, "Hard delete uses a scoped trigger bypass for archive guards");
assert.doesNotMatch(liveHardDeleteMigration, /FROM public\.project_versions|UPDATE public\.project_versions|DELETE FROM public\.project_versions|admin_publish_project_version|admin_save_project_version_draft/i, "Hard-delete migration does not depend on project-version tables or RPCs");
assert.match(editor, /await toXlsx\(exportRows, "salinan-jawaban-soal-"/, "Excel backup runs before the delete RPC");
assert.ok(
  editor.indexOf("await toXlsx(exportRows") < editor.indexOf('sb.rpc("admin_delete_question"'),
  "Question answers are exported before permanent deletion is requested",
);
assert.match(editor, /seluruh jawaban|semua jawaban terkait|jawaban terkait akan dihapus permanen/i, "Delete confirmation warns that related answers will be permanently removed");
assert.match(permanentDeleteRegressionSql, /admin_delete_question/, "Pre-versioning SQL regression exercises the hard-delete RPC");
assert.match(permanentDeleteRegressionSql, /ROLLBACK;/, "Hard-delete SQL regression rolls all synthetic fixtures back");
assert.match(permanentDeleteRegressionSql, /forced failure rolls back question, options, and answers/i, "Hard-delete regression verifies atomic rollback");
assert.match(permanentDeleteRegressionSql, /non-admin is rejected/i, "Hard-delete regression denies non-admin callers");
assert.match(permanentDeleteRegressionSql, /cross-project deletion is rejected/i, "Hard-delete regression rejects cross-project deletion");
assert.match(permanentDeleteRegressionSql, /archived RPC cleanup/i, "Hard-delete regression covers admin cleanup while ordinary archived writes remain blocked");

console.log("CIVIC VISION live-content and permanent-question-deletion invariants: PASS");
