"""
dstools — toolkit data science satu file, jalan di laptop maupun di Kaggle Notebook.

Alur lengkap:  muat data -> EDA (laporan HTML) -> feature engineering -> preprocessing
               -> banyak model + cross-validation -> leaderboard -> ensemble -> submission.csv

Pakai di Python / Kaggle:
    import dstools as ds
    train, test, sample = ds.load()                    # di Kaggle: cari otomatis di /kaggle/input
    ds.eda(train, target="Survived", out="laporan_eda.html")
    auto = ds.AutoML(target="Survived", id_col="PassengerId").fit(train)
    auto.leaderboard
    ds.save_submission(auto, test, sample)             # -> submission.csv

Pakai dari terminal:
    python dstools.py demo
    python dstools.py demo --tune                      # dengan hyperparameter tuning
    python dstools.py eda   --train train.csv --target Survived
    python dstools.py train --train train.csv --test test.csv --target Survived --id PassengerId
"""
from __future__ import annotations

import argparse
import html
import json
import os
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (ExtraTreesClassifier, ExtraTreesRegressor,
                              HistGradientBoostingClassifier, HistGradientBoostingRegressor,
                              RandomForestClassifier, RandomForestRegressor)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.metrics import (accuracy_score, f1_score, log_loss, mean_absolute_error,
                             mean_squared_error, r2_score, roc_auc_score)
from sklearn.model_selection import KFold, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, OrdinalEncoder, StandardScaler

__version__ = "1.1.0"
warnings.filterwarnings("ignore", category=UserWarning)

# --------------------------------------------------------------------------- lingkungan

def is_kaggle() -> bool:
    """True bila berjalan di Kaggle Notebook."""
    return bool(os.environ.get("KAGGLE_KERNEL_RUN_TYPE")) or Path("/kaggle/input").exists()


def output_dir() -> Path:
    """Folder hasil: /kaggle/working di Kaggle, folder kerja saat ini di tempat lain."""
    return Path("/kaggle/working") if is_kaggle() else Path.cwd()


def _read(path) -> pd.DataFrame:
    path = Path(path)
    suf = path.suffix.lower()
    if suf == ".parquet":
        return pd.read_parquet(path)
    if suf in (".xlsx", ".xls"):
        return pd.read_excel(path)
    if suf == ".tsv":
        return pd.read_csv(path, sep="\t")
    return pd.read_csv(path)


def find_files(root="/kaggle/input"):
    """Cari train / test / sample_submission di bawah `root` (rekursif)."""
    found = {"train": None, "test": None, "sample": None}
    root = Path(root)
    if not root.exists():
        return found
    exts = {".csv", ".parquet", ".tsv"}
    for p in sorted(root.rglob("*")):
        if p.suffix.lower() not in exts:
            continue
        name = p.stem.lower()
        if "sample" in name or "submission" in name:
            found["sample"] = found["sample"] or p
        elif name.startswith("train") or name == "train":
            found["train"] = found["train"] or p
        elif name.startswith("test") or name == "test":
            found["test"] = found["test"] or p
    return found


def load(train=None, test=None, sample=None, root="/kaggle/input"):
    """Muat data. Tanpa argumen: cari otomatis (di Kaggle). Mengembalikan (train, test, sample)."""
    if train is None:
        f = find_files(root)
        train, test, sample = f["train"], test or f["test"], sample or f["sample"]
        if train is None:
            raise FileNotFoundError(f"Tidak menemukan file train di {root}. Isi argumen train=...")
        print(f"[dstools] train={train}\n[dstools] test={test}\n[dstools] sample={sample}")
    tr = _read(train)
    te = _read(test) if test is not None else None
    sa = _read(sample) if sample is not None else None
    return tr, te, sa


def reduce_memory(df: pd.DataFrame) -> pd.DataFrame:
    """Perkecil tipe numerik (float64->float32, int64->int terkecil) untuk dataset besar."""
    df = df.copy()
    for c in df.select_dtypes(include="integer").columns:
        df[c] = pd.to_numeric(df[c], downcast="integer")
    for c in df.select_dtypes(include="float").columns:
        df[c] = pd.to_numeric(df[c], downcast="float")
    return df

# --------------------------------------------------------------------------- EDA

def detect_task(y: pd.Series) -> str:
    """'binary', 'multiclass' atau 'regression'."""
    y = y.dropna()
    n = y.nunique()
    if n == 2:
        return "binary"
    if y.dtype == object or str(y.dtype) in ("category", "bool", "string"):
        return "multiclass"
    if pd.api.types.is_integer_dtype(y) and n <= 20:
        return "multiclass"
    if pd.api.types.is_float_dtype(y) and n <= 20 and np.allclose(y, y.round()):
        return "multiclass"
    return "regression"


def summary(df: pd.DataFrame) -> pd.DataFrame:
    """Ringkasan per kolom: tipe, % kosong, jumlah unik, contoh, statistik."""
    rows = []
    for c in df.columns:
        s = df[c]
        num = pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s)
        rows.append({
            "kolom": c,
            "tipe": str(s.dtype),
            "kosong_%": round(s.isna().mean() * 100, 2),
            "unik": s.nunique(dropna=True),
            "contoh": ", ".join(map(str, s.dropna().unique()[:3])),
            "mean": round(s.mean(), 4) if num else None,
            "std": round(s.std(), 4) if num else None,
            "min": s.min() if num else None,
            "max": s.max() if num else None,
        })
    return pd.DataFrame(rows).set_index("kolom")


def eda(df: pd.DataFrame, target: str | None = None, out: str | Path | None = "laporan_eda.html",
        top_corr: int = 15) -> dict:
    """Analisis data eksploratif. Mencetak ringkasan dan (opsional) menulis laporan HTML."""
    info = {"baris": len(df), "kolom": df.shape[1],
            "duplikat": int(df.duplicated().sum()),
            "memori_MB": round(df.memory_usage(deep=True).sum() / 1e6, 2)}
    summ = summary(df)
    warn = []
    for c, r in summ.iterrows():
        if r["kosong_%"] > 40:
            warn.append(f"Kolom '{c}' kosong {r['kosong_%']}%")
        if r["unik"] <= 1:
            warn.append(f"Kolom '{c}' konstan (bisa dibuang)")
        if r["unik"] == len(df) and r["tipe"] == "object":
            warn.append(f"Kolom '{c}' unik di setiap baris (ID/teks?)")
    target_info, corr = None, None
    if target and target in df:
        task = detect_task(df[target])
        info["task"] = task
        if task == "regression":
            target_info = df[target].describe().to_frame("nilai")
        else:
            vc = df[target].value_counts(dropna=False)
            target_info = pd.DataFrame({"jumlah": vc, "persen": (vc / vc.sum() * 100).round(2)})
            if vc.min() / vc.max() < 0.2:
                warn.append("Target tidak seimbang (imbalanced) — perhatikan metrik & stratifikasi")
        num = df.select_dtypes("number")
        if target in num and num.shape[1] > 1:
            corr = num.corr(numeric_only=True)[target].drop(target).abs().sort_values(ascending=False)
            corr = corr.head(top_corr).round(4).to_frame("|korelasi| dgn target")
    info["peringatan"] = warn

    print(f"[EDA] {info['baris']} baris x {info['kolom']} kolom, duplikat={info['duplikat']}, "
          f"memori={info['memori_MB']} MB" + (f", task={info.get('task')}" if target else ""))
    for w in warn:
        print("  ! " + w)

    if out:
        out = Path(out)
        if not out.is_absolute():
            out = output_dir() / out
        parts = [f"<h1>Laporan EDA</h1><p>{info['baris']} baris × {info['kolom']} kolom · "
                 f"duplikat {info['duplikat']} · memori {info['memori_MB']} MB"
                 + (f" · task <b>{info.get('task')}</b> (target <code>{html.escape(target)}</code>)"
                    if target else "") + "</p>"]
        if warn:
            parts.append("<h2>Peringatan</h2><ul>" + "".join(f"<li>{html.escape(w)}</li>" for w in warn) + "</ul>")
        if target_info is not None:
            parts.append("<h2>Distribusi target</h2>" + target_info.to_html())
        if corr is not None:
            parts.append("<h2>Korelasi fitur numerik dengan target</h2>" + _bars(corr.iloc[:, 0]))
        miss = summ["kosong_%"][summ["kosong_%"] > 0].sort_values(ascending=False)
        if len(miss):
            parts.append("<h2>Nilai kosong (%)</h2>" + _bars(miss, maxv=100))
        parts.append("<h2>Ringkasan kolom</h2>" + summ.to_html(na_rep=""))
        parts.append("<h2>5 baris pertama</h2>" + df.head().to_html())
        out.write_text(_page("Laporan EDA", "".join(parts)), encoding="utf-8")
        print(f"[EDA] laporan ditulis ke {out}")
    return {"info": info, "summary": summ, "target": target_info, "corr": corr}


def _bars(s: pd.Series, maxv=None) -> str:
    maxv = maxv or (s.max() if len(s) and s.max() > 0 else 1)
    rows = "".join(
        f"<tr><td>{html.escape(str(k))}</td><td style='width:60%'><div class='bar' "
        f"style='width:{max(v / maxv * 100, 0.5):.1f}%'></div></td><td>{v:.4g}</td></tr>"
        for k, v in s.items())
    return f"<table class='bars'>{rows}</table>"


def _page(title, body) -> str:
    return f"""<!doctype html><html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><style>
body{{font-family:system-ui,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1rem;color:#1f2328}}
h1{{margin-bottom:.2rem}} h2{{margin-top:2rem;border-bottom:1px solid #ddd;padding-bottom:.3rem}}
table{{border-collapse:collapse;font-size:.85rem;overflow-x:auto;display:block}}
th,td{{border:1px solid #e1e4e8;padding:.3rem .55rem;text-align:left}} th{{background:#f6f8fa}}
table.bars{{display:table;width:100%}} .bar{{height:.8rem;background:#2f6fde;border-radius:2px}}
code{{background:#f6f8fa;padding:0 .3rem}}</style></head><body>{body}</body></html>"""

# --------------------------------------------------------------------------- fitur

def add_features(df: pd.DataFrame, date_cols=None) -> pd.DataFrame:
    """Feature engineering otomatis: pecah kolom tanggal, hitung jumlah nilai kosong per baris."""
    df = df.copy()
    if date_cols is None:
        date_cols = []
        for c in df.select_dtypes(include=["object", "string"]).columns:
            sample = df[c].dropna().astype(str).head(200)
            if len(sample) and sample.str.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}").mean() > 0.9:
                date_cols.append(c)
        date_cols += list(df.select_dtypes(include=["datetime", "datetimetz"]).columns)
    for c in dict.fromkeys(date_cols):
        d = pd.to_datetime(df[c], errors="coerce")
        df[f"{c}_tahun"] = d.dt.year
        df[f"{c}_bulan"] = d.dt.month
        df[f"{c}_hari"] = d.dt.day
        df[f"{c}_hari_minggu"] = d.dt.dayofweek
        df[f"{c}_jam"] = d.dt.hour
        df = df.drop(columns=c)
    df["n_kosong"] = df.isna().sum(axis=1)
    return df


def build_preprocessor(X: pd.DataFrame, max_onehot: int = 15, scale: bool = True) -> ColumnTransformer:
    """Imputasi + scaling untuk numerik; one-hot (kardinalitas kecil) / ordinal (besar) untuk kategori."""
    num = list(X.select_dtypes(include=["number", "bool"]).columns)
    cat = [c for c in X.columns if c not in num]
    low = [c for c in cat if X[c].nunique() <= max_onehot]
    high = [c for c in cat if c not in low]
    num_steps = [("imp", SimpleImputer(strategy="median"))]
    if scale:
        num_steps.append(("sc", StandardScaler()))
    tr = [("num", Pipeline(num_steps), num)]
    if low:
        tr.append(("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")),
                                    ("oh", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), low))
    if high:
        tr.append(("ord", Pipeline([("imp", SimpleImputer(strategy="constant", fill_value="NA")),
                                    ("oe", OrdinalEncoder(handle_unknown="use_encoded_value",
                                                          unknown_value=-1))]), high))
    return ColumnTransformer(tr, remainder="drop", verbose_feature_names_out=False)

# --------------------------------------------------------------------------- model

def available_models(task: str, seed: int = 42, n_jobs: int = -1) -> dict:
    """Model kandidat. LightGBM / XGBoost / CatBoost dipakai bila terpasang (sudah ada di Kaggle)."""
    clf = task != "regression"
    m = {}
    if clf:
        m["logreg"] = LogisticRegression(max_iter=2000, C=1.0)
        m["random_forest"] = RandomForestClassifier(n_estimators=400, min_samples_leaf=2, n_jobs=n_jobs, random_state=seed)
        m["extra_trees"] = ExtraTreesClassifier(n_estimators=400, min_samples_leaf=2, n_jobs=n_jobs, random_state=seed)
        m["hist_gb"] = HistGradientBoostingClassifier(max_iter=400, learning_rate=0.05, random_state=seed)
    else:
        m["ridge"] = Ridge(alpha=1.0)
        m["random_forest"] = RandomForestRegressor(n_estimators=400, min_samples_leaf=2, n_jobs=n_jobs, random_state=seed)
        m["extra_trees"] = ExtraTreesRegressor(n_estimators=400, min_samples_leaf=2, n_jobs=n_jobs, random_state=seed)
        m["hist_gb"] = HistGradientBoostingRegressor(max_iter=400, learning_rate=0.05, random_state=seed)
    try:
        import lightgbm as lgb
        kw = dict(n_estimators=600, learning_rate=0.03, num_leaves=31, subsample=0.8, subsample_freq=1,
                  colsample_bytree=0.8, random_state=seed, n_jobs=n_jobs, verbose=-1)
        m["lightgbm"] = lgb.LGBMClassifier(**kw) if clf else lgb.LGBMRegressor(**kw)
    except ImportError:
        pass
    try:
        import xgboost as xgb
        kw = dict(n_estimators=600, learning_rate=0.03, max_depth=6, subsample=0.8,
                  colsample_bytree=0.8, random_state=seed, n_jobs=n_jobs, tree_method="hist")
        m["xgboost"] = xgb.XGBClassifier(**kw) if clf else xgb.XGBRegressor(**kw)
    except ImportError:
        pass
    try:
        import catboost as cb
        kw = dict(iterations=800, learning_rate=0.05, depth=6, random_seed=seed, verbose=0)
        m["catboost"] = cb.CatBoostClassifier(**kw) if clf else cb.CatBoostRegressor(**kw)
    except ImportError:
        pass
    return m


# --------------------------------------------------------------------------- tuning

# ruang pencarian hyperparameter: nama -> ("int"|"float", rendah, tinggi, log) atau ("pilih", [opsi])
SEARCH_SPACES = {
    "lightgbm": {
        "n_estimators": ("int", 200, 2000, True), "learning_rate": ("float", 0.005, 0.2, True),
        "num_leaves": ("int", 8, 256, True), "min_child_samples": ("int", 5, 100, True),
        "subsample": ("float", 0.5, 1.0, False), "colsample_bytree": ("float", 0.3, 1.0, False),
        "reg_alpha": ("float", 1e-8, 10.0, True), "reg_lambda": ("float", 1e-8, 10.0, True),
    },
    "xgboost": {
        "n_estimators": ("int", 200, 2000, True), "learning_rate": ("float", 0.005, 0.2, True),
        "max_depth": ("int", 3, 10, False), "min_child_weight": ("float", 1.0, 20.0, True),
        "subsample": ("float", 0.5, 1.0, False), "colsample_bytree": ("float", 0.3, 1.0, False),
        "reg_alpha": ("float", 1e-8, 10.0, True), "reg_lambda": ("float", 1e-8, 10.0, True),
    },
    "catboost": {
        "iterations": ("int", 300, 2000, True), "learning_rate": ("float", 0.01, 0.2, True),
        "depth": ("int", 4, 10, False), "l2_leaf_reg": ("float", 1.0, 10.0, True),
    },
    "hist_gb": {
        "max_iter": ("int", 100, 1000, True), "learning_rate": ("float", 0.01, 0.3, True),
        "max_leaf_nodes": ("int", 15, 127, True), "min_samples_leaf": ("int", 5, 100, True),
        "l2_regularization": ("float", 1e-8, 10.0, True),
    },
    "random_forest": {
        "n_estimators": ("int", 200, 800, False), "max_depth": ("pilih", [None, 6, 10, 16, 24]),
        "min_samples_leaf": ("int", 1, 10, False), "max_features": ("pilih", ["sqrt", "log2", 0.5, 1.0]),
    },
    "logreg": {"C": ("float", 1e-3, 100.0, True)},
    "ridge": {"alpha": ("float", 1e-3, 100.0, True)},
}
SEARCH_SPACES["extra_trees"] = SEARCH_SPACES["random_forest"]


def _in_space(spec, v) -> bool:
    if spec[0] == "pilih":
        return v in spec[1]
    return isinstance(v, (int, float)) and not isinstance(v, bool) and spec[1] <= v <= spec[2]


def _sample_params(space: dict, trial=None, rng=None) -> dict:
    """Ambil satu set hyperparameter: lewat Optuna (trial) atau acak biasa (rng)."""
    out = {}
    for k, spec in space.items():
        kind = spec[0]
        if kind == "pilih":
            out[k] = (trial.suggest_categorical(k, spec[1]) if trial is not None
                      else spec[1][rng.integers(len(spec[1]))])
            continue
        lo, hi, log = spec[1], spec[2], spec[3]
        if trial is not None:
            fn = trial.suggest_int if kind == "int" else trial.suggest_float
            out[k] = fn(k, lo, hi, log=log)
        else:
            v = np.exp(rng.uniform(np.log(lo), np.log(hi))) if log else rng.uniform(lo, hi)
            out[k] = int(round(v)) if kind == "int" else float(v)
    return out


# nama metrik -> (fungsi(y, pred, proba), lebih_besar_lebih_baik, butuh_proba)
METRICS = {
    "accuracy": (lambda y, p, pr: accuracy_score(y, p), True),
    "f1": (lambda y, p, pr: f1_score(y, p, average="binary" if len(np.unique(y)) == 2 else "macro"), True),
    "roc_auc": (lambda y, p, pr: roc_auc_score(y, pr[:, 1]) if pr.shape[1] == 2
                else roc_auc_score(y, pr, multi_class="ovr"), True),
    "logloss": (lambda y, p, pr: log_loss(y, pr, labels=np.arange(pr.shape[1])), False),
    "rmse": (lambda y, p, pr: float(np.sqrt(mean_squared_error(y, p))), False),
    "mae": (lambda y, p, pr: mean_absolute_error(y, p), False),
    "r2": (lambda y, p, pr: r2_score(y, p), True),
    "rmsle": (lambda y, p, pr: float(np.sqrt(mean_squared_error(np.log1p(y), np.log1p(np.clip(p, 0, None))))), False),
}
DEFAULT_METRIC = {"binary": "roc_auc", "multiclass": "accuracy", "regression": "rmse"}
LINEAR = {"logreg", "ridge"}


class AutoML:
    """Latih banyak model dengan K-Fold CV, buat leaderboard, lalu ensemble model terbaik.

    Parameter penting:
        target   : nama kolom target
        id_col   : kolom ID (dibuang dari fitur, dipakai di submission)
        metric   : accuracy, f1, roc_auc, logloss, rmse, mae, r2, rmsle (default sesuai task)
        models   : daftar nama model (lihat available_models); None = semua
        folds    : jumlah fold CV
        top_k    : jumlah model terbaik yang dirata-rata untuk ensemble
        log_target : latih regresi pada log1p(y) (bagus untuk harga/penjualan)
        tune     : hyperparameter tuning. None = tidak; "auto" = tuning model terbaik;
                   "lightgbm" atau ["lightgbm", "xgboost"] = model tertentu.
                   Hasilnya ditambahkan ke leaderboard sebagai "<model>_tuned".
        n_trials : jumlah percobaan kombinasi hyperparameter per model
        tune_timeout : batas waktu tuning per model (detik), None = tanpa batas
    """

    def __init__(self, target, id_col=None, metric=None, models=None, folds=5, top_k=3,
                 drop=None, seed=42, log_target=False, feature_engineering=True, verbose=True,
                 tune=None, n_trials=30, tune_timeout=None):
        self.target, self.id_col, self.metric = target, id_col, metric
        self.model_names, self.folds, self.top_k = models, folds, top_k
        self.drop, self.seed, self.log_target = list(drop or []), seed, log_target
        self.fe, self.verbose = feature_engineering, verbose
        self.tune, self.n_trials, self.tune_timeout = tune, n_trials, tune_timeout

    # ---- helper
    def _log(self, *a):
        if self.verbose:
            print(*a, flush=True)

    def _prepare(self, df: pd.DataFrame) -> pd.DataFrame:
        X = df.drop(columns=[c for c in [self.target, self.id_col, *self.drop] if c and c in df.columns])
        if self.fe:
            X = add_features(X, self.date_cols_)
        return X.reindex(columns=self.columns_) if hasattr(self, "columns_") else X

    def _score(self, y, pred, proba):
        fn, _ = METRICS[self.metric]
        return float(fn(y, pred, proba))

    def _better(self, a, b):
        return a > b if METRICS[self.metric][1] else a < b

    def _cv(self, name, estimator, X, y, y_fit, splits, on_fold=None):
        """Cross-validation satu model. on_fold(i, skor) bisa melempar exception untuk berhenti (pruning)."""
        clf = self.task_ != "regression"
        base = name.removesuffix("_tuned")
        pipe = Pipeline([("prep", build_preprocessor(X, scale=base in LINEAR)), ("model", estimator)])
        oof = np.zeros((len(X), self.n_classes_)) if clf else np.zeros(len(X))
        fold_scores, fold_models = [], []
        for i, (tr, va) in enumerate(splits):
            m = clone(pipe).fit(X.iloc[tr], y_fit[tr])
            if clf:
                oof[va] = m.predict_proba(X.iloc[va])
                fold_scores.append(self._score(y[va], oof[va].argmax(1), oof[va]))
            else:
                p = m.predict(X.iloc[va])
                oof[va] = np.expm1(p) if self.log_target else p
                fold_scores.append(self._score(y[va], oof[va], None))
            fold_models.append(m)
            if on_fold is not None:
                on_fold(i, float(np.mean(fold_scores)))
        score = self._score(y, oof.argmax(1), oof) if clf else self._score(y, oof, None)
        return score, fold_scores, oof, fold_models

    def _tune_one(self, name, base_est, X, y, y_fit, splits):
        """Cari hyperparameter terbaik untuk satu model. Optuna bila ada, random search bila tidak."""
        space = SEARCH_SPACES.get(name)
        if not space:
            self._log(f"  [tuning] {name}: tidak ada ruang pencarian, dilewati")
            return None
        greater = METRICS[self.metric][1]
        history = []

        def evaluate(params, on_fold=None):
            est = clone(base_est).set_params(**params)
            score = self._cv(name, est, X, y, y_fit, splits, on_fold)[0]
            history.append({"model": name, self.metric: score, **params})
            return score

        t0, engine = time.time(), None
        try:
            import optuna
            optuna.logging.set_verbosity(optuna.logging.WARNING)
            study = optuna.create_study(direction="maximize" if greater else "minimize",
                                        sampler=optuna.samplers.TPESampler(seed=self.seed),
                                        pruner=optuna.pruners.MedianPruner(n_startup_trials=5))

            def objective(trial):
                def on_fold(i, mean_score):  # hentikan percobaan yang jelas jelek lebih awal
                    trial.report(mean_score, i)
                    if trial.should_prune():
                        raise optuna.TrialPruned()
                return evaluate(_sample_params(space, trial=trial), on_fold)

            def progress(study, trial):
                done = [t for t in study.trials if t.state == optuna.trial.TrialState.COMPLETE]
                if done and (trial.number % 5 == 4 or trial.number == 0):
                    self._log(f"  [tuning] {name}: percobaan {trial.number + 1}/{self.n_trials} "
                              f"terbaik={study.best_value:.5f}")

            # percobaan pertama = setelan bawaan, supaya hasil tuning minimal sama bagusnya
            start = {k: v for k, v in base_est.get_params().items() if k in space and _in_space(space[k], v)}
            if start:
                study.enqueue_trial(start, skip_if_exists=True)
            study.optimize(objective, n_trials=self.n_trials, timeout=self.tune_timeout,
                           callbacks=[progress], catch=(ValueError, ArithmeticError))
            if not any(t.state == optuna.trial.TrialState.COMPLETE for t in study.trials):
                self._log(f"  [tuning] {name}: semua percobaan gagal")
                return None
            n_pruned = sum(t.state == optuna.trial.TrialState.PRUNED for t in study.trials)
            best_params, best_score = study.best_params, study.best_value
            engine = f"optuna, {len(study.trials)} percobaan, {n_pruned} dihentikan dini"
        except ImportError:  # tanpa optuna: random search
            rng = np.random.default_rng(self.seed)
            best_params, best_score = None, None
            for i in range(self.n_trials):
                if self.tune_timeout and time.time() - t0 > self.tune_timeout:
                    break
                params = _sample_params(space, rng=rng)
                try:
                    sc = evaluate(params)
                except (ValueError, ArithmeticError):
                    continue
                if best_score is None or (sc > best_score if greater else sc < best_score):
                    best_params, best_score = params, sc
                if i % 5 == 4:
                    self._log(f"  [tuning] {name}: percobaan {i + 1}/{self.n_trials} terbaik={best_score:.5f}")
        self.tuning_history_ = pd.concat([getattr(self, "tuning_history_", pd.DataFrame()),
                                          pd.DataFrame(history)], ignore_index=True)
        if best_params is None:
            return None
        if engine is None:
            engine = f"random search, {len(history)} percobaan"
        self._log(f"  [tuning] {name}: selesai ({engine}, "
                  f"{time.time() - t0:.0f}s) terbaik {self.metric}={best_score:.5f} params={best_params}")
        return best_params

    # ---- latih
    def fit(self, df: pd.DataFrame):
        t0 = time.time()
        df = df[df[self.target].notna()].reset_index(drop=True)
        self.task_ = detect_task(df[self.target])
        self.metric = self.metric or DEFAULT_METRIC[self.task_]
        if self.metric not in METRICS:
            raise ValueError(f"Metrik '{self.metric}' tidak dikenal. Pilihan: {list(METRICS)}")
        clf = self.task_ != "regression"
        if clf and self.metric in ("rmse", "mae", "r2", "rmsle"):
            raise ValueError(f"Metrik {self.metric} untuk regresi, padahal task={self.task_}")
        if not clf and self.metric in ("accuracy", "f1", "roc_auc", "logloss"):
            raise ValueError(f"Metrik {self.metric} untuk klasifikasi, padahal task={self.task_}")

        # kolom tanggal dideteksi sekali di data latih supaya test diperlakukan sama
        raw = df.drop(columns=[c for c in [self.target, self.id_col, *self.drop] if c and c in df.columns])
        self.__dict__.pop("columns_", None)  # fit ulang: jangan pakai kolom lama
        self.date_cols_ = None
        if self.fe:
            before = set(raw.columns)
            after = set(add_features(raw.head(500)).columns)
            self.date_cols_ = sorted(before - after)
        X = self._prepare(df)
        self.columns_ = list(X.columns)

        y_raw = df[self.target]
        if clf:
            self.label_encoder_ = LabelEncoder().fit(y_raw.astype(str) if y_raw.dtype == object else y_raw)
            y = self.label_encoder_.transform(y_raw.astype(str) if y_raw.dtype == object else y_raw)
            self.n_classes_ = len(self.label_encoder_.classes_)
            cv = StratifiedKFold(self.folds, shuffle=True, random_state=self.seed)
        else:
            y = y_raw.to_numpy(dtype=float)
            cv = KFold(self.folds, shuffle=True, random_state=self.seed)
        y_fit = np.log1p(y) if (self.log_target and not clf) else y
        splits = list(cv.split(X, y))

        candidates = available_models(self.task_, self.seed)
        names = self.model_names or list(candidates)
        unknown = [n for n in names if n not in candidates]
        if unknown:
            raise ValueError(f"Model tidak tersedia: {unknown}. Tersedia: {list(candidates)}")

        self._log(f"[AutoML] task={self.task_} metric={self.metric} folds={self.folds} "
                  f"fitur={X.shape[1]} baris={len(X)} model={names}")
        self.results_, self.oof_ = [], {}
        self.fitted_ = {}
        def run(name, est):
            t = time.time()
            try:
                score, fold_scores, oof, fold_models = self._cv(name, est, X, y, y_fit, splits)
            except Exception as e:  # satu model gagal tidak menghentikan semuanya
                self._log(f"  - {name:14s} GAGAL: {type(e).__name__}: {e}")
                return
            self.oof_[name], self.fitted_[name] = oof, fold_models
            self.results_.append({"model": name, self.metric: round(score, 5),
                                  "std_fold": round(float(np.std(fold_scores)), 5),
                                  "detik": round(time.time() - t, 1)})
            self._log(f"  - {name:14s} {self.metric}={score:.5f} ± {np.std(fold_scores):.5f} "
                      f"({time.time() - t:.1f}s)")

        for name in names:
            run(name, candidates[name])

        # ---- hyperparameter tuning
        self.best_params_ = {}
        if self.tune and self.results_:
            greater = METRICS[self.metric][1]
            done = sorted(self.results_, key=lambda r: r[self.metric], reverse=greater)
            if self.tune in ("auto", True):
                to_tune = [next((r["model"] for r in done if r["model"] in SEARCH_SPACES), done[0]["model"])]
            else:
                to_tune = [self.tune] if isinstance(self.tune, str) else list(self.tune)
            bad = [n for n in to_tune if n not in candidates]
            if bad:
                raise ValueError(f"Model untuk tuning tidak tersedia: {bad}. Tersedia: {list(candidates)}")
            self._log(f"[AutoML] tuning {to_tune} — {self.n_trials} percobaan per model"
                      + (f", maks {self.tune_timeout}s" if self.tune_timeout else ""))
            for name in to_tune:
                params = self._tune_one(name, candidates[name], X, y, y_fit, splits)
                if params is not None:
                    self.best_params_[name] = params
                    run(f"{name}_tuned", clone(candidates[name]).set_params(**params))

        if not self.results_:
            raise RuntimeError("Semua model gagal dilatih.")

        lb = pd.DataFrame(self.results_).sort_values(self.metric, ascending=not METRICS[self.metric][1])
        # model asli yang sudah punya versi _tuned tidak ikut ensemble (isinya hampir sama)
        pool = [n for n in lb["model"] if f"{n}_tuned" not in self.fitted_]
        best = pool[:self.top_k]
        ens = np.mean([self.oof_[n] for n in best], axis=0)
        ens_score = self._score(y, ens.argmax(1), ens) if clf else self._score(y, ens, None)
        lb = pd.concat([lb, pd.DataFrame([{"model": f"ensemble({'+'.join(best)})",
                                           self.metric: round(ens_score, 5)}])], ignore_index=True)
        self.leaderboard = lb.sort_values(self.metric, ascending=not METRICS[self.metric][1]).reset_index(drop=True)
        top = self.leaderboard.iloc[0]["model"]
        self.selected_ = best if top.startswith("ensemble") else [top]
        self.y_ = y
        self._log(f"[AutoML] terbaik: {top} -> dipakai untuk prediksi: {self.selected_} "
                  f"(total {time.time() - t0:.1f}s)")
        self._log(self.leaderboard.to_string(index=False))
        return self

    # ---- prediksi (rata-rata model dari semua fold = tanpa perlu latih ulang)
    def predict_proba(self, df: pd.DataFrame, models=None) -> np.ndarray:
        if self.task_ == "regression":
            raise ValueError("predict_proba hanya untuk klasifikasi")
        X = self._prepare(df)
        return np.mean([m.predict_proba(X) for n in (models or self.selected_) for m in self.fitted_[n]], axis=0)

    def predict(self, df: pd.DataFrame, models=None) -> np.ndarray:
        if self.task_ != "regression":
            return self.label_encoder_.inverse_transform(self.predict_proba(df, models).argmax(1))
        X = self._prepare(df)
        preds = [m.predict(X) for n in (models or self.selected_) for m in self.fitted_[n]]
        p = np.mean([np.expm1(q) for q in preds] if self.log_target else preds, axis=0)
        return p

    # ---- interpretasi
    def feature_importance(self, model=None, top: int = 30) -> pd.Series:
        """Importance dari model pohon (rata-rata fold). Default: model pohon terbaik."""
        tree_models = [n for n in self.leaderboard["model"]
                       if n in self.fitted_ and n.removesuffix("_tuned") not in LINEAR]
        model = model or (tree_models[0] if tree_models else None)
        if model is None:
            return pd.Series(dtype=float)
        imps = []
        for pipe in self.fitted_[model]:
            est = pipe.named_steps["model"]
            names = pipe.named_steps["prep"].get_feature_names_out()
            vals = getattr(est, "feature_importances_", None)
            if vals is None:
                return pd.Series(dtype=float)
            imps.append(pd.Series(vals, index=names))
        s = pd.concat(imps, axis=1).mean(axis=1)
        return (s / s.sum()).sort_values(ascending=False).head(top).rename(f"importance ({model})")

    def report(self, out="laporan_model.html") -> Path:
        out = Path(out)
        if not out.is_absolute():
            out = output_dir() / out
        fi = self.feature_importance()
        body = (f"<h1>Laporan Model</h1><p>task <b>{self.task_}</b> · metrik <b>{self.metric}</b> · "
                f"{self.folds}-fold CV · dipakai: <code>{', '.join(self.selected_)}</code></p>"
                f"<h2>Leaderboard</h2>{self.leaderboard.to_html(index=False, na_rep='')}")
        for name, params in getattr(self, "best_params_", {}).items():
            body += (f"<h2>Hyperparameter terbaik: {html.escape(name)}</h2>"
                     + pd.Series(params, name="nilai").to_frame().to_html())
        if len(fi):
            body += f"<h2>Feature importance</h2>{_bars(fi)}"
        out.write_text(_page("Laporan Model", body), encoding="utf-8")
        self._log(f"[AutoML] laporan ditulis ke {out}")
        return out

    # ---- simpan / muat
    def save(self, path="model_dstools.joblib") -> Path:
        import joblib
        path = Path(path)
        if not path.is_absolute():
            path = output_dir() / path
        joblib.dump(self, path, compress=3)
        self._log(f"[AutoML] model disimpan ke {path}")
        return path

    @staticmethod
    def load(path) -> "AutoML":
        import joblib
        return joblib.load(path)


def save_submission(auto: AutoML, test: pd.DataFrame, sample: pd.DataFrame | None = None,
                    out="submission.csv", proba: bool | None = None) -> pd.DataFrame:
    """Buat submission.csv. Mengikuti format sample_submission bila ada.

    proba=None -> otomatis: ikuti isi sample_submission (pecahan = probabilitas, 0/1 atau teks = label);
                 tanpa sample: probabilitas bila metrik roc_auc/logloss, label bila bukan.
    """
    id_col = auto.id_col
    if sample is not None:
        id_col = id_col or sample.columns[0]
        pred_cols = [c for c in sample.columns if c != id_col]
    else:
        pred_cols = [auto.target]
    if proba is None:
        if sample is not None and len(pred_cols) == 1:
            # ikuti contoh: angka pecahan (0.5) = probabilitas; 0/1, True/False, teks = label
            col = sample[pred_cols[0]]
            proba = bool(pd.api.types.is_float_dtype(col) and not np.allclose(col.fillna(0) % 1, 0))
        else:
            proba = auto.metric in ("roc_auc", "logloss")
    ids = test[id_col].values if id_col and id_col in test else np.arange(len(test))
    sub = pd.DataFrame({id_col or "id": ids})
    if auto.task_ == "regression":
        sub[pred_cols[0]] = auto.predict(test)
    elif proba:
        pr = auto.predict_proba(test)
        classes = list(map(str, auto.label_encoder_.classes_))
        if len(pred_cols) > 1:  # satu kolom per kelas (mis. multiclass logloss)
            for c in pred_cols:
                sub[c] = pr[:, classes.index(str(c))] if str(c) in classes else 0.0
        else:
            sub[pred_cols[0]] = pr[:, 1] if pr.shape[1] == 2 else pr.argmax(1)
    else:
        sub[pred_cols[0]] = auto.predict(test)
        if sample is not None and pd.api.types.is_bool_dtype(sample[pred_cols[0]]):
            sub[pred_cols[0]] = sub[pred_cols[0]].astype(bool)
    out = Path(out)
    if not out.is_absolute():
        out = output_dir() / out
    sub.to_csv(out, index=False)
    print(f"[dstools] submission {sub.shape} ditulis ke {out}")
    return sub

# --------------------------------------------------------------------------- data contoh

def demo_data(n=3000, seed=0, task="binary"):
    """Data sintetis (ada kategori, tanggal, nilai kosong) untuk mencoba toolkit tanpa download."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({
        "id": np.arange(n),
        "umur": rng.integers(18, 70, n).astype(float),
        "pendapatan": rng.lognormal(15, 0.6, n).round(-3),
        "kota": rng.choice(["Jakarta", "Bandung", "Surabaya", "Medan", "Makassar"], n, p=[.35, .2, .2, .15, .1]),
        "pekerjaan": rng.choice(["karyawan", "wiraswasta", "pelajar", "pns", "lainnya"], n),
        "lama_member_bulan": rng.integers(0, 120, n),
        "tanggal_daftar": pd.to_datetime("2020-01-01") + pd.to_timedelta(rng.integers(0, 1800, n), "D"),
        "skor_kredit": rng.normal(650, 80, n).round(),
    })
    df["tanggal_daftar"] = df["tanggal_daftar"].dt.strftime("%Y-%m-%d")
    logit = (0.04 * (df.umur - 40) + 0.8 * np.log(df.pendapatan / 3e6) + 0.01 * (df.skor_kredit - 650)
             + df.kota.map({"Jakarta": .5, "Bandung": .2, "Surabaya": .1, "Medan": -.2, "Makassar": -.3})
             + df.pekerjaan.map({"pns": .6, "karyawan": .3, "wiraswasta": 0, "pelajar": -.8, "lainnya": -.2})
             + rng.normal(0, 1, n))
    if task == "regression":
        df["belanja"] = (np.exp(12 + 0.3 * logit) + rng.normal(0, 2e4, n)).clip(1e4).round(-2)
    else:
        df["beli"] = (logit > np.quantile(logit, 0.6)).astype(int)
    for c in ["umur", "pendapatan", "pekerjaan", "skor_kredit"]:
        df.loc[rng.random(n) < 0.08, c] = np.nan
    return df

# --------------------------------------------------------------------------- CLI

def main(argv=None):
    ap = argparse.ArgumentParser(prog="dstools", description="Toolkit data science (lokal & Kaggle)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("demo", help="buat data contoh lalu jalankan EDA + AutoML")
    d.add_argument("--task", choices=["binary", "regression"], default="binary")
    d.add_argument("--tune", action="store_true", help="sertakan hyperparameter tuning (model terbaik)")

    e = sub.add_parser("eda", help="laporan EDA HTML")
    e.add_argument("--train")
    e.add_argument("--target")
    e.add_argument("--out", default="laporan_eda.html")

    t = sub.add_parser("train", help="latih AutoML dan buat submission")
    t.add_argument("--train", help="CSV/parquet latih (kosong = cari otomatis di /kaggle/input)")
    t.add_argument("--test")
    t.add_argument("--sample", help="sample_submission.csv")
    t.add_argument("--target", required=True)
    t.add_argument("--id")
    t.add_argument("--metric", choices=list(METRICS))
    t.add_argument("--models", help="dipisah koma, mis. lightgbm,catboost,logreg")
    t.add_argument("--folds", type=int, default=5)
    t.add_argument("--top-k", type=int, default=3)
    t.add_argument("--drop", help="kolom yang dibuang, dipisah koma")
    t.add_argument("--log-target", action="store_true")
    t.add_argument("--proba", choices=["auto", "yes", "no"], default="auto")
    t.add_argument("--seed", type=int, default=42)
    t.add_argument("--tune", help="hyperparameter tuning: auto, atau nama model dipisah koma (lightgbm,xgboost)")
    t.add_argument("--trials", type=int, default=30, help="jumlah percobaan tuning per model")
    t.add_argument("--tune-timeout", type=float, help="batas waktu tuning per model (detik)")
    a = ap.parse_args(argv)

    if a.cmd == "demo":
        df = demo_data(task=a.task)
        target = "belanja" if a.task == "regression" else "beli"
        train, test = df.iloc[:2400], df.iloc[2400:].drop(columns=target)
        eda(train, target=target)
        auto = AutoML(target=target, id_col="id", folds=3, log_target=a.task == "regression",
                      tune="auto" if a.tune else None, n_trials=15).fit(train)
        print(auto.feature_importance(top=10).to_string())
        auto.report()
        save_submission(auto, test)
        return
    if a.cmd == "eda":
        df, _, _ = load(a.train)
        eda(df, target=a.target, out=a.out)
        return
    train, test, sample = load(a.train, a.test, a.sample)
    auto = AutoML(target=a.target, id_col=a.id, metric=a.metric,
                  models=a.models.split(",") if a.models else None, folds=a.folds, top_k=a.top_k,
                  drop=a.drop.split(",") if a.drop else None, seed=a.seed, log_target=a.log_target,
                  tune=(a.tune if a.tune in (None, "auto") else a.tune.split(",")), n_trials=a.trials,
                  tune_timeout=a.tune_timeout).fit(train)
    auto.report()
    auto.save()
    if test is not None:
        save_submission(auto, test, sample, proba=None if a.proba == "auto" else a.proba == "yes")
    (output_dir() / "leaderboard.json").write_text(auto.leaderboard.to_json(orient="records", indent=1))


if __name__ == "__main__":
    main()
