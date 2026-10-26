# CIVIC VISION — Staging Setup

Last checked: 2026-10-26 (Asia/Jakarta)

## Staging project

- Supabase project: `civic-vision-staging`
- Project ref: `bneqqkvhehrlcjhvvyvv`
- API URL: `https://bneqqkvhehrlcjhvvyvv.supabase.co`
- Region: `ap-northeast-1`
- Status: `ACTIVE_HEALTHY`
- Creation estimate returned by Supabase: US$0/month. This is the initial project estimate, not a guarantee that every future usage or add-on is free.
- No student/group/submission/answer data was copied from Production.

## Setup applied

1. Base application schema from `supabase/schema.sql`.
2. Security baseline from `supabase/security.sql`.
3. Project isolation and archive behavior from `supabase/p1-project-isolation.sql`.
4. The `api_rate_limits` table and `student_rate_limit()` RPC, with RLS enabled and table/function access limited to the server role.
5. Public-read lockdown from `supabase/p0-lock-public-reads.sql`.
6. The five existing database hardening/editor migrations, `20261023010223_serialize_answer_saves_with_submission.sql`, and `20261023030000_serialize_submit_group_with_answer_saves.sql`.
7. Staging-specific hardening for the `auth.users` trigger function `public.handle_new_user()`: empty search path and no EXECUTE grant to `anon` or `authenticated`.
8. `20261026090535_add_project_content_versioning`: project/LKPD snapshots, immutable published baseline, submission version pinning, guarded publication RPCs, and backfill.
9. `20261026091333_add_project_version_fk_indexes`: supporting indexes for the new version-related foreign keys.
10. `20261026093943_version_publish_compare_and_swap`: `submissions.project_id NOT NULL`, publication compare-and-swap using the exact `updated_at` timestamp checked by the admin UI, and pointer-guard owner lookup updated to the three-argument RPC.

The staging migration history was populated through the Supabase migration API. Its generated staging versions do not match every pre-existing filename timestamp under `supabase/migrations`. This was not a data clone or a Production migration. **Do not run `supabase db push` against this staging project until migration history is reconciled with repository versions**; the current environment was bootstrapped for isolated runtime testing.

## Checks confirmed

- All 11 application tables have RLS enabled.
- No direct table SELECT privilege is granted to `anon` on those 11 tables.
- `api_rate_limits` has no client-role privileges; only `service_role` can use the table. Its RLS-no-policy Advisor notice is therefore intentional, provided these grants remain unchanged.
- Student RPCs are not executable by `anon` or `authenticated`; they are executable by `service_role`.
- `save_answer()` uses `search_path = ''`, writes `answers.project_id`, checks project scope and locks the submission row using `FOR UPDATE`. Only `service_role` can execute it.
- Admin editor RPCs deny `anon` and check admin authorization internally.
- Storage bucket `videos` is private, with a 50 MiB limit and explicit allowed MIME types.
- Security Advisor currently reports only the informational finding about `api_rate_limits` having no RLS policy.
- Counts verified as zero for `users`, `projects`, `groups`, `submissions`, `answers`, and `api_rate_limits`.

## Current readiness and audit findings (2026-10-26)

- Supabase Staging is `civic-vision-staging`, ref `bneqqkvhehrlcjhvvyvv`, URL `https://bneqqkvhehrlcjhvvyvv.supabase.co`. No Production migration or write test was run.
- PR #20 has applied these versioning migrations to this Staging target: `20261026090535 add_project_content_versioning`, `20261026091333 add_project_version_fk_indexes`, and `20261026093943 version_publish_compare_and_swap`. These recorded names match their source filenames. The CAS follow-up sets `submissions.project_id NOT NULL` after a guard check, removes the old two-argument publication RPC, and requires the `updated_at` timestamp observed at validation; a stale timestamp is rejected with `project_version_validation_stale`.
- One synthetic legacy project/submission/answer was used to verify backfill: 1 baseline v1, 1 pinned submission, 1 unchanged answer, 0 submissions missing a version. A deliberately invalid submission caused the migration's transaction to fail with `project_version_backfill_failed`; the invalid row was then removed and the valid backfill completed.
- The expanded `supabase/p1-versioning-security-test.sql` completed with an explicit PASS sentinel after the CAS migration. It verifies grants, admin/non-admin/anon RPC behavior, immutable published snapshots, valid/invalid publication, and stale publication after a working-question edit. All temporary users and test records were rolled back. The separate v1/v2 SQL scenario verified old Group A remains on v1 and a newly started Group B pins to v2; the transaction was rolled back to preserve the reusable baseline fixture.
- Supabase privilege checks confirmed: `anon` has no privileges on `project_versions`; `authenticated` and `service_role` have SELECT only; table RLS is enabled; the draft-save RPC and three-argument compare-and-swap publication RPC are SECURITY DEFINER; the old two-argument publish RPC is absent; the active-version guard trigger exists. Read-only checks confirm `submissions.project_id` and `project_version_id` are both NOT NULL and no submissions lack either relationship.
- Security Advisor still flags the two authenticated-callable SECURITY DEFINER admin RPCs. Their body checks `private.is_admin()` and the non-admin/no-UID cases passed in the SQL test, but an independent reviewer must explicitly accept or require changes. Advisor also reports the pre-existing informational RLS-without-policy notice on `api_rate_limits`.
- Performance Advisor no longer reports missing covering indexes for the new foreign keys. It reports the new indexes as unused because the staging database is tiny; do not remove them solely on that signal without workload review.
- Preview URL and anon key have branch-specific overrides for `feature/project-lkpd-versioning-sync` and have been compared with the Staging project (host/ref and legacy anon key match). To prevent accidental use of the shared cross-environment secret, branch-specific `SUPABASE_SERVICE_ROLE_KEY` is currently a fail-closed placeholder. It is **not** a working staging key.
- Fresh Preview deployment `https://civic-vision-jua31xt9u-uki8.vercel.app` is READY from SHA `c861db8f0c940be913fc9d5a5761636889dd37ba`. Read-only GET smoke checks for `/` and `/admin/versions` returned HTTP 200. `GET /api/student-content` returned 405, consistent with its POST-only route. These are smoke checks, not interactive browser E2E.
- `lib/supabase/admin.ts` imports `server-only` and reads `SUPABASE_SERVICE_ROLE_KEY` in server-side code. The variable is not prefixed `NEXT_PUBLIC_`. A full browser network/bundle test remains part of E2E verification.

## Four required browser scenarios — NOT TESTED

Do not start application write tests until the branch-specific service key is privately replaced in Vercel with the matching Staging credential and a new deployment has been built from the exact candidate SHA.

- [ ] Type an answer and submit immediately; the final stored value equals the latest typed value.
- [ ] Disconnect during autosave and reconnect; pending values retry and the latest answer is stored correctly.
- [ ] Release a delayed save after submission; the server rejects the late save and the submitted answer remains unchanged.
- [ ] Teacher reopens a submission, if this capability exists; first verify the real UI action/RPC exists, otherwise record as not implemented.

## Remaining before browser tests

- [ ] In Vercel Project → Settings → Environment Variables, replace the branch-only `SUPABASE_SERVICE_ROLE_KEY` placeholder for Preview branch `feature/project-lkpd-versioning-sync` with the secret/service-role credential from Supabase project ref `bneqqkvhehrlcjhvvyvv`. Do not paste the secret into chat, logs, source, or `NEXT_PUBLIC_*`; do not change Production targets.
- [ ] Create a fresh Preview deployment and verify the URL/ref, anon key/ref, and server-side key/ref are all the same Staging project without printing any key. Confirm service-role secret is absent from HTML/JS/browser response.
- [ ] Obtain a genuine independent SQL review on PR #20 covering grants/default privileges, SECURITY DEFINER, `private.is_admin()`, pointer trigger, row locking/concurrent publication, and backfill failure/rollback.
- [ ] Prepare a test-only administrator login plus synthetic teacher/student/group/video/question fixtures in Staging. Do not import real student data.
- [ ] Run and record teacher/student browser E2E on the same exact source SHA: old/new group version pinning, history/results, CSV/Excel exports, video/question archive, stale draft after validation, simultaneous publication, and delayed autosave after submit.
- [ ] Re-run CI on the final head. Merge stays NO-GO until the review, environment, and browser gates are all evidenced.

## Migration history reconciliation


The migration API assigned staging-specific version identifiers at apply time. These IDs intentionally do not equal the original repository filename timestamps, so do **not** use `supabase db push` against this project until the CLI ledger is separately rebuilt and verified. To account for the complete current staging ledger, the records read from Supabase map as follows:

| Staging version | Recorded migration name | Source / origin |
| --- | --- | --- |
| `20261023011407` | `staging_bootstrap_schema` | `supabase/schema.sql` |
| `20261023011411` | `staging_security_baseline` | `supabase/security.sql` |
| `20261023011414` | `staging_project_isolation` | `supabase/p1-project-isolation.sql` |
| `20261023011430` | `staging_rate_limit` | Staging-only table and service-role RPC setup; do not replay against Production |
| `20261023011434` | `staging_lock_public_reads` | `supabase/p0-lock-public-reads.sql` |
| `20261023011437` | `harden_is_admin_and_fk_indexes` | `supabase/migrations/20261022151155_harden_is_admin_and_fk_indexes.sql` |
| `20261023011440` | `optimize_users_rls_policies` | `supabase/migrations/20261022151421_optimize_users_rls_policies.sql` |
| `20261023011444` | `secure_admin_helper_and_transactional_question_editor` | `supabase/migrations/20261022152719_secure_admin_helper_and_transactional_question_editor.sql` |
| `20261023011448` | `add_safe_question_deletion_rpc` | `supabase/migrations/20261022153005_add_safe_question_deletion_rpc.sql` |
| `20261023011515` | `add_transactional_question_order_and_delete` | `supabase/migrations/20261022153051_add_transactional_question_order_and_delete.sql` |
| `20261023011518` | `serialize_answer_saves_with_submission` | `supabase/migrations/20261023010223_serialize_answer_saves_with_submission.sql` |
| `20261023011552` | `staging_harden_auth_user_trigger` | Staging-only hardening of `public.handle_new_user()`; do not blindly replay against Production |
| `20261023023649` | `serialize_submit_group_with_answer_saves` | `supabase/migrations/20261023030000_serialize_submit_group_with_answer_saves.sql` |
| `20261026090535` | `add_project_content_versioning` | `supabase/migrations/20261026090535_add_project_content_versioning.sql` |
| `20261026091333` | `add_project_version_fk_indexes` | `supabase/migrations/20261026091333_add_project_version_fk_indexes.sql` |
| `20261026093943` | `version_publish_compare_and_swap` | `supabase/migrations/20261026093943_version_publish_compare_and_swap.sql` |

The mapping above reconciles the **recorded migration names to their intended source/origin** without rewriting provider-generated version IDs. New staging changes are to be applied through the controlled Supabase migration API, then the returned migration version and live function definition must be recorded below. This does not authorize `db push`.

The mapping above reconciles the **recorded migration names to their intended source/origin** without rewriting provider-generated version IDs. New staging changes are to be applied through the controlled Supabase migration API, then the returned migration version and live function definition must be recorded below. This does not authorize `db push`.

## PR #20 CAS follow-up — 2026-10-26

- The stale-publish guard was applied to Staging as ledger version `20261026093943`.
- A read-only PostgreSQL query confirmed `submissions.project_id IS NOT NULL`, `submissions.project_version_id IS NOT NULL`, zero submissions missing either reference, the old two-argument publish RPC absent, and the three-argument CAS RPC present/executable by `authenticated` but not `anon`.
- `supabase/p1-versioning-security-test.sql` was rerun after this migration and returned an explicit PASS sentinel, including the stale-draft race test. Temporary auth/user/group fixtures were rolled back; no Production database was touched.
- Supabase Security Advisor continues to flag the intentionally authenticated-callable `SECURITY DEFINER` admin RPCs. The body checks `private.is_admin()`; this must still be explicitly accepted or changed by an independent reviewer.
- Browser E2E is still blocked because the branch-specific Preview `SUPABASE_SERVICE_ROLE_KEY` is a fail-closed placeholder. Replace it privately in Vercel with a secret from this same Staging project, redeploy exact final SHA, then run/record browser tests. Do not use the shared cross-environment key or run Preview write tests before this.

## P0 submission/autosave audit

The initial live staging definition of `submit_group()` was missing the lock on the same submission row, so the protocol was incomplete. The staging-only migration `serialize_submit_group_with_answer_saves` was applied through the Supabase migration API and recorded as version `20261023023649`. A read-only query confirmed both `save_answer(text,uuid,text)` and `submit_group(text)` are SECURITY DEFINER, use `search_path=''`, contain `FOR UPDATE` on the same row selected by `group_id` and `project_id`, and can be executed only by `service_role` (anon/authenticated EXECUTE=false). This confirms the live function definition and privileges now match the intended lock protocol; **it does not prove the race has passed at runtime**. Browser/concurrency tests remain pending until Preview is proven to use staging.
