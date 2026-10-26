# PR #20 — Staging Verification Evidence

Last checked: 2026-10-26 (Asia/Jakarta)\n\nDocumentation candidate before this follow-up: `d4a341d71c7a78cfb33dd21fb77323b3d798567d`. CI run #169 passed on that candidate; this follow-up changes only verification documentation.

## Candidate and target

- Pull request: https://github.com/syauqigntg-art/civic-vision/pull/20
- SQL migration candidate used for staging integration: commit `c861db8f0c940be913fc9d5a5761636889dd37ba` (migration body had already been corrected before application).
- Staging project: `civic-vision-staging`, ref `bneqqkvhehrlcjhvvyvv`
- Staging URL: `https://bneqqkvhehrlcjhvvyvv.supabase.co`
- No migration or write tests ran against Production.

The repository migration filenames now align with the migration ledger records created via the Supabase migration API:

| Staging version | Migration name | Status |
| --- | --- | --- |
| `20261026090535` | `add_project_content_versioning` | Applied |
| `20261026091333` | `add_project_version_fk_indexes` | Applied |

## Backfill and transactional failure evidence

A synthetic legacy project, video, question, group, submission, and answer were created in Staging.

- Valid initial state: 1 project, 1 associated legacy submission, and 1 unchanged answer.
- With a deliberately invalid legacy submission missing `project_id`, the full migration was executed as a dry-run through the SQL API. It failed with `project_version_backfill_failed`.
- Post-failure checks showed `public.project_versions`, `projects.active_version_id`, and `submissions.project_version_id` had not been left behind by that failed transaction.
- The invalid synthetic row was removed before the migration was applied.
- After successful application: 1 published baseline v1, 1 active v1 pointer, 1 legacy submission pinned to v1, 1 answer preserved as `legacy-answer-untouched`, and 0 submissions missing a version.
- The synthetic project is archived in Staging. It is deliberately labeled `__cv_pr20_versioning_backfill__`; it is not production data.

## SQL security test

Source: `supabase/p1-versioning-security-test.sql`.

The script executed in the Staging SQL Editor context as database owner after the migration. It returned without a SQL error. A subsequent read-only query confirmed the temporary auth/app users, security-test projects, and temporary Group B fixture were removed by transaction rollback.

The direct privilege matrix was separately queried in PostgreSQL:

- `anon`: no SELECT/INSERT/UPDATE/DELETE privilege on `public.project_versions`.
- `authenticated`: SELECT only; direct INSERT/UPDATE/DELETE false.
- `service_role`: SELECT only; direct INSERT/UPDATE/DELETE false.
- RLS on `public.project_versions`: enabled.
- `admin_save_project_version_draft(uuid)` and `admin_publish_project_version(uuid,uuid)`: SECURITY DEFINER.
- `projects_active_version_publish_guard`: present.

The script includes negative checks for direct DML, anon access, non-admin and no-UID RPC denial, direct active-pointer bypass (including cross-project pointer), invalid publication without pointer movement, published-version UPDATE/DELETE protection, and a positive valid-publication flow. It rolls back test fixtures.

## SQL v1/v2 integration scenario

A separate single-transaction test ran against the same Staging DB and rolled back all test-only changes:

1. Group A's synthetic legacy submission was confirmed pinned to v1 with its old answer.
2. The source question text was changed in working data and a valid v2 snapshot was saved/published through the RPC.
3. The v1 snapshot still contained `Synthetic legacy question`; v2 contained `Synthetic V2 question`.
4. A newly started Group B submission created via `begin_submission` was pinned to v2, while Group A stayed pinned to v1.
5. After rollback, Group B and its user fixture were absent, the project pointer returned to v1, the answer remained unchanged, and live question text was restored.

This verifies DB-level pinning in a transaction; it does not replace browser E2E.

## Preview environment and secret safety

- Preview branch: `feature/project-lkpd-versioning-sync`.
- Branch-specific `NEXT_PUBLIC_SUPABASE_URL` points to `https://bneqqkvhehrlcjhvvyvv.supabase.co`.
- Branch-specific `NEXT_PUBLIC_SUPABASE_ANON_KEY` was compared with the legacy anon key returned for the same Supabase Staging project; it matched. No key value is recorded here.
- Branch-specific `SUPABASE_SERVICE_ROLE_KEY` is intentionally a fail-closed placeholder, not a working credential. The platform's environment-variable API did not reveal the existing sensitive value, and the Staging service-role secret was not available through the Supabase connector. This prevents the Preview branch from inheriting the shared cross-environment key. Replace the placeholder directly in Vercel with the Staging project's service-role/secret key; never paste it into chat, source, logs, HTML or any `NEXT_PUBLIC_*` variable.
- Code check: `lib/supabase/admin.ts` imports `server-only` and reads `SUPABASE_SERVICE_ROLE_KEY` only in server-side code. No client-side environment prefix is used.
- Deployment `https://civic-vision-jua31xt9u-uki8.vercel.app` is READY from source SHA `c861db8f0c940be913fc9d5a5761636889dd37ba`, the SQL-test candidate.
- The most recent doc candidate deployment `https://civic-vision-n4rvqgxmn-uki8.vercel.app` is also READY from SHA `d4a341d71c7a78cfb33dd21fb77323b3d798567d`. Read-only HTTP smoke checks on that deployment: `GET /` = 200; `GET /admin/versions` = 200. `GET /api/student-content` on the earlier same-source candidate returned 405 as expected for a POST-only route. No student write request was sent.
- Eleven initial client JavaScript chunks linked by the home/admin HTML were fetched (one needed a retry). None contained the `SUPABASE_SERVICE_ROLE_KEY` identifier or fail-closed placeholder string. This is a useful initial-bundle check, not a complete dynamic-chunk/network scan; the full browser check remains pending.

**Environment gate remains BLOCKED.** The URL and anon key are verified, but the runtime service-role key is not yet a Staging key. Do not run application write tests until the placeholder is privately replaced and a fresh deployment is verified. A complete browser bundle/network leakage scan remains part of that browser gate.

## Security Advisor assessment to be reviewed

- WARN: `admin_save_project_version_draft` and `admin_publish_project_version` are SECURITY DEFINER and callable by `authenticated`. They are intended admin RPC endpoints and perform `private.is_admin()` checks internally; SQL tests for non-admin and no UID deny paths passed. An independent reviewer must confirm the checks, grants/default privileges, safe search path, and trigger/locking invariants before accepting this tradeoff.
- INFO: `api_rate_limits` has RLS enabled but no RLS policy. This table predates PR #20 and has no client-role table privileges; service-role-only access is intended. Confirm grants remain unchanged.
- Performance Advisor no longer reports missing covering indexes for the version-related foreign keys after the index migration. It reports new indexes as unused due to tiny test data; do not remove them on that basis alone.

## Release gate status

- [x] Migration applied to Staging and ledger recorded.
- [x] Invalid-backfill failure rolled back without partial schema.
- [x] Baseline v1 and legacy submission backfill verified.
- [x] SQL security test executed; fixtures rolled back.
- [x] DB-level Group A v1 / Group B v2 scenario passed; changes rolled back.
- [x] Preview URL and anon key branch-scoped to Staging.
- [x] Read-only Preview HTTP smoke checks succeeded.
- [x] CI run #166 passed on SQL candidate SHA `c861db8f0c940be913fc9d5a5761636889dd37ba`: https://github.com/syauqigntg-art/civic-vision/actions/runs/40297962828
- [x] CI run #169 passed on documentation candidate SHA `d4a341d71c7a78cfb33dd21fb77323b3d798567d`: https://github.com/syauqigntg-art/civic-vision/actions/runs/40300077820. This follow-up changes only verification documentation, and a new CI run is still required on the resulting final head.
- [ ] Staging service-role key privately configured for this Preview branch, then runtime/key-ref verified.
- [ ] Full browser bundle/network check confirms no secret leaked.
- [ ] Independent SQL review submitted by a reviewer other than the PR author.
- [ ] Browser E2E on the same final source SHA: teacher/student flow, old/new snapshots, history/results, CSV/Excel, content archiving, stale drafts, concurrent publish, delayed autosave after submit.
- [ ] Re-run CI on the final head after documentation/environment changes.
- [ ] No merge until all remaining boxes above pass with recorded evidence.
