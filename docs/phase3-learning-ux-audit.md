# CIVIC VISION — Tahap 3: Audit UX belajar dan cakupan tes

Last checked: 2026-10-23 (Asia/Jakarta). Source-based review of branch `phase3/pbl-ux-testing`; browser/runtime behavior has not been assumed.

## Scope and evidence rules

This audit reads the current teacher/student pages, request schemas, answer helpers, autosave hook, and CI workflow. It is not a browser usability study. Items below are labeled **observed in source**, **unit-tested**, or **pending runtime** so that source inspection cannot be mistaken for proof that a deployment works.

## 3A — Peta alur pengguna saat ini

### Guru
1. Opens the admin area and selects a project.
2. Manages videos, assigned groups, and questions for that project.
3. In the question editor, filters by phase/status, previews the student question form, sets required/active state, and orders questions.
4. Saves question content/options through `admin_save_question`; guarded deletion and ordering use `admin_delete_question` and `admin_reorder_questions`.
5. Reviews group/submission results through the available admin views.

Observed gaps for follow-up: the active/inactive toggle uses a direct Supabase `questions.update()` call, unlike transactional save/delete/reorder; RLS still applies, but the UX/error handling should be evaluated for consistency. Whether an admin can reopen a submitted assignment is not confirmed as an implemented action/RPC and must not be presented as an existing capability.

### Siswa
1. Enters the group access code; `get_group` resolves the group/project and the identity screen captures group/class/leader information.
2. Opens the assigned video list; the API checks group assignment and project scope.
3. Opens a video and completes SEE observation questions when the project has active SEE questions.
4. Continues to the analysis route for THINK, CONNECT, and ACT.
5. Required questions are checked before moving to the next phase. The client flushes pending autosave and refuses to advance when answers remain unsaved.
6. Before final submit, the client checks required answers across the phases, flushes queued answers, asks for confirmation, and calls `submit_group`.
7. The user is routed to the results view after the server reports successful submission.

## 3A/3B — Prioritized UX findings

### P1 — Recovery path on load errors
- **Observed in source:** the video detail route has an error state with a link back to the cases list. The analysis route's `view === "err"` state shows an alert but offers no explicit retry or back-to-video action.
- **Impact:** on transient connection/server failures, a student may not know how to recover without refreshing the browser.
- **Acceptance criteria:** error text stays visible; provide an explicit retry action (re-run the load request) and a safe back action; disable duplicate retries while loading; do not clear draft/local pending answers.
- **Runtime status:** pending.

### P1 — Validate stored answer shape before rendering progress
- **Observed in source:** older `parse()` directly returned any valid JSON value for `multiple_text` and `multi_select`; `filled()` could call array methods on an object/scalar or call `.trim()` on non-string items.
- **Change on this branch:** parsing now treats non-array JSON and malformed JSON as empty arrays and filters structured entries to strings; `filled()` and `show()` handle the resulting shape defensively.
- **Acceptance criteria:** malformed/legacy draft values do not crash progress/results; malformed values cannot satisfy required-answer validation; valid text/selection values behave the same.
- **Unit tests:** added in `scripts/pbl-ux-validation.test.mjs`; pending first CI result on this branch.

### P2 — Align answer input limits with server behavior
- **Observed in source:** `save_answer` request validation and the server RPC cap a serialized answer at 5,000 characters, but the text/textarea controls do not visibly communicate this limit.
- **Impact:** students can type a value that the server rejects with only a generic save failure.
- **Acceptance criteria:** decide whether to limit by character count in the input or show a live character count; preserve the user's text and display an explicit error if the server rejects it.
- **Runtime status:** pending; no behavior change applied as part of the initial audit.

### P2 — Retry on student case-list failures
- **Observed in source:** the cases list has a distinct loading and error state, but errors are presented without a retry button.
- **Acceptance criteria:** retry re-fetches assignment and group status; empty assignments remain a separate non-error state.
- **Runtime status:** pending.

### P2 — Identity save interaction feedback
- **Observed in source:** identity fields are validated and errors use `role=alert`, but the save action has no explicit busy/disabled state.
- **Acceptance criteria:** show saving state, prevent duplicate submissions while in-flight, preserve entered data on error, and avoid displaying success before the API confirms it.
- **Runtime status:** pending.

### P3 — Phase consistency and teacher clarity
- **Observed in source:** the four phases are represented consistently in the phase bar and question editor. Questions with no phase are routed to THINK in the student analysis page; the teacher UI already warns about active questions without a phase.
- **Acceptance criteria:** keep that routing explicit in teacher guidance; verify every phase has a clear outcome and empty-state message. Do not require all four phases to have questions unless the learning design specifies this.
- **Runtime status:** source inspection only.

## 3C — Automated checks now added

The branch adds dependency-free Node test-runner cases against the actual Zod request/form schemas and the answer helper functions:
- whitespace-only text is not considered filled;
- multiple-text required counts count only non-empty strings;
- malformed JSON, wrong-shaped JSON, and non-string entries do not throw or count as completed;
- multiselect requires a non-empty string choice;
- options remain in display order without mutating the source list;
- category ordering is stable/unique;
- student RPC/content request schemas validate operation, access-code, UUID, answer-length, and path-traversal boundaries;
- video/question form schemas reject invalid required fields, phase, order, and length.

This is not an integration test of the Supabase RPC, browser, or concurrent transactions. It should run with `npm run test:unit` and be included in GitHub Actions. The test uses Node's TypeScript type-stripping support on Node 24, so the first CI run will verify the invocation.

## 3D — Teacher content and release acceptance

- The question editor supports SEE/THINK/CONNECT/ACT, required/optional, active/inactive status, options, display order, filters, and a student-style preview in source.
- The video editor and group editor exist in the current app, but their complete UX behavior still requires browser coverage.
- The current review did not verify that a teacher reopen-submission workflow exists. Treat that as **unknown/not confirmed**, not passed.
- Realistic learning-material examples should require students to separate observation/facts (SEE), causes/evidence (THINK), relevant social-science/civic concepts (CONNECT), and a feasible action with roles/success indicators (ACT).

## Remaining gates

1. CI on this branch must pass the new unit tests and existing build/audit checks.
2. Run full dependency-tree audit and review the remaining 7 advisories (2 moderate, 5 high); the production-only audit does not include that result.
3. Keep database-writing student tests blocked until Vercel deployment SHA and Preview environment have been verified to use Supabase staging.
4. Do not run `supabase db push` until the staging migration ledger is reconciled.
5. Keep PR #6 Draft and do not merge/release to Production while runtime and remaining dependency review is open.
