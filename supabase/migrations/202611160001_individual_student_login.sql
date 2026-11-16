-- Individual student credentials with shared group submissions.
create table if not exists public.student_credentials (
  id uuid primary key default gen_random_uuid(),
  group_member_id uuid not null unique references public.group_members(id) on delete cascade,
  student_id text not null unique,
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.student_credentials(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.student_credentials enable row level security;
alter table public.student_sessions enable row level security;
create index if not exists idx_student_sessions_token on public.student_sessions(token_hash);
create index if not exists idx_student_sessions_expiry on public.student_sessions(expires_at);
-- No direct client access to credential/session records.
revoke all on public.student_credentials, public.student_sessions from anon, authenticated;
create or replace function public.admin_set_student_credential(p_member_id uuid,p_student_id text,p_pin text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if not public.is_admin() then raise exception 'not_authorized'; end if;
 if length(trim(p_student_id)) < 4 or length(trim(p_student_id)) > 32
   or p_student_id !~ '^[A-Za-z0-9_-]+$' then raise exception 'invalid_student_id'; end if;
 if p_pin !~ '^[0-9]{6}$' then raise exception 'invalid_pin'; end if;
 if not exists(select 1 from public.group_members where id=p_member_id) then raise exception 'member_not_found'; end if;
 insert into public.student_credentials(group_member_id,student_id,pin_hash)
 values(p_member_id,upper(trim(p_student_id)),crypt(p_pin,gen_salt('bf',10)))
 on conflict(group_member_id) do update set student_id=excluded.student_id,pin_hash=excluded.pin_hash,
 failed_attempts=0,locked_until=null,is_active=true,updated_at=now()
 returning id into v_id;
 return jsonb_build_object('id',v_id,'student_id',upper(trim(p_student_id)));
end $$;
create or replace function public.student_login(p_student_id text,p_pin text,p_token_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.student_credentials; gm public.group_members; g public.groups;
begin
 select * into c from public.student_credentials where student_id=upper(trim(p_student_id)) and is_active=true;
 if c.id is null then return null; end if;
 if c.locked_until is not null and c.locked_until > now() then return null; end if;
 if c.pin_hash <> crypt(p_pin,c.pin_hash) then
   update public.student_credentials set failed_attempts=failed_attempts+1,
     locked_until=case when failed_attempts+1 >= 5 then now()+interval '15 minutes' else null end
   where id=c.id;
   return null;
 end if;
 update public.student_credentials set failed_attempts=0,locked_until=null where id=c.id;
 select * into gm from public.group_members where id=c.group_member_id;
 select * into g from public.groups where id=gm.group_id;
 if g.id is null then return null; end if;
 insert into public.student_sessions(credential_id,token_hash,expires_at)
 values(c.id,p_token_hash,now()+interval '12 hours');
 return jsonb_build_object('student_id',c.student_id,'student_name',gm.name,'group_id',g.id,'expires_in',43200);
end $$;
create or replace function public.student_session(p_token_hash text)
returns jsonb language sql security definer set search_path=public as $$
 select jsonb_build_object('student_id',c.student_id,'student_name',gm.name,'group_id',g.id,'access_code',g.access_code)
 from public.student_sessions s
 join public.student_credentials c on c.id=s.credential_id and c.is_active
 join public.group_members gm on gm.id=c.group_member_id
 join public.groups g on g.id=gm.group_id
 where s.token_hash=p_token_hash and s.expires_at>now()
 limit 1
$$;
create or replace function public.student_logout(p_token_hash text)
returns void language sql security definer set search_path=public as $$
 delete from public.student_sessions where token_hash=p_token_hash
$$;
grant execute on function public.admin_set_student_credential(uuid,text,text) to authenticated;
grant execute on function public.student_login(text,text,text), public.student_session(text), public.student_logout(text) to anon,authenticated;
