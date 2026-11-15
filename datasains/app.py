"""Aplikasi web dstools — jalankan:  streamlit run app.py"""
import contextlib
import io
import os
from pathlib import Path

import pandas as pd
import streamlit as st

import asisten
import dstools as ds
import viz

st.set_page_config(page_title="dstools — Data Science Studio", layout="wide")
viz.css()

PANDUAN = Path(__file__).with_name("PANDUAN_PEMULA.md")
NAMA_TASK = {"binary": "Biner", "multiclass": "Multikelas", "regression": "Regresi"}
INFO_TASK = {"binary": "Klasifikasi 2 kelas (ya/tidak)", "multiclass": "Klasifikasi lebih dari 2 kelas",
             "regression": "Menebak angka"}


# --------------------------------------------------------------------------- panduan & asisten

def render_panduan():
    """Ebook: panduan pemula per bab."""
    if not PANDUAN.exists():
        st.warning("File PANDUAN_PEMULA.md tidak ditemukan di folder aplikasi.")
        return
    teks = PANDUAN.read_text(encoding="utf-8")
    judul, *bab = teks.split("\n## ")
    bab = ["## " + b for b in bab]
    nama = [b.splitlines()[0].removeprefix("## ") for b in bab]
    c1, c2 = st.columns([3, 1], vertical_alignment="bottom")
    pilih = c1.selectbox("Bab", ["Daftar isi"] + nama, key="bab")
    c2.download_button("Download ebook (.md)", teks, "Panduan_Data_Science_Pemula.md", "text/markdown",
                       width="stretch")
    if pilih == "Daftar isi":
        st.markdown(judul.split("**Daftar isi**")[0])
        st.markdown("\n".join(f"- {n}" for n in nama))
        viz.note("Pilih bab di atas. Ada pertanyaan? Tanyakan di tab Asisten AI.")
        return
    i = nama.index(pilih)
    st.markdown(bab[i].replace("\n---\n", "\n"))

    def ke(bab_baru):
        st.session_state["bab"] = bab_baru

    st.divider()
    a, _, b = st.columns([1, 1, 1])
    if i > 0:
        a.button(f"← {nama[i - 1]}", key="prev", on_click=ke, args=(nama[i - 1],), width="stretch")
    if i < len(nama) - 1:
        b.button(f"{nama[i + 1]} →", key="next", on_click=ke, args=(nama[i + 1],), width="stretch")


def _api_key_bawaan():
    try:
        return st.secrets.get("ANTHROPIC_API_KEY", "")
    except Exception:  # tidak ada secrets.toml
        return os.environ.get("ANTHROPIC_API_KEY", "")


def render_asisten(train=None, target=None, auto=None):
    """Chatbot: tanya apa saja tentang data science, data Anda, Python, Kaggle, LLM."""
    with st.expander("Pengaturan asisten", expanded=not st.session_state.get("api_key")):
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
        if st.button("Mulai percakapan baru"):
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
        viz.note("Contoh pertanyaan")
        cols = st.columns(3)
        for i, q in enumerate(asisten.SARAN_PERTANYAAN):
            if cols[i % 3].button(q, key=f"saran{i}", width="stretch"):
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


# --------------------------------------------------------------------------- data

st.title("Data Science Studio")
viz.note("Upload data, kenali isinya, latih banyak model dengan cross-validation, lalu download hasilnya. "
         "Kode yang sama jalan di Kaggle (kaggle_notebook.ipynb).")

with st.sidebar:
    st.subheader("Data")
    f_train = st.file_uploader("Data latih", type=["csv", "tsv", "parquet", "xlsx"],
                               help="train.csv / parquet / xlsx — berisi kolom target")
    f_test = st.file_uploader("Data uji (opsional)", type=["csv", "tsv", "parquet", "xlsx"])
    f_sample = st.file_uploader("sample_submission.csv (opsional)", type=["csv"])
    pakai_demo = st.toggle("Pakai data contoh", value=f_train is None)


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
    st.info("Upload data latih di sidebar, atau nyalakan **Pakai data contoh**. "
            "Sambil menunggu, baca panduan atau tanya asisten AI.")
    t_panduan, t_asisten = st.tabs(["Panduan", "Asisten AI"])
    with t_panduan:
        render_panduan()
    with t_asisten:
        render_asisten()
    st.stop()

cols = list(train.columns)
with st.sidebar:
    st.subheader("Target")
    default_t = cols.index("beli") if "beli" in cols else len(cols) - 1
    target = st.selectbox("Kolom yang ditebak", cols, index=default_t)
    id_opts = ["(tidak ada)"] + [c for c in cols if c != target]
    guess = next((c for c in id_opts if c.lower() in ("id", "passengerid", "row_id")), "(tidak ada)")
    id_col = st.selectbox("Kolom ID", id_opts, index=id_opts.index(guess))
    id_col = None if id_col == "(tidak ada)" else id_col
    drop = st.multiselect("Kolom yang dibuang", [c for c in cols if c not in (target, id_col)],
                          placeholder="Tidak ada")

task = ds.detect_task(train[target])
auto_now = st.session_state.get("auto")
if auto_now is not None and auto_now.target != target:
    auto_now = None

tab_data, tab_eda, tab_train, tab_pred, tab_chat, tab_guide = st.tabs(
    ["Ringkasan", "EDA", "Latih model", "Prediksi & download", "Asisten AI", "Panduan"])

# --------------------------------------------------------------------------- ringkasan

with tab_data:
    res = ds.eda(train, target=target, out=None)
    info = res["info"]
    miss_pct = train.isna().mean().mean() * 100
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Baris", f"{len(train):,}".replace(",", "."), border=True)
    c2.metric("Kolom", train.shape[1], border=True)
    c3.metric("Jenis tugas", NAMA_TASK[task], border=True, help=INFO_TASK[task])
    c4.metric("Sel kosong", f"{miss_pct:.1f}%", border=True)
    c5.metric("Baris duplikat", info["duplikat"], border=True)
    if info["peringatan"]:
        st.warning("**Perlu diperhatikan**\n" + "\n".join(f"- {w}" for w in info["peringatan"]))
    viz.note(f"Data uji: {'ada, ' + str(len(test)) + ' baris' if test is not None else 'belum diupload'}"
             f" · sample_submission: {'ada' if sample is not None else 'tidak ada'}")
    st.dataframe(train.head(200), width="stretch", hide_index=True)

# --------------------------------------------------------------------------- EDA

with tab_eda:
    left, right = st.columns(2, gap="large")
    with left:
        st.subheader("Distribusi target")
        if task == "regression":
            chart, table = viz.histogram(train[target], target)
            viz.note(f"Sebaran nilai {target}. Arahkan kursor ke batang untuk rentang & jumlahnya.")
        else:
            vc = train[target].astype(str).value_counts()
            n = vc.sum()
            chart, table = viz.hbar(vc, "Jumlah baris",
                                    label_fmt=lambda v: f"{v / n:.0%} · {int(v):,}".replace(",", "."), counts=True)
            viz.note(f"Proporsi tiap kelas {target}. Kelas yang sangat jarang = data tidak seimbang.")
        viz.show(chart, table)
    with right:
        st.subheader("Hubungan dengan target")
        num = train.drop(columns=[c for c in [id_col] if c]).select_dtypes("number")
        if target in num and num.shape[1] > 1:
            corr = num.corr(numeric_only=True)[target].drop(target)
            chart, table = viz.diverging_bar(corr, "Korelasi (r)")
            viz.note("Biru: makin besar kolom ini, makin besar target. Merah: sebaliknya. "
                     "Korelasi bukan sebab-akibat.")
            viz.show(chart, table)
        else:
            viz.note("Target bukan angka, jadi korelasi Pearson tidak dihitung. "
                     "Lihat feature importance setelah melatih model.")

    miss = train.isna().mean().mul(100)
    miss = miss[miss > 0]
    if len(miss):
        st.subheader("Nilai kosong")
        viz.note("Persentase sel kosong per kolom. Di atas ±40% biasanya lebih baik dibuang atau dijadikan "
                 "fitur 'kosong / tidak'.")
        chart, table = viz.hbar(miss / 100, "Kosong", label_fmt=lambda v: f"{v:.1%}", percent=True)
        viz.show(chart, table)

    st.subheader("Lihat satu kolom")
    fitur = [c for c in cols if c not in (target, id_col)] or cols
    kol = st.selectbox("Kolom", fitur)
    s = train[kol]
    if pd.api.types.is_numeric_dtype(s) and s.nunique() > 20:
        chart, table = viz.histogram(s, kol)
    else:
        vc = s.astype(str).value_counts()
        chart, table = viz.hbar(vc, "Jumlah baris", max_rows=15, counts=True,
                                label_fmt=lambda v: f"{int(v):,}".replace(",", "."))
        if len(vc) > 15:
            viz.note(f"15 nilai tersering dari {len(vc)} nilai unik.")
    viz.show(chart, table)

    with st.expander("Ringkasan semua kolom"):
        st.dataframe(res["summary"], width="stretch")
    if st.button("Buat laporan EDA (HTML)"):
        ds.eda(train, target=target, out="laporan_eda.html")
        st.download_button("Download laporan_eda.html", open(ds.output_dir() / "laporan_eda.html", "rb"),
                           "laporan_eda.html", "text/html")

# --------------------------------------------------------------------------- latih

with tab_train:
    clf = task != "regression"
    metrics = ["roc_auc", "accuracy", "f1", "logloss"] if clf else ["rmse", "mae", "r2", "rmsle"]
    if task == "multiclass":
        metrics = ["accuracy", "f1", "logloss", "roc_auc"]
    all_models = list(ds.available_models(task))

    with st.container(border=True):
        c1, c2, c3 = st.columns(3)
        metric = c1.selectbox("Metrik", metrics, help="Cara menilai tebakan. Ikuti metrik kompetisi bila ada.")
        folds = c2.slider("Jumlah fold CV", 2, 10, 5)
        top_k = c3.slider("Ensemble top-k", 1, len(all_models), min(3, len(all_models)))
        models = st.multiselect("Model", all_models, default=all_models, placeholder="Pilih model")
        log_target = st.checkbox("Latih pada log(target) — cocok untuk harga/penjualan", disabled=clf)
        with st.expander("Hyperparameter tuning (opsional — lebih lama, skor biasanya naik sedikit)"):
            do_tune = st.toggle("Aktifkan tuning")
            tunable = [m for m in models if m in ds.SEARCH_SPACES]
            t1, t2, t3 = st.columns(3)
            tune_models = t1.multiselect("Model yang di-tuning", tunable,
                                         default=[m for m in ("lightgbm",) if m in tunable] or tunable[:1],
                                         disabled=not do_tune, placeholder="Otomatis (model terbaik)",
                                         help="Kosongkan = otomatis pilih model terbaik")
            n_trials = t2.slider("Jumlah percobaan", 5, 200, 30, disabled=not do_tune)
            timeout = t3.number_input("Batas waktu per model (detik, 0 = tanpa batas)", 0, 36000, 300,
                                      disabled=not do_tune)
        go = st.button("Latih model", type="primary", disabled=not models)

    if go:
        with st.spinner("Melatih model dengan cross-validation…"):
            log = io.StringIO()
            with contextlib.redirect_stdout(log):
                auto = ds.AutoML(target=target, id_col=id_col, metric=metric, models=models, folds=folds,
                                 top_k=top_k, drop=drop, log_target=log_target,
                                 tune=(tune_models or "auto") if do_tune else None, n_trials=n_trials,
                                 tune_timeout=timeout or None).fit(train)
        st.session_state["auto"], st.session_state["log"] = auto, log.getvalue()
        auto_now = auto

    auto = auto_now
    if auto is not None:
        lb = auto.leaderboard
        greater = ds.METRICS[auto.metric][1]
        best = lb.iloc[0]
        std = f" ± {best['std_fold']:.4f} antar fold" if pd.notna(best.get("std_fold")) else ""
        viz.hero(f"Skor CV terbaik · {auto.metric}", f"{best[auto.metric]:.4f}",
                 f"{best['model']}{std} · {auto.folds}-fold cross-validation")

        st.subheader("Perbandingan model")
        viz.note("Titik = skor rata-rata CV, garis = sebaran ±1 std antar fold. Selisih yang lebih kecil dari "
                 "sebarannya kemungkinan hanya kebetulan.")
        chart, table = viz.model_scores(lb, auto.metric, greater)
        viz.show(chart, table)

        fi = auto.feature_importance(top=15)
        if len(fi):
            st.subheader("Fitur paling berpengaruh")
            viz.note(f"Seberapa banyak model {fi.name.split('(')[-1].rstrip(')')} memakai tiap fitur "
                     "(dinormalkan, total 100%). Bukan bukti sebab-akibat.")
            chart, table = viz.hbar(fi, "Importance", label_fmt=lambda v: f"{v:.1%}", percent=True)
            viz.show(chart, table)

        hist = getattr(auto, "tuning_history_", None)
        if hist is not None and len(hist):
            st.subheader("Proses tuning")
            viz.note("Titik samar = skor tiap percobaan, garis = skor terbaik sejauh ini. "
                     "Garis yang sudah datar berarti menambah percobaan tidak banyak membantu.")
            chart, table = viz.tuning_progress(hist, auto.metric, greater, list(auto.best_params_))
            viz.show(chart, table)
            for name, params in auto.best_params_.items():
                with st.expander(f"Hyperparameter terbaik — {name}"):
                    st.dataframe(pd.DataFrame({"parameter": list(params), "nilai": [str(v) for v in params.values()]}),
                                 hide_index=True, width="stretch")
        with st.expander("Log pelatihan"):
            st.code(st.session_state.get("log", ""), language=None)
    elif not go:
        viz.note("Atur pilihan di atas lalu klik Latih model. Dengan data contoh prosesnya ±10 detik.")

# --------------------------------------------------------------------------- prediksi

with tab_pred:
    auto = auto_now
    if auto is None:
        st.info("Latih model dulu di tab **Latih model**.")
    else:
        import joblib
        buf = io.BytesIO()
        joblib.dump(auto, buf, compress=3)
        if test is None:
            st.info("Upload data uji di sidebar untuk membuat prediksi / submission.")
            st.download_button("Download model (.joblib)", buf.getvalue(), "model_dstools.joblib")
        else:
            proba = st.segmented_control("Isi submission", ["otomatis", "label kelas", "probabilitas"],
                                         default="otomatis", disabled=task == "regression")
            proba = None if proba in (None, "otomatis") else proba == "probabilitas"
            sub = ds.save_submission(auto, test, sample, out="submission.csv", proba=proba)
            c1, c2 = st.columns(2)
            c1.download_button("Download submission.csv", sub.to_csv(index=False), "submission.csv", "text/csv",
                               type="primary", width="stretch")
            c2.download_button("Download model (.joblib)", buf.getvalue(), "model_dstools.joblib",
                               width="stretch")
            pred_col = sub.columns[-1]
            st.subheader("Sebaran prediksi")
            if pd.api.types.is_numeric_dtype(sub[pred_col]) and sub[pred_col].nunique() > 20:
                chart, table = viz.histogram(sub[pred_col], pred_col)
            else:
                vc = sub[pred_col].astype(str).value_counts()
                n = vc.sum()
                chart, table = viz.hbar(vc, "Jumlah baris",
                                        label_fmt=lambda v: f"{v / n:.0%} · {int(v):,}".replace(",", "."), counts=True)
            viz.note(f"{len(sub):,} baris prediksi. Bandingkan dengan distribusi target di tab EDA: "
                     "kalau sangat berbeda, cek lagi datanya.".replace(",", "."))
            viz.show(chart, table)
            with st.expander("50 baris pertama submission"):
                st.dataframe(sub.head(50), width="stretch", hide_index=True)

with tab_chat:
    render_asisten(train, target, auto_now)

with tab_guide:
    render_panduan()
