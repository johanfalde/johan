# Desain Jersey Futsal Anak (4–6 th) — TK IP AI MUHAAJIR

## File hasil (folder `output/`)
| File | Untuk apa |
|---|---|
| `desain-1-emerald-gold.jpg`, `desain-2-ocean-blast.jpg` | Preview untuk dibagikan ke konsumen/wali murid (3200×2000 px) |
| `*.pdf` | Versi vektor (tajam di ukuran berapa pun), kirim ke konveksi |
| `*_baju-depan.svg`, `*_baju-belakang.svg`, `*_celana-depan.svg` | File vektor terpisah, bisa dibuka & diedit di CorelDraw / Illustrator / Inkscape |
| `per-pemain/*.jpg` | Tampak belakang per anak (nama + nomor), sebagai daftar order ke konveksi |

## Mengganti nama sekolah / nama & nomor anak
1. Buka `config.json`
2. Ubah `sekolah_baris1` / `sekolah_baris2`, `contoh_pemain`, dan daftar `pemain`
3. Jalankan: `node generate.js` (butuh Node.js + Playwright)

## Font (gratis, Google Fonts — install di komputer konveksi bila edit SVG)
- **Anton** — nomor & nama sekolah
- **Bebas Neue** — nama punggung
