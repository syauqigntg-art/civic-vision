# CIVIC VISION — Status pengujian keamanan dan regresi

## Status lingkungan staging (2026-10-23)

- [x] Proyek Supabase staging terpisah dibuat: `civic-vision-staging` (`bneqqkvhehrlcjhvvyvv`), region `ap-northeast-1`, estimasi pembuatan US$0/bulan.
- [x] Skema dasar, konfigurasi keamanan, project isolation, rate limiter, public-read lockdown, editor RPC, dan migrasi hardening diterapkan pada staging.
- [x] Tidak ada data proyek/kelompok/submission/jawaban yang disalin dari Production; tabel yang diperiksa masih kosong.
- [x] Seluruh 11 tabel aplikasi memiliki RLS; akses baca langsung anon ditolak; bucket video privat; RPC siswa dibatasi ke `service_role`.
- [x] Security Advisor staging hanya menampilkan INFO untuk `api_rate_limits` yang tidak memiliki policy RLS. Tabel itu tidak dapat diakses role client.
- [x] Migrasi staging `20261023023649 serialize_submit_group_with_answer_saves` diterapkan; definisi aktif `save_answer()` dan `submit_group()` kini sama-sama mengunci baris submission menggunakan `FOR UPDATE` sebelum menulis/memfinalisasi jawaban.
- [x] Query read-only mengonfirmasi kedua fungsi memakai `search_path=''`; hanya `service_role` dapat menjalankan keduanya; anon/authenticated EXECUTE ditolak.
- [ ] Vercel Preview masih terblokir: tool mengembalikan HTTP 403 untuk scope tim `uki8`; tidak ada environment variable Vercel yang diubah.
- [ ] Browser/concurrency tests belum dijalankan dan hanya boleh dilaksanakan setelah Preview terverifikasi memakai staging.

Rincian: [docs/staging-setup.md](./staging-setup.md).

## Pengujian otomatis dan dependency

- [x] Workflow CI menggunakan audit dependency produksi sebagai gate blocking; tidak ada `continue-on-error` pada langkah `npm audit --omit=dev`.
- [x] Run #24 pada SHA `02d7808b3ab7b68131b170e8135040c759e3640b` mendeteksi satu temuan kritis pada `next@16.4.0`; kegagalan ini valid, bukan regresi TypeScript.
- [x] `package.json` sekarang meminta `next@^16.4.1`; lockfile diregenerasi melalui npm runner dan memilih `next@16.4.2`. Run #39 menjalankan `npm ci` dan audit produksi tanpa temuan.
- [x] Run #38 (`39890824427`) pada head SHA `8bfa17a21ea9529c2bbd4e7c23256731f6bfd2f2` lulus `npm ci`, TypeScript, `git diff --check`, source invariants, `npm run build`, dan `npm audit --omit=dev` (**found 0 vulnerabilities**). Build menggunakan placeholder CI khusus, bukan kredensial staging/Production. Output instalasi masih menampilkan ringkasan 7 advisori pada seluruh dependency tree (2 moderate, 5 high); audit produksi yang diblokir CI terpisah lulus. Full-tree audit/remediation belum dinyatakan selesai.
- [x] `npm run build` sekarang menjadi langkah CI dengan nilai environment placeholder khusus build. Run #39 berhasil membangun Next.js (`Compiled successfully` dan 17/17 static pages).

## Verifikasi database staging

- [x] Seluruh 11 tabel aplikasi memiliki RLS.
- [x] Privilege tabel langsung role `anon` untuk tabel aplikasi ditolak.
- [x] RPC siswa hanya dapat dijalankan `service_role`.
- [x] Helper admin berada pada schema `private`; `public.is_admin()` tidak tersedia.
- [x] Bucket `videos` privat, batas 50 MiB dan MIME dibatasi.
- [x] `save_answer()` menolak simpanan setelah submission bukan draft, validasi proyek/pertanyaan konsisten, mengisi `answers.project_id`, serta mengunci baris submission.
- [x] `submit_group()` telah diperbaiki di staging agar mengunci baris submission yang sama sebelum validasi kelengkapan dan pengubahan status. Privilege, SECURITY DEFINER, dan empty search_path sudah diverifikasi.
- [ ] Race test runtime belum lulus/belum dijalankan; query fungsi tidak menggantikan tes dua permintaan yang benar-benar berjalan bersamaan.

## Empat skenario utama yang belum diuji di browser

Keempat skenario berikut **BELUM DIUJI**. Jangan menyebutnya lulus dari CI atau pemeriksaan metadata:

- [ ] **Submit segera setelah mengetik:** nilai jawaban terakhir di server harus sama dengan teks terakhir sebelum submit.
- [ ] **Koneksi terputus saat autosave:** pulihkan koneksi; antrean harus mencoba ulang dan nilai terakhir tersimpan tanpa kehilangan data senyap.
- [ ] **Save terlambat setelah submit:** save ditolak dan jawaban pada submission yang sudah terkirim tidak berubah.
- [ ] **Guru membuka kembali submission:** cek apakah aksi UI dan RPC itu memang ada. Jika tersedia, uji tanpa menghapus histori; jika tidak, catat sebagai fitur belum tersedia/tidak berlaku.

## Skenario tambahan yang masih perlu diuji

- [ ] Guru login/logout dan perlindungan area admin.
- [ ] Penyimpanan, penonaktifan/penghapusan, dan pengurutan pertanyaan serta opsi.
- [ ] Kegagalan validasi/database tidak menutup form atau menampilkan sukses palsu.
- [ ] Soal yang sudah memiliki jawaban melindungi makna jawaban historis.
- [ ] Kode kelompok/video yang tidak ditugaskan tidak memberi akses ke konten.
- [ ] Isolasi kelompok dan proyek tidak memungkinkan pembacaan lintas scope.
- [ ] Signed URL Storage, tampilan mobile, dan fase kosong SEE/THINK/CONNECT/ACT.

## Kesiapan Preview

Preview terbaru belum diverifikasi memakai SHA kandidat terkini dan database staging. Akses Vercel scope tim `uki8` menghasilkan HTTP 403; komentar Vercel sebelumnya menandai deployment sebagai Ignored dan percobaan lain mencapai batas deployment harian paket Free. Tidak ada environment variable Vercel yang diubah.

Jangan jalankan tes tulis pada Preview sampai pemilik tim memberi akses resmi, ketiga environment variable Preview diarahkan ke staging, deployment Ready dengan SHA kandidat yang sama terkonfirmasi, dan URL/key staging diverifikasi tanpa menampilkan nilai rahasia. Jangan mengubah Production atau menyalin data siswa asli ke staging.


## Rujukan pedagogis

Skenario teknis dan keamanan dalam dokumen ini tidak menggantikan penilaian aktivitas belajar. Untuk memeriksa apakah siswa benar-benar mengorientasi masalah, mengorganisasi belajar, menyelidiki bukti, menyajikan solusi, berefleksi, dan merevisi setelah umpan balik, gunakan [checklist pedagogis kanonis A.1–A.7](phase3-learning-ux-audit.md#kanonis--checklist-validasi-pedagogis-pbl-audit-2026-10-26). Jangan mengubah status checklist tersebut berdasarkan source invariant atau tes keamanan saja.

## P0 regression-invariant hardening — 2026-10-26

The PR `#18` change adds source-level checks to `scripts/check-pbl-invariants.mjs` for the two autosave/submit serialization migrations:

- `supabase/migrations/20261023010223_serialize_answer_saves_with_submission.sql`
- `supabase/migrations/20261023030000_serialize_submit_group_with_answer_saves.sql`

The checks require both RPCs to use `SECURITY DEFINER` with an empty `search_path`, lock the same submission row scoped by group and project, restrict EXECUTE to `service_role`, reject autosave unless the submission is still a draft, and transition only draft submissions to submitted. This closes a source-regression coverage gap; it does **not** establish database race-safety by itself.

- Source commit tested: `b5b393bc5f08b0d1b292f02b78b00e613b22ec35`.
- [GitHub Actions CI run #136](https://github.com/syauqigntg-art/civic-vision/actions/runs/40256246749): PASS on that exact source commit. `npm ci`, TypeScript, unit tests, `git diff --check`, PBL/security source invariants, Next.js production build, production dependency audit, and full dependency audit reporting all succeeded.
- [Vercel status](https://vercel.com/uki8/civic-vision/9e5dLuAfUcbTpnLAQkDXjUkGGd73): success status only; not treated as browser/staging evidence.
- Browser verification, staging-backed autosave/submit concurrency tests, and backup/restore exercise: still NOT TESTED / BLOCKED pending verification of the Preview deployment's exact SHA and staging target.
- Production, database schema, migration history, secrets, and environment variables were not changed. No Production writes, `supabase db push`, or deployment were performed.

Keep the release decision **NO-GO** until the required runtime and operational evidence is collected on the same candidate SHA.

### Preview backend target verification — BLOCKED

A read-only inspection of the Vercel project environment metadata on 2026-10-26 found that the project-level `NEXT_PUBLIC_SUPABASE_URL` is scoped to `production`, `preview`, and `development`, and its configured Supabase project reference does **not** match the documented isolated staging reference `bneqqkvhehrlcjhvvyvv`. No branch-specific Preview override was found for `fix/p0-sustainability-hardening`. Therefore, the current Preview cannot be treated as staging and no student write-flow/concurrency test was run against it.

Required follow-up by the project owner: configure and verify Preview-only Supabase URL/keys for the isolated staging project without changing Production targets; then deploy a fresh Preview, verify its exact source SHA and backend target, and use synthetic fixtures only. This audit did not read or disclose service-role/anon key values and did not modify any Vercel environment variable.
