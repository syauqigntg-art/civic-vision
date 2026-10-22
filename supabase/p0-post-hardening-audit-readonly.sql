-- CIVIC VISION: post-hardening audit (read-only)
-- SELECT statements only. No access codes, student identities, answers, API keys, or private content are displayed.

-- 01 — RLS status for application tables.
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND c.relname IN ('users','projects','groups','group_members','videos','group_videos','questions','question_options','submissions','answers','api_rate_limits')
ORDER BY c.relname;

-- 02 — Direct privileges for anon on protected application tables.
SELECT t.table_name,
  has_table_privilege('anon',format('public.%I',t.table_name),'SELECT') AS anon_select,
  has_table_privilege('anon',format('public.%I',t.table_name),'INSERT') AS anon_insert,
  has_table_privilege('anon',format('public.%I',t.table_name),'UPDATE') AS anon_update,
  has_table_privilege('anon',format('public.%I',t.table_name),'DELETE') AS anon_delete
FROM (VALUES ('users'),('projects'),('groups'),('group_members'),('videos'),('group_videos'),('questions'),('question_options'),('submissions'),('answers'),('api_rate_limits')) AS t(table_name)
ORDER BY t.table_name;

-- 03 — Admin helper location and public exposure.
SELECT to_regprocedure('public.is_admin()') IS NOT NULL AS public_is_admin_exists,
  to_regprocedure('private.is_admin()') IS NOT NULL AS private_is_admin_exists,
  CASE WHEN to_regprocedure('private.is_admin()') IS NOT NULL THEN has_function_privilege('anon','private.is_admin()','EXECUTE') ELSE NULL END AS anon_can_execute_private_helper;

-- 04 — Student privileged RPCs should only be executable by service_role.
SELECT p.proname AS function_name,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') AS service_role_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('get_group','save_identity','begin_submission','get_answers','save_answer','submit_group','student_rate_limit','stats')
ORDER BY p.proname;

-- 05 — Admin editor RPCs: not public/anon; authorization is checked inside each function.
SELECT p.proname AS function_name, p.prosecdef AS security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('admin_save_question','admin_delete_question','admin_reorder_questions')
ORDER BY p.proname;

-- 06 — Storage bucket settings and admin-only object policy.
SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='videos';
SELECT policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname='storage' AND tablename='objects' AND policyname='teacher storage';
