# PR #20 — Staging Verification Evidence

Last checked: 2026-10-26 (Asia/Jakarta)

All migration, SQL test, and concurrent-publish checks are against Supabase Staging. The security/CAS suite, repeatable v1/v2 integration suite, and two-session concurrent-publish test were rerun against the documentation-updated branch head `ded990a25ec154cd469a75fd667a33a12cfc26a1`; all passed and all temporary fixtures were removed. CI run #183 and Preview are successful on that same head. The remaining gates are a privately configured Staging service-role secret, human independent SQL review, and interactive browser E2E.

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
| `20261026093943` | `version_publish_compare_and_swap` | Applied |

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
- `admin_save_project_version_draft(uuid)` and `admin_publish_project_version(uuid,uuid,timestamptz)`: SECURITY DEFINER. The legacy two-argument publish function has been removed.
- `projects_active_version_publish_guard`: present.

The script includes negative checks for direct DML, anon access, non-admin and no-UID RPC denial, direct active-pointer bypass (including cross-project pointer), invalid publication without pointer movement, published-version UPDATE/DELETE protection, and a positive valid-publication flow. It rolls back test fixtures.

After the compare-and-swap follow-up migration, the script was run again with a final explicit PASS sentinel. It includes an additional stale-validation race test: it saves a draft, changes the working question after the expected timestamp is captured, resaves the draft, and verifies publication with the old timestamp is rejected as `project_version_validation_stale` while the active pointer remains on v2. The run returned `PASS: versioning SQL security test transaction completed and fixtures rolled back`.

The CAS follow-up also sets `submissions.project_id NOT NULL` after a guard check. A read-only Staging query confirmed both `submissions.project_id` and `project_version_id` are NOT NULL, there are zero submissions missing either link, the old publish RPC signature is absent, the new three-argument signature exists, and anon cannot execute the new RPC.

## SQL v1/v2 integration scenario

Repeatable source: `supabase/p1-versioning-v1-v2-integration-test.sql`.

Executed again from branch code candidate `ded990a25ec154cd469a75fd667a33a12cfc26a1` against Staging; result sentinel:

`PASS: V1/V2 integration completed; Group A remained on v1, Group B used v2, late autosave was rejected, historical snapshots survived archive, all fixtures will roll back`

Observed checks:
1. Group A started on v1 and saved `group-a-answer-v1`.
2. Working content changed to “Question text v2”; server validation and CAS publication succeeded for v2.
3. Group A remained pinned to v1 and kept its answer. Group B started after publication and was pinned to v2.
4. The immutable v1 snapshot retained “Question text v1” and v2 retained “Question text v2”.
5. Group A submission finalized with status `submitted`; a subsequent `save_answer` returned `false`, and the final answer did not change.
6. Physical DELETEs of the published question/video were rejected by their guards; archiving the working rows was allowed without changing snapshot pins.

A read-only post-run query confirmed zero test projects, temporary users, Group B fixtures, and zero broken submission pins. All integration changes were rolled back. This is DB-level evidence, not browser E2E.

## Concurrent publication race

A separate two-session Staging test used the same valid draft ID and exact `updated_at` observed before either request. Both independent SQL calls ran in parallel:

- Attempt A: **PASS**, publication returned the v2 draft ID.
- Attempt B: **EXPECTED REJECTION**, `project_version_draft_not_found` after it waited for the project lock and observed the draft was already published.
- Post-race database: exactly two published versions for the synthetic project (v1 and v2), zero drafts, active version number 2, and active pointer matched the published v2 row.
- Cleanup deleted the test project, its versions, video, question, and temporary admin. A verification query returned zero remaining fixture/project/version/user rows and confirmed the pointer guard and version immutability triggers were enabled again.

This verifies database serialization/CAS under two concurrent publish RPC calls. It does not replace the required browser-level concurrency scenario.

## Preview environment and secret safety

- Preview branch: `feature/project-lkpd-versioning-sync`.
- Branch-specific `NEXT_PUBLIC_SUPABASE_URL` points to `https://bneqqkvhehrlcjhvvyvv.supabase.co`.
- Branch-specific `NEXT_PUBLIC_SUPABASE_ANON_KEY` was compared with the legacy anon key returned for the same Supabase Staging project; it matched. No key value is recorded here.
- Branch-specific `SUPABASE_SERVICE_ROLE_KEY` is intentionally a fail-closed placeholder, not a working credential. The platform's environment-variable API did not reveal the existing sensitive value, and the Staging service-role secret was not available through the Supabase connector. This prevents the Preview branch from inheriting the shared cross-environment key. Replace the placeholder directly in Vercel with the Staging project's service-role/secret key; never paste it into chat, source, logs, HTML or any `NEXT_PUBLIC_*` variable.
- Code check: `lib/supabase/admin.ts` imports `server-only` and reads `SUPABASE_SERVICE_ROLE_KEY` only in server-side code. No client-side environment prefix is used.
- Latest deployment `https://civic-vision-hhyn5vjpl-uki8.vercel.app` is READY from SHA `ded990a25ec154cd469a75fd667a33a12cfc26a1`: https://vercel.com/uki8/civic-vision/26PK8ndm1uNZixgjHCkfZNzSivBE
- Read-only HTTP smoke checks on this deployment: `GET /` = 200; `GET /admin/versions` = 200; `GET /api/student-content` = 405 as expected for a POST-only route. No application write request was sent.
- Static initial-bundle check fetched all 11 JavaScript files linked directly from home/admin HTML; all returned HTTP 200. No fetched chunk contained `SUPABASE_SERVICE_ROLE_KEY`, the fail-closed placeholder, or an `sb_secret_...` pattern. The single JWT-shaped literal decoded only to the expected public `role=anon` and Staging project ref `bneqqkvhehrlcjhvvyvv`; no `service_role` claim was present. No `sourceMappingURL` references were found in the scanned chunks. Direct probes for each of the 11 corresponding `.map` URLs returned HTTP 403; no source map was readable via this path. This is a static asset check, not an interactive browser/network test, and cannot rule out route-specific dynamic chunks.

**Environment gate remains BLOCKED.** The URL and anon key are verified, but the runtime service-role key is not yet a Staging key. Do not run application write tests until the placeholder is privately replaced and a fresh deployment is verified. A complete browser bundle/network leakage scan remains part of that browser gate.

## Security Advisor assessment to be reviewed

- WARN: `admin_save_project_version_draft` and `admin_publish_project_version` are SECURITY DEFINER and callable by `authenticated`. They are intended admin RPC endpoints and perform `private.is_admin()` checks internally; SQL tests for non-admin and no UID deny paths passed. An independent reviewer must confirm the checks, grants/default privileges, safe search path, and trigger/locking invariants before accepting this tradeoff.
- INFO: `api_rate_limits` has RLS enabled but no RLS policy. This table predates PR #20 and has no client-role table privileges; service-role-only access is intended. Confirm grants remain unchanged.
- Performance Advisor no longer reports missing covering indexes for the version-related foreign keys after the index migration. It reports new indexes as unused due to tiny test data; do not remove them on that basis alone.

## Release gate status

- [x] Versioning migration, FK-index migration, and CAS/NOT NULL follow-up migration applied to Staging and ledger recorded.
- [x] Invalid-backfill failure rolled back without partial schema.
- [x] Baseline v1 and legacy submission backfill verified.
- [x] SQL security test executed after the CAS follow-up; includes valid/invalid publish and stale validated-draft rejection; fixtures rolled back.
- [x] Repeatable SQL v1/v2 integration test passed on code candidate `ded990a25ec154cd469a75fd667a33a12cfc26a1`: Group A v1, Group B v2, historical prompts, late autosave rejection, and archive guards. Fixtures rolled back.
- [x] Two simultaneous publication RPC calls against one CAS draft produced one successful publish and one safe rejection; exactly v2 was active, no draft remained, fixture rows were removed, and triggers were re-enabled.
- [x] Preview URL and anon key branch-scoped to Staging.
- [x] Read-only Preview HTTP smoke checks succeeded.
- [x] CI run #166 passed on SQL candidate SHA `c861db8f0c940be913fc9d5a5761636889dd37ba`: https://github.com/syauqigntg-art/civic-vision/actions/runs/40297962828
- [x] CI run #183 passed on head SHA `ded990a25ec154cd469a75fd667a33a12cfc26a1`: https://github.com/syauqigntg-art/civic-vision/actions/runs/40305468830. Vercel check and deployment are green on the same SHA.
- [ ] Staging service-role key privately configured for this Preview branch, then runtime/key-ref verified.
- [ ] Full browser bundle/network check confirms no secret leaked.
- [ ] Independent SQL review submitted by a reviewer other than the PR author.
- [ ] Browser E2E on the same final source SHA: teacher/student flow, old/new snapshots, history/results, CSV/Excel, content archiving, stale drafts, concurrent publish, delayed autosave after submit.
- [ ] Re-run CI on the final head after documentation/environment changes.
- [ ] No merge until all remaining boxes above pass with recorded evidence.
