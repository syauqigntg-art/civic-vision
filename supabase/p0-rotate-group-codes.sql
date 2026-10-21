-- P0: rotasi semua kode kelompok menjadi kode yang lebih sulit ditebak.
-- PERINGATAN: menjalankan skrip ini mengganti SEMUA kode akses kelompok.
-- Jalankan hanya setelah siap membagikan kode baru kepada setiap kelompok.
-- Butuh pgcrypto (sudah dibuat oleh schema.sql CIVIC VISION).
begin;

update public.groups
set access_code =
  'K' || coalesce(group_number::text, '0') || '-' ||
  upper(encode(gen_random_bytes(8), 'hex')),
    updated_at = now();

commit;

-- Hasil: suffix 16 karakter heksadesimal acak (64 bit), bukan 8 karakter.
-- Setelah dijalankan, cetak/bagikan ulang kode melalui Dashboard Kelompok.
