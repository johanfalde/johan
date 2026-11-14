"""Buat narasi permanen (MP3) untuk template KanvasCut dengan suara natural Indonesia.

Suara: Gadis (wanita) dan Ardi (pria) lewat edge-tts — gratis, tanpa API key, tanpa daftar.
Jalankan sekali di folder proyek (perlu internet):

    pip install edge-tts
    python buat_suara.py

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
VOICES = {"wanita": "id-ID-GadisNeural", "pria": "id-ID-ArdiNeural"}
RATE = "+10%"
# Ikuti proxy sistem bila ada (mis. jaringan kantor).
PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy") or None


def narrations():
    # Ambil teks narasi langsung dari template supaya selalu sama dengan yang tampil di video.
    src = (ROOT / "js" / "templates.js").read_text(encoding="utf-8")
    texts = re.findall(r"narration:\s*'([^']*)'", src)
    if not texts:
        sys.exit("Tidak menemukan narasi di js/templates.js")
    return texts


async def main():
    texts = narrations()
    for folder, voice in VOICES.items():
        out = ROOT / "examples" / "assets" / "suara" / folder
        out.mkdir(parents=True, exist_ok=True)
        for i, text in enumerate(texts, 1):
            path = out / f"{i:02d}.mp3"
            print(f"[{folder}] {path.name}: {text}")
            await edge_tts.Communicate(text, voice, rate=RATE, proxy=PROXY).save(str(path))
    print(f"\nSelesai: {len(texts)} narasi x {len(VOICES)} suara di examples/assets/suara/")


if __name__ == "__main__":
    asyncio.run(main())
