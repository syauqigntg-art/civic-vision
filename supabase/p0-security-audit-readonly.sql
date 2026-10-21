-- CIVIC VISION P0 SECURITY AUDIT — READ ONLY
-- Jalankan di Supabase SQL Editor untuk memeriksa konfigurasi database YANG AKTIF.
-- Skrip ini hanya menjalankan SELECT; tidak mengubah data, grants, policy, atau fungsi.
-- Jangan jalankan schema.sql/security.sql sebagai pengganti audit ini.

WITH relevant_tables AS (
  SELECT
    n.nspname AS schema_name,
    c.relname AS table_name,
    c.oid,
    c.relrowsecurity,
    c.relforcerowsecurity
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r', 'p')
    AND (
      (n.nspname = 'public' AND c.relname IN (
        'users', 'projects', 'groups', 'group_members', 'videos',
        'group_videos', 'questions', 'question_options', 'submissions',
        'answers', 'api_rate_limits'
      ))
      OR (n.nspname = 'storage' AND c.relname = 'objects')
    )
),
report AS (
  SELECT
    '01_TABLE_ACCESS'::text AS section,
    schema_name || '.' || table_name AS object_name,
    concat(
      'RLS=', relrowsecurity,
      '; FORCE_RLS=', relforcerowsecurity,
      '; anon SELECT=', has_table_privilege('anon', oid, 'SELECT'),
      '; authenticated SELECT=', has_table_privilege('authenticated', oid, 'SELECT'),
      '; service_role SELECT=', has_table_privilege('service_role', oid, 'SELECT')
    ) AS detail
  FROM relevant_tables

  UNION ALL

  SELECT
    '02_POLICIES',
    schemaname || '.' || tablename || '.' || policyname,
    concat(
      'roles=', roles::text,
      '; command=', cmd,
      '; using=', coalesce(qual, '-'),
      '; with_check=', coalesce(with_check, '-')
    )
  FROM pg_policies
  WHERE (schemaname = 'public' AND tablename IN (
      'users', 'projects', 'groups', 'group_members', 'videos',
      'group_videos', 'questions', 'question_options', 'submissions',
      'answers', 'api_rate_limits'
    ))
    OR (schemaname = 'storage' AND tablename = 'objects')

  UNION ALL

  SELECT
    '03_FUNCTION_EXECUTE',
    n.nspname || '.' || p.proname || '(' ||
      pg_get_function_identity_arguments(p.oid) || ')',
    concat(
      'anon EXECUTE=', has_function_privilege('anon', p.oid, 'EXECUTE'),
      '; authenticated EXECUTE=', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      '; service_role EXECUTE=', has_function_privilege('service_role', p.oid, 'EXECUTE'),
      '; SECURITY DEFINER=', p.prosecdef
    )
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_group', 'save_identity', 'begin_submission', 'get_answers',
      'save_answer', 'submit_group', 'student_rate_limit', 'stats',
      'is_admin', 'handle_new_user'
    )

  UNION ALL

  SELECT
    '04_VIDEO_BUCKET',
    b.id,
    concat(
      'public=', b.public,
      '; file_size_limit=', coalesce(b.file_size_limit::text, 'unlimited'),
      '; allowed_mime_types=', coalesce(b.allowed_mime_types::text, 'not specified')
    )
  FROM storage.buckets b
  WHERE b.id = 'videos'

  UNION ALL

  SELECT
    '05_GROUP_CODE_STRENGTH',
    'summary',
    concat(
      'total groups=', count(*),
      '; strong CV-20-hex codes=', count(*) FILTER (WHERE access_code ~ '^CV-[A-F0-9]{20}$'),
      '; other/legacy codes=', count(*) FILTER (WHERE access_code IS NULL OR access_code !~ '^CV-[A-F0-9]{20}$')
    )
  FROM public.groups

  UNION ALL

  SELECT
    '06_TRIGGER',
    n.nspname || '.' || c.relname || '.' || t.tgname,
    pg_get_triggerdef(t.oid, true)
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE NOT t.tgisinternal
    AND n.nspname IN ('auth', 'public', 'storage')
)
SELECT section, object_name, detail
FROM report
ORDER BY section, object_name;
