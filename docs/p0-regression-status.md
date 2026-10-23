# CIVIC VISION — Status pengujian keamanan dan regresi

## Status lingkungan staging (2026-10-23)

- [x] Proyek Supabase staging terpisah dibuat: `civic-vision-staging` (`bneqqkvhehrlcjhvvyvv`), region `ap-northeast-1`, estimasi pembuatan US$0/bulan.
- [x] Skema dasar, konfigurasi keamanan, project isolation, rate limiter, public-read lockdown, dan migrasi hardening diterapkan pada staging.
- [x] Tidak ada data proyek/kelompok/submission/jawaban yang disalin dari Production; tabel yang diperiksa masih kosong.
- [x] Seluruh 11 tabel aplikasi memiliki RLS; akses baca langsung anon ditolak; video bucket privat; RPC siswa dibatasi ke `service_role`.
- [x] Security Advisor setelah hardening hanya menampilkan INFO untuk `api_rate_limits` yang tidak memiliki policy RLS. Tabel tetap tidak dapat diakses `anon`/`authenticated`.
- [ ] Vercel Preview belum dapat diarahkan ke staging karena tool Vercel mengembalikan HTTP 403 untuk scope tim `uki8`; daftar tim yang bisa diakses kosong. Belum ada environment variable Vercel yang diubah.
- [ ] Browser/concurrency tests tetap ditahan sampai Preview dipastikan menggunakan staging.

Rincian: [docs/staging-setup.md](./staging-setup.md).

## Pengujian otomatis yang sudah dijalankan

- [x] Instalasi dependensi (`npm ci`) berhasil pada GitHub Actions.
- [x] Pemeriksaan TypeScript (`npx tsc --noEmit`) lulus pada commit UI PBL terbaru yang diperiksa.
- [x] Pemeriksaan invariants PBL dan keamanan lulus pada workflow sebelumnya.
- [x] Audit dependensi produksi dijalankan pada GitHub Actions; audit sebelumnya melaporkan 0 kerentanan dependensi produksi.
- [x] RLS aktif pada 11 tabel aplikasi yang diperiksa.
- [x] Query langsung mengonfirmasi tidak ada grant tabel untuk anon pada 11 tabel yang diperiksa.
- [x] RPC siswa (termasuk `student_rate_limit`) tidak dapat dieksekusi anon/authenticated dan hanya dapat dijalankan `service_role`.
- [x] `public.is_admin()` sudah tidak ada; helper berada di schema `private` dan anon tidak bisa mengeksekusinya.
- [x] Tiga RPC editor terpasang; anon tidak memiliki EXECUTE, authenticated dapat memanggilnya dengan pemeriksaan admin di dalam fungsi.
- [x] Bucket `videos` terverifikasi privat, batas 50 MiB, MIME sesuai kebijakan.
- [x] Performance Advisor tidak lagi menandai foreign key yang sebelumnya tidak memiliki indeks; indeks baru masih mungkin berstatus unused karena beban kueri kecil.
- [x] **P0 autosave/submit diperbaiki pada database aktif** melalui migrasi `20261023010223_serialize_answer_saves_with_submission`.
- [x] Definisi `save_answer()` setelah migrasi diverifikasi: mengambil `FOR UPDATE` pada baris submission yang sama dengan `submit_group()`, memeriksa status `draft`, mengisi `answers.project_id`, membatasi pertanyaan ke proyek kelompok, dan menolak akses dari `anon`/ `authenticated`. Hanya `service_role` yang memiliki EXECUTE.
- [x] Fungsi `save_answer()` menggunakan `search_path = ''` dan seluruh referensi tabel/fungsi yang relevan dikualifikasi dengan schema.

## Perlindungan yang diterapkan

- Penyimpanan soal beserta opsi dilakukan dalam satu RPC transaksional.
- Perubahan teks/fase/tipe/opsi soal yang sudah memiliki jawaban ditolak agar makna jawaban lama tidak berubah diam-diam.
- Penghapusan soal yang memiliki jawaban menonaktifkan soal, bukan menghapus histori.
- Pengurutan soal dilakukan lewat satu RPC transaksional.
- Empat fase PBL menampilkan tujuan dan hasil yang diharapkan; fase kosong memberi pesan yang jelas.
- Autosave dan submit sekarang menggunakan lock baris submission yang sama. Simpanan yang mendapatkan lock terlebih dahulu selesai sebelum submit memvalidasi; simpanan yang datang setelah submit tersimpan akan melihat status bukan `draft` dan ditolak.
- File migrasi disimpan di `supabase/migrations/20261023010223_serialize_answer_saves_with_submission.sql`; salinan skrip P0 diselaraskan agar tidak lagi menimpa `submit_group()` dengan definisi lama.

## Skenario regresi browser yang masih perlu dijalankan

Tes di bawah belum dapat dinyatakan lulus dari CI atau query metadata saja:

- [ ] Guru masuk/logout; akses area guru tanpa sesi ditolak.
- [ ] Guru membuat/mengedit/nonaktifkan soal teks dan pilihan; opsi tersimpan secara atomik.
- [ ] Kesalahan validasi/database membuat form tetap terbuka dan tidak menampilkan sukses.
- [ ] Soal berjawaban ditolak jika teks/tipe/fase/opsi diubah; jawaban lama tetap utuh.
- [ ] Soal berjawaban hanya dinonaktifkan; soal tanpa jawaban dapat dihapus.
- [ ] Pengurutan soal bertahan setelah refresh dan tidak mencampur proyek.
- [ ] Kode kelompok tidak valid dan video yang tidak ditugaskan tidak membuka konten.
- [ ] Kelompok A tidak dapat membaca konten/jawaban kelompok B atau proyek lain.
- [ ] **Autosave dan submit bersamaan**: ketik jawaban lalu segera kirim; periksa nilai akhir di server pada kelompok uji.
- [ ] Putuskan koneksi ketika save tertunda, sambungkan lagi, lalu verifikasi nilai terakhir tersimpan tepat satu kali secara logis (upsert).
- [ ] Refresh ketika ada jawaban tertunda dan verifikasi pemulihan antrean lokal/server.
- [ ] Submit menunggu autosave; jawaban terkunci setelah submit dan tidak berubah walau ada percobaan save terlambat.
- [ ] Guru membuka kembali tugas; siswa dapat melanjutkan tanpa kehilangan histori, jika fitur buka-kembali diaktifkan.
- [ ] URL objek Storage tanpa izin ditolak; video untuk kelompok yang benar tetap bisa dibuka.
- [ ] Tampilan ponsel dan fase kosong SEE/THINK/CONNECT/ACT.

## Mengapa tes browser belum ditandai lulus

Perbaikan P0 sudah diverifikasi pada definisi dan hak akses database, tetapi belum dibuktikan dengan uji browser/concurrency pada kelompok uji. Deployment Preview terbaru belum diverifikasi memakai commit terbaru dan pada pemeriksaan sebelumnya Vercel mencapai batas deployment harian paket Free. Selain itu, konfigurasi Preview sebelumnya menggunakan nilai environment Supabase yang sama dengan Production. Tes alur siswa yang menulis data di Preview belum aman sebelum Preview diarahkan ke database staging yang terpisah.

Jangan jalankan tes yang mengubah identitas, jawaban, kelompok, atau status submission pada kelompok nyata. Gunakan database staging dan kelompok uji setelah Preview diarahkan ke staging.
