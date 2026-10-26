# CIVIC VISION — Tahap 3: Audit UX belajar dan cakupan tes

Last checked: 2026-10-23 (Asia/Jakarta). Source-based review of branch `phase3/pbl-ux-testing`. Verified candidate before this documentation update: `ce450964b9b3061fb9242e608f27a2ed390dd49f`. Browser/runtime behavior has not been assumed.

> The original Phase 3 findings below are a historical snapshot. The canonical pedagogical checklist and its current source-audit statuses are maintained in the final section of this document; the current audit baseline is `main` at `f470cb5b322bc76282c24610be3a10e6c4809d65` (2026-10-26).

## Scope and evidence rules

This audit reads the current teacher/student pages, request schemas, answer helpers, autosave hook, and CI workflow. It is not a browser usability study. Items below are labeled **observed in source**, **unit-tested**, or **pending runtime** so that source inspection cannot be mistaken for proof that a deployment works.

## 3A — Peta alur pengguna saat ini

### Guru
1. Opens the admin area and selects a project.
2. Manages videos, assigned groups, and questions for that project.
3. In the question editor, filters by phase/status, previews the student question form, sets required/active state, and orders questions.
4. Saves question content/options through `admin_save_question`; guarded deletion and ordering use `admin_delete_question` and `admin_reorder_questions`.
5. Reviews group/submission results through the available admin views.

Observed gaps for follow-up: the active/inactive toggle uses a direct Supabase `questions.update()` call, unlike transactional save/delete/reorder; RLS still applies, but the UX/error handling should be evaluated for consistency. Whether an admin can reopen a submitted assignment is not confirmed as an implemented action/RPC and must not be presented as an existing capability.

### Siswa
1. Enters the group access code; `get_group` resolves the group/project and the identity screen captures group/class/leader information.
2. Opens the assigned video list; the API checks group assignment and project scope.
3. Opens a video and completes SEE observation questions when the project has active SEE questions.
4. Continues to the analysis route for THINK, CONNECT, and ACT.
5. Required questions are checked before moving to the next phase. The client flushes pending autosave and refuses to advance when answers remain unsaved.
6. Before final submit, the client checks required answers across the phases, flushes queued answers, asks for confirmation, and calls `submit_group`.
7. The user is routed to the results view after the server reports successful submission.

## 3A/3B — Prioritized UX findings

### P1 — Recovery path on load errors
- **Observed in source before the change:** the analysis route's `view === "err"` state showed an alert without a retry or back-to-video action; the case-list error did not offer an explicit action.
- **Impact:** on transient connection/server failures, a student may not know how to recover without refreshing the browser.
- **Change on this branch:** both error states now expose a `Coba lagi` button (reloads the current route) and a safe navigation link (`Kembali ke video` / `Kembali ke identitas`). A source invariant checks these actions are present. This is a page-reload recovery path, not an in-place retry state machine.
- **Acceptance criteria:** verify in browser that retry returns to loading then success/error; safe back links preserve recoverability and queued drafts. Do not treat static source checks as runtime proof.
- **Runtime status:** pending.

### P1 — Validate stored answer shape before rendering progress
- **Observed in source:** older `parse()` directly returned any valid JSON value for `multiple_text` and `multi_select`; `filled()` could call array methods on an object/scalar or call `.trim()` on non-string items.
- **Change on this branch:** parsing now treats non-array JSON and malformed JSON as empty arrays and filters structured entries to strings; `filled()` and `show()` handle the resulting shape defensively.
- **Acceptance criteria:** malformed/legacy draft values do not crash progress/results; malformed values cannot satisfy required-answer validation; valid text/selection values behave the same.
- **Unit tests:** `scripts/pbl-ux-validation.test.mjs`; **12 passed, 0 failed** in [GitHub Actions Run #46](https://github.com/syauqigntg-art/civic-vision/actions/runs/39892292995), run against candidate SHA `ce450964b9b3061fb9242e608f27a2ed390dd49f`.

### P2 — Align answer input limits with server behavior
- **Observed in source:** `save_answer` request validation and the server RPC cap a serialized answer at 5,000 characters, but the text/textarea controls do not visibly communicate this limit.
- **Impact:** students can type a value that the server rejects with only a generic save failure.
- **Acceptance criteria:** decide whether to limit by character count in the input or show a live character count; preserve the user's text and display an explicit error if the server rejects it.
- **Runtime status:** pending; no behavior change applied as part of the initial audit.

### P2 — Retry on student case-list failures
- **Change on this branch:** case-list failure now presents a reload retry button and a link to return to group identity. The source invariant asserts both actions exist.
- **Acceptance criteria:** retry re-fetches assignment and group status; empty assignments remain a separate non-error state.
- **Runtime status:** pending.

### P2 — Identity save interaction feedback
- **Change on this branch:** identity save uses a `saving` guard, disables the submit button in flight, sets a progress label, catches network exceptions, and clears the busy state in `finally`.
- **Acceptance criteria:** show saving state, prevent duplicate submissions while in-flight, preserve entered data on error, and avoid displaying success before the API confirms it.
- **Runtime status:** pending.

### P3 — Phase consistency and teacher clarity
- **Observed in source:** the four phases are represented consistently in the phase bar and question editor. Questions with no phase are routed to THINK in the student analysis page; the teacher UI already warns about active questions without a phase.
- **Acceptance criteria:** keep that routing explicit in teacher guidance; verify every phase has a clear outcome and empty-state message. Do not require all four phases to have questions unless the learning design specifies this.
- **Runtime status:** source inspection only.

## 3C — Automated checks now added

The branch adds dependency-free Node test-runner cases against the actual Zod request/form schemas and the answer helper functions:
- whitespace-only text is not considered filled;
- multiple-text required counts count only non-empty strings;
- malformed JSON, wrong-shaped JSON, and non-string entries do not throw or count as completed;
- multiselect requires a non-empty string choice;
- options remain in display order without mutating the source list;
- category ordering is stable/unique;
- student RPC/content request schemas validate operation, access-code, UUID, answer-length, and path-traversal boundaries;
- video/question form schemas reject invalid required fields, phase, order, and length.

This is not an integration test of the Supabase RPC, browser, or concurrent transactions. It runs via `npm run test:unit` in GitHub Actions. Run #46 on SHA `ce450964b9b3061fb9242e608f27a2ed390dd49f` passed TypeScript, 12/12 unit tests, PBL/security source invariants, Next.js build (17/17 static pages), and the blocking production dependency audit. The full dependency-tree audit remains open.

## 3D — Teacher content and release acceptance

- The question editor supports SEE/THINK/CONNECT/ACT, required/optional, active/inactive status, options, display order, filters, and a student-style preview in source.
- The video editor and group editor exist in the current app, but their complete UX behavior still requires browser coverage.
- The current review did not verify that a teacher reopen-submission workflow exists. Treat that as **unknown/not confirmed**, not passed.
- Realistic learning-material examples should require students to separate observation/facts (SEE), causes/evidence (THINK), relevant social-science/civic concepts (CONNECT), and a feasible action with roles/success indicators (ACT).

## Remaining gates

1. Re-run/confirm CI against the post-documentation final SHA; the current verified code candidate passed Run #46.
2. Run full dependency-tree audit and review the remaining 7 advisories (2 moderate, 5 high); production-only audit does not include those development/transitive packages.
3. Keep database-writing student tests blocked until Vercel deployment SHA and Preview environment have been verified to use Supabase staging.
4. Do not run `supabase db push` until the staging migration ledger is reconciled.
5. Keep PR #6 Draft and do not merge/release to Production while runtime and remaining dependency review is open.

## Exact file scope for this candidate

- `lib/utils/questions.ts`: defensive parsing for structured draft answers; reject malformed/wrong-shaped entries safely.
- `scripts/pbl-ux-validation.test.mjs`: 12 unit tests for answer helpers, request validation, media paths, and video/question form schemas.
- `app/lkpd/kasus/page.tsx`: case-list error recovery links/actions.
- `app/lkpd/kasus/[id]/analisis/page.tsx`: analysis load-error recovery links/actions.
- `app/lkpd/identitas/page.tsx`: prevent duplicate in-flight identity saves and display network failure without discarding entered form state.
- `scripts/check-pbl-invariants.mjs`: source assertions for the retry/recovery actions and disabled/busy identity-save state.
- `.github/workflows/ci.yml`, `package.json`: run the unit test command on Phase 3 branch pushes.

## Verification boundary

| Area | Current evidence | Status |
|---|---|---|
| TypeScript | `npx tsc --noEmit` via Run #46 | Passed |
| Unit tests | 12 passed, 0 failed via Run #46 | Passed |
| PBL/security source invariants | Run #46 | Passed |
| Production build | Run #46, compiled and 17/17 static pages generated | Passed |
| Production dependency audit | `npm audit --omit=dev`, Run #46 | Passed, 0 production advisories reported by that command |
| Full dependency-tree audit | 7 installation advisories historically reported (2 moderate, 5 high) | Open |
| Retry/identity state transitions in UI | Source invariants only | Runtime pending |
| Supabase autosave/submit race behavior | No database-writing/runtime test in this phase | Runtime pending |
| Preview's exact source SHA and staging configuration | Vercel access still blocked with HTTP 403 | Blocked |


---

## Kanonis — checklist validasi pedagogis PBL (audit 2026-10-26)

**Baseline yang diaudit:** `main` pada SHA `f470cb5b322bc76282c24610be3a10e6c4809d65`.
**Status dokumen:** Checklist ini menjadi sumber utama untuk cakupan pedagogis PBL. Audit ini memeriksa source code, seed, skema data, tes otomatis, dan catatan QA yang tersedia. Audit ini **bukan** bukti bahwa alur telah diuji pada browser atau staging.
**Pembedaan penting:** UI saat ini mempunyai empat label kerja — SEE, THINK, CONNECT, ACT — bukan lima tahap PBL yang lengkap. Empat label tersebut tidak boleh dihitung sebagai bukti bahwa organisasi belajar, penyelidikan terstruktur, presentasi/evaluasi, atau revisi berdasarkan umpan balik telah tersedia.

### Status ringkas A.1–A.7

| ID | Kriteria | Status audit | Bukti implementasi yang ditemukan | Bukti pengujian | Kesenjangan / tindakan |
|---|---|---|---|---|---|
| A.1 | Validitas dan keterbukaan masalah | **PARTIAL** | `app/admin/videos/page.tsx` menyediakan konteks kasus; `app/admin/questions/page.tsx` mempunyai prompt SEE/THINK tentang masalah, fakta, penyebab, dampak, dan pihak terdampak; `scripts/seed.mjs` memuat pertanyaan kasus awal. | Tes unit dan invariant menguji skema/struktur sumber, bukan kualitas pedagogis setiap kasus aktif. Belum ada bukti browser/staging yang menilai kasus dan jawaban siswa. | Audit contoh video/kasus yang benar-benar dipakai: konteks nyata, masalah terbuka, alternatif solusi yang dapat dipertanggungjawabkan, pihak terdampak, fakta awal, penyebab, konsekuensi. Pastikan pertanyaan tidak mengarahkan hanya ke satu jawaban hafalan. |
| A.2 | Tahap 1 — orientasi masalah | **PARTIAL** | `components/lkpd/PhaseBar.tsx`, `app/lkpd/kasus/[id]/page.tsx`, dan `app/admin/questions/page.tsx` mendukung stimulus/video, pengamatan, fakta, masalah awal, dan pihak terdampak. | Ada pemeriksaan source-level untuk empat label fase dan unit test formulir; belum membuktikan pemahaman siswa atau perilaku runtime. | Pastikan instruksi membedakan fakta, dugaan, dan pendapat; menjelaskan ruang lingkup, pertanyaan pemantik, pihak terdampak, dan hasil belajar. Uji dengan kasus contoh dan respons siswa. |
| A.3 | Tahap 2 — organisasi belajar | **NOT IMPLEMENTED** | `groups` dan `group_members` menyimpan kelompok/anggota; halaman admin kelompok mengelola kelompok dan penugasan video. Tidak ditemukan model peran anggota, pertanyaan penyelidikan terstruktur, atau rencana kerja kelompok yang disimpan. | Tidak ada tes yang membuktikan pembagian peran, rencana pencarian informasi, atau target keluaran kelompok. Identitas anggota bukan bukti pembagian peran. | Rancang sebagai pekerjaan pengembangan terpisah: pertanyaan penyelidikan, peran/tanggung jawab anggota, rencana sumber/bukti, urutan kerja, dan keluaran. Setelah diimplementasikan, uji simpan, muat ulang, dan akses antarkelompok. |
| A.4 | Tahap 3 — penyelidikan | **PARTIAL** | Pertanyaan dan jawaban siswa dapat disimpan; prompt THINK meminta bukti/fakta, penyebab, dampak, dan perspektif. Skema `questions`/`answers` menyimpan pertanyaan dan jawaban. | `scripts/pbl-ux-validation.test.mjs` menguji helper/skema dan `scripts/check-pbl-invariants.mjs` menguji invariant sumber. Keduanya bukan tes pengelolaan sumber eksternal atau hubungan klaim–bukti. | Belum ditemukan field/alur khusus untuk mencatat sumber informasi, kutipan/tautan, klaim yang didukung setiap bukti, kekuatan/keterbatasan bukti, atau asumsi. Jangan menganggap pertanyaan teks terbuka sebagai fitur manajemen bukti. |
| A.5 | Tahap 4 — pengembangan dan penyajian solusi | **PARTIAL** | Prompt ACT meminta solusi, tindakan nyata, langkah awal, pihak yang dilibatkan, dan kelayakan; instruksi fase meminta pembagian peran dan indikator keberhasilan. Halaman `app/admin/submissions/page.tsx` menampilkan jawaban dan mendukung ekspor. | Tes otomatis memvalidasi sebagian perilaku data/form, bukan presentasi produk atau tinjauan guru. Belum ada bukti runtime presentasi. | Belum ditemukan mekanisme tersendiri untuk mengumpulkan/menyajikan produk akhir (mis. artefak/presentasi) dan memberi umpan balik guru atas kualitas solusi. Rencana aksi ACT tidak otomatis memenuhi kriteria presentasi. |
| A.6 | Tahap 5 — evaluasi dan refleksi | **PARTIAL** | Sistem pertanyaan umum dapat menyimpan jawaban; daftar placeholder kategori solusi/refleksi/kesimpulan memuat “Apa pelajaran penting yang kalian peroleh?”. Seed menempatkan pertanyaan kesimpulan dalam ACT. | Tidak ada tes yang membuktikan aktivitas refleksi/evaluasi tersendiri, evaluasi dampak/kelayakan, atau perbandingan tujuan awal dengan hasil. | Belum ada tahap refleksi yang eksplisit dengan pertanyaan tentang keterbatasan bukti, proses kelompok, kontribusi anggota, kelayakan/dampak solusi, tujuan awal vs hasil, dan perbaikan berikutnya. Pastikan aktivitas tersebut dapat disimpan dan ditinjau. |
| A.7 | Revisi solusi berdasarkan umpan balik | **PARTIAL** | Alur admin mempunyai mekanisme “Buka kembali” pengerjaan yang dicatat dalam `docs/p0-autosave-submit-qa.md`; data jawaban bisa diedit saat pengerjaan kembali dibuka. | QA dokumen mencantumkan skenario buka kembali, tetapi itu bukan bukti bahwa umpan balik, versi revisi, atau urutan penilaian akhir telah diuji. | Tidak ditemukan alur lengkap komentar/umpan balik guru → revisi siswa → alasan mempertahankan/mengubah solusi → versi/riwayat revisi → penilaian final. Membuka submission kembali saja tidak memenuhi kriteria. |

### Definisi status dan batas bukti

- **PASS:** seluruh kriteria terukur dibuktikan oleh implementasi dan pengujian yang sesuai.
- **PARTIAL:** ada dukungan terkait, tetapi setidaknya satu unsur wajib belum tersedia atau belum dibuktikan.
- **FAIL:** pengujian menemukan perilaku yang bertentangan dengan kriteria.
- **BLOCKED:** verifikasi belum dapat dilakukan karena akses/lingkungan/bukti tidak tersedia.
- **NOT IMPLEMENTED:** kemampuan inti yang disyaratkan tidak ditemukan dalam source yang diaudit.
- **NOT APPLICABLE:** hanya jika alasan ketidakberlakuan dijelaskan.

Status di tabel adalah **hasil audit source dan dokumentasi**, bukan hasil uji browser. Tidak ada A.1–A.7 yang diberi PASS. Tes unit/source invariant tidak membuktikan kualitas kasus, pemahaman siswa, presentasi, refleksi, atau revisi saat runtime.

### Kriteria penerimaan terukur dan bukti yang perlu direkam

#### A.1 — Validitas dan keterbukaan masalah
- [ ] Guru dapat menunjuk kasus/video yang relevan dengan materi dan konteks nyata.
- [ ] Pertanyaan pemantik memungkinkan lebih dari satu alternatif solusi yang harus dijustifikasi, bukan satu jawaban hafalan.
- [ ] Siswa diminta mengidentifikasi fakta awal, dugaan, pihak terdampak, penyebab, dan konsekuensi.
- [ ] Reviewer mencatat ID/nama kasus, prompt aktif, contoh respons, dan alasan mengapa masalah terbuka.
- **Bukti:** konfigurasi kasus/pertanyaan aktif dan hasil respons contoh; bukan sekadar adanya kolom video/pertanyaan.

#### A.2 — Orientasi masalah
- [ ] Siswa dapat menyatakan ulang masalah dan ruang lingkupnya.
- [ ] Instruksi memisahkan fakta yang diamati dari dugaan/pendapat.
- [ ] Pihak terdampak dan pertanyaan pemantik disebut secara eksplisit.
- [ ] Hasil belajar/keluaran yang diharapkan dijelaskan sebelum analisis solusi.
- **Bukti:** prompt aktif, contoh kasus, dan pengujian browser dengan respons yang menunjukkan pemahaman awal.

#### A.3 — Organisasi belajar
- [ ] Kelompok merumuskan pertanyaan penyelidikan yang dapat dijawab melalui pengumpulan informasi.
- [ ] Setiap anggota mempunyai peran/tanggung jawab yang eksplisit; nama anggota saja tidak cukup.
- [ ] Kelompok menyimpan rencana pencarian informasi/bukti, urutan kerja, dan target keluaran.
- [ ] Guru dapat meninjau rencana tersebut; data tetap tersedia setelah reload dan tidak bocor antar-kelompok.
- **Bukti:** record rencana/peran pada lingkungan uji dan tes simpan-muat ulang/isolation. Saat ini status **NOT IMPLEMENTED**.

#### A.4 — Penyelidikan
- [ ] Siswa dapat mencatat fakta/informasi dan sumber eksternal bila digunakan.
- [ ] Klaim/kesimpulan dikaitkan dengan bukti yang mendukungnya.
- [ ] Siswa membahas penyebab, dampak, perspektif pihak terdampak, asumsi, serta informasi yang belum cukup.
- [ ] Guru dapat meninjau jawaban beserta sumber dan keterbatasan bukti.
- **Bukti:** respons siswa yang tersimpan, sumber/tautan yang tercatat, dan tampilan guru yang menunjukkan relasi klaim–bukti. Saat ini pengelolaan sumber/bukti khusus belum ditemukan.

#### A.5 — Pengembangan dan penyajian solusi
- [ ] Solusi merujuk pada temuan penyelidikan dan menyertakan argumentasi/bukti.
- [ ] Solusi mempunyai langkah penerapan, pihak yang bertanggung jawab, dan indikator keberhasilan.
- [ ] Siswa dapat mengumpulkan/menyajikan produk akhir; guru dapat membukanya dan memberikan umpan balik.
- [ ] Bukti presentasi/produk tidak hanya berupa status `submitted` atau rencana ACT.
- **Bukti:** artefak/presentasi tersimpan, tampilan tinjauan guru, dan uji pengiriman/akses pada staging. Mekanisme presentasi khusus belum ditemukan.

#### A.6 — Evaluasi dan refleksi
- [ ] Siswa menilai kelayakan dan potensi dampak solusi dengan alasan.
- [ ] Siswa mencatat keterbatasan bukti/informasi yang belum diketahui.
- [ ] Siswa merefleksikan proses penyelidikan, keputusan kelompok, dan kontribusi anggota.
- [ ] Siswa membandingkan tujuan awal dengan hasil dan menjelaskan pelajaran/perbaikan berikutnya.
- [ ] Jawaban refleksi tersimpan dan dapat ditinjau guru secara terpisah dari ringkasan submission.
- **Bukti:** aktivitas refleksi yang eksplisit dan jawaban tersimpan; satu prompt “pelajaran penting” saja belum cukup.

#### A.7 — Revisi berdasarkan umpan balik
- [ ] Guru dapat menyimpan umpan balik yang terkait dengan solusi/argumentasi tertentu.
- [ ] Siswa dapat membaca umpan balik dan mengirim revisi beserta alasan/bukti.
- [ ] Sistem membedakan versi awal dan revisi atau menyediakan riwayat perubahan yang dapat ditinjau.
- [ ] Penilaian final terjadi setelah revisi selesai atau kesempatan revisi ditutup menurut kebijakan.
- **Bukti:** urutan umpan balik → revisi → versi/riwayat → penilaian final yang diuji. Fitur buka kembali submission saja belum cukup.

### Cara menjalankan audit lanjutan tanpa melebih-lebihkan status

Untuk setiap butir, simpan secara terpisah:
1. **Source:** path komponen/API/skema yang mendukung perilaku.
2. **Automated test:** nama tes dan run URL yang lulus pada SHA yang diuji.
3. **Browser/staging:** URL deployment, exact SHA, browser/OS/versi/viewport, skenario, hasil aktual, dan bukti aman.
4. **Gap:** fitur yang belum ada, bukti yang belum tersedia, pemilik tindak lanjut, dan kriteria penerimaan.

Gunakan data sintetis pada staging yang telah diverifikasi. Jangan menguji tulis pada Production. Jika akses Preview/staging belum dapat diverifikasi, tandai **BLOCKED** dan jangan menyimpulkan PASS.

### Prioritas tindak lanjut

1. **P0 — A.3 organisasi belajar:** rancang dan implementasikan peran, pertanyaan penyelidikan, dan rencana kerja tersimpan; tanpa ini alur kelompok belum mencakup organisasi belajar.
2. **P0 — A.4 pengelolaan bukti:** putuskan struktur pencatatan sumber dan hubungan klaim–bukti; pertanyaan teks saja tidak mencukupi.
3. **P1 — A.5 presentasi dan tinjauan guru:** definisikan produk akhir dan alur umpan balik.
4. **P1 — A.6 refleksi/evaluasi:** tambahkan aktivitas eksplisit dan dapat disimpan, tidak hanya kesimpulan pada ACT.
5. **P1 — A.7 revisi:** tentukan komentar guru, revisi siswa, riwayat, dan aturan penilaian final.
6. **P1 — A.1/A.2 validasi konten:** audit kasus dan prompt aktif dengan rubrik terbuka/fakta-dugaan/pihak terdampak.
7. **P2 — validasi runtime:** jalankan skenario browser dan staging sesudah fitur tersedia; jangan menutup gap berdasarkan source invariant saja.

### Hubungan dengan dokumen lain

Checklist pedagogis kanonis ada di bagian ini. Dokumen berikut adalah catatan historis/teknis untuk domain masing-masing dan tidak membuat checklist pedagogis duplikat:
- [Tahap 4 — dependency, staging, dan runtime ledger](phase4-verification-status.md)
- [Tahap 5 — release-readiness ledger](phase5-release-readiness.md)
- [Tahap 6 — final verification dan release gate](phase6-final-verification.md)
- [QA autosave dan submit](p0-autosave-submit-qa.md)
- [Status regresi keamanan dan staging](p0-regression-status.md)

---

## Kanonis — checklist B: dashboard admin sistem dan keberlanjutan (audit 2026-10-26)

**Baseline source:** `main` pada SHA `870566d5e8160099bc85b456a28474e69bc06672` (setelah PR #15 digabung).
**Cakupan bagian ini:** B.1 pengguna/hak akses, B.2 sekolah/kelas/tahun ajaran, dan B.3 pemeliharaan sistem.
**Batas audit:** pemeriksaan source dan dokumentasi repository. Ini bukan pengujian langsung browser, bukan konfirmasi keadaan Production, dan bukan bukti bahwa konfigurasi staging saat ini masih sama dengan catatan historis.

### Ringkasan status

| Area | Hasil audit source | Kesimpulan |
|---|---|---|
| B.1 Pengguna dan hak akses | **Tersedia, perlu penyempurnaan** | Login admin dan pemeriksaan role sisi server/RLS ada. Model role saat ini hanya `admin` dan `student`; pengelolaan akun, guru per proyek, pemulihan akses, dan audit log belum terbukti sebagai alur produk. |
| B.2 Sekolah, kelas, dan tahun ajaran | **Belum ditemukan / perlu keputusan cakupan** | Ada proyek, nama kelas berbentuk teks pada kelompok, anggota, dan penugasan video. Tidak ditemukan model formal sekolah, kelas, tahun ajaran, atau penugasan guru dengan scope sekolah/kelas. Kebutuhan multi-sekolah harus diputuskan sebelum implementasi. |
| B.3 Pemeliharaan sistem | **Tersedia, perlu penyempurnaan** | Ada CI, migrasi SQL bernama, skrip keamanan, dan dokumentasi staging. Dashboard admin yang terlihat berfokus pada progres pembelajaran; health monitoring, audit log operasional, backup/restore teruji, dan prosedur insiden belum dibuktikan. |

### B.1 — Pengguna dan hak akses

| ID | Kebutuhan | Status | Bukti source/dokumentasi | Tes dan runtime | Kekurangan, prioritas, kriteria penerimaan |
|---|---|---|---|---|---|
| B.1.1 | Pengelolaan akun administrator dan guru | **Tersedia, perlu penyempurnaan** | `supabase/schema.sql` membatasi `users.role` menjadi `admin` atau `student`. `app/admin/layout.tsx` memiliki halaman pengaturan akun, tetapi navigasi dan deskripsi yang terlihat menunjukkan informasi akun/logout, bukan konsol untuk membuat, menonaktifkan, atau mengatur guru. | CI pada SHA baseline ini belum dibuktikan dari status yang diperiksa. Browser belum diverifikasi. | **P1.** Putuskan apakah role guru berbeda dari admin sistem. Kriteria: admin berwenang dapat mengundang/menonaktifkan akun, menetapkan role dan scope; tindakan ditolak di server untuk aktor tanpa izin; akun yang dinonaktifkan tidak dapat mengakses data. |
| B.1.2 | Pengelolaan/prosedur penerimaan akun siswa | **Tersedia, perlu penyempurnaan** | README menjelaskan kode akses kelompok dan pengisian identitas siswa tanpa akun siswa individual. `groups.access_code` dan `group_members` tersedia pada `supabase/schema.sql`. | Dokumentasi staging menyebut isolasi kelompok sebagai sasaran, tetapi skenario browser terkait belum dinyatakan lulus. | **P1.** Tetapkan secara eksplisit bahwa onboarding berbasis kode adalah kebijakan produk atau apakah akun individual diperlukan. Kriteria: prosedur pembuatan, pembagian, rotasi, kedaluwarsa, dan pencabutan kode terdokumentasi; siswa tidak dapat mendaftarkan diri atau melihat kelompok lain. |
| B.1.3 | Peran admin sistem, guru, dan siswa dibedakan | **Belum ditemukan** | Skema `users.role` hanya menerima `admin` dan `student`; antarmuka admin menggunakan label “Ruang Kerja Guru”, tetapi label UI tidak membuktikan role guru terpisah. | Belum ada tes matriks izin tiga peran yang dibuktikan untuk baseline ini. | **P0 sebelum multi-guru.** Rancang matriks izin dan model role terlebih dahulu. Kriteria: tes positif/negatif membuktikan setiap peran hanya dapat melakukan tindakan yang disetujui; jangan memberi semua guru hak admin sistem. |
| B.1.4 | Hak akses diperiksa di server, bukan hanya dengan menyembunyikan menu | **Tersedia, perlu penyempurnaan** | `proxy.ts` memeriksa sesi dan role admin pada rute `/admin/*`; migrasi `supabase/migrations/20261022152719_secure_admin_helper_and_transactional_question_editor.sql` menggunakan helper admin dan RLS untuk tabel aplikasi. `supabase/security.sql` membatasi RPC siswa ke `service_role`. | `docs/p0-regression-status.md` mencatat pemeriksaan RLS/RPC pada staging secara historis, tetapi Preview terbaru dan tes browser belum terverifikasi pada audit ini. Status Vercel sukses saja bukan bukti kontrol akses lulus. | **P0.** Jalankan matriks akses pada staging terverifikasi: tanpa login, student, admin, role tidak dikenal; coba akses langsung API/RPC/tabel, bukan hanya URL halaman. Kriteria: semua permintaan lintas role ditolak di server tanpa kebocoran data. |
| B.1.5 | Guru hanya mengakses proyek dan hasil sesuai kewenangannya | **Belum ditemukan** | `projects` tidak memiliki `owner_id`/relasi guru; policy admin yang diperiksa memberi akses berdasarkan `is_admin()`, bukan kepemilikan proyek oleh guru. `ProjectProvider` mengatur proyek aktif di UI, tetapi pemilih proyek tidak sama dengan otorisasi per guru. | Belum ada tes lintas-guru/per-proyek yang dibuktikan. | **P0 jika multi-guru.** Tambahkan relasi penugasan guru–proyek/kelas dan enforce di server/RLS. Kriteria: guru A tidak bisa membaca/mengubah proyek, submission, atau ekspor milik guru B dengan mengganti ID atau memanggil API langsung. |
| B.1.6 | Siswa hanya dapat mengakses pekerjaan kelompoknya | **Tersedia, perlu penyempurnaan** | README dan API siswa menyebut validasi kode kelompok serta penugasan video; skema memuat `groups`, `group_videos`, `submissions`, dan `answers`. `docs/staging-setup.md` mendokumentasikan hardening isolasi kelompok/proyek pada staging. | `docs/p0-regression-status.md` menyebut browser/concurrency tests belum dijalankan dan Preview belum terverifikasi. | **P0.** Jalankan tes dua kelompok sintetis di staging. Kriteria: kode salah, ID kelompok/video/submission yang dimanipulasi, dan permintaan lintas kelompok tidak mengembalikan data atau mengubah jawaban kelompok lain. |
| B.1.7 | Pemulihan akun dan perubahan kewenangan memiliki prosedur jelas | **Belum ditemukan** | README menjelaskan pembuatan akun admin secara manual melalui Supabase Authentication/SQL. Tidak ditemukan alur pemulihan akun atau proses persetujuan perubahan role di UI yang diperiksa. | Tidak ada skenario pemulihan akun/role yang terbukti diuji. | **P1.** Dokumentasikan reset akun, verifikasi identitas, pergantian pemilik/admin, pencabutan sesi, dan prosedur saat admin kehilangan akses. Kriteria: prosedur diuji di staging dan tidak membutuhkan berbagi kata sandi atau menampilkan secret. |
| B.1.8 | Perubahan hak akses penting tercatat dalam audit log | **Belum ditemukan** | Pencarian source untuk pola `audit_log` tidak menemukan implementasi yang cocok; skema inti yang diperiksa tidak menampilkan tabel log perubahan role/izin. Ini adalah hasil pencarian repository, bukan bukti bahwa platform penyedia tidak mempunyai log tersendiri. | Tidak ada tes audit-log atau contoh event yang dapat diverifikasi. | **P1.** Catat aktor, target, tindakan, waktu, hasil, dan alasan untuk perubahan role, penugasan, serta operasi administratif sensitif; jangan menyimpan password/token. Kriteria: event tetap tersedia bagi auditor berwenang dan tidak dapat diubah oleh pengguna biasa. |

### B.2 — Sekolah, kelas, dan tahun ajaran

| ID | Kebutuhan | Status | Bukti source/dokumentasi | Tes dan runtime | Kekurangan, prioritas, kriteria penerimaan |
|---|---|---|---|---|---|
| B.2.1 | Model sekolah jika produk mendukung banyak sekolah | **Belum diverifikasi** | Pencarian `school_id` tidak menemukan model sekolah yang cocok. Belum ada keputusan cakupan multi-sekolah yang tercatat pada dokumen yang diperiksa. | Belum ada tes isolasi antarsekolah. | **P0 keputusan arsitektur.** Putuskan apakah targetnya satu sekolah atau multi-tenant. Jika multi-sekolah: sekolah menjadi tenant eksplisit dan semua query, RLS, storage, ekspor, dan API harus memverifikasi tenant. |
| B.2.2 | Pengelolaan kelas dan mata pelajaran | **Tersedia, perlu penyempurnaan** | `projects.subject` dan `projects.grade` tersedia; `groups.class_name` hanya teks, bukan entitas kelas dengan identitas dan relasi. | Belum ada tes pengelolaan kelas formal atau validasi konsistensi lintas proyek. | **P1.** Jika kelas perlu dipakai lintas proyek/periode, buat entitas kelas dan relasi ke sekolah/periode. Kriteria: daftar kelas konsisten, perubahan nama tidak merusak histori, dan proyek hanya dapat ditugaskan ke kelas yang valid. |
| B.2.3 | Pengelolaan tahun ajaran/periode | **Belum ditemukan** | Pencarian `academic_year` tidak menemukan model yang cocok; tabel proyek/kelompok yang diperiksa tidak menunjukkan relasi tahun ajaran formal. | Tidak ada tes pergantian periode. | **P1.** Tambahkan periode hanya setelah kebijakan sekolah disepakati. Kriteria: proyek, kelas, kelompok, dan submission terikat pada periode eksplisit dan tidak bercampur saat periode baru dibuat. |
| B.2.4 | Guru dapat ditugaskan pada kelas dan proyek tertentu | **Belum ditemukan** | Tidak ditemukan tabel/relasi penugasan guru. Akses admin yang diperiksa didasarkan pada role admin global. | Tidak ada tes assignment atau isolasi guru. | **P0 jika multi-guru.** Buat model assignment dan enforcement server-side. Kriteria: guru hanya melihat kelas/proyek yang ditugaskan dan pencabutan assignment segera menutup akses. |
| B.2.5 | Kelompok terkait dengan kelas serta periode yang benar | **Tersedia, perlu penyempurnaan** | `groups.class_name` menyimpan nama kelas sebagai teks dan `groups.project_id` menghubungkan kelompok ke proyek; tidak ditemukan foreign key periode/tahun ajaran. | Belum ada tes integritas data lintas kelas/periode. | **P1.** Kriteria: setiap kelompok terkait dengan ID kelas dan periode yang valid jika fitur itu masuk cakupan; laporan dan ekspor memfilter periode yang benar. |
| B.2.6 | Isolasi data antarsekolah jika multi-sekolah diterapkan | **Belum ditemukan** | Tidak ditemukan tenant/sekolah ID dalam model inti yang diperiksa. | Belum ada tes lintas-tenant; tes isolasi kelompok/proyek bukan pengganti tes isolasi sekolah. | **P0 jika multi-sekolah.** Kriteria: tes negatif antarsekolah untuk baca/tulis, Storage, API, ekspor, dan admin; tidak boleh mengandalkan filter UI saja. |
| B.2.7 | Proyek lama dapat diarsipkan tanpa kehilangan histori | **Tersedia, perlu penyempurnaan** | `projects.is_active` tersedia pada `supabase/schema.sql`, tetapi flag aktif/nonaktif tidak dengan sendirinya membuktikan kebijakan arsip dan retensi historis. Relasi tertentu memakai `ON DELETE CASCADE`, sehingga penghapusan fisik berisiko menghapus catatan terkait. | Tidak ada tes arsip/pemulihan proyek yang dibuktikan pada audit ini. | **P1.** Bedakan arsip dari hapus permanen. Kriteria: proyek arsip tidak muncul sebagai pilihan baru, tetapi submission/jawaban historis tetap dapat dibaca sesuai izin; unarchive mengikuti kebijakan; hapus permanen dibatasi dan tercatat. |
| B.2.8 | Pergantian tahun ajaran tidak mencampurkan data lama dan baru | **Belum ditemukan** | Model periode formal tidak ditemukan; karena itu tidak ada relasi yang dapat dipakai untuk menjamin pemisahan periode. | Tidak ada tes pergantian tahun ajaran. | **P1 setelah B.2.3.** Kriteria: buat periode baru, pastikan daftar kelompok, proyek, penilaian, dan ekspor hanya menampilkan periode yang dipilih; histori periode lama tetap utuh. |

### B.3 — Pemeliharaan sistem

| ID | Kebutuhan | Status | Bukti source/dokumentasi | Tes dan runtime | Kekurangan, prioritas, kriteria penerimaan |
|---|---|---|---|---|---|
| B.3.1 | Admin dapat melihat kesehatan layanan | **Tersedia, perlu penyempurnaan** | `app/admin/page.tsx` menampilkan metrik kelompok, video, pertanyaan, submission, dan pesan gagal memuat data. Itu metrik pembelajaran, bukan pemeriksaan health layanan/API/database. `docs/staging-setup.md` mencatat status Supabase staging pada 2026-10-23. | Status Vercel pada SHA baseline `870566d` tercatat sukses, tetapi tidak ada bukti panel health admin atau probe end-to-end. | **P2.** Tambahkan status layanan yang aman (database/API/storage, waktu pemeriksaan terakhir, status deployment) tanpa secret atau data siswa. Kriteria: kegagalan terdeteksi, status stale dibedakan dari sehat, dan akses panel terbatas. |
| B.3.2 | Kegagalan penyimpanan/integrasi dapat diidentifikasi | **Tersedia, perlu penyempurnaan** | Ada pesan error pada sejumlah halaman dan catatan CI/staging; belum ditemukan pusat observabilitas aplikasi atau katalog insiden terintegrasi. | Dokumen staging menyatakan browser/concurrency tests belum dijalankan. Tidak ada bukti tracing end-to-end pada baseline ini. | **P1.** Tetapkan log terstruktur, correlation/request ID, metrik kegagalan, dan retensi. Kriteria: kegagalan simpan dapat ditelusuri tanpa mencatat jawaban pribadi, access code, atau token; alert dapat diuji dengan kegagalan sintetis. |
| B.3.3 | Versi aplikasi dan status deployment dapat ditelusuri | **Tersedia, perlu penyempurnaan** | Git SHA/PR dan status deployment dapat dilacak di GitHub/Vercel; informasi ini tidak tampak sebagai panel status deployment di dashboard admin. | Combined status untuk SHA `870566d` menunjukkan Vercel success; itu tidak membuktikan browser/staging atau backend cocok dengan SHA tersebut. | **P2.** Tampilkan atau dokumentasikan commit SHA, environment, waktu deployment, dan tautan log. Kriteria: operator dapat mengidentifikasi versi yang berjalan dan membedakan Preview dari Production tanpa membuka rahasia. |
| B.3.4 | Migrasi database memiliki versi dan prosedur | **Tersedia, perlu penyempurnaan** | File bernama timestamp tersedia pada `supabase/migrations/`; `docs/staging-setup.md` memperingatkan bahwa riwayat migrasi staging tidak cocok dengan semua timestamp file repository dan melarang `supabase db push` sebelum rekonsiliasi. | Catatan migrasi staging ada, tetapi tidak membuktikan migrasi dapat direplay dengan aman pada database kosong maupun upgrade. | **P0 untuk perubahan skema.** Rekonsiliasi migration history, tetapkan prosedur review/apply/rollback, dan uji upgrade pada database staging baru. Kriteria: urutan versi dapat direproduksi, hasil skema terverifikasi, dan tidak ada eksekusi Production tanpa persetujuan eksplisit. |
| B.3.5 | Backup dan restore terdokumentasi serta diuji | **Belum ditemukan** | Pencarian repository untuk prosedur backup/restore tidak menemukan dokumen yang cocok pada hasil yang diperiksa. Backup otomatis dari penyedia, jika ada, belum diverifikasi melalui repository. | Tidak ada bukti restore drill atau pengukuran RPO/RTO. | **P0 sebelum penggunaan data penting/produksi berkelanjutan.** Tetapkan pemilik, frekuensi, retensi, enkripsi, RPO/RTO, dan akses backup. Kriteria: restore dilakukan di lingkungan terisolasi, integritas record diverifikasi, dan hasil/tanggal dicatat. |
| B.3.6 | Rahasia tidak ditampilkan sebagai nilai yang dapat dibaca pengguna | **Tersedia, perlu penyempurnaan** | README memperingatkan agar `SUPABASE_SERVICE_ROLE_KEY` tidak diberi awalan `NEXT_PUBLIC_`; skema deployment memakai environment server. Tidak ditemukan bukti panel admin yang menampilkan secret, tetapi pemeriksaan dokumentasi saja tidak membuktikan tidak ada kebocoran runtime. | Build/CI tidak menggantikan pemeriksaan bundle browser, log, dan network. Uji kebocoran secret pada deployment aktual belum dibuktikan untuk SHA ini. | **P0.** Audit penggunaan environment variable, bundle client, log, dan error response. Kriteria: hanya nilai publik yang dikirim ke browser; secret tidak muncul dalam HTML/JS, response, log, atau UI; rotasi secret terdokumentasi. |
| B.3.7 | Operasi pemeliharaan berisiko memerlukan kewenangan sesuai | **Tersedia, perlu penyempurnaan** | Akses `/admin/*` dibatasi pada pengguna role admin melalui `proxy.ts`; helper RLS juga memakai role admin. Model tidak menunjukkan role operator pemeliharaan terpisah atau persetujuan dua pihak. | Belum ada tes tindakan pemeliharaan sensitif atau matriks izin admin/guru/operator. | **P1.** Klasifikasikan tindakan: baca status, ekspor data, ubah role, migrasi, restore, hapus permanen. Kriteria: tindakan berisiko dibatasi, dikonfirmasi, tercatat, dan tidak tersedia kepada guru/siswa tanpa izin eksplisit. |
| B.3.8 | Prosedur insiden dan pemulihan tersedia | **Belum ditemukan** | Ada catatan regresi/staging dan guardrail rilis, tetapi belum ditemukan runbook insiden operasional lengkap pada dokumen yang diperiksa. | Tidak ada bukti latihan respons insiden/restore. | **P1.** Buat runbook untuk kebocoran akses, kegagalan database, kehilangan data, deployment gagal, dan rotasi credential. Kriteria: mencakup deteksi, containment, eskalasi, pemulihan, komunikasi, dan postmortem; lakukan tabletop exercise. |
| B.3.9 | Dokumentasi untuk pengelola berikutnya tersedia | **Tersedia, perlu penyempurnaan** | README, `docs/staging-setup.md`, `docs/p0-regression-status.md`, dokumen fase 4–6, serta skrip SQL memberi konteks setup dan keamanan. Dokumen staging juga menyebut risiko migration-history yang belum direkonsiliasi. | Dokumen teknis ada, tetapi belum ada bukti onboarding operator baru atau latihan pemulihan yang berhasil. | **P2.** Satukan runbook setup, akses, release, migrasi, backup/restore, insiden, dan pemilik sistem. Kriteria: pengelola baru dapat menjalankan simulasi setup/rollback/restore di staging mengikuti dokumen tanpa mengakses secret dari chat atau meminta pengetahuan lisan yang tidak terdokumentasi. |

### Bukti CI, browser, dan staging untuk bagian B

- **Baseline audit:** `main` SHA `870566d5e8160099bc85b456a28474e69bc06672`.
- **CI:** workflow `.github/workflows/ci.yml` tersedia. Pada pemeriksaan status commit baseline, status yang terlihat adalah Vercel **success**; keberhasilan GitHub Actions untuk SHA yang sama belum dibuktikan dari respons status yang diperiksa. Jangan menyatakan seluruh CI lulus tanpa run yang cocok dengan SHA ini.
- **Browser/Preview:** belum ada bukti browser yang terikat ke deployment SHA ini. `docs/p0-regression-status.md` menyebut Preview terblokir oleh akses dan browser/concurrency tests belum dijalankan pada catatan terakhirnya.
- **Staging:** `docs/staging-setup.md` memuat bukti historis setup dan hardening staging, sekaligus peringatan bahwa migration history perlu direkonsiliasi. Catatan tersebut bukan konfirmasi keadaan runtime terkini.
- **Batas keselamatan:** jangan menjalankan migrasi, tes tulis, restore, atau pengujian destruktif di Production. Gunakan data sintetis dan staging yang identitasnya telah diverifikasi.

### Prioritas pelaksanaan B

1. **P0 — model kewenangan dan isolasi:** putuskan model satu guru vs multi-guru dan satu sekolah vs multi-sekolah; desain role, assignment, dan tenant isolation sebelum menambah fitur pengguna.
2. **P0 — migrasi dan perlindungan data:** rekonsiliasi migration history; siapkan prosedur backup/restore dan uji pemulihan terisolasi.
3. **P0 — tes akses server-side:** matriks admin/guru/siswa dan tes isolasi kelompok/proyek/tenant di staging.
4. **P1 — operasi akun:** onboarding, pemulihan akun, pencabutan akses, dan audit log perubahan kewenangan.
5. **P1 — kelas/periode:** model kelas dan tahun ajaran hanya setelah kebutuhan produk disepakati; jangan mengandalkan nama kelas bebas untuk isolasi data.
6. **P1 — observabilitas dan runbook:** pencatatan error yang aman, status layanan, eskalasi insiden, dan latihan pemulihan.
7. **P2 — dashboard pemeliharaan:** panel versi/deployment dan health check setelah batas akses serta sumber statusnya ditetapkan.

**Keputusan audit B:** belum layak diberi status “tersedia dan terverifikasi” secara menyeluruh. Sebagian fondasi keamanan dan operasional sudah ada, tetapi hak akses multi-guru, model sekolah/periode, audit log, backup/restore, health monitoring, dan uji runtime masih perlu dikembangkan atau dibuktikan. Status ini adalah hasil pemetaan source/dokumentasi; bukan penetapan bahwa seluruh fitur gagal.

