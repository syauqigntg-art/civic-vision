-- JALANKAN SETELAH schema.sql (aman dijalankan ulang untuk instalasi yang sudah ada)
-- 1) Fungsi siswa hanya bisa dipanggil server (service role), bukan langsung dari browser.
revoke execute on function get_group(text),save_identity(text,text,int,text,text,jsonb),begin_submission(text,uuid),get_answers(text),save_answer(text,uuid,text),submit_group(text) from public,anon,authenticated;
grant execute on function get_group(text),save_identity(text,text,int,text,text,jsonb),begin_submission(text,uuid),get_answers(text),save_answer(text,uuid,text),submit_group(text) to service_role;
-- 2) Konten hanya dibaca guru berhak atau API server yang memverifikasi kode + penugasan.
-- Jangan buat policy baca publik pada tabel ini.
drop policy if exists "public read" on public.videos;
drop policy if exists "public read" on public.questions;
drop policy if exists "public read" on public.projects;
drop policy if exists "public read" on public.question_options;
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
  public.answers
from public, anon;

-- RPC statistik menghitung jumlah kelompok/konten dan tidak dipakai oleh beranda lagi.
revoke execute on function public.stats() from public, anon, authenticated;
grant execute on function public.stats() to service_role;
-- 3) Bucket video privat + batas ukuran/tipe dipaksa di sisi server. Tanpa policy baca publik; siswa memakai signed URL dari /api/media.
update storage.buckets set public=false,file_size_limit=52428800,allowed_mime_types=array['video/mp4','video/webm','video/quicktime','image/jpeg','image/png','image/webp'] where id='videos';
-- 4) Batas panjang input di database (pertahanan terakhir selain Zod).
alter table groups drop constraint if exists g_len; alter table groups add constraint g_len check (char_length(group_name)<=80 and char_length(class_name)<=20 and char_length(leader_name)<=80);
alter table group_members drop constraint if exists m_len; alter table group_members add constraint m_len check (char_length(name)<=80);
alter table answers drop constraint if exists a_len; alter table answers add constraint a_len check (char_length(answer_text)<=5000);
alter table videos drop constraint if exists v_len; alter table videos add constraint v_len check (char_length(title)<=150 and char_length(coalesce(description,''))<=1000);
alter table questions drop constraint if exists q_len; alter table questions add constraint q_len check (char_length(question_text)<=500 and min_items between 1 and 10);
alter table question_options drop constraint if exists o_len; alter table question_options add constraint o_len check (char_length(option_text)<=300);
-- 5) Perbaiki hanya kode lama yang sangat pendek.
-- Rotasi seluruh kode aktif dilakukan terpisah melalui p0-rotate-group-codes.sql
-- karena perubahan tersebut membutuhkan pembagian kode baru kepada kelompok.
update public.groups
set access_code='CV-'||upper(encode(gen_random_bytes(10),'hex'))
where char_length(access_code)<11;
