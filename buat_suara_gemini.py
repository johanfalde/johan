"""Buat narasi template KanvasCut dengan Google Gemini TTS dan simpan permanen sebagai file WAV.

Suara Gemini paling natural, tapi kuota gratisnya terbatas. Dengan skrip ini narasi dibuat SEKALI,
lalu template memakai filenya tanpa memanggil Gemini lagi.

Pakai (Windows):
    set GEMINI_API_KEY=key-dari-aistudio.google.com
    python buat_suara_gemini.py
Mac/Linux:
    GEMINI_API_KEY=... python3 buat_suara_gemini.py

Opsi:  --wanita Aoede  --pria Puck  --gaya santai|jualan|profesional|cerita  --ulang
       --hanya pria   (buat suara pria saja, mis. kalau kuota kemarin habis setelah suara wanita)
Hasil: examples/assets/suara/gemini-wanita/01.wav …  dan  examples/assets/suara/gemini-pria/01.wav …
Tidak butuh paket tambahan (hanya library standar Python).
"""
import argparse
import base64
import getpass
import json
import os
import pathlib
import re
import struct
import sys
import time
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
API = os.environ.get("GEMINI_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
STYLES = {
    "santai": "Bacakan dalam bahasa Indonesia dengan gaya santai, hangat, dan antusias seperti kreator konten TikTok",
    "jualan": "Bacakan dalam bahasa Indonesia dengan gaya semangat dan meyakinkan seperti host live jualan",
    "profesional": "Bacakan dalam bahasa Indonesia dengan gaya profesional, tenang, dan jelas seperti presenter berita",
    "cerita": "Bacakan dalam bahasa Indonesia dengan gaya bercerita yang lembut dan ekspresif",
}


def narrations():
    src = (ROOT / "js" / "templates.js").read_text(encoding="utf-8")
    texts = re.findall(r"narration:\s*'([^']*)'", src)
    if not texts:
        sys.exit("Tidak menemukan narasi di js/templates.js")
    return texts


def call(key, path, body=None):
    """Panggil Gemini; tunggu otomatis bila kena batas per menit (429)."""
    for attempt in range(1, 7):
        req = urllib.request.Request(
            f"{API}/{path}",
            data=json.dumps(body).encode() if body is not None else None,
            headers={"x-goog-api-key": key, "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.load(res)
        except urllib.error.HTTPError as e:
            text = e.read().decode("utf-8", "replace")
            if e.code == 429 and "PerDay" not in text and attempt < 6:
                m = re.search(r'"retryDelay":\s*"([\d.]+)s"', text) or re.search(r"retry in ([\d.]+)s", text)
                wait = min(65, int(float(m.group(1))) + 1 if m else 20)
                print(f"  batas per menit tercapai, menunggu {wait} detik...")
                time.sleep(wait)
                continue
            if e.code == 429:
                sys.exit("Kuota gratis Gemini hari ini habis. Coba lagi besok (file yang sudah jadi tidak dibuat ulang).")
            if e.code in (400, 401, 403):
                sys.exit(f"Key ditolak ({e.code}). Cek GEMINI_API_KEY.\n{text[:300]}")
            raise
    sys.exit("Gagal menghubungi Gemini.")


def pick_model(key):
    names = [m["name"] for m in call(key, "models?pageSize=1000").get("models", []) if "tts" in m["name"].lower()]
    if not names:
        sys.exit("Key ini tidak punya akses ke model Gemini TTS.")
    ver = lambda n: float((re.search(r"gemini-(\d+(?:\.\d+)?)", n) or [0, 0])[1])
    names.sort(key=lambda n: (-ver(n), "flash" not in n, "lite" in n))
    return names


def to_wav(pcm, rate):
    head = b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
    return head + b"data" + struct.pack("<I", len(pcm)) + pcm


def speak(key, models, text, voice, style):
    prompt = f"{STYLES[style]}. Pertahankan karakter suara, nada, dan tempo yang sama sepanjang video:\n{text}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}},
        },
    }
    data = call(key, f"{models[0]}:generateContent", body)
    part = next(p for p in data["candidates"][0]["content"]["parts"] if "inlineData" in p)["inlineData"]
    raw = base64.b64decode(part["data"])
    rate = int((re.search(r"rate=(\d+)", part.get("mimeType", "")) or [0, 24000])[1])
    return raw if raw[:4] == b"RIFF" else to_wav(raw, rate)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--wanita", default="Aoede", help="suara wanita: Kore, Aoede, Leda, Zephyr")
    ap.add_argument("--pria", default="Puck", help="suara pria: Puck, Charon, Fenrir, Orus")
    ap.add_argument("--gaya", default="santai", choices=STYLES)
    ap.add_argument("--ulang", action="store_true", help="buat ulang file yang sudah ada")
    ap.add_argument("--hanya", choices=("wanita", "pria"), help="buat satu suara saja (hemat kuota)")
    args = ap.parse_args()

    key = os.environ.get("GEMINI_API_KEY") or getpass.getpass("Tempel Gemini API key (tidak ditampilkan): ").strip()
    models = pick_model(key)
    print(f"Model: {models[0].replace('models/', '')}")
    texts = narrations()
    targets = [("gemini-wanita", args.wanita), ("gemini-pria", args.pria)]
    if args.hanya:
        targets = [t for t in targets if t[0] == f"gemini-{args.hanya}"]
    for folder, voice in targets:
        out = ROOT / "examples" / "assets" / "suara" / folder
        out.mkdir(parents=True, exist_ok=True)
        (out / "suara.txt").write_text(f"Gemini {voice} ({args.gaya})\n", encoding="utf-8")
        for i, text in enumerate(texts, 1):
            path = out / f"{i:02d}.wav"
            if path.exists() and path.stat().st_size > 0 and not args.ulang:
                continue
            print(f"[{folder} · {voice}] {path.name}: {text}")
            path.write_bytes(speak(key, models, text, voice, args.gaya))
    print("\nSelesai. Di aplikasi pilih 'Gemini — wanita/pria (tersimpan)' di tab Template.")


if __name__ == "__main__":
    main()
