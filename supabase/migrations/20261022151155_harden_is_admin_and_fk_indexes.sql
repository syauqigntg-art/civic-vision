-- Harden the admin-check helper without changing its boolean semantics.
-- An empty search_path prevents object-shadowing while SECURITY DEFINER is required
-- by the current admin RLS policies that read public.users.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$function$;

-- Cover foreign keys identified by Supabase Performance Advisor.
-- Existing tables are small; each statement is idempotent.
create index if not exists idx_answers_project_question
  on public.answers (project_id, question_id);

create index if not exists idx_answers_project_submission
  on public.answers (project_id, submission_id);

create index if not exists idx_answers_question_id
  on public.answers (question_id);

create index if not exists idx_group_videos_project_group
  on public.group_videos (project_id, group_id);

create index if not exists idx_group_videos_project_video
  on public.group_videos (project_id, video_id);

create index if not exists idx_group_videos_video_id
  on public.group_videos (video_id);

create index if not exists idx_submissions_project_group
  on public.submissions (project_id, group_id);

create index if not exists idx_submissions_project_video
  on public.submissions (project_id, video_id);

create index if not exists idx_submissions_video_id
  on public.submissions (video_id);
