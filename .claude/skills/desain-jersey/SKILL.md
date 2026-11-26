---
name: desain-jersey
description: Membuat / merevisi desain jersey futsal & sepak bola (baju + celana) siap kirim ke konsumen (JPG) dan konveksi (PDF/SVG vektor), termasuk nama & nomor punggung per pemain. Pakai saat user minta desain jersey, kaos tim, seragam olahraga, atau ganti nama/nomor punggung.
---

# Skill: Desain Jersey (sublimasi)

Generator ada di `jersey-futsal/` (`generate.js` + `config.json`). Jalankan `cd jersey-futsal && node generate.js`
(Playwright/Chromium sudah ada). Hasil di `jersey-futsal/output/`.

## Alur kerja
1. Ubah `config.json` (nama sekolah/tim, contoh pemain, daftar `pemain`).
2. Desain baru / revisi warna → edit array `DESIGNS` di `generate.js`
   (c1/c2/c3 = gradasi dasar → gelap, accent = warna aksen, line2 = garis kedua, art = motif, neck = crew|v).
3. Render → SELALU lihat JPG hasilnya (Read) sebelum dikirim; cek teks tidak tumpang tindih / terpotong.
4. Kirim JPG ke user (SendUserFile). PDF + SVG untuk konveksi.

## Pedoman desain (referensi tren kit 2026)
- **Sublimasi full print**: gradasi & motif rumit aman dicetak, tidak ada biaya tambahan per warna.
- **Motif geometri tonal**: pola 1 tingkat lebih terang/gelap dari warna dasar (opacity 5–10%) → terlihat premium, tidak ramai.
- **Garis/sapuan asimetris & melengkung** atau kilat diagonal → kesan dinamis.
- Maksimal 3 warna utama + putih. Kontras teks tinggi (isi putih + outline gelap / aksen).
- Lengan raglan + manset bergaris 2 warna, kerah crew atau V dengan list aksen.
- Anak usia dini: warna cerah & bersahabat, hindari motif agresif; bahan dryfit/milano.

## Tata letak & tipografi
- Font di jersey: **Anton** (nomor & nama sekolah) + **Bebas Neue** (nama punggung, "TK IP"). Klien TIDAK suka font
  membulat (Fredoka) — jangan dipakai.
- Depan (disetujui klien): logo dada kiri + nomor dada kanan sejajar; di tengah dada "TK IP" kecil berjarak lebar,
  di bawahnya "AL MUHAAJIR" besar + garis emas dengan ornamen belah ketupat. TANPA pita/band. Lebar maks 246
  (data-fit) agar tidak kena list samping.
- Belakang: nama melengkung di area bersih ANTARA jahitan raglan (arc 176–424, data-fit 226) supaya tidak menabrak
  jahitan/panel samping; nomor besar ±215px; motif bawah digeser turun agar tidak kena nomor.
- Celana: nomor di kaki kiri depan, logo kecil kanan, list samping + list bawah. Celana BELAKANG POLOS (tanpa tulisan).
- Nama panjang otomatis diperkecil; jangan pakai textLength yang memampatkan huruf.

## Anti-tabrakan (WAJIB)
- Semua tulisan/logo diberi class `chk`, semua garis/motif/jahitan diberi class `ko`.
- `generate.js` otomatis mengecek (ukuran tinta huruf asli via canvas) dan mencetak `⚠ TABRAKAN` bila ada yang kena.
  Desain belum boleh dikirim sebelum output bersih dari peringatan ini.
- Nama punggung di atas (arc 186–414, y≈158–182), nomor di bawahnya; logo dada x=228, nomor dada x=374.

## Logo
- `logo.js`: logo bulat resmi (kubah+menara, kitab, bulan sabit-bintang, BOLA, sinar, untaian daun; font Cinzel),
  versi perisai untuk jersey (`crestShield`, ada bola kecil), dan `ball()`.
- Nama sekolah lengkap: "TK ISLAM PLUS" + "AL MUHAAJIR" (bukan "TK IP").
- Lengan (depan & belakang): BATIK MODERN: garis miring tebal-tipis + isen-isen cecek (titik) + belah ketupat kecil, memudar dari bahu ke manset (mask `${id}-smask`). Klien TIDAK mau bendera, logo, bintang, Kawung, atau Parang gelombang di lengan.

## Gambar realistis (harimau, dll.)
- JANGAN menggambar hewan realistis dengan path SVG — hasilnya kartun/imut. Klien minta "realistis & garang".
- Pakai FOTO/ilustrasi berlisensi aman: domain publik/CC0 (mis. foto U.S. Fish & Wildlife Service di Wikimedia
  Commons), atau gambar yang dibeli klien (Freepik/Shutterstock/Envato). Catat sumber di `assets/SUMBER-GAMBAR.md`.
- `prep_tiger.py`: crop → perbesar → pertajam → grayscale kontras → masker oval lembut → `assets/tiger-head.png`.
  Ganti gambar via `config.json`: `harimau_gambar` + `harimau_crop`.
- Di jersey: lapisan PALING BAWAH (sebelum motif), `mix-blend-mode: luminosity` (opacity .5) untuk baju gelap,
  `multiply` (.3) untuk baju putih → menyatu dengan warna baju seperti sublim tonal.
- Gaya referensi klien: ilustrasi harimau mengaum emas-hitam + cipratan kuas & pusaran (full print).

## Presentasi ke konsumen
Lembar "kit launch" 1920×1200 (render @2x = 3840×2400 JPG): latar gelap senada + sorot lampu,
watermark nama besar outline tipis, judul desain, label tampak depan/belakang/celana,
footer berisi swatch warna (HEX) + spesifikasi bahan, printing, ukuran, contoh nama & nomor.
