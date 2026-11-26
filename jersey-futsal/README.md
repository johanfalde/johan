# Desain Jersey Futsal Anak (4–6 th) — TK IP AL MUHAAJIR

## File hasil (folder `output/`)
| File | Untuk apa |
|---|---|
| `desain-1-emerald-royale.jpg`, `desain-2-electric-ocean.jpg`, `desain-3-golden-crescent.jpg` | Preview untuk dibagikan ke konsumen/wali murid (3840×2400 px) |
| `*.pdf` | Versi vektor (tajam di ukuran berapa pun), kirim ke konveksi |
| `svg/*.svg` (baju depan/belakang, celana depan/belakang) | File vektor terpisah, bisa dibuka & diedit di CorelDraw / Illustrator / Inkscape |
| `per-pemain/*.jpg` | Tampak belakang per anak (nama + nomor), sebagai daftar order ke konveksi |

## Mengganti nama sekolah / nama & nomor anak
1. Buka `config.json`
2. Ubah `sekolah_baris1` / `sekolah_baris2`, `contoh_pemain`, dan daftar `pemain`
3. Jalankan: `node generate.js` (butuh Node.js + Playwright)

## Font (gratis, Google Fonts — install di komputer konveksi bila edit SVG)
- **Fredoka Bold** — semua tulisan di jersey (nama, nomor, sekolah)
- **Anton** — judul lembar presentasi
- **Bebas Neue** — nama punggung
