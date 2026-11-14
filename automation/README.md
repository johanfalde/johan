# Video affiliate otomatis (gratis)

Setiap hari GitHub Actions membuat video affiliate 9:16 dari bank konten, tanpa server dan tanpa biaya:

```
02:17 WIB  GitHub → Kaggle: Wan 2.2 membuat klip AI latar dari kolom prompt_ai (GPU T4 gratis)
05:47 WIB  GitHub: ambil klip Kaggle → render KanvasCut (Chromium headless) → MP4 1080×1920 30 fps + caption
           → kirim ke Telegram Anda → Anda posting di TikTok + pasang keranjang kuning (±1 menit)
```

Kalau klip Kaggle belum selesai atau gagal, video tetap dibuat dengan latar gradien.

## Bank konten

`konten.csv`, atau Google Sheets dengan kolom yang sama (isi secret `SHEET_CSV_URL` dengan link
*File → Bagikan → Publikasikan ke web → CSV*). Satu baris = satu video.

| Kolom | Isi |
|---|---|
| `tanggal` | `YYYY-MM-DD`, video dibuat pada tanggal ini |
| `produk`, `hook` | wajib |
| `masalah_judul`, `masalah`, `bukti` | teks adegan 2 dan 3 |
| `manfaat` | poin dipisah ` \| `, poin pertama jadi judul |
| `promo`, `cta` | adegan terakhir, mis. "Cek keranjang kuning" |
| `foto_produk` | path (mis. `aset/tumbler.png`) atau URL foto/video produk asli |
| `latar` | klip latar per adegan dipisah ` \| ` (path/URL), opsional |
| `prompt_ai` | prompt Wan (bahasa Inggris) untuk latar adegan 1, 2, … dipisah ` \| `. Jangan tampilkan produk |
| `musik` | opsional, default musik bebas hak cipta di `examples/assets/` |
| `caption`, `hashtag` | untuk posting |
| `ide` | kalau diisi dan `GEMINI_API_KEY` ada, kolom naskah yang kosong diisi Gemini (tier gratis) |
| `status` | isi `selesai` / `skip` supaya dilewati |

## Menjalankan di komputer sendiri

```bash
cd automation
npm install
npx playwright install chromium
node pipeline.mjs --tanggal 2026-11-14   # atau --baris 2, --semua
```
Butuh `ffmpeg`. Hasil di `automation/output/`.

## Menyalakan jadwal otomatis di GitHub

1. Gabungkan branch ini ke branch utama (jadwal GitHub hanya jalan dari branch default).
2. *Settings → Secrets and variables → Actions → New repository secret*, isi yang dipakai:
   - `KAGGLE_USERNAME`, `KAGGLE_API_TOKEN`: dari kaggle.com/settings → API → *Generate New Token*.
     Akun Kaggle harus sudah verifikasi nomor HP.
   - `TELEGRAM_BOT_TOKEN` (buat bot lewat @BotFather) dan `TELEGRAM_CHAT_ID` (ID chat Anda).
   - `GEMINI_API_KEY` (opsional, aistudio.google.com) dan `SHEET_CSV_URL` (opsional).
3. Tes manual: tab *Actions → Video harian → Run workflow*, pilih `kirim`, tunggu notebook Kaggle selesai
   (cek di kaggle.com/code), lalu jalankan lagi dengan `render`. Video juga bisa diunduh dari *Artifacts*.

## Catatan

- Klip AI wajib diberi label *AI-generated* di TikTok. Caption otomatis mengingatkan bila klip AI dipakai.
- Prompt AI sebaiknya untuk suasana/b-roll, bukan produknya, supaya produk tidak tampil berbeda dari aslinya.
- Kuota GPU Kaggle terbatas per minggu. Preset Wan bisa diganti lewat env `WAN_PRESET` (`cepat`, `natural`, `natural_panjang`).
