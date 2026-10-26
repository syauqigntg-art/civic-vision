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

## Staging verification update — 2026-10-26

### Confirmed facts
- Pull request #18 was merged into `main` at `a2f5d1d11e49667f3f0cccca3f85b5b4b71b8494`. GitHub Actions run #138 passed on pre-merge head `11a68bb38c9a503b7b5d734f6081edd23ed8b10f`; it is not being represented as a separately run CI result on the merge commit.
- Supabase project `civic-vision-staging`, ref `bneqqkvhehrlcjhvvyvv`, is `ACTIVE_HEALTHY`. The migration ledger lists 13 expected staging entries, including the two autosave/submit serialization migrations.
- A read-only table inspection confirmed RLS is enabled on all 11 public application tables and showed zero rows in the inspected tables, which is consistent with the recorded empty staging environment. The Security Advisor reports one informational notice: RLS is enabled on `public.api_rate_limits` without policies. This is intentional only while client-role privileges stay revoked; privilege posture still needs to be validated for the exact runtime candidate.
- Preview-only, branch-specific values were created for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for branch `fix/p0-sustainability-hardening`. They target only the Preview environment; the project-wide variables, including Production target configuration, were not edited. No service-role key was created as a Preview override.

### Current deployment verification
- The latest inspected deployment for branch `fix/p0-sustainability-hardening` is still `READY` for source SHA `11a68bb38c9a503b7b5d734f6081edd23ed8b10f`, which predates the environment override. No newer deployment containing the Preview-only overrides was available in the deployment list at the time of this check.
- A separate `main` deployment for merge SHA `a2f5d1d11e49667f3f0cccca3f85b5b4b71b8494` is `READY` and target `production`. This is recorded as a status observation only; no manual Production deployment/promotion was triggered by this task.
- Until a fresh branch Preview is created after the override and its runtime target is verified without disclosing secret values, browser write/concurrency tests remain **BLOCKED**. This entry does not claim the Preview has already picked up the new variables.

### Remaining required runtime evidence
1. Create/obtain a fresh Preview deployment from the same source SHA after the Preview-specific variables are applied; verify deployment ID, branch, exact SHA, and Supabase project ref.
2. Use staging-only synthetic project/group/video/question records. Record sanitized request/response order and assert database state after latest-answer autosave, offline/reconnect, delayed save after submit, duplicate submit, concurrent save/submit, and cross-group/project access attempts.
3. Clean up synthetic fixtures and verify that only those test records are removed.
4. Run a controlled backup/restore exercise with the staging owner and record integrity checks. No backup/restore test was performed in this update.

No Production environment settings or secrets were changed. No database migrations or schema changes were applied, no Production write test was run, and no Production deploy/promotion was invoked by this verification.

## Follow-up execution tracking — staging Preview validation

The environment override has been configured for branch `fix/p0-sustainability-hardening` only. Vercel's deployment list still shows the previous Ready deployment SHA `11a68bb38c9a503b7b5d734f6081edd23ed8b10f` and does not yet show a deployment created after those overrides. The override itself is therefore **not yet verified at runtime**.

A separate tracking change is being prepared from main; it does not deploy or alter the application. Do not run browser writes until Vercel creates a fresh deployment containing the override and its exact Git SHA / backend reference have been checked.

## Executed staging database verification — 2026-10-26

### Environment and source identity
- Supabase staging project `civic-vision-staging` (`bneqqkvhehrlcjhvvyvv`) is `ACTIVE_HEALTHY`; read-only migration ledger contains the expected 13 migration records.
- Vercel deployment `dpl_ACR7b8bqc94WB8sK8VNNHYW9R7qW` is `READY`, target `staging`, source SHA `a2f5d1d11e49667f3f0cccca3f85b5b4b71b8494` (the PR #18 merge commit). URL: https://civic-vision-agxkuwu59-uki8.vercel.app
- Branch-specific Preview variables exist for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, restricted to branch `fix/p0-sustainability-hardening`. The project-level `SUPABASE_SERVICE_ROLE_KEY` remains shared across Production/Preview/Development and has no branch-specific staging override. Its value was not read or disclosed. Because the server credential has not been verified as belonging to the staging project, app-server writes remain **BLOCKED** until a staging-specific service-role credential is configured for this branch through the secret manager/Vercel UI and then runtime-tested.
- The deployed Preview URL could not be opened by the available browser retrieval path; Vercel project SSO protection is enabled. No interactive browser session or browser automation was executed in this check.

### Read-only staging security observations
- All 11 public application tables have RLS enabled; all were empty before fixtures were created.
- No `anon` table grants were present for public application tables. `anon` and `authenticated` do not have CREATE privilege on schema `public`, and anonymous direct SELECT on `public.projects` is denied by privilege checks.
- Student/admin RPCs inspected (`get_group`, `get_answers`, `save_identity`, `begin_submission`, `save_answer`, `submit_group`, `student_rate_limit`, `stats`) denied EXECUTE to `anon` and `authenticated`; EXECUTE is granted to `service_role`.
- The videos Storage bucket is private with a 50 MiB file-size limit and explicit MIME types.
- Security Advisor has one informational notice on `public.api_rate_limits` having RLS enabled without policies. This remains intentional only while client-role table privileges stay revoked.
- A subset of older SECURITY DEFINER helpers still declares `search_path=public` rather than an empty path. No anon/authenticated CREATE privilege exists on `public`, but replacing unqualified name resolution with an empty path is a separate hardening follow-up; this task did not apply schema changes.

### Synthetic staging database tests — executed and cleaned up

Only synthetic fixtures were inserted into the isolated staging project. The tests called the live database RPCs through the Supabase SQL connection; they are **database-level tests**, not application API or browser tests.

| Scenario | Observed result |
|---|---|
| Valid first answer save | `save_answer` returned `true` |
| Group A attempts to save a question belonging to another project | Returned `false` |
| Group B attempts to save Group A's project question | Returned `false` |
| Two sequential saves of the same answer in a draft | Both returned `true`; direct read showed the second/latest value |
| Valid final submit | `submit_group` returned `ok` |
| Duplicate submit after finalization | Returned `sudah terkirim` |
| Save after submission | Returned `false`; the persisted answer remained unchanged |
| Save racing with submission under an explicit submission-row lock and delay | Submit returned `ok`; competing save returned `false`; the prior confirmed value remained unchanged |
| Isolation between two groups in the same project | Group C initially saw an empty answer object while Group A's answer existed; after C saved its own answer, A's answer remained unchanged and C saw only its own answer |
| Post-submit save after the concurrent test | Returned `false` |

All temporary IDs were explicitly deleted. A follow-up query returned zero remaining rows for the synthetic projects, videos, groups, members, video assignments, questions, submissions, and answers. No Production write test, Production configuration change, database migration, schema change, or Production deploy/promotion was performed.

### Still not closed
- **BLOCKED:** end-to-end application/API tests until a staging-specific `SUPABASE_SERVICE_ROLE_KEY` is set for this branch and verified without revealing its value.
- **NOT TESTED:** browser autosave UI, offline/reconnect local queue, actual website route access, network traces, and browser-level cross-group access. The DB RPC tests above do not replace them.
- **NOT TESTED:** backup/restore rehearsal.
- Release decision remains **NO-GO** until the service credential is isolated and browser/API tests run against this exact staging target and SHA.
