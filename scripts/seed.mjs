// Seed data awal CIVIC VISION. Aman dijalankan ulang: dilewati jika project sudah ada. Jalankan: npm run seed
import { createClient } from "@supabase/supabase-js"; import { randomBytes } from "node:crypto";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local"); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });
const ok = (r, m) => { if (r.error) { console.error("Gagal:", m, r.error.message); process.exit(1); } return r.data; };
const { count } = await db.from("projects").select("id", { count: "exact", head: true });
if (count > 0) { console.log("Data sudah ada. Seed dilewati."); process.exit(0); }
const [p] = ok(await db.from("projects").insert({ title: "CIVIC VISION", tagline: "Menganalisis Pancasila dalam Kehidupan Sehari-hari", description: "Amati permasalahan di sekitar kita, temukan nilai Pancasila di dalamnya, dan ubah pemahaman menjadi tindakan nyata.", subject: "Pendidikan Pancasila", grade: "X", phase: "E", duration: "90 menit" }).select("id"), "project");
const V = [["Beda Keyakinan, Tetap Berteman", "Toleransi"], ["Komentar yang Menyakiti", "Bullying dan etika bermedia sosial"], ["Saring Sebelum Sharing", "Hoaks dan literasi digital"], ["Kita Berbeda, Kita Bersatu", "Persatuan dan konflik antarkelompok"], ["Adil untuk Semua", "Keadilan"], ["Bukan Urusanku", "Kepedulian sosial"]];
const vids = ok(await db.from("videos").insert(V.map(([title, category], i) => ({ project_id: p.id, number: i + 1, title, category }))).select("id,number"), "videos");
const groups = ok(await db.from("groups").insert(V.map((_, i) => ({ project_id: p.id, group_number: i + 1, access_code: `K${i + 1}-${randomBytes(8).toString("hex").toUpperCase()}` }))).select("id,group_number,access_code"), "groups");
ok(await db.from("group_videos").insert(groups.map(g => ({ group_id: g.id, video_id: vids.find(v => v.number === g.group_number).id }))), "group_videos");
const SILA = ["Sila 1 — Ketuhanan Yang Maha Esa", "Sila 2 — Kemanusiaan yang Adil dan Beradab", "Sila 3 — Persatuan Indonesia", "Sila 4 — Kerakyatan yang Dipimpin oleh Hikmat Kebijaksanaan dalam Permusyawaratan/Perwakilan", "Sila 5 — Keadilan Sosial bagi Seluruh Rakyat Indonesia"];
// Hanya pertanyaan yang ditetapkan di project (6 tahap analisis + kesimpulan). Fase: Dampak ditaruh di CONNECT agar fase berurutan; guru dapat mengubahnya di Admin.
const Q = [["Masalah", "see", "Apa masalah utama yang terjadi dalam video?", null, "textarea", "Tuliskan masalah utama yang kalian temukan...", 1],
 ["Penyebab", "think", "Apa penyebab terjadinya masalah tersebut?", null, "multiple_text", "Tuliskan satu penyebab...", 2],
 ["Nilai Pancasila", "connect", "Sila atau nilai Pancasila apa yang berkaitan dengan kasus tersebut?", null, "single_select", null, 1],
 ["Nilai Pancasila", "connect", "Jelaskan alasan kalian memilih sila tersebut.", null, "textarea", "Jelaskan keterkaitannya dengan kasus...", 1],
 ["Dampak", "connect", "Apa dampak permasalahan tersebut terhadap individu dan lingkungan sosial?", null, "textarea", "Tuliskan dampak bagi individu dan lingkungan sosial...", 1],
 ["Solusi", "act", "Apa solusi konkret yang dapat dilakukan untuk mengatasi masalah tersebut?", "Pilih solusi yang realistis dan dapat dilakukan dalam kehidupan sehari-hari.", "textarea", "Tuliskan solusi kelompok...", 1],
 ["Aksi", "act", "Apa tindakan nyata yang dapat kalian lakukan agar masalah tersebut tidak terulang?", "Ubahlah solusi menjadi tindakan yang benar-benar dapat dilakukan.", "textarea", "Tuliskan tindakan nyata...", 1],
 ["Kesimpulan", "act", "Berdasarkan video yang kami analisis, kami menyimpulkan bahwa...", null, "textarea", null, 1], ["Kesimpulan", "act", "Solusi yang menurut kelompok kami paling tepat adalah...", null, "textarea", null, 1],
 ["Kesimpulan", "act", "Nilai Pancasila yang ingin kami terapkan adalah...", null, "textarea", null, 1], ["Kesimpulan", "act", "Tindakan yang akan kami lakukan adalah...", null, "textarea", null, 1]];
const qs = ok(await db.from("questions").insert(Q.map(([category, phase, question_text, description, question_type, placeholder, min_items], i) => ({ project_id: p.id, category, phase, question_text, description, question_type, placeholder, min_items: question_type === "multiple_text" ? 2 : 1, display_order: i + 1 }))).select("id,question_type"), "questions");
ok(await db.from("question_options").insert(SILA.map((option_text, i) => ({ question_id: qs.find(q => q.question_type === "single_select").id, option_text, display_order: i + 1 }))), "options");
console.log("Seed selesai. Kode akses kelompok (bagikan ke siswa):"); groups.forEach(g => console.log(`  Kelompok ${g.group_number}: ${g.access_code}`));
