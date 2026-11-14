"""Buat narasi permanen (MP3) untuk template KanvasCut dengan suara natural Indonesia.

Suara: Gadis & Ava (wanita), Ardi & Andrew (pria) lewat edge-tts — gratis, tanpa API key, tanpa daftar.
Jalankan sekali di folder proyek (perlu internet):

    pip install edge-tts
    python buat_suara.py          (hanya membuat file yang belum ada)
    python buat_suara.py --ulang  (buat ulang semua, mis. setelah teks narasi diubah)

Hasil: examples/assets/suara/wanita/01.mp3 … dan examples/assets/suara/pria/01.mp3 …
Di aplikasi, pilih "Narasi template" lalu muat template. Commit & push folder itu kalau ingin
suaranya ikut tersedia di GitHub Pages.

Catatan: edge-tts adalah alat open-source tidak resmi yang memakai layanan baca-teks Microsoft Edge.
"""
import asyncio
import os
import pathlib
import re
import sys

try:
    import edge_tts
except ImportError:
    sys.exit("edge-tts belum terpasang. Jalankan dulu:  pip install edge-tts")

ROOT = pathlib.Path(__file__).resolve().parent
# Folder -> suara. Gadis/Ardi = suara Indonesia asli; Ava/Andrew = suara Multilingual generasi baru
# (lebih ekspresif dan mengalir, otomatis berbahasa Indonesia mengikuti teks).
VOICES = {
    "wanita": "id-ID-GadisNeural",
    "wanita-ava": "en-US-AvaMultilingualNeural",
    "pria": "id-ID-ArdiNeural",
    "pria-andrew": "en-US-AndrewMultilingualNeural",
}
RATE = "+0%"
# File lebih kecil dari ini dianggap gagal (server kadang mengirim audio terpotong).
MIN_BYTES = 4000
# Ikuti proxy sistem bila ada (mis. jaringan kantor).
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or None


def templates():
    """[(nama, folder suara, [narasi...]), ...] diambil langsung dari js/templates.js."""
    src = (ROOT / "js" / "templates.js").read_text(encoding="utf-8")
    out = []
    for name, body in re.findall(r"export const (\w+) = \{(.*?)\n\};", src, re.S):
        texts = re.findall(r"narration:\s*'([^']*)'", body)
        base = re.search(r"voiceSet\('([^']+)'\)", body)
        if texts and base:
            out.append((name, ROOT / base.group(1), texts))
    if not out:
        sys.exit("Tidak menemukan narasi di js/templates.js")
    return out


async def main():
    for tpl, base, texts in templates():
      for folder, voice in VOICES.items():
        out = base / folder
        out.mkdir(parents=True, exist_ok=True)
        for i, text in enumerate(texts, 1):
            path = out / f"{i:02d}.mp3"
            if path.exists() and path.stat().st_size > MIN_BYTES and "--ulang" not in sys.argv:
                continue  # sudah ada; pakai --ulang untuk membuat ulang semua
            print(f"[{tpl} · {folder}] {path.name}: {text}")
            for attempt in range(1, 4):
                try:
                    await edge_tts.Communicate(text, voice, rate=RATE, proxy=PROXY).save(str(path))
                    if path.stat().st_size <= MIN_BYTES:  # audio terpotong dari server
                        raise edge_tts.exceptions.NoAudioReceived("audio terlalu pendek")
                    break
                except edge_tts.exceptions.NoAudioReceived:
                    if attempt == 3:
                        raise
                    print("  server tidak mengirim audio, coba lagi...")
                    await asyncio.sleep(2 * attempt)
    print("\nSelesai. Narasi tersimpan di examples/assets/suara/ (per template).")


if __name__ == "__main__":
    asyncio.run(main())
