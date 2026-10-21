-- CIVIC VISION P0 ACTIVE FUNCTION AUDIT — READ ONLY
-- Shows the current definitions and execution privileges of security-critical functions.
-- SELECT only. Does not alter functions, grants, policies, or data.
-- Do not run schema.sql or replace functions based only on this report.

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_userbyid(p.proowner) AS owner_name,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute,
  pg_get_functiondef(p.oid) AS active_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_group',
    'save_identity',
    'begin_submission',
    'get_answers',
    'save_answer',
    'submit_group',
    'student_rate_limit',
    'stats',
    'is_admin',
    'handle_new_user'
  )
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
