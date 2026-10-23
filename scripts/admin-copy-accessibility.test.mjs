import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const groups = read("../app/admin/groups/page.tsx");
const layout = read("../app/admin/layout.tsx");
const overview = read("../app/admin/page.tsx");
const questions = read("../app/admin/questions/page.tsx");
const submissions = read("../app/admin/submissions/page.tsx");
const videos = read("../app/admin/videos/page.tsx");
const projects = read("../components/admin/ProjectProvider.tsx");

test("group editor uses explicit Indonesian accessible names and save guidance", () => {
  for (const snippet of [
    'className="admin-field-hint">Isi nama anggota',
    "aria-label={`Nama anggota ${i + 1}`}",
    'aria-label="Nomor kelompok"',
    'aria-label="Nama kelompok"',
    'aria-label="Kelas kelompok"',
    'aria-label="Nama ketua kelompok"',
  ]) assert.ok(groups.includes(snippet), `missing group accessibility/copy: ${snippet}`);
});

test("admin navigation and dashboard use the revised Indonesian copy", () => {
  for (const snippet of [
    'label: "Ringkasan"',
    'label: "Proyek"',
    'label: "Pertanyaan LKPD"',
    'className="admin-nav-label">RUANG KERJA</div>',
  ]) assert.ok(layout.includes(snippet), `missing navigation copy: ${snippet}`);
  for (const snippet of [
    'note: "Kelompok dalam proyek"',
    '${drafts.length} draf tersimpan',
    '"Sudah dikirim"',
    '"Draf"',
  ]) assert.ok(overview.includes(snippet), `missing dashboard copy: ${snippet}`);
});

test("question labels remain localized and associated with their controls", () => {
  for (const snippet of [
    'text: "Jawaban singkat"',
    'textarea: "Jawaban panjang"',
    'multiple_text: "Beberapa jawaban teks"',
    'single_select: "Pilih satu jawaban"',
    'multi_select: "Pilih beberapa jawaban"',
    'scale: "Skala 1–5"',
    'htmlFor="question-placeholder">Petunjuk/contoh jawaban</label>',
    '<label>Posisi tampil</label>',
    '<th>Posisi tampil</th>',
    'htmlFor="question-description"',
    'id="question-description"',
  ]) assert.ok(questions.includes(snippet), `missing question copy/label: ${snippet}`);
});

test("PR #6 question preview and transactional RPC handlers remain intact", () => {
  for (const snippet of [
    'import { QuestionField }',
    'aria-label="Pratinjau soal siswa"',
    'setPreviewAnswer',
    'sb.rpc("admin_save_question"',
    'sb.rpc("admin_delete_question"',
    'sb.rpc("admin_reorder_questions"',
    'setErr(',
    'saving ? "Menyimpan..."',
  ]) assert.ok(questions.includes(snippet), `missing preview/RPC/error behavior: ${snippet}`);
});

test("submission, video and project error states preserve accessible Indonesian copy", () => {
  for (const snippet of [
    'return "Belum mulai"',
    'return "Sudah dikirim"',
    'return "Draf"',
    'aria-label="Dari tanggal"',
    'aria-label="Sampai tanggal"',
  ]) assert.ok(submissions.includes(snippet), `missing submission copy/accessibility: ${snippet}`);
  assert.ok(videos.includes("Gambar pratinjau (JPG, PNG, WebP"), "missing localized preview-image label");
  assert.ok(videos.includes("htmlFor=\"new-video-title\""), "video title label should remain associated with its input");
  assert.ok(projects.includes("PROJECT_LOAD_ERROR"), "project load error helper missing");
  assert.ok(projects.includes('role="alert"'), "project load errors should be announced accessibly");
});
