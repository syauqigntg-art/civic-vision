# Hotfix: Project Snapshot Diagnostics and Safe Question Editing

Status: **implementation in progress; not release-approved**. No Production writes or migrations were run during investigation.

## Read-only investigation (2026-10-26)

### Production target

- Supabase project: `civic-vision`
- Project ref: `pvjjboyfyvknmbdztylo`
- This is the Production project returned by the connected Supabase project inventory. No secret values were read.

Observed Production schema:
- `public.project_versions` is absent.
- `public.projects.active_version_id` is absent.
- `public.submissions.project_version_id` is absent; `submissions.project_id` is nullable in the current schema.
- The versioning RPCs `admin_save_project_version_draft`, `admin_validate_project_version`, and `admin_publish_project_version` are absent.
- The current `begin_submission`, `get_group`, and `submit_group` definitions still read mutable project/question rows and do not pin or validate against an immutable `project_versions.content` snapshot.
- Production migration ledger currently lists: `20261022151155`, `20261022151421`, `20261022152719`, `20261022153005`, `20261022153051`, and `20261023010223`. It does not record the three versioning migrations, and it does not record `20261023030000_serialize_submit_group_with_answer_saves.sql`. The actual function definitions must be reconciled against source before applying any missing migration.
- Read-only data preflight: 6 submissions, 18 answers, 0 submissions with null `project_id`, 0 invalid project links, 0 answers without a submission, 0 answers whose project does not match their submission/question, 0 invalid group links, and 0 invalid video links. These counts are a point-in-time check, not a backup.

### Staging target

- Supabase project: `civic-vision-staging`
- Project ref: `bneqqkvhehrlcjhvvyvv`
- Staging has `project_versions`, `projects.active_version_id`, `submissions.project_version_id`, and all three versioning RPCs.
- Its ledger records `20261026090535_add_project_content_versioning`, `20261026091333_add_project_version_fk_indexes`, and `20261026093943_version_publish_compare_and_swap`.
- Staging is currently empty outside synthetic tests. Its ledger has bootstrap-generated timestamps that differ from some repository migration filenames. As `docs/staging-setup.md` warns, do not use `supabase db push` blindly; reconcile the ledger and actual schema first.

## Root causes

1. The version dashboard collapses PostgREST/table, RPC, permission, and network failures into a generic message (and previously could report success even if the refresh failed). The Production catalog confirms the versioning schema and RPCs are not installed.
2. `admin_save_question` rejects semantic edits when a question has answers, even when each answer can be interpreted through an immutable published snapshot. Production's current definition has the `question_has_answers_create_new_version` guard.
3. The teacher result view previously fell back to the current mutable question/video rows when a submission's pinned snapshot was missing. That could mislabel historical answers. The hotfix changes this to fail closed and show a diagnostic instead of substituting current content.

## Hotfix implementation

- `lib/utils/versioning-error.ts`: safe error classification for physical missing-table errors, PostgREST table/schema-cache errors, missing/mismatched RPC signatures, permission/RLS/admin denial, archived/invalid project, network errors, and unknown failures. It intentionally does not render raw backend details.
- `app/admin/versions/page.tsx`: use the classifier, distinguish refresh failure from successful RPC completion, and clear validation state when the snapshot list cannot be refreshed.
- `supabase/migrations/20261026112425_allow_versioned_question_edits.sql`: preserve `private.is_admin()`, archived/project checks, payload and option validation, project scoping, transactional question/options writes, and authenticated-only execution. It locks the project row to serialize edits with snapshot creation/publication. For questions with answers, it refuses edits unless every answer's submission maps to a published snapshot containing that question. It never deletes answer rows. `admin_delete_question` deactivates questions that have answers or are referenced by a published snapshot.
- `app/admin/questions/page.tsx`: explain that working edits appear in the next snapshot and do not change in-progress submissions; errors explicitly state when historical snapshot coverage cannot be proven.
- `app/admin/submissions/page.tsx`: historical results and exports use only the snapshot referenced by `submissions.project_version_id`; if that snapshot is unavailable, the UI does not fall back to current questions or videos.
- `supabase/p1-question-versioning-hotfix-test.sql`: synthetic transaction test for draft creation/resave, v1 pinning, semantic text/type/options edits, stale publication rejection, v2 pinning and answer validation, historical answer preservation, non-admin denial, soft-delete, and rollback.
- `scripts/pbl-ux-validation.test.mjs` and `scripts/check-pbl-invariants.mjs`: regression checks for safe error categories, snapshot-only results, migration guards, and fixture rollback.

## Controlled Production migration plan — NOT EXECUTED

Do not apply migrations to Production until a named operational approver accepts the backup, ledger reconciliation, data preflight, maintenance window, compatibility and recovery plan.

1. **Backup and restore readiness.** Take/confirm a restorable managed backup or approved `pg_dump` of the Production database, record its timestamp and restore procedure, and capture pre-migration counts for projects, submissions, answers, questions, options, videos, and groups. Verify the backup's restorability before the change window.
2. **Reconcile migration history.** Compare the Production ledger, actual function definitions, constraints, grants, triggers, and repository migrations. The ledger lacks `20261023030000_serialize_submit_group_with_answer_saves.sql`; Production's current `submit_group` still validates against live questions. Determine and approve whether that migration must be applied before versioning. Do not mark migrations as applied merely to silence ledger drift.
3. **Preflight every submission and answer.** Re-run read-only checks for null `submissions.project_id`, project rows missing for a submission, group/project mismatches, video/project mismatches, answers without a submission, answers without a matching project/question, and duplicate/invalid relations. Current preflight returned zero for these classes and six submissions/eighteen answers, but re-run immediately before migration. If any guard fails, stop and investigate; do not delete or rewrite student data to force the migration through.
4. **Apply in reviewed order.** After ledger reconciliation and approval, apply the required missing submission-serialization migration if confirmed necessary, then `20261026090535_add_project_content_versioning.sql`, `20261026091333_add_project_version_fk_indexes.sql`, `20261026093943_version_publish_compare_and_swap.sql`, and finally `20261026112425_allow_versioned_question_edits.sql`. Use a controlled migration process with exact source hashes and verify each transaction before proceeding; do not run `supabase db push` blindly.
5. **Backfill checks.** The first versioning migration must create one published baseline v1 per existing project, set each project's active pointer to that project's baseline, and pin every existing submission to the correct project/version. Compare answer row counts and sampled answer values against the pre-migration baseline. The migration's guard must abort transactionally if a submission cannot be mapped; do not bypass it.
6. **Post-migration verification.** Confirm all version columns/tables/constraints/indexes exist; every project has a valid published active version; every submission has a non-null project and published version from that same project; no answer rows were lost; RPC signatures and grants match source; `anon` and non-admin users cannot call admin RPCs; RLS and immutability/pointer guards remain enabled; PostgREST schema cache is refreshed; and a new submission pins the current active version.
7. **Recovery.** If the versioning migration fails before commit, investigate the error and verify the transaction left no partial DDL/backfill. If a post-commit application issue occurs, prefer a forward-compatible application rollback while retaining additive snapshot schema and historical data. Do not drop `project_versions`, remove pins, reverse backfill, or restore over live data without explicit incident approval and a verified restore plan. A restore can lose writes made after the backup.
8. **Release.** Only after approved Production migration and post-migration checks, deploy the compatible application build and run read-only smoke tests plus approved end-to-end checks. Record the exact deployed SHA, deployment target, database migration versions, error scan, and rollback decision. Production work remains blocked until approval is recorded.

## Verification status

- [x] Read-only Production schema, function signatures, ledger, and data-integrity preflight inspected.
- [x] Read-only Staging schema and ledger inspected.
- [x] Synthetic SQL regression source added; it is designed to end with `ROLLBACK`.
- [x] CI run #196 passed on code candidate `79b11948196d7074fd3b41f3d10458781567c631` (TypeScript, unit tests, whitespace, security/source invariants, production build, and dependency audit steps all succeeded). This status-documentation commit requires a fresh exact-head CI check.\n- [ ] Vercel Preview READY on the exact final PR head; currently blocked by the Vercel build-rate limit (`upgradeToPro=build-rate-limit`).
- [x] Applied `allow_versioned_question_edits` to verified Staging; Supabase ledger recorded version `20261026112425`. The SQL regression returned the explicit PASS sentinel for snapshot-safe edits, v1/v2 validation, stale CAS, soft-delete, non-admin denial, and fixture rollback.
- [ ] Full browser E2E on Staging for version dashboard, question editor, teacher historical results/exports, and student flow; verify synthetic fixture cleanup. Not run: the current head has no READY Preview due to the Vercel build-rate limit, and interactive browser automation is unavailable in this execution.
- [ ] Independent review of the migration and Security Advisor implications. Staging Security Advisor still reports the two existing authenticated-callable SECURITY DEFINER version RPC warnings and the pre-existing `api_rate_limits` RLS-without-policy INFO; no independent acceptance recorded.
- [ ] Production backup, migration order, compatibility, operational window, and recovery plan approved.
- [ ] Production migration/deployment. **Not executed.**

Post-test cleanup query returned zero synthetic projects, Auth users, groups, submissions, answers, and versions. A read-only function/grant check confirmed `admin_save_question` and `admin_delete_question` remain SECURITY INVOKER, `anon` cannot execute either, and `authenticated` can execute them through the existing admin checks. The Staging migration is applied and the SQL regression passed; this does not establish browser E2E or Production readiness.\n\n**Decision: NO-GO for Production deployment until all gates above have evidence and explicit approval.**
