# CIVIC VISION — Status pengujian keamanan dan regresi

## Pengujian otomatis yang sudah dijalankan

- [x] Instalasi dependensi (npm ci) berhasil pada GitHub Actions.
- [x] Pemeriksaan TypeScript (npx tsc --noEmit) lulus pada commit UI PBL terbaru.
- [x] Audit dependensi produksi selesai pada GitHub Actions; audit sebelumnya melaporkan 0 kerentanan dependensi produksi.
- [x] RLS aktif pada 11 tabel aplikasi yang diperiksa.
- [x] Query langsung mengonfirmasi tidak ada grant tabel untuk anon pada 11 tabel yang diperiksa.
- [x] RPC siswa (termasuk student_rate_limit) tidak dapat dieksekusi anon/authenticated dan hanya dapat dijalankan service_role.
- [x] public.is_admin() sudah tidak ada; helper berada di schema private dan anon tidak bisa mengeksekusinya.
- [x] Tiga RPC editor terpasang; anon tidak memiliki EXECUTE, authenticated dapat memanggilnya dengan pemeriksaan admin di dalam fungsi.
- [x] Bucket videos terverifikasi privat, batas 50 MiB, MIME sesuai kebijakan.
- [x] Performance Advisor tidak lagi menandai foreign key yang sebelumnya tidak memiliki indeks; indeks baru masih mungkin berstatus unused karena beban kueri kecil.

## Perlindungan yang diterapkan

- Penyimpanan soal beserta opsi dilakukan dalam satu RPC transaksional.
- Perubahan teks/fase/tipe/opsi soal yang sudah memiliki jawaban ditolak agar makna jawaban lama tidak berubah diam-diam.
- Penghapusan soal yang memiliki jawaban menonaktifkan soal, bukan menghapus histori.
- Pengurutan soal dilakukan lewat satu RPC transaksional.
- Empat fase PBL menampilkan tujuan dan hasil yang diharapkan; fase kosong memberi pesan yang jelas.

## Skenario regresi browser yang masih perlu dijalankan

Tes di bawah belum dapat dinyatakan lulus dari CI atau query metadata saja:

- [ ] Guru masuk/logout; akses area guru tanpa sesi ditolak.
- [ ] Guru membuat/mengedit/nonaktifkan soal teks dan pilihan; opsi tersimpan secara atomik.
- [ ] Kesalahan validasi/database membuat form tetap terbuka dan tidak menampilkan sukses.
- [ ] Soal berjawaban ditolak jika teks/tipe/fase/opsi diubah; jawaban lama tetap utuh.
- [ ] Soal berjawaban hanya dinonaktifkan; soal tanpa jawaban dapat dihapus.
- [ ] Pengurutan soal bertahan setelah refresh dan tidak mencampur proyek.
- [ ] Kode kelompok tidak valid dan video yang tidak ditugaskan tidak membuka konten.
- [ ] Kelompok A tidak dapat membaca konten/jawaban kelompok B atau proyek lain.
- [ ] Autosave, reconnect, refresh ketika ada jawaban tertunda, dan nilai terakhir saat mengetik cepat.
- [ ] Submit menunggu autosave; jawaban terkunci setelah submit dan tetap sama jika dicoba diubah.
- [ ] Guru membuka kembali tugas; siswa dapat melanjutkan tanpa kehilangan histori.
- [ ] URL objek Storage tanpa izin ditolak; video untuk kelompok yang benar tetap bisa dibuka.
- [ ] Tampilan ponsel dan fase kosong SEE/THINK/CONNECT/ACT.

## Mengapa tes browser belum ditandai lulus

Deployment terbaru belum diterbitkan karena Vercel mencapai batas deployment harian paket Free. Selain itu, konfigurasi Preview sebelumnya menggunakan nilai environment Supabase yang sama dengan Production. Jadi, tes siswa yang menulis data di Preview belum aman sebelum Preview diarahkan ke database staging yang terpisah.

Jangan jalankan tes yang mengubah identitas, jawaban, kelompok, atau status submission pada kelompok nyata. Gunakan database staging dan kelompok uji setelah Preview diarahkan ke staging.
