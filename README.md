# ANS Download
Website downloader video publik berbahasa Indonesia. Tempel link → proses → pilih kualitas → download MP4. Mendukung ekstraktor YouTube, TikTok, Instagram, Facebook, dan X melalui yt-dlp; keberhasilan tergantung akses platform, wilayah, dan IP server. Tidak mengunduh konten privat atau DRM.

## Jalankan dengan Docker
```sh
docker build --pull -t ans-download .
docker run --rm -p 3000:3000 ans-download
```
Buka http://localhost:3000. Untuk hosting, gunakan layanan container atau VPS, hubungkan domain dan HTTPS melalui reverse proxy. GitHub Pages tidak menjalankan backend ini. Pada layanan Docker, gunakan port dari variabel `PORT` (default 3000); health check `/health`.

## Tanpa Docker
Pasang Node.js 22+, Python, yt-dlp terbaru (termasuk dependensi default), dan FFmpeg. Pastikan `yt-dlp` dan `ffmpeg` ada di PATH, lalu `npm start`. `YTDLP_BIN` dapat menunjuk executable yt-dlp. Jalankan `npm test` untuk pengujian. Rebuild Docker berkala untuk memperbarui ekstraktor ketika platform berubah.

## Batas dan perilaku
- Kualitas 360p, 720p, 1080p adalah batas maksimum; hasil mengikuti format sumber. Audio disatukan dengan FFmpeg bila perlu.
- Maksimum dua proses bersamaan, 10 permintaan metadata/IP/menit, durasi 20 menit, ukuran akhir 500 MB. Batas ukuran sumber dari yt-dlp bersifat best effort; sediakan kuota disk/container.
- Link proses berlaku 10 menit dan disimpan di memori; gunakan satu instance atau sticky sessions. Tidak ada database atau riwayat server.
- File sementara dihapus setelah respons selesai. Browser menampung file di memori sebelum menyimpan; video besar membutuhkan RAM perangkat.
- Video yang memerlukan login/cookie, diblokir anti-bot, privat, atau dibatasi wilayah dapat gagal. Tidak ada jaminan semua link dapat diunduh. Tidak ada mode demo atau hasil palsu.
- Rate limit memakai alamat koneksi; di belakang proxy, pengguna dapat berbagi batas yang sama. Untuk website publik, pasang rate limiting di reverse proxy, kuota sumber daya, dan isolasi jaringan server.
- Gunakan untuk video milik sendiri atau dengan izin pemilik.

## Arsitektur
Frontend HTML/CSS/JavaScript tanpa dependency; backend Node HTTP memanggil yt-dlp tanpa shell. Referensi awal: https://github.com/Sansekai/ssyoutube-api. Implementasi ini dibuat baru dan tidak memakai layanan SSYouTube.

## Status verifikasi
Pengujian otomatis memeriksa validasi platform, API metadata/download dengan mesin uji, dan kegagalan proses. Pengunduhan nyata harus diuji pada hosting tujuan karena koneksi dan pembatasan platform berbeda-beda.
