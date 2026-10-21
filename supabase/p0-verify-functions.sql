-- Read-only: definisi fungsi yang benar-benar aktif di database Supabase.
-- Tidak mengubah fungsi atau data. Ekspor hasil jika perlu ditinjau.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as function_settings,
  pg_get_functiondef(p.oid) as sql_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and p.proname in (
    'get_group',
    'save_identity',
    'begin_submission',
    'get_answers',
    'save_answer',
    'submit_group',
    'student_rate_limit',
    'stats'
  )
order by p.proname, pg_get_function_identity_arguments(p.oid);
