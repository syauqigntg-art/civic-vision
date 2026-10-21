-- P0 read-only audit. Tidak mengubah data, grant, policy, atau konfigurasi.
-- Jalankan setelah p0-lock-public-reads.sql selesai.
with wanted_tables as (
  select unnest(array[
    'users','projects','groups','group_members','videos','group_videos',
    'questions','question_options','submissions','answers','api_rate_limits'
  ]) as table_name
),
roles as (
  select unnest(array['anon','authenticated','service_role']) as role_name
),
rls_rows as (
  select
    'RLS'::text as section,
    n.nspname || '.' || c.relname as object_name,
    '-'::text as principal,
    ('enabled=' || c.relrowsecurity::text ||
     '; forced=' || c.relforcerowsecurity::text) as details
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname in (select table_name from wanted_tables)
),
policy_rows as (
  select
    'POLICY'::text as section,
    schemaname || '.' || tablename as object_name,
    array_to_string(roles, ',') as principal,
    ('name=' || policyname ||
     '; command=' || cmd ||
     '; using=' || coalesce(qual, '-') ||
     '; check=' || coalesce(with_check, '-')) as details
  from pg_policies
  where schemaname in ('public','storage')
    and (
      tablename in (select table_name from wanted_tables)
      or (schemaname='storage' and tablename='objects')
    )
),
grant_rows as (
  select
    'TABLE_PRIVILEGE'::text as section,
    'public.' || t.table_name as object_name,
    r.role_name as principal,
    ('SELECT=' || has_table_privilege(r.role_name, format('public.%I', t.table_name), 'SELECT')::text ||
     '; INSERT=' || has_table_privilege(r.role_name, format('public.%I', t.table_name), 'INSERT')::text ||
     '; UPDATE=' || has_table_privilege(r.role_name, format('public.%I', t.table_name), 'UPDATE')::text ||
     '; DELETE=' || has_table_privilege(r.role_name, format('public.%I', t.table_name), 'DELETE')::text) as details
  from wanted_tables t
  cross join roles r
  where to_regclass(format('public.%I', t.table_name)) is not null
),
function_rows as (
  select
    'FUNCTION_EXECUTE'::text as section,
    n.nspname || '.' || p.proname || '(' ||
      pg_get_function_identity_arguments(p.oid) || ')' as object_name,
    r.role_name as principal,
    ('EXECUTE=' || has_function_privilege(r.role_name, p.oid, 'EXECUTE')::text) as details
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join roles r
  where n.nspname='public'
    and p.prokind='f'
    and p.proname in (
      'get_group','save_identity','begin_submission','get_answers',
      'save_answer','submit_group','student_rate_limit','stats'
    )
),
bucket_rows as (
  select
    'STORAGE_BUCKET'::text as section,
    b.id as object_name,
    '-'::text as principal,
    ('public=' || b.public::text ||
     '; file_size_limit=' || coalesce(b.file_size_limit::text, 'null') ||
     '; allowed_mime_types=' || coalesce(b.allowed_mime_types::text, 'null')) as details
  from storage.buckets b
  where b.id='videos'
)
select * from rls_rows
union all select * from policy_rows
union all select * from grant_rows
union all select * from function_rows
union all select * from bucket_rows
order by section, object_name, principal;
