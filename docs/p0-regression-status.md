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
- [x] Pemeriksaan invariants PBL dan keamanan lulus pada run #23 untuk head SHA `261176eb9aafc986244baa0b606eabecebbc0c7b`.
- [x] `npm audit --omit=dev` benar-benar dijalankan pada run #23, tetapi **gagal dengan exit code 1**: satu temuan kritis pada `next@16.4.0`; laporan menampilkan GHSA-2464-fhr4-w9xw, GHSA-p3m5-59mp-jv5r, dan GHSA-673q-mjm6-r5xr. Next.js menyatakan versi 16.4.1 sebagai versi perbaikan ([advisory image optimization](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw), [advisory typed arrays](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr), [advisory Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r)).
- [ ] Naikkan dependency `next` ke versi yang sudah dipatch (minimal 16.4.1), regenerasi `package-lock.json`, lalu jalankan audit ulang.
- [x] Status keseluruhan run #23 `success` **tidak berarti audit bersih**: workflow lama memakai `continue-on-error: true`, sehingga exit code audit 1 tidak menggagalkan job. Workflow diperbaiki pada commit tinjauan ini agar audit menjadi blocking; run baru harus diperiksa terhadap SHA baru.
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

## Empat skenario utama yang belum diuji di browser

Keempat skenario ini tetap **BELUM DIUJI** sampai ada Preview yang terbukti memakai staging. Source checks dan query database bukan bukti uji runtime.

- [ ] **Submit segera setelah mengetik:** ketik atau ubah jawaban lalu tekan kirim secepatnya; nilai final di server harus sama dengan nilai terbaru.
- [ ] **Koneksi putus saat autosave:** putuskan koneksi ketika penyimpanan tertunda, pulihkan koneksi, lalu pastikan antrean terkirim dan nilai terakhir tersimpan dengan benar.
- [ ] **Save terlambat setelah submit:** tahan satu request save sampai submit berhasil, lalu lepaskan request; server harus menolak save terlambat dan jawaban submission yang sudah terkirim tidak berubah.
- [ ] **Guru membuka kembali pengerjaan:** periksa dulu apakah aksi buka-kembali memang tersedia pada UI dan RPC saat ini. Jika ada, pastikan status/akses siswa kembali terbuka tanpa menghapus jawaban lama; jika tidak ada, catat sebagai fitur belum tersedia, bukan tes yang lulus.

## Skenario regresi browser tambahan yang masih perlu dijalankan

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

Perbaikan P0 sudah diverifikasi pada definisi dan hak akses database, tetapi belum dibuktikan dengan uji browser/concurrency pada kelompok uji. Preview terbaru belum terbukti menggunakan SHA kandidat saat ini maupun database staging. Akses Vercel scope tim `uki8` menghasilkan HTTP 403, dan komentar Vercel sebelumnya melaporkan batas deployment harian paket Free. Tidak ada environment variable Vercel yang diubah. Jangan menjalankan tes yang menulis data melalui Preview sampai akses pulih, env Preview diarahkan ke staging, dan deployment SHA serta URL database terverifikasi.

Jangan jalankan tes yang mengubah identitas, jawaban, kelompok, atau status submission pada kelompok nyata. Gunakan database staging dan kelompok uji setelah Preview diarahkan ke staging.
