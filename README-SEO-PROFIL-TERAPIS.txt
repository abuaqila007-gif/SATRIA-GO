SATRIA GO — SEO PROFIL TERAPIS
================================

Perubahan:
- Menambahkan halaman profil publik server-rendered: /terapis/{slug}-{anggota_id}
- Profil hanya dibuat untuk anggota dengan status_verifikasi = "verified" dari Edge Function public-catalog.
- Menambahkan tautan "Profil lengkap" pada kartu terapis.
- Menambahkan deep-link reservasi ?terapis={anggota_id} tanpa mengganti alur booking.
- Menyajikan sitemap.xml dinamis berisi beranda + profil anggota terverifikasi.
- robots.txt yang sudah ada tetap dipertahankan.
- Tidak mengubah skema database, Edge Function pemesanan, maupun tarif Home Visit.

PENTING UNTUK DEPLOY CLOUDFLARE PAGES:
1. Unggah/commit SELURUH isi ZIP ke root repository GitHub SATRIA GO, termasuk folder functions/.
2. Pastikan folder functions berada sejajar dengan index.html, app.js, dan config.js.
3. Cloudflare Pages harus memakai root repository sebagai project root dan folder output root (.) untuk situs statis.
4. Setelah deployment sukses, uji:
   - https://satria-go.pages.dev/sitemap.xml
   - https://satria-go.pages.dev/robots.txt
   - Buka katalog, isi data pasien, cari terapis, lalu tekan "Profil lengkap".
5. Sitemap dinamis memanggil Edge Function public-catalog menggunakan publishable key yang memang sudah dipakai di config.js.
   Tidak ada service_role key atau secret yang ditambahkan.

CATATAN:
- Profil individual dan sitemap dinamis memakai Cloudflare Pages Functions. Jika project Pages saat ini tidak mengaktifkan pemrosesan folder functions/, route tersebut tidak akan bekerja; pastikan deployment menunjukkan Functions aktif.
- Hanya data publik yang dipilih yang ditampilkan. Nomor WhatsApp hanya ditautkan untuk Home Visit yang memang diaktifkan; biaya tambahan Home Visit tidak ditampilkan dan tetap dikonfirmasi langsung kepada terapis.
