# CIVIC VISION — LKPD Digital
Menganalisis Pancasila dalam Kehidupan Sehari-hari. Next.js + TypeScript + Supabase (Postgres, Auth, Storage, RLS).

## 1. Persyaratan
Node.js 20.6+ · akun Supabase (gratis cukup) · akun Vercel (untuk deploy).

## 2. Siapkan Supabase
1. Buat project baru di supabase.com. Di **Settings → API** salin: Project URL, `anon` key, dan `service_role` key.
2. **SQL migration** — buka SQL Editor, jalankan untuk instalasi baru:
   1. `supabase/schema.sql` (tabel, fungsi, RLS dasar, bucket, indeks).
   2. `supabase/security.sql` (mengunci RPC siswa, menutup baca publik tabel konten, memprivatkan bucket, dan membatasi input).
   - Database lama: jangan menjalankan ulang `schema.sql` pada produksi. Terapkan migrasi yang sesuai setelah membaca instruksinya.
   - Untuk deployment yang sudah berjalan, deploy aplikasi terbaru hingga Vercel berstatus **Ready**, lalu jalankan `supabase/p0-lock-public-reads.sql` di SQL Editor. Skrip ini menutup baca langsung tabel konten oleh anon, mengunci RPC siswa (termasuk `student_rate_limit` bila tersedia) agar hanya dapat dipanggil `service_role`, dan menjaga bucket video tetap privat; siswa kemudian mendapat konten lewat API server yang memeriksa kode kelompok dan penugasan.
   - Sebelum kode kelompok dibagikan ke kelas, pertimbangkan menjalankan `supabase/p0-rotate-group-codes.sql`. Skrip ini mengganti semua kode yang ada, sehingga kode baru wajib dibagikan ulang kepada semua kelompok.
3. **Bucket video** — dibuat otomatis oleh `schema.sql`. Cek di **Storage → videos**: *Public* harus **off**, batas 50 MB, tipe mp4/webm/mov/jpg/png/webp. Video diputar lewat URL bertanda tangan (1 jam) yang hanya diberikan kepada guru atau kelompok dengan kode valid. Untuk file lebih dari 50 MB, naikkan batas di Storage Settings (sesuai paketmu) dan ubah `MAX_VIDEO` di `lib/storage/upload.ts`.
4. **Akun admin (guru)**
   1. **Authentication → Providers → Email**: aktif. **Matikan "Allow new users to sign up"** (supaya tidak ada yang mendaftar sendiri).
   2. **Authentication → Users → Add user**: isi email dan kata sandi (centang auto-confirm). Kata sandi disimpan Supabase Auth dalam bentuk hash; aplikasi tidak menyimpannya.
   3. SQL Editor: `update users set role='admin' where email='guru@sekolah.id';`

## 3. Jalankan lokal
```
cp .env.example .env.local     # isi 3 variabel
npm install
npm run seed                   # sekali: project, 6 video, 6 kelompok, pertanyaan; mencetak kode akses
npm run dev                    # http://localhost:3000
```
`SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di `app/api/*`. Jangan beri awalan `NEXT_PUBLIC_` dan jangan di-commit.

## 4. Deploy ke Vercel
1. Push ke GitHub, **Add New Project** di Vercel, pilih repo.
2. **Environment Variables**: isi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Deploy.
3. Supabase → **Authentication → URL Configuration**: isi Site URL dengan domain Vercel.
4. Jalankan `npm run seed` sekali (dari lokal, dengan `.env.local` menunjuk ke project yang sama) jika belum.

## 5. Alur guru (semua lewat `/admin`, tanpa kode)
Login → **Project** (buat/ubah judul dan deskripsi) → **Video Kasus** (upload, ubah judul, ganti, nonaktifkan, hapus) → **Pertanyaan** (tambah, edit, seret untuk mengurutkan, nonaktifkan, hapus) → **Kelompok** (buat, isi data, tentukan video, lihat kode akses) → **Dashboard** (progress kelas) → **Jawaban Siswa** (filter, buka hasil, buka kembali editing, export CSV/Excel).

## 6. Alur siswa
Buka situs → **MULAI LKPD** → masukkan kode kelompok → isi identitas → pilih dan tonton video → jawab tahap demi tahap (autosave) → kirim → ringkasan hasil.

## 7. Uji keamanan P0 setelah deploy
Jalankan setelah deployment terbaru berstatus **Ready** dan migrasi `p0-lock-public-reads.sql` berhasil. Gunakan `$SUPABASE_URL` untuk alamat proyek Supabase, `$SITE_URL` untuk alamat website Vercel, dan `$ANON` untuk publishable/anon key. Simpan nilainya hanya di terminal lokal; jangan kirim key atau token ke chat.

```sh
# Tabel siswa dan konten tidak boleh terbaca anon:
curl -i "$SUPABASE_URL/rest/v1/answers?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl -i "$SUPABASE_URL/rest/v1/groups?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl -i "$SUPABASE_URL/rest/v1/videos?select=id,title" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl -i "$SUPABASE_URL/rest/v1/questions?select=id,question_text" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl -i "$SUPABASE_URL/rest/v1/question_options?select=*" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# RPC siswa tidak boleh dipanggil langsung melalui REST:
curl -i -X POST "$SUPABASE_URL/rest/v1/rpc/get_answers" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{"code":"KODE-TIDAK-VALID"}'

# API website harus menolak kode tidak valid; jangan gunakan kode kelompok sungguhan:
curl -i -X POST "$SITE_URL/api/student-content" -H "Content-Type: application/json" -d '{"op":"list_videos","args":{"code":"KODE-TIDAK-VALID"}}'

# /admin tanpa login harus mengarah ke /admin/login
curl -i "$SITE_URL/admin"
```

Hasil uji yang tepat untuk endpoint konten adalah tidak ada data video/pertanyaan yang dikembalikan untuk kode tidak valid. Pada REST, respons `401/403` atau daftar kosong boleh sesuai konfigurasi; yang tidak boleh terjadi adalah data sensitif keluar. Ulangi pengujian konten siswa dengan dua kelompok percobaan berbeda dan pastikan keduanya hanya melihat penugasan masing-masing.

## 8. Struktur
`app/` rute (`lkpd/*` siswa, `admin/*` guru, `api/*` server) · `components/{ui,glass,video,lkpd,admin}` · `hooks/` · `lib/{supabase,auth,validation,db,api,storage,utils}` · `types/` · `proxy.ts` penjaga rute admin · `scripts/seed.mjs` · `supabase/*.sql`

## 9. Pemeriksaan otomatis GitHub
Pull request ke `main` dan push ke `main` menjalankan GitHub Actions untuk memasang dependensi secara reproduktif (`npm ci`) dan memeriksa TypeScript (`npx tsc --noEmit`). Build aplikasi tetap diverifikasi melalui deployment Preview/Production Vercel; GitHub Actions tidak memerlukan atau menyimpan `SUPABASE_SERVICE_ROLE_KEY`.


## 10. PBL editor, security audit, and regression checklist

- The teacher question editor saves question content and answer options through one transactional RPC. If a question already has answers, changes to its meaning (text, phase, type, placeholder, description, or options) are rejected; create a new question and deactivate the old one to preserve interpretation of historical answers.
- Reordering and deleting questions use server-side guarded RPCs. A question that has answers is deactivated, not physically deleted.
- Teacher question previews and PBL phase guidance use SEE (observe and define the problem), THINK (analyze causes/evidence/impact), CONNECT (connect the case to relevant concepts/values), and ACT (design an action and success criteria).
- Run the read-only Supabase audit in [supabase/p0-post-hardening-audit-readonly.sql](supabase/p0-post-hardening-audit-readonly.sql).
- Follow [docs/p0-regression-status.md](docs/p0-regression-status.md) for the distinction between automated checks already passed and browser scenarios still pending.
- GitHub Actions runs npm ci, TypeScript checks, and source-level PBL/security regression invariants. These checks do not replace teacher/student browser tests on a staging database.
