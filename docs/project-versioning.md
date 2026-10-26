# Versi Proyek dan LKPD — Desain dan Panduan Rilis

**Status:** implementasi pada branch; migration belum diterapkan pada Supabase staging maupun Production.
**Tujuan:** memisahkan materi kerja guru dari snapshot konten yang dipakai siswa, agar publikasi baru tidak mengubah tafsir pekerjaan yang sudah berjalan.

## Alur kerja guru

1. **Edit materi kerja.** Guru tetap memakai menu Proyek, Video Kasus, dan Pertanyaan LKPD untuk mengedit data kerja.
2. **Simpan snapshot draft.** Di **Admin → Versi Proyek & LKPD**, pilih **Buat snapshot draft**. Snapshot mencatat metadata proyek, video beserta metadata, pertanyaan, dan opsi jawaban. Jika draft sudah ada, penyimpanan berikutnya memperbarui draft tersebut.
3. **Pratinjau.** Pratinjau membaca JSON snapshot tersimpan, bukan langsung membaca ulang tabel kerja. Perubahan di editor setelah snapshot dibuat belum terlihat pada pratinjau sampai draft disimpan ulang.
4. **Validasi.** Server memeriksa kelengkapan minimum: judul proyek, sedikitnya satu video aktif, sedikitnya satu pertanyaan aktif, fase PBL dan tipe pertanyaan yang dikenali, serta minimal dua opsi pada soal pilihan.
5. **Terbitkan.** Tombol terbitkan aktif hanya setelah validasi untuk ID draft terbaru berhasil. Fungsi database mengulang validasi di dalam transaksi, membuat snapshot tersebut immutable, lalu mengganti pointer `projects.active_version_id`.
6. **Tinjau riwayat.** Versi terbit ditampilkan sebagai versi aktif atau historis. Versi terbit tidak dapat diedit; perubahan berikutnya memerlukan draft dan publikasi versi baru.

## Model data

- `public.project_versions`: identitas versi, nomor urut dalam proyek, status draft/terbit, snapshot JSON konten, relasi `based_on_version_id`, pembuat, penerbit, dan timestamp.
- `public.projects.active_version_id`: menunjuk versi terbit yang dipakai ketika kelompok **memulai pengerjaan baru**.
- `public.submissions.project_version_id`: pin versi yang dipakai submission itu. FK komposit memastikan versi tersebut berasal dari proyek yang sama.
- Snapshot memuat identitas proyek, metadata video, pertanyaan, fase PBL, tipe/ketentuan wajib, urutan, serta teks dan urutan opsi. Jawaban tetap memakai ID pertanyaan, sedangkan guru membaca teks pertanyaan historis dari snapshot yang terkait dengan submission.

Migration membuat **versi terbit baseline v1** untuk setiap proyek yang sudah ada dan mengikat submission lama ke baseline tersebut. Ini penting supaya pekerjaan yang dibuat sebelum fitur versioning tetap punya satu versi rujukan yang jelas setelah migration diterapkan.

## Jaminan integritas yang disiapkan

- Perubahan pada tabel kerja tidak otomatis mengubah `project_versions.content` yang sudah terbit.
- Submission baru memilih versi aktif ketika `begin_submission` dijalankan; jika proyek menerbitkan versi baru, submission yang sudah ada tidak dipindahkan ke versi baru.
- Konten siswa dimuat dari snapshot versi yang dipin. Validasi akhir submission juga memeriksa pertanyaan wajib/aktif dan opsi berdasarkan snapshot tersebut, bukan tabel pertanyaan kerja terkini.
- Penyimpanan jawaban dan finalisasi tetap mengunci baris submission yang sama. Penyimpanan ditolak bila submission sudah dikirim.
- Penghapusan fisik video/pertanyaan yang direferensikan versi terbit dicegah. Video di UI admin diarahkan untuk diarsipkan, bukan menghapus file Storage yang mungkin dibutuhkan oleh snapshot lama.
- Tabel versi memakai RLS admin, tetapi peran `authenticated` hanya mendapat hak baca langsung. `INSERT`/`UPDATE`/`DELETE` versi harus melewati RPC resmi; `admin_save_project_version_draft` dan `admin_publish_project_version` memakai `SECURITY DEFINER`, `search_path` kosong, serta pemeriksaan `private.is_admin()`.
- Trigger `projects_active_version_publish_guard` menolak perubahan langsung pada `projects.active_version_id`, kecuali perubahan yang dijalankan sebagai pemilik RPC publikasi dan menunjuk snapshot terbit milik proyek yang sama. Ini menutup jalur tabel langsung tanpa mengambil hak metadata proyek dari editor admin.

Ini adalah jaminan desain/source. Jaminan runtime baru boleh dinyatakan lulus setelah migration dan tes integrasi diterapkan pada staging yang terverifikasi.

## Mengapa nilai historis tidak berubah?

Saat publikasi, hanya pointer versi aktif proyek yang berubah. Kolom `submissions.project_version_id` tidak di-update oleh proses publikasi. Jawaban tetap terkait submission dan ID pertanyaannya, sementara halaman hasil guru dan siswa memilih definisi pertanyaan dari snapshot versi submission tersebut. Dengan demikian teks pertanyaan, opsi, fase, dan konteks LKPD historis tidak bergantung pada perubahan materi kerja setelahnya.

## Rubrik dan penilaian — cakupan berikutnya

Belum ada model penilaian/rubrik terstruktur yang dibangun dalam perubahan ini. Jangan menganggap versi proyek ini sudah mencakup versi rubrik.

Tahap lanjut disarankan menambahkan `rubric_versions` dengan draft/published snapshot serta relasi ke proyek dan kemudian menautkan setiap hasil penilaian melalui `assessments.rubric_version_id` (atau model penilaian setara setelah skema penilaian dirancang). Penilaian historis harus merujuk versi rubrik yang benar, sama seperti submission merujuk versi LKPD. Struktur dan migrasinya perlu dirancang terpisah setelah kriteria, level kinerja, bobot, dan perhitungan nilai disepakati.

## Gerbang verifikasi sebelum rilis

1. Tinjau SQL migration dan pastikan urutannya cocok dengan history database target.
2. Terapkan hanya ke project staging yang benar melalui alur migration yang disetujui; jangan `db push` ke Production. Setelah migration, jalankan `supabase/p1-versioning-security-test.sql` di SQL Editor Staging sebagai database owner. Skrip memeriksa penolakan direct DML, bypass pointer, RPC simpan draft, dan penolakan publish untuk draft invalid; skrip melakukan rollback atas fixture sintetis.
3. Jalankan tes dengan fixture sintetis: baseline existing, simpan draft, edit working table setelah draft, preview harus tetap stabil, validasi gagal/lulus, publish v2, v1 tetap immutable, submission baru memakai v2, submission lama tetap di v1, save/submit mengacu pertanyaan v1/v2 yang benar, serta isolasi lintas proyek.
4. Uji jalur browser guru dan siswa pada deployment dari SHA yang sama dengan target staging. Pastikan URL, anon key, dan server-side service-role credential semua menunjuk staging; jangan mengubah konfigurasi Production.
5. Uji kompatibilitas terhadap proyek/submission pra-migrasi, baca hasil lama dan ekspor, nonaktifkan konten secara aman, serta jalankan backup/restore rehearsal.
6. Setelah semua bukti lulus, minta review independen sebelum memutuskan merge/deploy.

## Status implementasi

Pada branch implementasi ini tersedia migration, halaman versi admin, pemuatan konten siswa dari snapshot terbit, pin versi pada submission, label versi pada hasil guru/siswa, dan pemeriksaan source-level. Belum ada migration yang diterapkan ke database, tes browser, atau tes database integrasi pada versi baru. CI/build dan tes source-level tidak menggantikan verifikasi migration/runtime.
