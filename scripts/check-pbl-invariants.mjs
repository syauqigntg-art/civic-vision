import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
assert.match(deletionMigration, /RETURN 'deactivated'/, "Historical pre-hard-delete migration remains documented");
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

const hardDeleteMigration = read("../supabase/migrations/20261027230000_admin_question_hard_delete_archive_guard.sql");
const adminLayout = read("../app/admin/layout.tsx");
const adminPanel = read("../app/admin/Panel.tsx");
const studentResults = read("../app/lkpd/hasil/page.tsx");
const retiredVersionsPage = read("../app/admin/versions/page.tsx");
const adminHook = read("../hooks/useAdmin.ts");

// Product direction: use the selected project's live content directly and retire
// the snapshot/version workflow. These source checks do not replace runtime tests.
assert.match(studentContent, /from\("questions"\)/, "Student content reads questions from the selected project");
assert.match(studentContent, /from\("videos"\)/, "Student content reads assigned videos from the selected project");
assert.match(studentContent, /question_options\(\*\)/, "Student content loads current answer options");
assert.doesNotMatch(studentContent, /project_versions|active_version_id|project_version_id/, "Student content does not require versioning schema");
assert.doesNotMatch(submissionHistory, /project_versions|active_version_id|project_version_id|Versi LKPD|snapshot/i, "Teacher results do not require or present project versions");
assert.match(submissionHistory, /toXlsx\(exportRows\(\)/, "Teacher results can export live question answers to Excel");
assert.doesNotMatch(adminLayout, /\/admin\/versions|Versi Proyek & LKPD/, "Version workflow is removed from teacher navigation");
assert.doesNotMatch(adminPanel, /Versi Proyek & LKPD|snapshot LKPD|versi baru diterbitkan/i, "Project administration no longer instructs teachers to publish versions");
assert.match(retiredVersionsPage, /redirect\("\/admin"\)/, "Old version route redirects to the admin summary");
assert.doesNotMatch(studentResults, /project_version_number|Versi LKPD/, "Student result page does not expose project version labels");
assert.match(editor, /backup Excel|ekspor hasil ke Excel/i, "Permanent delete exports affected answers before confirmation");
assert.match(editor, /await toXlsx\(backupRows,/, "Permanent deletion waits for the Excel backup to finish before confirmation");
assert.match(editor, /\.range\(offset, offset \+ pageSize - 1\)/, "Question backup paginates through the full answer set");
assert.match(editor, /Hapus permanen/, "Question editor exposes permanent deletion");
assert.match(hardDeleteMigration, /CREATE OR REPLACE FUNCTION public\.admin_delete_question\(p_id uuid, p_project_id uuid\)[\s\S]*?SECURITY DEFINER[\s\S]*?private\.is_admin\(\)/, "Hard-delete RPC validates admin identity");
assert.match(hardDeleteMigration, /DELETE FROM public\.answers[\s\S]*?DELETE FROM public\.question_options[\s\S]*?DELETE FROM public\.questions/i, "Hard delete removes answer, option, and question rows in one transaction");
assert.match(hardDeleteMigration, /current_setting\('civic_vision\.admin_question_hard_delete', true\)[\s\S]*?current_user = \([\s\S]*?admin_delete_question\(uuid,uuid\)/, "Archive bypass is scoped to the admin hard-delete RPC");
assert.match(hardDeleteMigration, /CREATE OR REPLACE FUNCTION public\.reject_archived_project_write\(\)/, "Archive guard is preserved");
assert.match(hardDeleteMigration, /DROP TRIGGER IF EXISTS questions_published_version_delete_guard/i, "Version-specific question guard is safely removed when present");
assert.doesNotMatch(hardDeleteMigration, /UPDATE public\.project_versions|DELETE FROM public\.project_versions|admin_publish_project_version|admin_save_project_version_draft/i, "Hard-delete RPC does not require or mutate project versions");
assert.match(permanentDeleteRegressionSql, /target options\/answers remain/, "SQL test checks deleted answer and option rows");
assert.match(permanentDeleteRegressionSql, /forced failure rolls back question, options, and answers/, "SQL test checks atomic rollback");
assert.match(permanentDeleteRegressionSql, /non-admin is rejected with admin_required/, "SQL test rejects non-admin deletion");
assert.match(permanentDeleteRegressionSql, /cross-project deletion is rejected/, "SQL test blocks cross-project deletion");
assert.match(permanentDeleteRegressionSql, /archived RPC cleanup removes only target question data/, "SQL test permits scoped admin cleanup and retains the submission");
assert.match(permanentDeleteRegressionSql, /ROLLBACK;/, "Hard-delete fixture suite rolls synthetic data back");
assert.doesNotMatch(adminHook, /is\("deleted_at", null\)/, "Admin question list does not depend on logical-delete state");

console.log("CIVIC VISION PBL/live-content/hard-delete source invariants: PASS");
