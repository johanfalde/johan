"""Aplikasi web dstools — jalankan:  streamlit run app.py"""
import io
import os
from pathlib import Path

import pandas as pd
import streamlit as st

import asisten
import dstools as ds

st.set_page_config(page_title="dstools — Data Science Studio", layout="wide")
st.title("📊 dstools — Data Science Studio")
st.caption("Upload data → EDA → latih banyak model dengan cross-validation → download submission & model. "
           "Ada 📖 panduan belajar dan 💬 asisten AI. Kode yang sama bisa dijalankan di Kaggle "
           "(lihat kaggle_notebook.ipynb).")

PANDUAN = Path(__file__).with_name("PANDUAN_PEMULA.md")


def render_panduan():
    """Tab ebook: panduan pemula per bab."""
    if not PANDUAN.exists():
        st.warning("File PANDUAN_PEMULA.md tidak ditemukan di folder aplikasi.")
        return
    teks = PANDUAN.read_text(encoding="utf-8")
    judul, *bab = teks.split("\n## ")
    bab = ["## " + b for b in bab]
    nama = [b.splitlines()[0].removeprefix("## ") for b in bab]
    c1, c2 = st.columns([3, 1])
    pilih = c1.selectbox("Pilih bab", ["Daftar isi"] + nama, key="bab")
    c2.download_button("⬇️ Download ebook (.md)", teks, "Panduan_Data_Science_Pemula.md", "text/markdown")
    if pilih == "Daftar isi":
        st.markdown(judul.split("**Daftar isi**")[0])
        for i, n in enumerate(nama):
            st.markdown(f"- {n}")
        st.info("Pilih bab di atas. Ada pertanyaan? Tanyakan ke tab **💬 Asisten AI**.")
    else:
        i = nama.index(pilih)
        st.markdown(bab[i].replace("\n---\n", "\n"))
        def ke(bab_baru):
            st.session_state["bab"] = bab_baru

        a, _, b = st.columns([1, 2, 1])
        if i > 0:
            a.button(f"← {nama[i - 1]}", key="prev", on_click=ke, args=(nama[i - 1],))
        if i < len(nama) - 1:
            b.button(f"{nama[i + 1]} →", key="next", on_click=ke, args=(nama[i + 1],))


def _api_key_bawaan():
    try:
        return st.secrets.get("ANTHROPIC_API_KEY", "")
    except Exception:  # tidak ada secrets.toml
        return os.environ.get("ANTHROPIC_API_KEY", "")


def render_asisten(train=None, target=None, auto=None):
    """Tab chatbot: tanya apa saja tentang data science, data Anda, Python, Kaggle, LLM."""
    with st.expander("⚙️ Pengaturan asisten", expanded=not st.session_state.get("api_key")):
        st.markdown("Butuh **API key Claude** dari [platform.claude.com](https://platform.claude.com) "
                    "(berbayar sesuai pemakaian). Key hanya disimpan selama aplikasi dibuka.")
        key = st.text_input("API key", value=st.session_state.get("api_key") or _api_key_bawaan(),
                            type="password")
        st.session_state["api_key"] = key
        c1, c2 = st.columns(2)
        model = c1.selectbox("Model", list(asisten.MODEL_PILIHAN), format_func=asisten.MODEL_PILIHAN.get)
        effort = c2.select_slider("Ketelitian berpikir", ["low", "medium", "high"], value="medium",
                                  help="Lebih tinggi = jawaban lebih matang, tapi lebih lama & lebih mahal")
        ada_data = train is not None
        kirim_ringkasan = st.checkbox("Sertakan ringkasan data & hasil model", value=ada_data,
                                      disabled=not ada_data,
                                      help="Yang dikirim: nama kolom, statistik, leaderboard — bukan isi data")
        contoh = st.slider("Sertakan contoh baris data (0 = tidak)", 0, 20, 0, disabled=not ada_data,
                           help="Jangan kirim data rahasia/pribadi")
        if st.button("🗑 Mulai percakapan baru"):
            st.session_state.pop("bot", None)
    if not key:
        st.info("Isi API key di pengaturan di atas untuk mulai mengobrol.")
        return
    bot = st.session_state.get("bot")
    if bot is None or (bot.model, bot.effort, st.session_state.get("bot_key")) != (model, effort, key):
        lama = bot.riwayat if bot is not None else []
        try:
            bot = asisten.Asisten(api_key=key, model=model, effort=effort)
        except Exception as e:  # noqa: BLE001
            st.error(asisten.pesan_error(e))
            return
        bot.riwayat = lama
        st.session_state["bot"], st.session_state["bot_key"] = bot, key
    bot.set_konteks(asisten.ringkas_data(train, target, auto, contoh_baris=contoh) if kirim_ringkasan else "")

    if not bot.riwayat:
        st.markdown("**Contoh pertanyaan:**")
        cols = st.columns(3)
        for i, q in enumerate(asisten.SARAN_PERTANYAAN):
            if cols[i % 3].button(q, key=f"saran{i}"):
                st.session_state["saran"] = q
    for m in bot.riwayat:
        with st.chat_message("user" if m["role"] == "user" else "assistant"):
            st.markdown(m["content"])
    q = st.chat_input("Tanya apa saja tentang data science, data Anda, Python, Kaggle, LLM…")
    q = q or st.session_state.pop("saran", None)
    if q:
        with st.chat_message("user"):
            st.markdown(q)
        with st.chat_message("assistant"):
            try:
                st.write_stream(bot.tanya(q))
            except Exception as e:  # noqa: BLE001
                st.error(asisten.pesan_error(e))

with st.sidebar:
    st.header("1. Data")
    f_train = st.file_uploader("Data latih (train.csv / parquet / xlsx)", type=["csv", "tsv", "parquet", "xlsx"])
    f_test = st.file_uploader("Data uji (test.csv) — opsional", type=["csv", "tsv", "parquet", "xlsx"])
    f_sample = st.file_uploader("sample_submission.csv — opsional", type=["csv"])
    pakai_demo = st.checkbox("Pakai data contoh", value=f_train is None)


@st.cache_data
def baca(file):
    name = file.name.lower()
    if name.endswith(".parquet"):
        return pd.read_parquet(file)
    if name.endswith(".xlsx"):
        return pd.read_excel(file)
    return pd.read_csv(file, sep="\t" if name.endswith(".tsv") else ",")


if f_train is not None and not pakai_demo:
    train = baca(f_train)
    test = baca(f_test) if f_test else None
    sample = baca(f_sample) if f_sample else None
elif pakai_demo:
    df = ds.demo_data()
    train, test, sample = df.iloc[:2400], df.iloc[2400:].drop(columns="beli"), None
else:
    st.info("Upload data latih di sidebar, atau centang **Pakai data contoh**. "
            "Sambil menunggu, baca panduan atau tanya asisten AI.")
    t_panduan, t_asisten = st.tabs(["📖 Panduan", "💬 Asisten AI"])
    with t_panduan:
        render_panduan()
    with t_asisten:
        render_asisten()
    st.stop()

cols = list(train.columns)
with st.sidebar:
    st.header("2. Target")
    default_t = cols.index("beli") if "beli" in cols else len(cols) - 1
    target = st.selectbox("Kolom target", cols, index=default_t)
    id_opts = ["(tidak ada)"] + [c for c in cols if c != target]
    guess = next((c for c in id_opts if c.lower() in ("id", "passengerid", "row_id")), "(tidak ada)")
    id_col = st.selectbox("Kolom ID", id_opts, index=id_opts.index(guess))
    id_col = None if id_col == "(tidak ada)" else id_col
    drop = st.multiselect("Kolom yang dibuang", [c for c in cols if c not in (target, id_col)])

task = ds.detect_task(train[target])
tab_data, tab_eda, tab_train, tab_pred, tab_chat, tab_guide = st.tabs(
    ["🗂 Data", "🔍 EDA", "🤖 Latih model", "📤 Prediksi & download", "💬 Asisten AI", "📖 Panduan"])

with tab_data:
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Baris", f"{len(train):,}")
    c2.metric("Kolom", train.shape[1])
    c3.metric("Task", task)
    c4.metric("Data uji", "ada" if test is not None else "tidak ada")
    st.dataframe(train.head(200), width="stretch")

with tab_eda:
    res = ds.eda(train, target=target, out=None)
    for w in res["info"]["peringatan"]:
        st.warning(w)
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Distribusi target")
        if task == "regression":
            st.bar_chart(train[target].dropna().value_counts(bins=30, sort=False).rename(lambda i: round(i.mid, 2)))
        else:
            st.bar_chart(res["target"]["jumlah"])
    with c2:
        st.subheader("Korelasi dengan target")
        if res["corr"] is not None:
            st.bar_chart(res["corr"])
        else:
            st.caption("Target bukan numerik — korelasi Pearson tidak dihitung.")
    st.subheader("Ringkasan kolom")
    st.dataframe(res["summary"], width="stretch")
    st.subheader("Lihat satu kolom")
    kol = st.selectbox("Kolom", cols)
    s = train[kol]
    if pd.api.types.is_numeric_dtype(s) and s.nunique() > 20:
        st.bar_chart(s.dropna().value_counts(bins=30, sort=False).rename(lambda i: round(i.mid, 2)))
    else:
        st.bar_chart(s.astype(str).value_counts().head(30))
    if st.button("Buat laporan EDA HTML"):
        ds.eda(train, target=target, out="laporan_eda.html")
        st.download_button("Download laporan_eda.html", open(ds.output_dir() / "laporan_eda.html", "rb"),
                           "laporan_eda.html", "text/html")

with tab_train:
    clf = task != "regression"
    metrics = ["roc_auc", "accuracy", "f1", "logloss"] if clf else ["rmse", "mae", "r2", "rmsle"]
    if task == "multiclass":
        metrics = ["accuracy", "f1", "logloss", "roc_auc"]
    all_models = list(ds.available_models(task))
    c1, c2, c3 = st.columns(3)
    metric = c1.selectbox("Metrik", metrics)
    folds = c2.slider("Jumlah fold CV", 2, 10, 5)
    top_k = c3.slider("Ensemble top-k", 1, len(all_models), min(3, len(all_models)))
    models = st.multiselect("Model", all_models, default=all_models)
    log_target = st.checkbox("Latih pada log(target) — cocok untuk harga/penjualan", disabled=clf)
    with st.expander("🎛 Hyperparameter tuning (opsional — lebih lama, biasanya skor naik sedikit)"):
        do_tune = st.checkbox("Aktifkan tuning")
        tunable = [m for m in models if m in ds.SEARCH_SPACES]
        t1, t2, t3 = st.columns(3)
        tune_models = t1.multiselect("Model yang di-tuning", tunable,
                                     default=[m for m in ("lightgbm",) if m in tunable] or tunable[:1],
                                     disabled=not do_tune, help="Kosongkan = otomatis pilih model terbaik")
        n_trials = t2.slider("Jumlah percobaan", 5, 200, 30, disabled=not do_tune)
        timeout = t3.number_input("Batas waktu per model (detik, 0 = tanpa batas)", 0, 36000, 300,
                                  disabled=not do_tune)
    if st.button("🚀 Latih", type="primary", disabled=not models):
        with st.spinner("Melatih model dengan cross-validation…"):
            log = io.StringIO()
            import contextlib
            with contextlib.redirect_stdout(log):
                auto = ds.AutoML(target=target, id_col=id_col, metric=metric, models=models, folds=folds,
                                 top_k=top_k, drop=drop, log_target=log_target,
                                 tune=(tune_models or "auto") if do_tune else None, n_trials=n_trials,
                                 tune_timeout=timeout or None).fit(train)
        st.session_state["auto"] = auto
        st.session_state["log"] = log.getvalue()
    auto = st.session_state.get("auto")
    if auto is not None and auto.target == target:
        st.success(f"Selesai. Dipakai untuk prediksi: {', '.join(auto.selected_)}")
        st.subheader("Leaderboard")
        st.dataframe(auto.leaderboard, width="stretch")
        for name, params in getattr(auto, "best_params_", {}).items():
            st.subheader(f"Hyperparameter terbaik — {name}")
            st.json(params)
        hist = getattr(auto, "tuning_history_", None)
        if hist is not None and len(hist):
            st.caption("Skor tiap percobaan tuning (yang selesai)")
            st.line_chart(hist.reset_index(), x="index", y=auto.metric, color="model")
        fi = auto.feature_importance(top=25)
        if len(fi):
            st.subheader("Feature importance")
            st.bar_chart(fi)
        with st.expander("Log pelatihan"):
            st.code(st.session_state.get("log", ""))

with tab_pred:
    auto = st.session_state.get("auto")
    if auto is None or auto.target != target:
        st.info("Latih model dulu di tab **Latih model**.")
    else:
        import joblib
        buf = io.BytesIO()
        joblib.dump(auto, buf, compress=3)
        st.download_button("💾 Download model (.joblib)", buf.getvalue(), "model_dstools.joblib")
        if test is None:
            st.info("Upload data uji di sidebar untuk membuat prediksi / submission.")
        else:
            proba = st.radio("Isi submission", ["otomatis", "label kelas", "probabilitas"], horizontal=True,
                             disabled=task == "regression")
            proba = None if proba == "otomatis" else proba == "probabilitas"
            sub = ds.save_submission(auto, test, sample, out="submission.csv", proba=proba)
            st.dataframe(sub.head(50), width="stretch")
            st.download_button("📤 Download submission.csv", sub.to_csv(index=False), "submission.csv", "text/csv",
                               type="primary")

with tab_chat:
    a = st.session_state.get("auto")
    render_asisten(train, target, a if a is not None and a.target == target else None)

with tab_guide:
    render_panduan()
