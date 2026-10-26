# CIVIC VISION — Pemetaan Kebutuhan dan Keberlanjutan Sistem

**Tanggal audit:** 2026-10-26 (Asia/Jakarta)
**Repository:** `syauqigntg-art/civic-vision`
**Baseline aktual:** `main` pada `870566d5e8160099bc85b456a28474e69bc06672` (merge PR #15; menggantikan baseline awal `f470cb5b322bc76282c24610be3a10e6c4809d65`).
**Metode:** inspeksi source, skema SQL/migrasi, tes otomatis yang terdefinisi, dan dokumen QA yang ada. Tidak ada browser/staging test baru yang dijalankan sebagai bagian audit ini.

> **Batas penting:** status “tersedia” berarti ada bukti implementasi di source/dokumen, bukan jaminan runtime. Tidak ada butir yang diberi status “Tersedia dan terverifikasi” hanya berdasarkan keberadaan halaman, kolom, atau tes source-level. Catatan staging pada dokumen yang dirujuk merupakan snapshot bertanggal 2026-10-23 dan perlu dicocokkan lagi dengan deployment/SHA yang diuji.

## 1. Definisi status

- **Tersedia dan terverifikasi** — implementasi dan perilaku telah diuji dengan bukti yang sesuai.
- **Tersedia, perlu penyempurnaan** — kemampuan dasar ditemukan, tetapi cakupan atau bukti penerimaan belum lengkap.
- **Belum ditemukan** — kemampuan inti tidak ditemukan pada source yang diperiksa.
- **Belum diverifikasi** — implementasi atau konfigurasi mungkin ada, tetapi bukti runtime/operasional yang cukup belum tersedia.
- **Tidak diperlukan** — hanya boleh digunakan setelah keputusan ruang lingkup produk dan alasannya dicatat.

Prioritas: **P0** keamanan/integritas yang menghalangi penggunaan aman; **P1** kebutuhan inti guru/siswa; **P2** keberlanjutan, efisiensi, dan kualitas setelah fondasi aman. Prioritas tidak sama dengan status.

## 2. Ringkasan keputusan audit

| Area | Status audit source | Prioritas | Keputusan/tindak lanjut |
|---|---|---:|---|
| B.1 Pengguna dan hak akses | Tersedia, perlu penyempurnaan | P0 | Pertahankan autentikasi/RLS; rancang peran guru terpisah bila dibutuhkan, prosedur akun, pemulihan, dan audit perubahan kewenangan. |
| B.2 Sekolah/kelas/periode | Tersedia, perlu penyempurnaan | P1 | Pertahankan kelompok/penugasan dan isolasi proyek; putuskan apakah sekolah, kelas formal, mata pelajaran, dan tahun ajaran menjadi entitas. |
| B.3 Pemeliharaan sistem | Tersedia, perlu penyempurnaan | P0 | Pertahankan CI, SQL audit, dokumentasi staging; lengkapi health/monitoring dan bukti backup-restore. |
| C.1 Identitas proyek | Tersedia, perlu penyempurnaan | P1 | Pertahankan CRUD dasar dan arsip; lengkapi editor metadata dan keluaran/tujuan pembelajaran. |
| C.2 Draft, publikasi, versi | Belum ditemukan | P1 | Rancang model versi immutable, draft, validasi, publikasi, rollback, dan tautan submission ke versi. |
| D.1 Konfigurasi tahapan PBL | Tersedia, perlu penyempurnaan | P0 | Jangan menyamakan empat label SEE/THINK/CONNECT/ACT dengan lima tahap PBL; rancang konfigurasi yang divalidasi. |
| D.2 A.1 Validitas masalah | Tersedia, perlu penyempurnaan | P1 | Audit konten kasus/prompt aktif dengan rubrik pedagogis dan bukti respons. |
| D.3 A.2 Orientasi masalah | Tersedia, perlu penyempurnaan | P1 | Tambahkan hasil belajar, ruang lingkup, pemisahan fakta/dugaan, dan uji pemahaman. |
| D.4 A.3 Organisasi belajar | Belum ditemukan | P0 | Buat pertanyaan penyelidikan, peran anggota, rencana kerja, dan tinjauan guru. |
| D.5 A.4 Pengelolaan bukti | Tersedia, perlu penyempurnaan | P0 | Tambahkan sumber/referensi dan hubungan klaim–bukti yang dapat ditinjau guru. |
| D.6 A.5 Produk/presentasi solusi | Tersedia, perlu penyempurnaan | P1 | Tambahkan artefak akhir dan alur peninjauan/umpan balik; ACT saja belum cukup. |
| D.7 A.6 Evaluasi/refleksi | Tersedia, perlu penyempurnaan | P1 | Tambahkan refleksi terstruktur yang dapat ditinjau terpisah. |
| D.8 A.7 Umpan balik/revisi | Tersedia, perlu penyempurnaan | P1 | Tambahkan feedback, revisi berversi, alasan perubahan, dan aturan penilaian final. |
| E.1 Editor LKPD | Tersedia, perlu penyempurnaan | P1 | Pertahankan editor dan pengamanan jawaban historis; tambahkan validasi publikasi/versi LKPD. |
| E.2 Materi dan pustaka | Tersedia, perlu penyempurnaan | P2 | Pertahankan video privat; rancang pustaka sumber, template, dan duplikasi proyek yang aman. |
| F.1 Editor rubrik | Belum ditemukan | P1 | Rancang kriteria, level kinerja, bobot, versi, dan cakupan individu/kelompok. |
| F.2 Nilai dan verifikasi | Belum ditemukan | P1 | Tetapkan formula, validasi rentang, audit penilai/waktu, koreksi, dan finalisasi. |
| F.3 Monitoring/laporan | Tersedia, perlu penyempurnaan | P1 | Pertahankan ringkasan progres/filter/ekspor; tambahkan progres tahap, feedback/revisi, rubrik, dan versi historis. |
| G.1 Integritas data | Tersedia, perlu penyempurnaan | P0 | Pertahankan batas proyek, RPC transaksi, migrasi; dokumentasikan retensi, penghapusan, idempotensi, dan restore test. |
| G.2 Keamanan/privasi | Tersedia, perlu penyempurnaan | P0 | Pertahankan RLS, API server, bucket privat; verifikasi deployment terkini dan putuskan kebijakan retensi/audit log. |
| G.3 Backup/restore | Belum diverifikasi | P0 | Buktikan backup, retensi, restore, RPO/RTO pada lingkungan aman. |
| G.4 Pemantauan | Belum ditemukan | P1 | Tambahkan monitoring terpusat/alert tanpa membocorkan data siswa atau kode akses. |
| H Pengujian/gerbang rilis | Belum diverifikasi | P0 | CI tersedia, tetapi gerbang browser/staging, isolasi, versi, dan restore belum lengkap/terbukti pada SHA terkini. |
| I Penggunaan lintas kelas/tahun | Tersedia, perlu penyempurnaan | P1 | Pertahankan arsip proyek; rancang periode, template, versi kurikulum/rubrik, dokumentasi, dan kepemilikan operasional. |

## 3. Pemetaan detail

Setiap status di bawah adalah hasil pemetaan source/dokumentasi, kecuali jika secara eksplisit disebut sebagai bukti tes historis. “Belum ditemukan” berarti tidak ditemukan pada jalur yang diperiksa, bukan klaim bahwa tidak mungkin ada di layanan eksternal.

### B. Dashboard admin sistem

#### B.1 Pengguna dan hak akses
**Status: Tersedia, perlu penyempurnaan — P0.**
**Bukti source:** `app/admin/login/page.tsx`, `proxy.ts`, `supabase/schema.sql`, `supabase/security.sql`, `supabase/migrations/20261022152719_secure_admin_helper_and_transactional_question_editor.sql`. Skema menetapkan peran `admin` dan `student`; proxy memeriksa login dan role admin untuk `/admin/*`; kebijakan/RPC admin juga memeriksa otorisasi.
**Yang belum tercakup:** UI untuk mengundang/mengelola akun guru/admin tidak ditemukan; role guru terpisah dari admin tidak ada pada constraint role yang diperiksa; alur pemulihan akun, perubahan kewenangan dengan audit trail, dan log tindakan admin belum dibuktikan. Akun siswa dibuat melalui alur identitas/kelompok, bukan sistem akun siswa individual yang terverifikasi.
**Tes/bukti:** ada tes invariant keamanan source-level pada `scripts/check-pbl-invariants.mjs` dan catatan audit staging di `docs/p0-regression-status.md`; tes tersebut bukan bukti browser terbaru untuk semua peran.
**Tindak lanjut:** pertahankan kontrol server/RLS; putuskan model peran (admin sistem vs guru), lifecycle akun, pemulihan, dan audit log.
**Kriteria penerimaan:** uji anon, siswa, guru, dan admin terhadap setiap rute/API/RPC; pastikan guru hanya melihat proyek yang ditugaskan dan semua perubahan role tercatat.

#### B.2 Sekolah, kelas, dan tahun ajaran
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti source:** `supabase/schema.sql` memiliki `projects`, `groups`, `group_members`, `group_videos`; `groups.class_name` tersedia dan kelompok ditautkan ke proyek. `supabase/p1-project-isolation.sql` menambahkan pemeriksaan hubungan lintas proyek dan batas komposit.
**Yang belum ditemukan:** entitas sekolah, kelas formal, mata pelajaran sebagai relasi terkelola, tahun ajaran/periode, penugasan guru, dan isolasi antarsekolah sebagai model multi-tenant. `subject` dan `grade` ada di skema proyek, tetapi keberadaan kolom tidak membuktikan workflow admin lengkap.
**Tes/bukti:** migrasi isolasi proyek dan catatan staging ada; tidak ada bukti runtime bahwa pergantian tahun ajaran diuji.
**Tindak lanjut:** putuskan target satu sekolah atau multi-sekolah. Jika multi-sekolah, desain tenant boundary, RLS, membership dan migration sebelum menambah UI.
**Kriteria penerimaan:** arsip/periode lama tetap dapat dibaca oleh pihak berwenang; proyek/kelompok baru tidak dapat membaca atau mewarisi submission periode lain.

#### B.3 Pemeliharaan sistem
**Status: Tersedia, perlu penyempurnaan — P0.**
**Bukti source/dokumen:** `.github/workflows/ci.yml`, `supabase/p0-post-hardening-audit-readonly.sql`, `docs/staging-setup.md`, `docs/p0-regression-status.md`, `docs/phase6-final-verification.md`. CI menginstal dependensi, menjalankan TypeScript, tes unit, source invariants, build, dan audit dependensi. SQL audit read-only memeriksa RLS/privilege/RPC. Dokumentasi staging memberi catatan setup dan batasan migrasi.
**Yang belum ditemukan/terverifikasi:** pusat health dashboard di aplikasi admin, alert operasional terpadu, backup/restore end-to-end, playbook insiden yang diuji, dan status migrasi yang terikat pada deployment SHA. Dokumentasi menyebut riwayat versi migrasi staging tidak selalu sama dengan timestamp nama file di repo; jangan menjalankan `supabase db push` tanpa rekonsiliasi.
**Tes/bukti:** CI pada PR #15 berhasil pada head sebelum merge; commit `main` saat audit `870566d5e8160099bc85b456a28474e69bc06672` memiliki status Vercel success, tetapi status tersebut bukan bukti browser atau restore test. Status GitHub Actions untuk exact merge SHA belum dikonfirmasi di audit ini.
**Tindak lanjut:** buat runbook deployment/migrasi, backup-restore, insiden, owner, dan pemeriksaan kesehatan. Jangan tampilkan secret dalam dashboard.
**Kriteria penerimaan:** latihan pemulihan tercatat dengan waktu mulai/selesai, data yang dipulihkan, verifikasi konsistensi, serta langkah rollback.

### C. Dashboard guru dan pengelolaan proyek

#### C.1 Identitas dan pengaturan proyek
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti source:** `app/admin/project/page.tsx` menggunakan `app/admin/Panel.tsx`; `Panel.tsx` mendukung daftar, buat, edit, aktif/arsip untuk proyek. `supabase/schema.sql` memuat `title`, `tagline`, `description`, `subject`, `grade`, `phase`, `duration`, `is_active`.
**Yang belum lengkap:** editor yang diperiksa menyimpan identitas dasar (judul, tagline, deskripsi); tidak ada bukti bahwa tujuan belajar, konteks masalah, keluaran terukur, jadwal, dan publikasi draft terkelola. Metadata skema tambahan belum otomatis berarti bisa diedit di UI.
**Tes/bukti:** source ada; browser test untuk create/edit/archive belum dicatat pada exact SHA saat audit.
**Tindak lanjut:** lengkapi form dan validasi metadata; bedakan arsip dari penghapusan permanen.
**Kriteria penerimaan:** proyek dapat dibuat, diedit, diarsipkan/dipulihkan dengan konfirmasi; siswa tidak melihat perubahan draft yang belum diterbitkan.

#### C.2 Draft, publikasi, dan versi konten
**Status: Belum ditemukan — P1.**
**Bukti source:** proyek memiliki `is_active` dan timestamp; pertanyaan memiliki timestamp serta pengamanan perubahan semantik ketika jawaban sudah ada melalui RPC editor. Tidak ditemukan model versi proyek/publikasi immutable pada skema yang diperiksa.
**Kesenjangan:** draft versus versi aktif, validasi sebelum publish, version ID pada submission/answer, riwayat perubahan, perbandingan versi, dan rollback.
**Tindak lanjut:** desain versioned project/LKPD/rubric sebelum menambah fitur penilaian; simpan submission terhadap versi tetap, bukan hanya konten terkini.
**Kriteria penerimaan:** publish membuat versi baru; draft tidak mengubah versi aktif; jawaban lama tetap bisa ditafsirkan dengan versi yang digunakan; rollback tidak mengubah sejarah.

### D. Pengaturan model pembelajaran PBL

#### D.1 Struktur tahapan
**Status: Tersedia, perlu penyempurnaan — P0.**
**Bukti source:** `app/admin/questions/page.tsx` mendefinisikan `PBL_PHASES` secara statis; `components/lkpd/PhaseBar.tsx` dan skema `questions.phase` memakai `see`, `think`, `connect`, `act`. Ini menunjukkan empat label aktivitas, bukan editor tahapan lima tahap yang dapat dikonfigurasi.
**Kesenjangan:** tujuan/aktivitas/pertanyaan pemantik/keluaran/kriteria penyelesaian/tenggat/prasyarat tahap belum menjadi model konfigurasi; tidak ada validasi struktur lima tahap atau preview alur penuh yang terbukti.
**Tindak lanjut:** tetapkan model pedagogis yang disepakati dahulu; petakan data lama ke struktur baru tanpa mengubah interpretasi jawaban historis.
**Kriteria penerimaan:** guru mengedit draft alur, melihat preview, mendapat error jika tahap wajib hilang/tidak valid, lalu menerbitkan versi baru tanpa mengubah pekerjaan yang sudah dimulai.

#### D.2 A.1 — Validitas masalah
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** `app/admin/videos/page.tsx`, `app/admin/questions/page.tsx`, `scripts/seed.mjs`; stimulus video dan prompt dapat disediakan.
**Gap:** kualitas setiap kasus aktif belum dinilai dengan rubrik terbuka; belum ada bukti bahwa fakta, dugaan, pihak terdampak, alternatif solusi, dan konsekuensi ditinjau sebelum publish.
**Tes/bukti:** tes source/form bukan penilaian kualitas konten; browser/staging belum diverifikasi pada exact SHA.
**Tindak lanjut/kriteria:** gunakan rubrik peninjauan kasus dan rekam contoh prompt/hasil; masalah harus dapat diselidiki dan memungkinkan alternatif solusi dengan alasan.

#### D.3 A.2 — Orientasi masalah
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** `components/lkpd/PhaseBar.tsx`, `app/lkpd/kasus/[id]/page.tsx`, prompt SEE di editor.
**Gap:** orientasi masalah belum terbukti mencakup tujuan/keluaran, ruang lingkup, fakta versus dugaan, dan kemampuan siswa menyatakan ulang masalah.
**Tindak lanjut/kriteria:** uji siswa sintetis di browser dengan prompt aktif; catat apakah siswa dapat mengidentifikasi masalah dan pihak terdampak tanpa diarahkan ke satu jawaban.

#### D.4 A.3 — Organisasi belajar
**Status: Belum ditemukan — P0.**
**Bukti:** `groups`/`group_members` serta halaman kelompok mengelola anggota dan penugasan video.
**Gap:** nama anggota tidak sama dengan peran; tidak ditemukan rencana penyelidikan tersimpan, tugas per anggota, rencana sumber/bukti, urutan kerja, target keluaran, atau review guru.
**Tindak lanjut:** buat model dan UI untuk pertanyaan penyelidikan, peran, tugas, target dan rencana informasi.
**Kriteria penerimaan:** kelompok dapat menyimpan/memuat rencana setelah reload; guru dapat meninjau; pengujian akses membuktikan kelompok lain tidak dapat membaca/mengubahnya.

#### D.5 A.4 — Penyelidikan dan pengelolaan bukti
**Status: Tersedia, perlu penyempurnaan — P0.**
**Bukti:** pertanyaan/jawaban pada `questions`/`answers`, prompt THINK di `app/admin/questions/page.tsx`, tinjauan jawaban pada `app/admin/submissions/page.tsx`.
**Gap:** tidak ditemukan alur khusus untuk sumber/tautan referensi, klaim yang dihubungkan ke bukti, kekuatan/keterbatasan bukti, dan asumsi. Jawaban teks bebas saja belum menjadi pengelolaan bukti.
**Tindak lanjut:** rancang entitas sumber, temuan, klaim, dan hubungan klaim–bukti dengan validasi URL/input.
**Kriteria penerimaan:** siswa menyimpan klaim beserta sumber dan alasan; guru dapat membuka bukti; akses lintas kelompok diuji; data tetap terkait versi proyek.

#### D.6 A.5 — Pengembangan dan penyajian solusi
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** prompt ACT di `app/admin/questions/page.tsx`; tinjauan dan ekspor jawaban di `app/admin/submissions/page.tsx`.
**Gap:** tidak ditemukan mekanisme produk/presentasi akhir terpisah, unggahan artefak yang terhubung dengan submission, atau tinjauan produk dengan rubrik/umpan balik. Rencana aksi bukan bukti bahwa presentasi sudah ada.
**Tindak lanjut:** tentukan format produk (tautan, dokumen, media, presentasi) dan batas file/akses.
**Kriteria penerimaan:** produk akhir tersimpan, dapat dibuka guru yang berwenang, terpisah dari status submit LKPD, dan gagal/unggah ulang ditangani dengan aman.

#### D.7 A.6 — Evaluasi dan refleksi
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** pertanyaan umum dapat menyimpan jawaban; placeholder/seed berisi prompt kesimpulan/refleksi, termasuk “Apa pelajaran penting yang kalian peroleh?”.
**Gap:** tidak ditemukan tahap refleksi terstruktur yang secara terpisah menilai kelayakan/dampak, keterbatasan bukti, proses penyelidikan, kontribusi anggota, tujuan awal versus hasil, dan perbaikan berikutnya.
**Tindak lanjut:** buat aktivitas refleksi terstruktur yang terhubung ke versi proyek dan dapat ditinjau guru.
**Kriteria penerimaan:** jawaban refleksi tersimpan, tampil terpisah dari analisis/solusi, dan dapat dibaca guru berwenang setelah reload.

#### D.8 A.7 — Umpan balik dan revisi
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** `docs/p0-autosave-submit-qa.md` mendokumentasikan skenario reopen/edit; jawaban dan submission memiliki status.
**Gap:** tidak ditemukan alur lengkap feedback guru → revisi siswa → alasan perubahan → versi/riwayat → finalisasi nilai. Reopen bukan versioning.
**Tindak lanjut:** model feedback yang tertaut pada kriteria/produk, revision records, perbandingan, dan aturan kapan nilai final.
**Kriteria penerimaan:** versi awal tetap tersedia, revisi memiliki timestamp/penulis/alasan, guru dapat membandingkan, dan nilai final tidak berubah diam-diam.

### E. Editor LKPD digital dan pustaka konten

#### E.1 Editor LKPD
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** `app/admin/questions/page.tsx`, `supabase/schema.sql`, migrasi `20261022152719_secure_admin_helper_and_transactional_question_editor.sql`, `20261022153005_add_safe_question_deletion_rpc.sql`, `20261022153051_add_transactional_question_order_and_delete.sql`. Editor mendukung tipe jawaban, phase empat label, required/active, opsi, urutan, preview; perubahan semantik pertanyaan yang sudah dijawab dibatasi dan penghapusan dapat menonaktifkan pertanyaan.
**Gap:** versi LKPD/publikasi/draft dan validasi kelengkapan keseluruhan sebelum publish belum ditemukan. Perilaku browser untuk seluruh jalur belum terverifikasi pada exact SHA.
**Tindak lanjut:** pertahankan proteksi historis; tambahkan validasi dan version pinning sebelum mengembangkan rubrik.
**Kriteria penerimaan:** perubahan pertanyaan tidak mengubah makna jawaban lama; publish menghasilkan versi yang dapat ditelusuri; tes CRUD, opsi, ordering, dan pertanyaan terjawab dijalankan.

#### E.2 Materi dan pustaka
**Status: Tersedia, perlu penyempurnaan — P2.**
**Bukti:** `app/admin/videos/page.tsx`, `components/admin/Uploader.tsx` (jika ada), `lib/storage/upload.ts`, `supabase/security.sql`. Upload membatasi tipe/ukuran di klien dan bucket video didesain privat; akses video siswa melewati API yang memeriksa kode dan assignment.
**Gap:** pustaka sumber belajar eksternal, template LKPD/rubrik, dan duplikasi proyek dengan pengecualian submission/penilaian lama belum ditemukan. Validasi klien saja tidak cukup; batas storage harus dipastikan juga di sisi layanan.
**Tindak lanjut:** pertahankan bucket privat; rancang katalog sumber dan template setelah model versi ditetapkan.
**Kriteria penerimaan:** file invalid ditolak server, akses URL/media dibatasi, duplikasi hanya menyalin konfigurasi yang dipilih dan tidak menyalin submission/hasil lama.

### F. Rubrik, penilaian, dan pelaporan

#### F.1 Editor rubrik
**Status: Belum ditemukan — P1.**
**Bukti:** skema yang diperiksa memuat proyek, pertanyaan, submission, dan jawaban; tidak ditemukan tabel/model rubric, criterion, performance level, weight, atau rubric version dalam `supabase/schema.sql`.
**Gap/tindak lanjut:** rancang rubrik dengan kriteria, indikator, level, rentang, bobot, validasi total, versi, serta cakupan kelompok/individu.
**Kriteria penerimaan:** rubrik yang sudah dipakai immutable; versi baru tidak mengubah skor lama; bobot/rentang tidak valid ditolak.

#### F.2 Perhitungan dan verifikasi nilai
**Status: Belum ditemukan — P1.**
**Bukti:** halaman submission menampilkan jawaban/status dan ekspor; tidak ditemukan model skor per kriteria, nilai final, persetujuan penilai, atau audit perubahan nilai pada skema yang diperiksa.
**Gap/tindak lanjut:** definisikan formula, pembulatan, rentang, manual override, penilai/waktu, finalisasi dan revisi nilai. Jangan menyebut penilaian otomatis/AI ada jika belum diimplementasikan.
**Kriteria penerimaan:** perhitungan deterministik dapat direproduksi; input di luar rentang ditolak; perubahan nilai setelah final tercatat dan membutuhkan otorisasi.

#### F.3 Monitoring dan laporan
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** `app/admin/page.tsx` menghitung kelompok, video/pertanyaan aktif, submission/draft; `app/admin/submissions/page.tsx` mendukung filter dan ekspor CSV/XLSX.
**Gap:** progres per tahap PBL, kelompok tertahan, feedback/revisi tertunda, produk/refleksi, detail skor rubrik, serta versi proyek/rubrik pada laporan belum ditemukan.
**Tindak lanjut:** pertahankan laporan dasar; tambahkan indikator hanya setelah definisi data/status disepakati.
**Kriteria penerimaan:** ekspor mengikuti filter dan kewenangan; total cocok dengan data staging; laporan historis menunjukkan versi konten/rubrik yang digunakan.

### G. Keamanan, integritas data, dan keberlanjutan operasional

#### G.1 Integritas data
**Status: Tersedia, perlu penyempurnaan — P0.**
**Bukti:** `supabase/schema.sql`, `supabase/p1-project-isolation.sql`, migrasi editor transaksional, `supabase/p0-autosave-submit-hardening.sql`, `docs/p0-autosave-submit-qa.md`. Skema memisahkan submission dan answers; migrasi menambahkan batas lintas proyek; RPC menyerialisasi autosave dan submit menggunakan lock baris.
**Gap:** bukti source/migrasi tidak menggantikan tes transaksi runtime; kebijakan retensi, penghapusan/anonimisasi, restore, dan perilaku idempotensi end-to-end belum terverifikasi pada SHA/deployment saat ini.
**Tindak lanjut:** setiap perubahan skema lewat migrasi reviewable; rekonsiliasi riwayat migrasi staging sebelum menjalankan deployment migrasi; jangan jalankan write test di Production.
**Kriteria penerimaan:** tes staging membuktikan autosave/submit berurutan, duplicate/replay aman, cross-project ditolak, dan restore menjaga relasi/FK.

#### G.2 Keamanan dan privasi
**Status: Tersedia, perlu penyempurnaan — P0.**
**Bukti:** `proxy.ts`, `app/api/student/route.ts`, `app/api/student-content/route.ts`, `lib/supabase/admin.ts`, `supabase/security.sql`, `supabase/p0-lock-public-reads.sql`, `supabase/p0-post-hardening-audit-readonly.sql`. API siswa memvalidasi payload, memakai rate limiting dan memeriksa kelompok/penugasan; dokumentasi menyatakan bucket privat dan RPC siswa dibatasi ke service role.
**Gap:** bukti staging bertanggal 2026-10-23 bukan bukti bahwa Preview terbaru terhubung ke staging atau bahwa browser tests terbaru lulus. Audit log admin, kebijakan retensi/penghapusan, dan tinjauan pengumpulan data pribadi belum lengkap.
**Tindak lanjut:** jalankan audit read-only dan tes akses hanya pada target yang diidentifikasi; jangan masukkan secret, access code, atau jawaban asli ke log/tiket.
**Kriteria penerimaan:** anon ditolak, kelompok A tidak dapat membaca kelompok B, admin authorization diuji pada server/API/RPC, service-role key tidak masuk bundle browser, dan hasil direkam tanpa data sensitif.

#### G.3 Backup dan pemulihan
**Status: Belum diverifikasi — P0.**
**Bukti:** dokumentasi QA meminta backup sebelum perubahan tertentu; namun jadwal/retensi backup dan bukti restore end-to-end tidak ditemukan sebagai hasil tes terverifikasi dalam artefak yang diperiksa.
**Gap/tindak lanjut:** tetapkan RPO/RTO, apa yang dicadangkan, retensi, akses backup, pemulihan database dan storage, serta verifikasi pasca-restore.
**Kriteria penerimaan:** restore dilakukan di lingkungan terisolasi dengan data sintetis; hasil dicek untuk jumlah/relasi, akses, file, jawaban, dan waktu pemulihan. Jangan mengklaim PASS dari keberadaan fitur backup provider.

#### G.4 Pemantauan
**Status: Belum ditemukan — P1.**
**Bukti:** ada penanganan error dan rate-limit di API serta CI/deployment status, tetapi monitoring aplikasi terpusat, alert publikasi gagal, dan prosedur respons alert tidak ditemukan pada source yang diperiksa.
**Tindak lanjut:** pilih monitoring yang sesuai, tetapkan sinyal/error threshold dan pemilik alert; redaksi kode akses, identitas dan jawaban dari log.
**Kriteria penerimaan:** simulasi kegagalan sintetis menghasilkan alert yang dapat ditindaklanjuti tanpa mengekspos data sensitif.

### H. Pengujian dan gerbang rilis
**Status: Belum diverifikasi — P0.**
**Bukti:** `.github/workflows/ci.yml` menjalankan `npm ci`, TypeScript, `npm run test:unit`, `git diff --check` pada PR, `scripts/check-pbl-invariants.mjs`, build Next.js dan audit dependensi produksi. PR #15 lulus CI pada head `5f610c0927b2da15389a21ec3513f9b06bf969a0` sebelum merge; pada commit merge main `870566d5e8160099bc85b456a28474e69bc06672`, pemeriksaan status yang tersedia hanya mengembalikan Vercel success. Ini tidak membuktikan browser/staging.
**Belum dibuktikan pada exact main SHA:** desktop/tablet/mobile matrix, alur guru/siswa lengkap, simpan-muat ulang/offline, isolasi antarkelompok, draft/publikasi/versi, integritas rubrik/nilai historis, seluruh tahap PBL, backup-restore, dan kecocokan deployment/backend.
**Tindak lanjut:** setiap PR mencantumkan SHA, run CI, URL/deployment ID, target staging yang aman, skenario browser, dan bukti sanitized. Tes tulis hanya dengan data sintetis di staging terverifikasi.
**Kriteria penerimaan:** semua gerbang wajib punya bukti pada kandidat yang sama; gate yang belum dijalankan tetap pending/blocked; keputusan Production terpisah dan eksplisit.

### I. Keberlanjutan lintas kelas dan tahun ajaran
**Status: Tersedia, perlu penyempurnaan — P1.**
**Bukti:** proyek dapat diarsipkan melalui `app/admin/Panel.tsx`; `app/api/student/route.ts` menolak perubahan/pengerjaan baru pada proyek arsip dan mempertahankan akses baca hasil yang ada; dokumen staging menjelaskan isolasi proyek.
**Gap:** belum ditemukan template/duplikasi proyek, periode/tahun ajaran formal, versi kurikulum/rubrik, panduan onboarding pengelola pengganti, pemilik produk/operasional, atau alur usulan fitur di aplikasi.
**Tindak lanjut:** buat keputusan cakupan periode dan kepemilikan; setelah versioning tersedia, tambahkan “duplikasi sebagai proyek baru” tanpa submission/jawaban/hasil lama.
**Kriteria penerimaan:** proyek baru tidak mewarisi data hasil; arsip lama tetap bisa ditelusuri oleh pihak berwenang; admin pengganti dapat mengikuti runbook tanpa akses secret yang tidak perlu.

## 4. Urutan implementasi yang direkomendasikan

1. **P0 — keamanan dan operasi:** verifikasi target staging, migrasi, backup/restore, dan akses antarkelompok; catat SHA/deployment. Jangan menulis ke Production.
2. **P0 — fondasi model data:** rancang versioning proyek/LKPD dan relasi submission ke versi sebelum membuat rubrik atau revisi.
3. **P0 — PBL inti:** implementasikan A.3 organisasi belajar dan A.4 pengelolaan bukti dengan authorization serta save/reload/isolation tests.
4. **P1 — tahap lanjutan:** produk/presentasi A.5, refleksi A.6, feedback/revisi A.7.
5. **P1 — konten yang dapat dipelihara:** editor konfigurasi tahapan, draft–validasi–publish, pustaka template.
6. **P1 — penilaian:** editor rubrik berversi, skor per kriteria, persetujuan dan riwayat nilai.
7. **P1/P2 — operasi lintas periode:** sekolah/kelas/tahun ajaran jika masuk scope, laporan historis, monitoring, dokumentasi, pemilik sistem.
8. **Setiap tahap:** tes otomatis dan browser/staging pada SHA yang sama; update status hanya berdasarkan bukti yang relevan.

Dependensi penting: **versi proyek/LKPD → submission terikat versi → rubrik berversi → skor/feedback/revisi historis**. Hindari mengembangkan penilaian final sebelum versi konten dan aturan revisi ditentukan.

## 5. Daftar bukti runtime yang masih harus dikumpulkan

- [ ] Deployment Preview ID/URL, target environment, dan exact source SHA.
- [ ] Bukti bahwa Preview menggunakan Supabase staging yang benar; jangan mencatat key/token.
- [ ] Uji browser guru: proyek create/edit/archive, video, pertanyaan/opsi, kelompok, submission filter/export.
- [ ] Uji browser siswa dengan kelompok sintetis: identitas, assignment, fase/pertanyaan, autosave, refresh/reconnect, submit, hasil.
- [ ] Uji akses silang dua kelompok dan peran; rekam status respons tanpa kode akses atau data siswa.
- [ ] Uji perubahan pertanyaan terjawab dan interpretasi historis.
- [ ] Setelah fitur baru tersedia: uji draft/publikasi/version pinning, A.3–A.7, rubrik, skor, feedback/revisi.
- [ ] Restore test di lingkungan terisolasi dan bukti konsistensi database/storage.
- [ ] Hasil, timestamp, browser/OS/viewport, SHA, serta tautan run dicatat di PR/dokumen.

Sampai bukti tersebut terkumpul, keputusan aplikasi untuk Production tetap **NO-GO**; dokumen pemetaan ini tidak mengubah fitur, skema database, secret, environment variable, atau deployment.
