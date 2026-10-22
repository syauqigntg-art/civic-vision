-- P0: tutup pembacaan langsung tabel konten dan data siswa oleh pengguna publik.
-- Jalankan SETELAH deployment aplikasi memakai /api/student-content berstatus Ready.
-- Perubahan ini tidak menghapus data dan dapat dijalankan ulang.
begin;

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

-- Hapus policy baca publik lama dari tabel konten.
drop policy if exists "public read" on public.projects;
drop policy if exists "public read" on public.videos;
drop policy if exists "public read" on public.questions;
drop policy if exists "public read" on public.question_options;

-- Pertahanan tambahan: tidak ada grant untuk PUBLIC/anon pada tabel siswa/konten.
-- Grant authenticated yang dipakai dashboard guru tidak diubah; tetap dibatasi RLS admin.
revoke all on table
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

-- RPC yang dipakai siswa hanya boleh dipanggil oleh backend dengan service_role.
-- Revokasi dibuat dinamis agar tetap idempoten pada instalasi yang memiliki fungsi versi berbeda.
-- Fungsi yang tidak ada dilewati; semua overload dengan nama berikut ikut diamankan.
do $$
declare
  fn record;
begin
  for fn in
    select p.proname, pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname in (
        'get_group', 'save_identity', 'begin_submission', 'get_answers',
        'save_answer', 'submit_group', 'student_rate_limit', 'stats'
      )
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      'public', fn.proname, fn.identity_args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      'public', fn.proname, fn.identity_args
    );
  end loop;
end $$;

-- Pastikan bucket video tetap privat dengan batas file dan tipe yang telah disepakati.
update storage.buckets
set public = false,
    file_size_limit = 52428800,
    allowed_mime_types = array[
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
where id = 'videos';

commit;

-- Setelah menjalankan:
-- 1) Periksa bahwa tabel konten tidak punya policy baca anon/PUBLIC.
-- 2) Pastikan policy "admin all" tetap ada untuk authenticated admin.
-- 3) Uji siswa melalui website (konten kini dimuat melalui API server).
-- 4) Jangan jalankan schema.sql lama di database produksi.
