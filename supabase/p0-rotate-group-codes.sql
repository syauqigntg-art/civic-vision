-- P0: rotasi semua kode kelompok menjadi kode yang jauh lebih sulit ditebak.
-- PERINGATAN: skrip ini mengganti SEMUA kode akses kelompok.
-- Jalankan hanya setelah siap membagikan kode baru kepada setiap kelompok.
-- Butuh pgcrypto (sudah dibuat oleh schema.sql CIVIC VISION).
begin;

update public.groups
set access_code = 'CV-' || upper(encode(gen_random_bytes(10), 'hex')),
    updated_at = now();

commit;

-- Hasil: 20 karakter heksadesimal acak setelah CV- (80 bit entropi).
-- Setelah dijalankan, bagikan ulang kode yang terlihat pada Dashboard Kelompok.
