-- P0: tutup pembacaan langsung tabel konten oleh pengguna publik.
-- Jalankan SETELAH deployment aplikasi memakai /api/student-content.
-- Perubahan ini tidak menghapus data dan dapat dijalankan ulang.
begin;

alter table public.projects enable row level security;
alter table public.videos enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;

-- Hapus policy lama yang membolehkan anon melihat seluruh konten aktif.
drop policy if exists "public read" on public.projects;
drop policy if exists "public read" on public.videos;
drop policy if exists "public read" on public.questions;
drop policy if exists "public read" on public.question_options;

-- Pertahanan tambahan: role anonim tidak mendapat SELECT langsung.
-- Akun guru terautentikasi tetap menggunakan policy "admin all" + is_admin().
revoke select on table
  public.projects,
  public.videos,
  public.questions,
  public.question_options
from public, anon;

-- Statistik total kelompok/konten tidak lagi tersedia sebagai RPC publik.
revoke execute on function public.stats() from public, anon, authenticated;
grant execute on function public.stats() to service_role;

commit;

-- Setelah menjalankan:
-- 1) Periksa bahwa hanya policy admin yang tersisa pada empat tabel tersebut.
-- 2) Pastikan halaman LKPD siswa tetap bekerja via /api/student-content.
-- 3) Jangan jalankan schema.sql lama di database produksi.
