-- Individual student credentials with group-shared submissions.
create table if not exists public.student_credentials (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null unique references public.group_members(id) on delete cascade,
  login_id text not null unique,
  pin_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_credentials_login_id_format check (login_id ~ '^[A-Za-z0-9._-]{4,32}$')
);
create unique index if not exists student_credentials_login_id_lower
  on public.student_credentials (lower(login_id));
create table if not exists public.student_sessions (
  token_hash text primary key,
  credential_id uuid not null references public.student_credentials(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists student_sessions_expiry on public.student_sessions(expires_at);
alter table public.student_credentials enable row level security;
alter table public.student_sessions enable row level security;
-- No direct browser access. Service-role API routes perform all credential/session operations.
revoke all on public.student_credentials from anon, authenticated;
revoke all on public.student_sessions from anon, authenticated;

-- Preserve stable group_members IDs when group identity is edited, so student
-- credentials remain attached to the same member record.
create or replace function public.save_identity(code text,p_name text,p_number int,p_class text,p_leader text,p_members jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare gid uuid; item record;
begin
 select g.id into gid from public.groups g
 where g.access_code=upper(code)
 and not exists(select 1 from public.submissions s where s.group_id=g.id and s.status='submitted');
 if gid is null then return; end if;
 update public.groups set group_name=p_name,group_number=p_number,class_name=p_class,leader_name=p_leader,updated_at=now() where id=gid;
 for item in
   select value as member_name, ordinality::int as member_order
   from jsonb_array_elements_text(coalesce(p_members,'[]'::jsonb)) with ordinality
   where btrim(value)<>''
 loop
   update public.group_members set name=item.member_name,member_order=item.member_order
   where id=(select gm.id from public.group_members gm where gm.group_id=gid and gm.member_order=item.member_order order by gm.id limit 1);
   if not found then
     insert into public.group_members(group_id,name,member_order) values(gid,item.member_name,item.member_order);
   end if;
 end loop;
 delete from public.group_members gm
 where gm.group_id=gid
 and not exists (
   select 1 from jsonb_array_elements_text(coalesce(p_members,'[]'::jsonb)) with ordinality t(value,ordinality)
   where t.ordinality=gm.member_order and btrim(t.value)<>''
 );
end $$;

-- Remove direct anonymous/authenticated access to legacy code-based RPCs.
-- Server routes call these with the service-role client after validating a session.
revoke execute on function public.get_group(text) from public, anon, authenticated;
revoke execute on function public.save_identity(text,text,integer,text,text,jsonb) from public, anon, authenticated;
revoke execute on function public.begin_submission(text,uuid) from public, anon, authenticated;
revoke execute on function public.get_answers(text) from public, anon, authenticated;
revoke execute on function public.save_answer(text,uuid,text) from public, anon, authenticated;
revoke execute on function public.submit_group(text) from public, anon, authenticated;
grant execute on function public.get_group(text) to service_role;
grant execute on function public.save_identity(text,text,integer,text,text,jsonb) to service_role;
grant execute on function public.begin_submission(text,uuid) to service_role;
grant execute on function public.get_answers(text) to service_role;
grant execute on function public.save_answer(text,uuid,text) to service_role;
grant execute on function public.submit_group(text) to service_role;
