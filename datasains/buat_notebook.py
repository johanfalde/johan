"""Buat kaggle_notebook.ipynb yang membawa isi dstools.py (tanpa perlu internet di Kaggle).

Jalankan ulang setiap kali dstools.py diubah:  python buat_notebook.py
"""
import json
from pathlib import Path

here = Path(__file__).parent
src = (here / "dstools.py").read_text(encoding="utf-8")


_n = iter(range(1000))


def md(text):
    return {"cell_type": "markdown", "id": f"c{next(_n)}", "metadata": {}, "source": text.strip().splitlines(keepends=True)}


def code(text):
    return {"cell_type": "code", "id": f"c{next(_n)}", "metadata": {}, "execution_count": None, "outputs": [],
            "source": text.strip().splitlines(keepends=True)}


cells = [
    md("""
# dstools di Kaggle — EDA → AutoML → submission

1. **Add Input** → pilih kompetisi/dataset (mis. *Titanic*).
2. Ubah `TARGET`, `ID_COL`, `METRIC` di sel konfigurasi.
3. **Run All**, lalu **Submit** (file `submission.csv` ada di `/kaggle/working`).

GPU tidak wajib. Internet tidak wajib (kode dstools sudah ada di sel berikut).
"""),
    code("%%writefile dstools.py\n" + src),
    code("""
import importlib, pandas as pd
import dstools as ds
importlib.reload(ds)
pd.set_option("display.max_columns", 100)

# ====== KONFIGURASI ======
TARGET = "Survived"        # kolom yang ditebak
ID_COL = "PassengerId"     # kolom ID untuk submission (None jika tidak ada)
METRIC = "accuracy"        # metrik kompetisi (Titanic: accuracy). None = otomatis; atau accuracy, roc_auc, logloss, f1, rmse, mae, r2, rmsle
MODELS = None              # None = semua; mis. ["lightgbm", "catboost", "xgboost"]
FOLDS = 5
DROP = ["Name", "Ticket"]  # kolom yang dibuang (teks unik per baris biasanya cuma noise)
LOG_TARGET = False         # True untuk regresi harga/penjualan

# Hyperparameter tuning (Optuna sudah terpasang di Kaggle)
TUNE = None                # None = tidak; "auto" = model terbaik; atau ["lightgbm", "catboost"]
N_TRIALS = 50              # jumlah percobaan per model
TUNE_TIMEOUT = 600         # batas waktu per model (detik); None = tanpa batas
"""),
    code("""
train, test, sample = ds.load()     # cari otomatis train/test/sample_submission di /kaggle/input
print(train.shape, None if test is None else test.shape)
train.head()
"""),
    md("## EDA"),
    code("""
res = ds.eda(train, target=TARGET, out="laporan_eda.html")
res["summary"]
"""),
    code("""
import matplotlib.pyplot as plt
if res["corr"] is not None:
    res["corr"].iloc[::-1].plot.barh(figsize=(7, 5), legend=False, title="|korelasi| dengan target"); plt.show()
train[TARGET].hist(bins=30, figsize=(6, 3)); plt.title(TARGET); plt.show()
"""),
    md("## Latih banyak model + cross-validation"),
    code("""
auto = ds.AutoML(target=TARGET, id_col=ID_COL, metric=METRIC, models=MODELS, folds=FOLDS,
                 drop=DROP, log_target=LOG_TARGET,
                 tune=TUNE, n_trials=N_TRIALS, tune_timeout=TUNE_TIMEOUT).fit(train)
auto.leaderboard
"""),
    code("""
fi = auto.feature_importance(top=25)
if len(fi):
    fi.iloc[::-1].plot.barh(figsize=(7, 7), title=fi.name); plt.show()
"""),
    code("""
# hasil tuning (kosong bila TUNE = None)
for name, params in auto.best_params_.items():
    print(name, params)
if hasattr(auto, "tuning_history_"):
    h = auto.tuning_history_
    for name, g in h.groupby("model"):
        g[auto.metric].reset_index(drop=True).plot(marker="o", label=name)
    plt.title(f"Skor tiap percobaan tuning ({auto.metric})"); plt.xlabel("percobaan"); plt.legend(); plt.show()
"""),
    md("## Submission"),
    code("""
sub = ds.save_submission(auto, test, sample)   # -> /kaggle/working/submission.csv
auto.report("laporan_model.html")
auto.save("model_dstools.joblib")
sub.head()
"""),
]

nb = {"cells": cells, "nbformat": 4, "nbformat_minor": 5,
      "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                   "language_info": {"name": "python"}}}
(here / "kaggle_notebook.ipynb").write_text(json.dumps(nb, indent=1, ensure_ascii=False), encoding="utf-8")
print("kaggle_notebook.ipynb dibuat")
