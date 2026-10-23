# CIVIC VISION — Staging Setup

Last checked: 2026-10-23 (Asia/Jakarta)

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
6. The five existing database hardening/editor migrations plus `20261023010223_serialize_answer_saves_with_submission.sql`.
7. Staging-specific hardening for the `auth.users` trigger function `public.handle_new_user()`: empty search path and no EXECUTE grant to `anon` or `authenticated`.

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

## Current readiness and audit findings (2026-10-23)

- Staging database setup is complete and isolated; this does **not** mean frontend runtime tests have passed.
- Vercel Preview is blocked: the connected Vercel tools return HTTP 403 for team scope `uki8`. The latest Vercel bot comment marked its deployment as **Ignored**, and an earlier attempt hit the free daily deployment limit. No Vercel environment variables were changed.
- GitHub Actions run #23 used the PR head SHA `261176eb9aafc986244baa0b606eabecebbc0c7b`. TypeScript and source invariants passed, but `npm audit --omit=dev` exited 1 with a critical advisory on `next@16.4.0`. The old workflow masked that exit with `continue-on-error: true`; the workflow is being changed so the audit is blocking. Patch `next` to at least 16.4.1 and regenerate the lockfile before calling the candidate clean.
- PR #6 remains Draft and unmerged. CI and database metadata checks are not browser/runtime tests.

## Four required browser scenarios — all NOT TESTED

Run only after Preview is confirmed to use this staging project and its deployment commit SHA is confirmed:

- [ ] **Type an answer and submit immediately:** final stored value must equal the latest typed value.
- [ ] **Disconnect during autosave and reconnect:** pending values retry; latest answer is stored correctly after connection returns.
- [ ] **Release a delayed save after submission:** server rejects the late save and the submitted answer remains unchanged.
- [ ] **Teacher reopens a submission, if this capability exists:** first verify a real UI action/RPC exists; if present, ensure existing answers remain and the student can continue. If absent, record the feature as not implemented rather than marking the scenario passed.

## Remaining before browser tests

- [ ] Restore authorized access to Vercel team scope `uki8` for this connection; current tools return HTTP 403 and cannot list accessible teams.
- [ ] Set Preview-only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to staging values. Do not alter Production targets.
- [ ] Create or confirm a fresh Preview deployment from the latest PR commit and verify runtime points to staging without printing secret values.
- [ ] Create test-only admin/group/video/question fixtures in staging and execute the four scenarios above.

Do not run student write-flow tests in the current Preview until the environment is proven to use this staging project. Do not copy real student data or secrets into source control.

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

The mapping above reconciles the **recorded migration names to their intended source/origin** without rewriting provider-generated version IDs. New staging changes are to be applied through the controlled Supabase migration API, then the returned migration version and live function definition must be recorded below. This does not authorize `db push`.

## P0 submission/autosave audit

The live staging definition of `save_answer()` uses `FOR UPDATE` on the submission row, but the live `submit_group()` definition initially inspected did **not** lock that same row before validating answers and setting status to submitted. Thus the shared-lock protocol was not complete, despite the save function's comment. A dedicated staging-only migration is being reviewed to make both functions lock the same submission row. This blocker is not considered fixed until the migration is applied to staging and the live definitions/privileges are re-queried.

