"""Aplikasi web dstools — jalankan:  streamlit run app.py"""
import io

import pandas as pd
import streamlit as st

import dstools as ds

st.set_page_config(page_title="dstools — Data Science Studio", layout="wide")
st.title("📊 dstools — Data Science Studio")
st.caption("Upload data → EDA → latih banyak model dengan cross-validation → download submission & model. "
           "Kode yang sama bisa dijalankan di Kaggle Notebook (lihat kaggle_notebook.ipynb).")

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
    st.info("Upload data latih di sidebar, atau centang **Pakai data contoh**.")
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
tab_data, tab_eda, tab_train, tab_pred = st.tabs(["🗂 Data", "🔍 EDA", "🤖 Latih model", "📤 Prediksi & download"])

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
    if st.button("🚀 Latih", type="primary", disabled=not models):
        with st.spinner("Melatih model dengan cross-validation…"):
            log = io.StringIO()
            import contextlib
            with contextlib.redirect_stdout(log):
                auto = ds.AutoML(target=target, id_col=id_col, metric=metric, models=models, folds=folds,
                                 top_k=top_k, drop=drop, log_target=log_target).fit(train)
        st.session_state["auto"] = auto
        st.session_state["log"] = log.getvalue()
    auto = st.session_state.get("auto")
    if auto is not None and auto.target == target:
        st.success(f"Selesai. Dipakai untuk prediksi: {', '.join(auto.selected_)}")
        st.subheader("Leaderboard")
        st.dataframe(auto.leaderboard, width="stretch")
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
