# CIVIC VISION — P0 autosave dan pengiriman LKPD

Lakukan pengujian ini di deployment preview/lingkungan uji, bukan saat siswa sedang mengerjakan LKPD asli. Jangan gunakan atau membagikan kode akses kelompok dalam screenshot atau tiket.

## Urutan pemasangan

1. Tinjau perubahan pada branch `p0/autosave-submit-hardening`.
2. Setelah UI/code branch berhasil build dan ditinjau, gabungkan branch ke `main` untuk membuat deployment.
3. Setelah backup database tersedia, buka `supabase/p0-autosave-submit-hardening.sql` dan jalankan di Supabase SQL Editor. Skrip mengubah dua fungsi, tidak mengubah baris jawaban yang ada.
4. Setelah fungsi aktif, lakukan semua tes berikut menggunakan kelompok uji tersendiri.

## Daftar pengujian manual

- [ ] Ubah satu jawaban dan pastikan status berubah ke “Menyimpan jawaban…” lalu “Semua jawaban tersimpan”.
- [ ] Di DevTools → Network, aktifkan mode Offline. Ubah jawaban. Pastikan status menjelaskan bahwa jawaban belum terkirim dan tersimpan sementara pada browser.
- [ ] Aktifkan kembali koneksi. Pastikan antrean lokal dikirim ulang dan status berubah menjadi tersimpan.
- [ ] Saat ada antrean tersimpan lokal, pulihkan koneksi lalu refresh halaman. Pastikan jawaban lokal dipulihkan ke formulir, dikirim ulang, dan akhirnya terlihat di server.
- [ ] Ketik cepat beberapa kali pada pertanyaan yang sama. Nilai terakhir harus menjadi nilai yang tersimpan.
- [ ] Dengan satu tab saja pada kelompok uji, klik Simpan draft dan lanjutkan secara cepat. Pastikan tidak ada jawaban lama yang menimpa nilai terbaru.
- [ ] Coba mengirim saat pertanyaan wajib kosong. UI harus menahan pengiriman; untuk pengujian server, panggilan submit juga harus mengembalikan “belum lengkap”.
- [ ] Putuskan koneksi sebelum pengiriman. Pengiriman harus dibatalkan dan status menjelaskan jawaban belum tersimpan.
- [ ] Setelah semua jawaban wajib tersimpan, kirim LKPD. Halaman hasil harus secara eksplisit mengonfirmasi pengiriman berhasil dan terkunci.
- [ ] Setelah status `submitted`, coba simpan perubahan lewat endpoint siswa pada kelompok uji. RPC harus mengembalikan `false` dan jawaban database harus tetap sama.
- [ ] Di dashboard guru → Hasil Siswa, gunakan “Buka kembali” untuk kelompok uji. Setelah siswa me-refresh halaman, pengerjaan harus kembali dapat diedit dan disimpan.
- [ ] Hapus kelompok uji setelah memeriksa namanya dengan teliti, lalu verifikasi kelompok asli tetap utuh.

## Pemeriksaan database setelah submit

Jalankan kueri berikut dengan nama kelompok uji yang sesuai:

```sql
SELECT
  g.group_number,
  g.group_name,
  s.status,
  COUNT(a.id) AS jumlah_jawaban
FROM public.groups AS g
LEFT JOIN public.submissions AS s ON s.group_id = g.id
LEFT JOIN public.answers AS a ON a.submission_id = s.id
WHERE g.group_name = 'UJI AUTOSAVE P0'
GROUP BY g.group_number, g.group_name, s.status;
```

Ekspektasi saat selesai: satu pengumpulan dengan status `submitted`, jumlah jawaban sesuai dengan data yang diisi, dan perubahan paksa setelah submit tidak mengubah jawaban. Setelah guru membuka kembali, status kembali ke `draft`.

## Batasan

File ini merupakan panduan pengujian, bukan bukti bahwa pengujian telah dijalankan. Build, migrasi database, dan skenario jaringan harus diuji pada deployment dan database yang benar-benar aktif sebelum fitur dinyatakan lulus.
