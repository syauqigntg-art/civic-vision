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

## Remaining before browser tests

- [ ] Authorize the Vercel team scope `uki8` for this connection. Current Vercel tools return HTTP 403 for that scope, and team listing returns no accessible teams.
- [ ] Set Preview-only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the staging project's values. Do not alter Production targets.
- [ ] Verify the selected Preview deployment uses the latest PR commit and confirm its runtime environment points to this staging project.
- [ ] Create test-only admin/group/video/question fixtures in staging and run the four autosave/submit browser scenarios.

Do not run student write-flow tests in the current Preview until the environment is proven to use this staging project. Do not copy real student data or secrets into source control.
