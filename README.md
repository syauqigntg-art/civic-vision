# CIVIC VISION — LKPD Digital
Menganalisis Pancasila dalam Kehidupan Sehari-hari. Next.js + TypeScript + Supabase (Postgres, Auth, Storage, RLS).

## 1. Persyaratan
Node.js 20.6+ · akun Supabase (gratis cukup) · akun Vercel (untuk deploy).

## 2. Siapkan Supabase
1. Buat project baru di supabase.com. Di **Settings → API** salin: Project URL, `anon` key, dan `service_role` key.
2. **SQL migration** — buka SQL Editor, jalankan berurutan:
   1. `supabase/schema.sql` (tabel, RLS, fungsi, bucket `videos`, indeks)
   2. `supabase/security.sql` (mengunci fungsi siswa, bucket jadi privat, batas ukuran/tipe file, batas panjang input)
   - Database yang sudah dibuat dari versi lama: jalankan juga `supabase/upgrade.sql`.
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

## 7. Uji keamanan setelah deploy
```
# harus mengembalikan [] atau 401/403, bukan data siswa:
curl "$URL/rest/v1/answers?select=*"     -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
curl "$URL/rest/v1/groups?select=*"      -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
# fungsi siswa tidak boleh bisa dipanggil langsung (harus ditolak):
curl -X POST "$URL/rest/v1/rpc/get_answers" -H "apikey: $ANON" -H "Content-Type: application/json" -d '{"code":"X"}'
# /admin tanpa login harus mengarah ke /admin/login
```

## 8. Struktur
`app/` rute (`lkpd/*` siswa, `admin/*` guru, `api/*` server) · `components/{ui,glass,video,lkpd,admin}` · `hooks/` · `lib/{supabase,auth,validation,db,api,storage,utils}` · `types/` · `proxy.ts` penjaga rute admin · `scripts/seed.mjs` · `supabase/*.sql`
