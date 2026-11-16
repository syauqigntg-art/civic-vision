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
