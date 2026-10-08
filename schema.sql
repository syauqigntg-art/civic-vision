create extension if not exists pgcrypto;
create table users(id uuid primary key references auth.users on delete cascade,email text,name text,role text not null default 'student' check(role in('admin','student')),created_at timestamptz default now());
create function is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from users where id=auth.uid() and role='admin') $$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into users(id,email,name) values(new.id,new.email,new.raw_user_meta_data->>'name'); return new; end $$;
create trigger on_auth_user after insert on auth.users for each row execute function handle_new_user();
create table projects(id uuid primary key default gen_random_uuid(),title text not null,tagline text,description text,subject text,grade text,phase text,duration text,is_active bool default true,created_at timestamptz default now(),updated_at timestamptz default now());
create table groups(id uuid primary key default gen_random_uuid(),project_id uuid references projects on delete cascade,group_number int,group_name text,class_name text,leader_name text,access_code text unique not null,created_at timestamptz default now(),updated_at timestamptz default now());
create table group_members(id uuid primary key default gen_random_uuid(),group_id uuid references groups on delete cascade,name text,member_order int);
create table videos(id uuid primary key default gen_random_uuid(),project_id uuid references projects on delete cascade,number int,title text not null,category text,description text,video_url text,thumbnail_url text,duration text,is_active bool default true,created_at timestamptz default now(),updated_at timestamptz default now());
create table group_videos(id uuid primary key default gen_random_uuid(),group_id uuid references groups on delete cascade,video_id uuid references videos on delete cascade,unique(group_id,video_id));
create table questions(id uuid primary key default gen_random_uuid(),project_id uuid references projects on delete cascade,category text not null,question_text text not null,description text,
 question_type text not null check(question_type in('text','textarea','multiple_text','single_select','multi_select','scale')),placeholder text,phase text check(phase in('see','think','connect','act')),is_required bool default true,min_items int default 1,display_order int not null,is_active bool default true,created_at timestamptz default now(),updated_at timestamptz default now());
create table question_options(id uuid primary key default gen_random_uuid(),question_id uuid references questions on delete cascade,option_text text not null,display_order int default 0);
create table submissions(id uuid primary key default gen_random_uuid(),project_id uuid references projects on delete cascade,group_id uuid unique references groups on delete cascade,video_id uuid references videos on delete set null,
 status text not null default 'draft' check(status in('draft','submitted')),started_at timestamptz default now(),submitted_at timestamptz,updated_at timestamptz default now());
create table answers(id uuid primary key default gen_random_uuid(),submission_id uuid references submissions on delete cascade,question_id uuid references questions on delete cascade,answer_text text,created_at timestamptz default now(),updated_at timestamptz default now(),unique(submission_id,question_id));
-- answer_text: teks biasa; untuk multiple_text / multi_select disimpan sebagai string JSON array.

do $$ declare t text; begin
foreach t in array array['users','projects','groups','group_members','videos','group_videos','questions','question_options','submissions','answers'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy "admin all" on %I for all to authenticated using (is_admin()) with check (is_admin())',t); end loop;
foreach t in array array['projects','videos','questions','question_options'] loop
 execute format('create policy "public read" on %I for select to anon,authenticated using (true)',t); end loop; end $$;
create policy "self read" on users for select to authenticated using (id=auth.uid());
-- groups, group_members, group_videos, submissions, answers: TIDAK terbuka untuk publik. Siswa hanya lewat RPC berkode akses.

create function get_group(code text) returns json language sql security definer set search_path=public as $$
 select json_build_object('id',g.id,'group_number',g.group_number,'group_name',g.group_name,'class_name',g.class_name,'leader_name',g.leader_name,
 'members',coalesce((select json_agg(name order by member_order) from group_members where group_id=g.id),'[]'::json),
 'video_ids',coalesce((select json_agg(video_id) from group_videos where group_id=g.id),'[]'::json),
 'submission',(select row_to_json(s) from (select video_id,status,submitted_at from submissions where group_id=g.id) s))
 from groups g where g.access_code=upper(code) $$;
create function save_identity(code text,p_name text,p_number int,p_class text,p_leader text,p_members jsonb) returns void language plpgsql security definer set search_path=public as $$
declare gid uuid; begin
 select g.id into gid from groups g where access_code=upper(code) and not exists(select 1 from submissions s where s.group_id=g.id and s.status='submitted'); if gid is null then return; end if;
 update groups set group_name=p_name,group_number=p_number,class_name=p_class,leader_name=p_leader,updated_at=now() where id=gid;
 delete from group_members where group_id=gid;
 insert into group_members(group_id,name,member_order) select gid,m,o from jsonb_array_elements_text(p_members) with ordinality t(m,o) where btrim(m)<>''; end $$;
create function begin_submission(code text,vid uuid) returns void language sql security definer set search_path=public as $$
 insert into submissions(project_id,group_id,video_id) select project_id,id,vid from groups where access_code=upper(code)
 on conflict(group_id) do update set video_id=case when submissions.status='draft' then excluded.video_id else submissions.video_id end $$;
create function get_answers(code text) returns jsonb language sql security definer set search_path=public as $$
 select coalesce(jsonb_object_agg(a.question_id,a.answer_text),'{}') from answers a join submissions s on s.id=a.submission_id join groups g on g.id=s.group_id where g.access_code=upper(code) $$;
create function save_answer(code text,qid uuid,val text) returns boolean language plpgsql security definer set search_path=public as $$
begin insert into answers(submission_id,question_id,answer_text) select s.id,qid,val from submissions s join groups g on g.id=s.group_id where g.access_code=upper(code) and s.status='draft'
 on conflict(submission_id,question_id) do update set answer_text=excluded.answer_text,updated_at=now(); return found; end $$;
create function submit_group(code text) returns text language plpgsql security definer set search_path=public as $$
declare g groups; s submissions; q questions; v text; ok boolean; begin
 select * into g from groups where access_code=upper(code); select * into s from submissions where group_id=g.id;
 if s.id is null then return 'belum mulai'; end if; if s.status='submitted' then return 'sudah terkirim'; end if;
 if coalesce(g.group_name,'')='' or coalesce(g.leader_name,'')='' then return 'identitas belum lengkap'; end if;
 for q in select * from questions where project_id=g.project_id and is_active and is_required loop
  select answer_text into v from answers where submission_id=s.id and question_id=q.id;
  ok := case when coalesce(btrim(v),'')='' then false
   when q.question_type='multiple_text' then (select count(*) from jsonb_array_elements_text(v::jsonb) e where btrim(e)<>'')>=q.min_items
   when q.question_type='multi_select' then jsonb_array_length(v::jsonb)>0 else true end;
  if not ok then return 'belum lengkap'; end if; end loop;
 update submissions set status='submitted',submitted_at=now(),updated_at=now() where id=s.id; return 'ok'; end $$;
create function stats() returns json language sql security definer set search_path=public as $$
 select json_build_object('videos',(select count(*) from videos where is_active),'questions',(select count(*) from questions where is_active),'groups',(select count(*) from groups)) $$;
grant execute on function get_group,save_identity,begin_submission,get_answers,save_answer,submit_group,stats to anon,authenticated;

insert into storage.buckets(id,name,public) values('videos','videos',true) on conflict do nothing;
create policy "teacher storage" on storage.objects for all to authenticated using (bucket_id='videos' and is_admin()) with check (bucket_id='videos' and is_admin());

-- INDEX (performa)
create index if not exists i_answers_sub on answers(submission_id); create index if not exists i_subs_group on submissions(group_id); create index if not exists i_q_proj on questions(project_id,display_order);
create index if not exists i_gm_group on group_members(group_id); create index if not exists i_gv_group on group_videos(group_id); create index if not exists i_v_proj on videos(project_id,number); create index if not exists i_qo_q on question_options(question_id);
-- Data awal: jalankan "npm run seed" (lihat scripts/seed.mjs). Jadikan akun guru admin: update users set role='admin' where email='guru@sekolah.id';
