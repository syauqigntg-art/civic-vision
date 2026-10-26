import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const student = read("../app/api/student/route.ts");
const studentContent = read("../app/api/student-content/route.ts");
const autosave = read("../hooks/useAutosave.ts");
const editor = read("../app/admin/questions/page.tsx");
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
assert.match(answerSaveMigration, /CREATE OR REPLACE FUNCTION public\\.save_answer\\(code text, qid uuid, val text\\)/, "Autosave migration defines the expected RPC");
assert.match(submitGroupMigration, /CREATE OR REPLACE FUNCTION public\\.submit_group\\(code text\\)/, "Submit migration defines the expected RPC");
for (const [name, sql] of [
  ["save_answer", answerSaveMigration],
  ["submit_group", submitGroupMigration],
]) {
  assert.match(sql, /SECURITY DEFINER/, `${name} runs with controlled database privileges`);
  assert.match(sql, /SET search_path = ''/, `${name} uses an empty search_path`);
  assert.match(
    sql,
    /FROM public\\.submissions AS s[\\s\\S]*?WHERE s\\.group_id = v_group_id\\s+AND s\\.project_id = v_project_id\\s+FOR UPDATE;/,
    `${name} locks the submission row for the same group and project`,
  );
  assert.match(sql, /REVOKE ALL ON FUNCTION public\\./, `${name} revokes default function execution`);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\\.[\\s\\S]*?TO service_role;/, `${name} grants execution only to the server role`);
}
assert.match(answerSaveMigration, /v_submission_status IS DISTINCT FROM 'draft'/, "Autosave rejects writes unless the submission remains a draft");
assert.match(submitGroupMigration, /SET status = 'submitted'[\\s\\S]*?WHERE id = v_submission_id\\s+AND status = 'draft'/, "Submit transitions only a draft submission");
console.log("CIVIC VISION PBL/security source invariants: PASS");
