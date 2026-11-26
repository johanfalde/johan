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
- Depan: logo dada kiri, nomor kecil dada kanan, nama sekolah/tim di tengah dada (font Anton, ≤ 290px lebar di viewBox 600).
- Belakang: nama melengkung di atas (Bebas Neue, auto-kecil lewat `data-fit`), nomor besar Anton ±230px dengan outline 2 lapis.
- Celana: nomor di kaki kiri depan, logo kecil kanan, list samping + list bawah.
- Nama panjang otomatis diperkecil; jangan pakai textLength yang memampatkan huruf.

## Presentasi ke konsumen
Lembar "kit launch" 1920×1200 (render @2x = 3840×2400 JPG): latar gelap senada + sorot lampu,
watermark nama besar outline tipis, judul desain, label tampak depan/belakang/celana,
footer berisi swatch warna (HEX) + spesifikasi bahan, printing, ukuran, contoh nama & nomor.
