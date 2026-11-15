"""
asisten.py — chatbot AI (Claude) untuk belajar & mengerjakan data science.

Dipakai oleh app.py (tab "Asisten AI"), dan bisa dipakai sendiri di Python / Kaggle:

    import asisten
    bot = asisten.Asisten()                       # baca ANTHROPIC_API_KEY dari environment
    bot.set_konteks(asisten.ringkas_data(train, target="Survived", auto=auto))
    for potongan in bot.tanya("Kenapa model terbaik saya random forest?"):
        print(potongan, end="")

Butuh API key dari https://platform.claude.com (berbayar per pemakaian).
Yang dikirim ke API hanya RINGKASAN data (nama kolom, statistik, leaderboard) —
bukan seluruh isi data — kecuali Anda sendiri memilih menyertakan contoh baris.
"""
from __future__ import annotations

import os

import pandas as pd

MODEL_DEFAULT = "claude-opus-5-5"
MODEL_PILIHAN = {
    "claude-opus-5-5": "Opus 5.5 — paling pintar (default)",
    "claude-sonnet-5-5": "Sonnet 5.5 — lebih cepat & lebih murah",
    "claude-haiku-5-5": "Haiku 5.5 — paling murah, untuk pertanyaan sederhana",
}

SYSTEM_PROMPT = """Kamu adalah asisten data science di aplikasi "dstools — Data Science Studio".
Penggunanya kebanyakan pemula dari Indonesia yang sedang belajar data science, Python, Kaggle, dan LLM,
sebagian juga memakai aplikasi ini untuk pekerjaan atau proyek freelance.

Cara menjawab:
- Pakai Bahasa Indonesia yang santai dan jelas, kecuali pengguna memakai bahasa lain.
- Jelaskan istilah teknis dengan bahasa sehari-hari dan contoh konkret; anggap pengguna belum tahu
  istilahnya kecuali ia jelas sudah paham.
- Kalau memberi kode, pakai Python (pandas, scikit-learn, atau fungsi dstools) yang bisa langsung
  dijalankan di Kaggle Notebook, dan jelaskan singkat apa yang dilakukan tiap bagian.
- Kalau ada ringkasan data atau hasil model pengguna di bawah, pakai itu untuk menjawab secara spesifik.
  Sebut angka yang relevan. Jangan mengarang kolom, angka, atau hasil yang tidak ada di ringkasan.
- Waspadai dan tunjukkan masalah umum: data leakage, overfitting, metrik yang tidak cocok,
  target tidak seimbang, kolom ID ikut jadi fitur.
- Kalau tidak yakin atau informasinya kurang, katakan terus terang dan sarankan cara mengeceknya.
- Jawaban ringkas dulu; tawarkan penjelasan lebih dalam bila perlu.

Fungsi dstools yang tersedia untuk pengguna:
ds.load(), ds.eda(df, target), ds.add_features(df), ds.AutoML(target, id_col, metric, models, folds,
top_k, drop, log_target, tune, n_trials, tune_timeout).fit(train), auto.leaderboard,
auto.feature_importance(), auto.best_params_, ds.save_submission(auto, test, sample)."""

SARAN_PERTANYAAN = [
    "Jelaskan hasil leaderboard saya dengan bahasa sederhana",
    "Fitur baru apa yang bisa saya buat dari data ini?",
    "Apakah ada tanda data leakage atau masalah di data saya?",
    "Metrik apa yang paling cocok untuk data ini, dan kenapa?",
    "Apa itu LLM dan bagaimana cara mulai belajarnya?",
    "Bagaimana cara menjelaskan hasil model ini ke klien/atasan?",
]


def ringkas_data(df: pd.DataFrame | None = None, target: str | None = None, auto=None,
                 contoh_baris: int = 0, maks_kolom: int = 60) -> str:
    """Ringkasan teks dari data & hasil model untuk dikirim ke chatbot (bukan datanya utuh)."""
    bagian = []
    if df is not None:
        bagian.append(f"## Data latih\n{len(df):,} baris × {df.shape[1]} kolom. Target: {target or '-'}")
        rows = []
        for c in list(df.columns)[:maks_kolom]:
            s = df[c]
            info = f"- {c} ({s.dtype}): kosong {s.isna().mean() * 100:.1f}%, unik {s.nunique()}"
            if pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s):
                info += f", mean {s.mean():.4g}, min {s.min():.4g}, max {s.max():.4g}"
            else:
                top = s.astype(str).value_counts().head(3)
                info += ", tersering: " + ", ".join(f"{k} ({v})" for k, v in top.items())
            rows.append(info)
        if df.shape[1] > maks_kolom:
            rows.append(f"- ... dan {df.shape[1] - maks_kolom} kolom lain")
        bagian.append("\n".join(rows))
        if target and target in df:
            vc = df[target].value_counts(normalize=True).head(10)
            if df[target].nunique() <= 20:
                bagian.append("Distribusi target: " + ", ".join(f"{k}={v:.1%}" for k, v in vc.items()))
            else:
                bagian.append(f"Target numerik: {df[target].describe().round(4).to_dict()}")
        if contoh_baris:
            bagian.append(f"Contoh {contoh_baris} baris:\n" + df.head(contoh_baris).to_csv(index=False))
    if auto is not None and hasattr(auto, "leaderboard"):
        bagian.append(f"## Hasil AutoML\nTask: {auto.task_}, metrik: {auto.metric}, {auto.folds}-fold CV.\n"
                      f"Dipakai untuk prediksi: {', '.join(auto.selected_)}\n"
                      + auto.leaderboard.to_string(index=False))
        fi = auto.feature_importance(top=15)
        if len(fi):
            bagian.append(f"Feature importance ({fi.name}):\n" + fi.round(4).to_string())
        for name, params in getattr(auto, "best_params_", {}).items():
            bagian.append(f"Hyperparameter terbaik {name}: {params}")
    return "\n\n".join(bagian)


class Asisten:
    """Chatbot multi-giliran dengan streaming. Riwayat percakapan disimpan di self.riwayat."""

    def __init__(self, api_key: str | None = None, model: str = MODEL_DEFAULT, effort: str = "medium",
                 client=None):
        if client is None:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
        self.client, self.model, self.effort = client, model, effort
        self.riwayat: list[dict] = []
        self.konteks = ""

    def set_konteks(self, teks: str):
        """Ringkasan data/hasil yang ikut dikirim di system prompt."""
        self.konteks = teks or ""

    def reset(self):
        self.riwayat = []

    def _system(self):
        blok = [{"type": "text", "text": SYSTEM_PROMPT}]
        if self.konteks:
            blok.append({"type": "text", "text": "# Data & hasil pengguna saat ini\n" + self.konteks})
        return blok

    def tanya(self, pertanyaan: str):
        """Kirim pertanyaan; hasilkan potongan teks jawaban satu per satu (streaming)."""
        self.riwayat.append({"role": "user", "content": pertanyaan})
        kw = dict(model=self.model, max_tokens=16000, system=self._system(), messages=self.riwayat,
                  cache_control={"type": "ephemeral"}, output_config={"effort": self.effort})
        if self.model in ("claude-opus-5-5", "claude-sonnet-5-5"):
            # bila model utama menolak permintaan, server mencoba model cadangan otomatis
            kw.update(betas=["server-side-fallback-2026-07-01"], fallbacks="default")
            stream_fn = self.client.beta.messages.stream
        else:
            stream_fn = self.client.messages.stream
        jawaban = ""
        try:
            with stream_fn(**kw) as stream:
                for teks in stream.text_stream:
                    jawaban += teks
                    yield teks
                final = stream.get_final_message()
        except Exception:
            self.riwayat.pop()  # pertanyaan gagal tidak disimpan, supaya bisa dicoba lagi
            raise
        if final.stop_reason == "refusal":
            pesan = "\n\n_(Maaf, permintaan ini tidak bisa dijawab. Coba ubah pertanyaannya.)_"
            jawaban += pesan
            yield pesan
        elif final.stop_reason == "max_tokens":
            pesan = "\n\n_(Jawaban terpotong karena terlalu panjang. Minta lanjutannya: \"lanjutkan\".)_"
            jawaban += pesan
            yield pesan
        self.riwayat.append({"role": "assistant", "content": jawaban or "(kosong)"})


def pesan_error(e: Exception) -> str:
    """Terjemahkan error API menjadi pesan yang ramah pemula."""
    try:
        import anthropic
    except ImportError:
        return f"Library anthropic belum terpasang: pip install anthropic ({e})"
    if isinstance(e, anthropic.AuthenticationError):
        return "API key salah atau tidak berlaku. Cek lagi key di platform.claude.com."
    if isinstance(e, anthropic.PermissionDeniedError):
        return "API key tidak punya izin untuk model ini."
    if isinstance(e, anthropic.NotFoundError):
        return "Model tidak ditemukan. Pilih model lain."
    if isinstance(e, anthropic.RateLimitError):
        return "Terlalu banyak permintaan / kuota habis. Tunggu sebentar lalu coba lagi."
    if isinstance(e, anthropic.BadRequestError):
        return f"Permintaan ditolak API: {e.message}. Jika saldo kredit habis, isi ulang di platform.claude.com."
    if isinstance(e, anthropic.APIStatusError):
        return f"Server API sedang bermasalah ({e.status_code}). Coba lagi beberapa saat."
    if isinstance(e, anthropic.APIConnectionError):
        return "Tidak bisa terhubung ke internet / API. Di Kaggle: nyalakan Internet di Session options."
    if isinstance(e, anthropic.AnthropicError) and "api_key" in str(e).lower():
        return "API key belum diisi. Masukkan di sidebar atau set environment ANTHROPIC_API_KEY."
    return f"{type(e).__name__}: {e}"


if __name__ == "__main__":  # obrolan sederhana di terminal
    bot = Asisten()
    print("Asisten data science (ketik 'keluar' untuk berhenti)")
    while (q := input("\nAnda: ").strip()).lower() not in ("keluar", "exit", "quit"):
        print("Asisten: ", end="")
        try:
            for t in bot.tanya(q):
                print(t, end="", flush=True)
        except Exception as e:  # noqa: BLE001
            print(pesan_error(e))
        print()
