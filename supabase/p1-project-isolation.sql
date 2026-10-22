-- P1 project isolation + archive semantics.
-- Run once in Supabase SQL Editor after reviewing the preflight query below.
-- Existing data is preserved. The migration aborts if it finds legacy cross-project assignments.

begin;

-- Preflight: stop instead of silently rewriting invalid legacy links.
do $$
begin
  if exists (
    select 1 from group_videos gv
    join groups g on g.id = gv.group_id
    join videos v on v.id = gv.video_id
    where g.project_id <> v.project_id
  ) then
    raise exception 'P1 migration blocked: group_videos contains cross-project assignments. Fix these rows before retrying.';
  end if;
  if exists (
    select 1 from submissions s
    join groups g on g.id = s.group_id
    where s.project_id <> g.project_id
  ) then
    raise exception 'P1 migration blocked: submissions.project_id does not match its group project.';
  end if;
  if exists (
    select 1 from answers a
    join submissions s on s.id = a.submission_id
    join questions q on q.id = a.question_id
    where s.project_id <> q.project_id
  ) then
    raise exception 'P1 migration blocked: answers reference questions from another project.';
  end if;
end $$;

create unique index if not exists groups_project_id_id_uq on groups(project_id,id);
create unique index if not exists videos_project_id_id_uq on videos(project_id,id);
create unique index if not exists questions_project_id_id_uq on questions(project_id,id);
create unique index if not exists submissions_project_id_id_uq on submissions(project_id,id);

-- Store project scope on junction/answer rows, then enforce composite foreign keys.
alter table group_videos add column if not exists project_id uuid;
update group_videos gv set project_id = g.project_id from groups g where g.id = gv.group_id and gv.project_id is null;
alter table group_videos alter column project_id set not null;

alter table answers add column if not exists project_id uuid;
update answers a set project_id = s.project_id from submissions s where s.id = a.submission_id and a.project_id is null;
alter table answers alter column project_id set not null;

alter table group_videos drop constraint if exists group_videos_project_group_fkey;
alter table group_videos add constraint group_videos_project_group_fkey
  foreign key(project_id,group_id) references groups(project_id,id) on delete cascade;
alter table group_videos drop constraint if exists group_videos_project_video_fkey;
alter table group_videos add constraint group_videos_project_video_fkey
  foreign key(project_id,video_id) references videos(project_id,id) on delete cascade;

alter table submissions drop constraint if exists submissions_project_group_fkey;
alter table submissions add constraint submissions_project_group_fkey
  foreign key(project_id,group_id) references groups(project_id,id) on delete cascade;
alter table submissions drop constraint if exists submissions_project_video_fkey;
alter table submissions add constraint submissions_project_video_fkey
  foreign key(project_id,video_id) references videos(project_id,id) on delete set null;

alter table answers drop constraint if exists answers_project_submission_fkey;
alter table answers add constraint answers_project_submission_fkey
  foreign key(project_id,submission_id) references submissions(project_id,id) on delete cascade;
alter table answers drop constraint if exists answers_project_question_fkey;
alter table answers add constraint answers_project_question_fkey
  foreign key(project_id,question_id) references questions(project_id,id) on delete cascade;

-- Backward-compatible trigger: current admin UI inserts group_id/video_id only.
-- The trigger fills project_id and rejects a cross-project pair before FK checks.
create or replace function enforce_group_video_project()
returns trigger language plpgsql set search_path=public as $$
declare group_project uuid; video_project uuid;
begin
  select project_id into group_project from groups where id = new.group_id;
  select project_id into video_project from videos where id = new.video_id;
  if group_project is null or video_project is null or group_project <> video_project then
    raise exception 'Kelompok dan video harus berasal dari project yang sama.';
  end if;
  new.project_id := group_project;
  return new;
end $$;
drop trigger if exists group_video_project_guard on group_videos;
create trigger group_video_project_guard before insert or update on group_videos
for each row execute function enforce_group_video_project();

-- A project archive is reversible: retain groups, drafts, submitted work and answers.
-- Archived projects are read-only for content/student work; project status can still be changed.
create or replace function reject_archived_project_write()
returns trigger language plpgsql set search_path=public as $$
declare pid uuid;
begin
  if tg_table_name in ('videos','questions','groups') then
    pid := coalesce(new.project_id, old.project_id);
  elsif tg_table_name in ('group_members','group_videos') then
    select project_id into pid from groups where id = coalesce(new.group_id, old.group_id);
  elsif tg_table_name = 'question_options' then
    select project_id into pid from questions where id = coalesce(new.question_id, old.question_id);
  elsif tg_table_name = 'submissions' then
    pid := coalesce(new.project_id, old.project_id);
  elsif tg_table_name = 'answers' then
    pid := coalesce(new.project_id, old.project_id);
  end if;

  if pid is not null and exists(select 1 from projects where id=pid and is_active=false) then
    raise exception 'Project diarsipkan: data pembelajaran bersifat baca-saja.';
  end if;
  return coalesce(new,old);
end $$;

drop trigger if exists archived_project_guard_videos on videos;
create trigger archived_project_guard_videos before insert or update or delete on videos
for each row execute function reject_archived_project_write();
drop trigger if exists archived_project_guard_questions on questions;
create trigger archived_project_guard_questions before insert or update or delete on questions
for each row execute function reject_archived_project_write();
drop trigger if exists archived_project_guard_groups on groups;
create trigger archived_project_guard_groups before insert or update or delete on groups
for each row execute function reject_archived_project_write();
drop trigger if exists archived_project_guard_members on group_members;
create trigger archived_project_guard_members before insert or update or delete on group_members
for each row execute function reject_archived_project_write();
drop trigger if exists archived_project_guard_group_videos on group_videos;
create trigger archived_project_guard_group_videos before insert or update or delete on group_videos
for each row execute function reject_archived_project_write();
drop trigger if exists archived_project_guard_options on question_options;
create trigger archived_project_guard_options before insert or update or delete on question_options
for each row execute function reject_archived_project_write();
drop trigger if exists archived_project_guard_submissions on submissions;
create trigger archived_project_guard_submissions before insert or update or delete on submissions
for each row execute function reject_archived_project_write();
drop trigger if exists archived_project_guard_answers on answers;
create trigger archived_project_guard_answers before insert or update or delete on answers
for each row execute function reject_archived_project_write();

commit;

-- Archive policy:
-- * student content endpoint denies archived projects;
-- * student write endpoint denies save_identity/begin_submission/save_answer/submit_group;
-- * existing drafts/submitted answers remain stored and available to the teacher;
-- * reactivation flips projects.is_active back to true; no data migration is needed.
