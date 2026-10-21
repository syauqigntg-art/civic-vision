-- CIVIC VISION P0 REMEDIATION: REMOVE DIRECT ANONYMOUS TABLE ACCESS
-- Review before running in Supabase SQL Editor.
-- This changes permissions/policies, but does not change or delete student data.
-- Student browser content should be served through the server endpoints:
-- /api/student, /api/student-content, and /api/media.
-- Admin remains able to manage data through authenticated requests + admin RLS policies.
-- Run only after confirming the application uses those server endpoints.

begin;

-- Remove anonymous/public table grants as defense in depth.
-- Keep authenticated grants so teacher admin pages can work; RLS restricts authenticated users.
revoke all privileges on table
  public.users,
  public.projects,
  public.groups,
  public.group_members,
  public.videos,
  public.group_videos,
  public.questions,
  public.question_options,
  public.submissions,
  public.answers,
  public.api_rate_limits
from public, anon;

-- Active project/video/question metadata must not be directly readable by anonymous
-- or normal authenticated users. Admin access remains governed by "admin all" + is_admin().
drop policy if exists "public read" on public.projects;
drop policy if exists "public read" on public.videos;
drop policy if exists "public read" on public.questions;
drop policy if exists "public read" on public.question_options;

-- Explicitly retain RLS for all application tables.
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.videos enable row level security;
alter table public.group_videos enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;
alter table public.api_rate_limits enable row level security;

commit;

-- Expected after running:
-- 1) anon direct table grants for the listed public tables should be false.
-- 2) public read policies should no longer exist on projects/videos/questions/question_options.
-- 3) authenticated admin continues to use the admin-all policies.
-- 4) students continue using the server API; test videos/questions and teacher admin immediately.
