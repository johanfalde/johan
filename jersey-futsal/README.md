# Desain Jersey Futsal Anak (4–6 th) — TK ISLAM PLUS AL MUHAAJIR

## File hasil (folder `output/`)
| File | Untuk apa |
|---|---|
| `desain-1-emerald-royale.jpg`, `desain-2-electric-ocean.jpg`, `desain-3-golden-crescent.jpg`, `desain-4-navy-flame.jpg` | Preview untuk dibagikan ke konsumen/wali murid (3840×2400 px) |
| `*.pdf` | Versi vektor (tajam di ukuran berapa pun), kirim ke konveksi |
| `svg/*.svg` (baju depan/belakang, celana depan/belakang) | File vektor terpisah, bisa dibuka & diedit di CorelDraw / Illustrator / Inkscape |
| `logo/` (PNG transparan, SVG, lembar presentasi JPG/PDF) | Logo resmi sekolah versi vektor (warna asli, putih, hitam) + lembar presentasi |
| `per-pemain/*.jpg` | Tampak belakang per anak (nama + nomor), sebagai daftar order ke konveksi |

## Mengganti nama sekolah / nama & nomor anak
1. Buka `config.json`
2. Ubah `sekolah_baris1` / `sekolah_baris2`, `contoh_pemain`, dan daftar `pemain`
3. Jalankan: `node generate.js` (butuh Node.js + Playwright)

## Font (gratis, Google Fonts — install di komputer konveksi bila edit SVG)
- **Anton** — nomor & nama sekolah; **Bebas Neue** — nama punggung
- **Anton** — judul lembar presentasi
- **Bebas Neue** — nama punggung
