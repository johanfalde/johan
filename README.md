# KanvasCut — editor video HTML Canvas + AI

Editor video mirip CapCut yang berjalan 100% di browser: preview dan render memakai
**HTML Canvas**, ekspor memakai **MediaRecorder** (tanpa server, tanpa biaya render), dan
fitur AI memakai **Claude API** langsung dari browser.

## Menjalankan

Tidak perlu build. Cukup sajikan foldernya lewat HTTP (ES module tidak jalan dari `file://`):

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

Bisa juga di-host gratis di GitHub Pages / Netlify / Vercel sebagai situs statis.

## Fitur

- Impor video, gambar, audio (klik atau drag & drop)
- Timeline multi-track: geser klip, trim ujung kiri/kanan, snap ke playhead & tepi klip, zoom
- Potong (S), duplikat (Ctrl+D), hapus (Del), undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Teks dengan preset (judul, subtitle, caption kotak, neon, lower third), font, warna,
  garis tepi, glow, latar, animasi (pop, fade, slide, mesin ketik)
- Transformasi langsung di preview (geser, scroll untuk skala), rotasi, opasitas, fade in/out
- Filter: kecerahan, kontras, saturasi, grayscale, hue, blur
- Kecepatan klip 0.25x–4x, volume, mute
- Rasio 9:16, 16:9, 1:1, 4:5
- Ekspor MP4 (jika browser mendukung) atau WebM, lengkap dengan audio

### Fitur AI (Claude)

Isi API key di tab **AI ✨** (key hanya disimpan di localStorage browser dan dikirim ke
`api.anthropic.com`). Pilih model: Opus 5.5 (paling pintar), Sonnet 5.5, atau Haiku 5.5 (paling murah).

1. **Buat video dari ide** — Claude menulis naskah + adegan, lalu teks beranimasi otomatis
   ditaruh di timeline. Opsional: kirim frame preview supaya naskah sesuai isi video.
2. **Subtitle dari naskah** — tempel naskah, Claude memecahnya jadi subtitle berwaktu.
3. **Perintah edit (AI agent)** — perintah bahasa biasa, mis. "semua teks kuning dengan animasi
   pop, potong klip pertama di detik 3". Claude membaca status proyek lalu mengembalikan daftar
   operasi (update / delete / split / add_text / set_background) yang diterapkan editor. Bisa di-undo.

Semua jawaban AI memakai *structured outputs* (JSON schema), jadi hasilnya selalu bisa dibaca
editor. SDK `@anthropic-ai/sdk` dimuat dari CDN hanya saat fitur AI dipakai.

> Catatan keamanan: memanggil API dari browser hanya aman untuk key milik sendiri. Kalau aplikasi
> ini mau dipakai orang lain, pindahkan panggilan AI ke backend kecil (mis. Cloudflare Worker)
> supaya key tidak terekspos.

## Struktur

```
index.html      tata letak UI
css/style.css   tema gelap
js/app.js       model proyek, render kanvas, timeline, inspector, ekspor
js/ai.js        klien Claude + skema JSON untuk tiap fitur AI
```

## Batasan & ide lanjutan

- Ekspor berjalan real-time (video 60 dtk = ~60 dtk render) dan tab harus tetap terbuka.
  Untuk ekspor lebih cepat/tajam bisa pakai WebCodecs + muxer MP4 atau ffmpeg.wasm.
- Proyek belum disimpan otomatis (media tersimpan sebagai blob sementara).
- Integrasi AI lain bisa ditambahkan di `js/ai.js`: text-to-speech untuk voice-over,
  generator gambar/B-roll, atau transkripsi audio untuk subtitle otomatis.
