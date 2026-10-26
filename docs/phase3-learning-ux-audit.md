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
