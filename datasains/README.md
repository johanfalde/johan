# dstools — toolkit data science (lokal & Kaggle)

> **Baru belajar data science?** Mulai dari [PANDUAN_PEMULA.md](PANDUAN_PEMULA.md) — dari nol sampai submit ke Kaggle.

Satu toolkit untuk alur data science lengkap, dengan **kode yang sama** di laptop dan di Kaggle Notebook:

| Tahap | Yang dikerjakan |
|---|---|
| Muat data | CSV / TSV / parquet / xlsx; di Kaggle mencari `train`, `test`, `sample_submission` otomatis di `/kaggle/input` |
| EDA | ringkasan kolom, nilai kosong, duplikat, distribusi target, korelasi, peringatan (kolom konstan, target imbalanced, dll.) + laporan HTML |
| Feature engineering | kolom tanggal dipecah (tahun/bulan/hari/hari-minggu/jam), jumlah nilai kosong per baris |
| Preprocessing | imputasi, scaling, one-hot (kategori kecil) / ordinal (kategori besar) — otomatis |
| Model | Logistic/Ridge, Random Forest, Extra Trees, HistGradientBoosting, **LightGBM, XGBoost, CatBoost** (dipakai bila terpasang — di Kaggle sudah ada) |
| Validasi | K-Fold / Stratified K-Fold, prediksi out-of-fold, leaderboard dengan skor ± std per fold |
| Tuning | hyperparameter tuning dengan **Optuna** (TPE + pruning percobaan jelek); tanpa Optuna otomatis random search. Hasil masuk leaderboard sebagai `<model>_tuned` |
| Ensemble | rata-rata top-k model; dipilih otomatis bila lebih baik dari model tunggal |
| Asisten AI | chatbot (Claude) di aplikasi: menjelaskan data & hasil model Anda, membantu kode, Kaggle, LLM — `asisten.py` |
| Panduan | ebook pemula 16 bab di tab **📖 Panduan** aplikasi (`PANDUAN_PEMULA.md`) |
| Hasil | `submission.csv` (format mengikuti `sample_submission`), feature importance, laporan model HTML, model `.joblib` |

Task dideteksi otomatis: **binary**, **multiclass**, atau **regression**.
Metrik: `accuracy`, `f1`, `roc_auc`, `logloss`, `rmse`, `mae`, `r2`, `rmsle`.

## 1. Di Kaggle (latih di Kaggle)

1. Buka kompetisi (mis. *Titanic*) → **Code** → **New Notebook**.
2. **File → Import Notebook** → upload `kaggle_notebook.ipynb` dari folder ini.
   (Notebook sudah membawa seluruh kode `dstools.py`, jadi **tidak perlu internet**.)
3. Pastikan data kompetisi sudah ada di panel **Input**.
4. Ubah sel konfigurasi: `TARGET`, `ID_COL`, `METRIC`, `DROP`.
5. **Run All** → **Submit to Competition**. Hasil di `/kaggle/working`:
   `submission.csv`, `laporan_eda.html`, `laporan_model.html`, `model_dstools.joblib`.

Alternatif: upload `dstools.py` sebagai **Utility Script** (File → Add utility script) lalu `import dstools as ds`.

## 2. Di laptop

```bash
cd datasains
pip install -r requirements.txt

python dstools.py demo                       # coba dengan data contoh
streamlit run app.py                         # aplikasi web: upload → EDA → latih → download + chatbot + panduan
python asisten.py                            # ngobrol dengan asisten AI di terminal
python dstools.py eda   --train train.csv --target Survived
python dstools.py train --train train.csv --test test.csv --sample sample_submission.csv \
                        --target Survived --id PassengerId --metric accuracy --drop Name,Ticket
```

Opsi `train` lain: `--models lightgbm,catboost`, `--folds 10`, `--top-k 2`, `--log-target` (regresi harga),
`--proba yes|no` (paksa isi submission probabilitas/label),
`--tune auto` atau `--tune lightgbm,xgboost` + `--trials 50 --tune-timeout 600` (hyperparameter tuning).

### Asisten AI (chatbot)

Butuh API key dari [platform.claude.com](https://platform.claude.com) (berbayar per pemakaian).
Isi di tab **💬 Asisten AI → ⚙️ Pengaturan**, atau set sekali saja:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."                      # Mac/Linux
setx ANTHROPIC_API_KEY "sk-ant-..."                        # Windows (buka terminal baru setelahnya)
# atau buat datasains/.streamlit/secrets.toml berisi:  ANTHROPIC_API_KEY = "sk-ant-..."
```

Secara bawaan yang dikirim ke API hanya **ringkasan** data (nama kolom, statistik, leaderboard),
bukan isi datanya. Penjelasan lengkap & contoh proyek LLM (klasifikasi ulasan, chatbot dokumen/RAG):
bab 12 panduan.

## 3. Dari Python

```python
import dstools as ds

train, test, sample = ds.load("train.csv", "test.csv", "sample_submission.csv")
ds.eda(train, target="Survived")                 # -> laporan_eda.html
auto = ds.AutoML(target="Survived", id_col="PassengerId", metric="accuracy",
                 drop=["Name", "Ticket"], folds=5).fit(train)
auto.leaderboard                                 # tabel skor semua model

# dengan hyperparameter tuning
auto = ds.AutoML(target="Survived", id_col="PassengerId", metric="accuracy", drop=["Name", "Ticket"],
                 tune=["lightgbm"], n_trials=50, tune_timeout=600).fit(train)
auto.best_params_                                # hyperparameter terbaik
auto.tuning_history_                             # skor setiap percobaan
auto.feature_importance()                        # fitur paling berpengaruh
auto.oof_["lightgbm"]                            # prediksi out-of-fold (untuk stacking)
ds.save_submission(auto, test, sample)           # -> submission.csv
auto.save("model.joblib");  ds.AutoML.load("model.joblib").predict(test)
```

## Batasan (jujur)

- Untuk data **tabel**. Gambar, teks panjang (NLP), audio, dan time series khusus butuh pendekatan lain
  (mis. PyTorch/transformers di Kaggle dengan GPU).
- Tuning memakai ruang pencarian bawaan (`ds.SEARCH_SPACES`, bisa diubah). Kenaikan skor dari tuning
  biasanya kecil dibanding feature engineering yang bagus.
- Feature engineering yang paling menaikkan skor biasanya tetap berasal dari pemahaman data Anda sendiri.

Bila `dstools.py` diubah, jalankan `python buat_notebook.py` agar `kaggle_notebook.ipynb` ikut diperbarui.
