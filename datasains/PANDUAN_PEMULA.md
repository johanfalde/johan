# Panduan Data Science untuk Pemula (dengan dstools & Kaggle)

Panduan ini untuk Anda yang **belum pernah** belajar data science. Tidak perlu jago matematika atau
pemrograman untuk mulai. Ikuti bab demi bab; di akhir Anda sudah mengirim prediksi pertama ke Kaggle.

**Daftar isi**

1. [Apa itu data science?](#1-apa-itu-data-science)
2. [Istilah wajib (bahasa sehari-hari)](#2-istilah-wajib-bahasa-sehari-hari)
3. [Cara kerja dstools](#3-cara-kerja-dstools)
4. [Proyek pertama: Titanic di Kaggle (tanpa install apa pun)](#4-proyek-pertama-titanic-di-kaggle)
5. [Membaca hasil](#5-membaca-hasil)
6. [Menaikkan skor: feature engineering](#6-menaikkan-skor-feature-engineering)
7. [Memakai aplikasi web di laptop](#7-memakai-aplikasi-web-di-laptop)
8. [Untuk pekerjaan: memakai data sendiri](#8-untuk-pekerjaan-memakai-data-sendiri)
9. [Kesalahan umum pemula](#9-kesalahan-umum-pemula)
10. [Rencana belajar 12 minggu](#10-rencana-belajar-12-minggu)
11. [Karier data science](#11-karier-data-science)
12. [Glosarium](#12-glosarium)

---

## 1. Apa itu data science?

Data science adalah **memakai data masa lalu untuk menjawab pertanyaan atau menebak hal yang belum
diketahui**. Contoh:

| Pertanyaan bisnis | Data yang dipakai | Jenis tugas |
|---|---|---|
| Pelanggan mana yang akan berhenti berlangganan? | riwayat pelanggan + siapa yang dulu berhenti | klasifikasi |
| Berapa penjualan bulan depan? | penjualan bulan-bulan sebelumnya | regresi / time series |
| Transaksi mana yang curang? | transaksi lama yang sudah diberi label curang/tidak | klasifikasi |
| Berapa harga wajar rumah ini? | data rumah yang sudah terjual | regresi |

Alur kerja seorang data scientist hampir selalu sama:

```
 1. Pahami masalah   →  "apa yang mau ditebak? untuk keputusan apa?"
 2. Kumpulkan data   →  file CSV, Excel, database (SQL)
 3. EDA              →  kenali data: isinya apa, ada yang kosong/aneh?
 4. Bersihkan data   →  isi yang kosong, buang yang salah
 5. Feature engineering → buat kolom baru yang membantu tebakan
 6. Latih model      →  komputer belajar pola dari data
 7. Evaluasi         →  seberapa bagus tebakannya? (cross-validation)
 8. Sampaikan hasil  →  laporan/presentasi/dipakai di sistem
```

**dstools mengotomatiskan langkah 3–7** supaya Anda bisa fokus ke langkah 1, 5, dan 8
(yang paling butuh otak manusia).

---

## 2. Istilah wajib (bahasa sehari-hari)

Bayangkan tabel Excel data penumpang kapal Titanic:

| PassengerId | Pclass | Sex | Age | Fare | **Survived** |
|---|---|---|---|---|---|
| 1 | 3 | male | 22 | 7.25 | **0** |
| 2 | 1 | female | 38 | 71.28 | **1** |

- **Baris** = satu contoh (satu penumpang). **Kolom** = satu informasi (umur, kelas, ...).
- **Target** = kolom yang ingin ditebak → `Survived` (selamat = 1, tidak = 0).
- **Fitur** = kolom-kolom yang dipakai untuk menebak → `Pclass`, `Sex`, `Age`, `Fare`.
- **ID** = nomor pengenal; bukan fitur (nomor urut tidak menentukan selamat atau tidak).
- **Data latih (train)** = data yang targetnya diketahui → dipakai belajar.
- **Data uji (test)** = data yang targetnya disembunyikan → harus ditebak.
- **Model** = "rumus" yang dibuat komputer dari data latih. Contoh: Random Forest, LightGBM.
- **Klasifikasi** = menebak kategori (ya/tidak, A/B/C). **Regresi** = menebak angka (harga, jumlah).
- **Metrik** = cara memberi nilai pada tebakan. *Accuracy* 0,80 = 80% tebakan benar.
- **Overfitting** = model "menghafal" data latih tapi gagal di data baru. Seperti murid yang hafal
  kunci jawaban latihan tapi tidak paham materinya.
- **Cross-validation (CV)** = cara jujur mengukur model: data latih dibagi misalnya 5 bagian;
  model dilatih di 4 bagian dan diuji di 1 bagian sisanya, diulang 5 kali. Rata-ratanya = **skor CV**.
  Inilah penangkal overfitting.

---

## 3. Cara kerja dstools

Saat Anda menjalankan `ds.AutoML(...).fit(train)`, ini yang terjadi di dalamnya:

```
train.csv
   │
   ▼
[1] Deteksi tugas ─── target cuma 2 nilai? → binary | sedikit kategori? → multiclass | angka? → regression
   │
   ▼
[2] Siapkan fitur ── buang kolom target, ID, dan kolom di DROP
   │                 kolom tanggal "2023-05-17" → tahun, bulan, hari, hari-minggu
   │                 tambah kolom n_kosong (berapa nilai kosong di baris itu)
   ▼
[3] Preprocessing ── angka kosong → diisi median        teks/kategori kosong → diisi yang paling sering
   │                 kategori sedikit (≤15 jenis) → one-hot (male→[1,0], female→[0,1])
   │                 kategori banyak → diberi nomor
   ▼
[4] Latih 5–8 model sekaligus, masing-masing dengan 5-fold cross-validation
   │     logreg · random_forest · extra_trees · hist_gb · lightgbm · (xgboost · catboost)
   ▼
[5] Leaderboard ──── urutkan model dari skor CV terbaik
   │
   ▼
[6] Ensemble ─────── rata-rata 3 model terbaik; dipakai kalau skornya lebih tinggi
   │
   ▼
[7] Prediksi test ── rata-rata dari model semua fold → submission.csv
```

Anda **tidak perlu** menulis kode untuk langkah-langkah ini. Tugas Anda: memilih target, metrik,
kolom yang dibuang, dan (nanti) membuat fitur baru.

---

## 4. Proyek pertama: Titanic di Kaggle

Kaggle = situs kompetisi data science, gratis, dan menyediakan komputer (termasuk GPU) di browser.
Jadi **tidak perlu install Python** di laptop.

### Langkah 1 — Buat akun
1. Daftar di **kaggle.com** (bisa pakai akun Google).
2. Verifikasi nomor HP di **Settings → Phone verification** (supaya bisa memakai internet & GPU di notebook).

### Langkah 2 — Ikuti kompetisi Titanic
1. Cari **"Titanic - Machine Learning from Disaster"** → klik **Join Competition** → setujui aturan.
2. Buka tab **Data** sebentar. Ada 3 file: `train.csv`, `test.csv`, `gender_submission.csv`
   (contoh format jawaban).

### Langkah 3 — Buka notebook dstools
1. Di halaman kompetisi klik **Code → New Notebook**.
2. Menu **File → Import Notebook** → pilih file `kaggle_notebook.ipynb` dari folder `datasains/`
   (download dari GitHub dulu: buka file → tombol *Download raw file*).
3. Di panel kanan, bagian **Input**, pastikan `titanic` sudah muncul. Kalau belum: **+ Add Input** →
   cari "titanic" → **Add**.

### Langkah 4 — Atur & jalankan
Sel konfigurasi sudah diisi untuk Titanic:

```python
TARGET = "Survived"
ID_COL = "PassengerId"
METRIC = "accuracy"          # Titanic dinilai dengan accuracy
DROP = ["Name", "Ticket"]
```

Klik **Run All** (▶▶). Tunggu ±1 menit. Anda akan melihat laporan EDA, leaderboard model, grafik
feature importance, lalu `submission.csv` dibuat.

### Langkah 5 — Kirim jawaban
1. Klik **Save Version** → **Save & Run All (Commit)** → tunggu selesai.
2. Buka versi tersebut → tab **Output** → **Submit**.
3. Skor muncul di tab **Leaderboard** kompetisi. Skor sekitar **0,76–0,79** sudah wajar untuk awal.

🎉 Selamat, Anda sudah menyelesaikan proyek data science pertama.

---

## 5. Membaca hasil

### Laporan EDA (`laporan_eda.html`)
- **Peringatan**: mis. *"Kolom 'Cabin' kosong 77%"* → kolom itu banyak bolongnya; pertimbangkan dibuang
  atau dibuat fitur "punya kabin atau tidak".
- **Distribusi target**: di Titanic ±38% selamat. Kalau satu kelas sangat jarang (mis. 2% transaksi
  curang), *accuracy* menyesatkan — pakai `roc_auc` atau `f1`.
- **Korelasi dengan target**: kolom angka yang paling berhubungan dengan target. Titik awal untuk dipelajari.

### Leaderboard (contoh)
```
model                                      accuracy  std_fold
ensemble(random_forest+extra_trees+lgbm)   0.81429
random_forest                              0.80286   0.02878
logreg                                     0.79286   0.02167
```
- Angka **accuracy** = skor CV (perkiraan skor di data baru).
- **std_fold** = seberapa beda skor antar-fold. Kecil = stabil. Selisih skor dua model yang lebih kecil
  dari std-nya biasanya **tidak berarti** (cuma kebetulan).
- Skor CV dan skor leaderboard Kaggle bisa beda sedikit — wajar. **Percayai CV** untuk memilih model;
  leaderboard publik Kaggle hanya memakai sebagian kecil data uji.

### Feature importance
Fitur yang paling dipakai model. Di Titanic biasanya `Sex`, `Fare`, `Age`, `Pclass` teratas — cocok
dengan sejarah ("perempuan dan anak-anak dulu", kelas 1 lebih dekat ke sekoci).
Ini **bukan** bukti sebab-akibat, hanya "model banyak memakai kolom ini".

---

## 6. Menaikkan skor: feature engineering

Model hanya sepintar fitur yang Anda berikan. **Feature engineering** = membuat kolom baru dari
pengetahuan Anda tentang masalahnya. Tambahkan sel ini di notebook sebelum `ds.AutoML(...)`:

```python
def tambah_fitur(df):
    df = df.copy()
    # "Braund, Mr. Owen Harris" -> "Mr"  (gelar menyiratkan umur & status)
    df["Gelar"] = df["Name"].str.extract(r",\s*([^\.]+)\.")[0]
    df["Gelar"] = df["Gelar"].replace({"Mlle": "Miss", "Ms": "Miss", "Mme": "Mrs"})
    df.loc[~df["Gelar"].isin(["Mr", "Mrs", "Miss", "Master"]), "Gelar"] = "Lainnya"
    # ukuran keluarga di kapal
    df["UkuranKeluarga"] = df["SibSp"] + df["Parch"] + 1
    df["SendirianSaja"] = (df["UkuranKeluarga"] == 1).astype(int)
    # kabin: punya atau tidak, dan dek (huruf pertama)
    df["PunyaKabin"] = df["Cabin"].notna().astype(int)
    df["Dek"] = df["Cabin"].str[0].fillna("Tidak ada")
    return df

train = tambah_fitur(train)
test = tambah_fitur(test)
DROP = ["Name", "Ticket", "Cabin"]   # kolom asal sudah diolah, buang versi mentahnya
```

Lalu jalankan ulang sel AutoML. Bandingkan skor CV **sebelum dan sesudah**. Itulah siklus kerja
data scientist sesungguhnya:

> **ide fitur → latih → bandingkan skor CV → simpan kalau naik, buang kalau tidak → ulangi**

Ide lain yang bisa dicoba: kelompok umur (anak/dewasa/lansia), harga tiket per orang
(`Fare / jumlah orang dengan tiket sama`).

---

## 7. Memakai aplikasi web di laptop

Kalau ingin mengolah data sendiri tanpa menulis kode:

1. Install **Python 3.10+** dari python.org (centang *Add Python to PATH* saat install di Windows).
2. Download repo ini dari GitHub (tombol **Code → Download ZIP**), ekstrak.
3. Buka terminal / Command Prompt di folder `datasains`, lalu:
   ```bash
   pip install -r requirements.txt
   streamlit run app.py
   ```
4. Browser terbuka otomatis. Alurnya:
   - **Sidebar**: upload `train.csv` (dan `test.csv` bila ada), pilih **kolom target** dan **kolom ID**.
   - Tab **Data**: lihat isi tabel.
   - Tab **EDA**: peringatan, grafik target, korelasi, ringkasan kolom.
   - Tab **Latih model**: pilih metrik & model → **🚀 Latih** → leaderboard + feature importance.
   - Tab **Prediksi & download**: download `submission.csv` dan file model.

Belum punya data? Centang **Pakai data contoh** (data pelanggan fiktif: siapa yang akan membeli).

---

## 8. Untuk pekerjaan: memakai data sendiri

**Bisakah dstools dipakai untuk kerjaan sungguhan?** Bisa, untuk **masalah prediksi pada data tabel**
(churn pelanggan, prediksi penjualan, skor risiko kredit, lead mana yang akan closing, dsb.).
Di dunia kerja, toolkit seperti ini biasanya dipakai untuk membuat **baseline** — model pertama yang
cepat jadi — lalu diperbaiki. Tapi alat hanyalah separuh pekerjaan; separuh lainnya adalah Anda:

### Contoh: memprediksi pelanggan yang akan berhenti (churn)

1. **Rumuskan pertanyaan dengan tajam.**
   Buruk: *"analisis pelanggan"*. Bagus: *"Dari pelanggan aktif per 1 Januari, siapa yang tidak
   bertransaksi lagi dalam 90 hari ke depan?"*
2. **Siapkan satu tabel CSV**: satu baris = satu pelanggan, kolom = info yang **sudah diketahui pada
   1 Januari** (lama berlangganan, jumlah transaksi 3 bulan terakhir, kota, paket, keluhan), plus
   kolom target `churn` (1/0) yang dilihat dari 90 hari sesudahnya.
3. **EDA** → cek kolom kosong, nilai aneh (umur 200 tahun?), proporsi churn.
4. **Latih** dengan `metric="roc_auc"` (karena churn biasanya jarang).
5. **Pakai hasilnya**: urutkan pelanggan aktif sekarang dari probabilitas churn tertinggi → tim
   marketing menghubungi 10% teratas.
6. **Sampaikan dalam bahasa bisnis**: bukan "AUC 0,82", tapi *"Dengan menghubungi 10% pelanggan
   teratas dari model, kita menjangkau ±40% dari pelanggan yang akan berhenti."*

### Hal yang wajib diwaspadai
- **Data leakage (kebocoran)**: fitur yang memuat "jawaban" atau informasi dari masa depan.
  Contoh: kolom `tanggal_berhenti` untuk menebak churn. Skor CV akan luar biasa tinggi (0,99) tapi
  model tidak berguna di dunia nyata. **Skor yang terlalu bagus = curigai dulu.**
- **Data waktu**: kalau memprediksi masa depan (penjualan bulan depan), cross-validation acak
  terlalu optimis. Uji dengan cara: latih di data lama, uji di data paling baru.
- **Privasi**: jangan upload data pelanggan/pasien ke Kaggle publik. Pakai aplikasi lokal (bab 7).
- **Keadilan**: hati-hati memakai fitur seperti jenis kelamin, suku, agama untuk keputusan tentang orang.

### Batasan dstools
Hanya untuk data tabel. Untuk **gambar** (mis. rontgen, foto produk), **teks** (ulasan, chat), atau
**suara**, Anda perlu deep learning (PyTorch / TensorFlow / Hugging Face) — itu langkah lanjutan
setelah dasar-dasar di panduan ini dikuasai.

---

## 9. Kesalahan umum pemula

| Gejala | Penyebab & solusi |
|---|---|
| `KeyError: 'Survived'` | Nama kolom target salah ketik. Huruf besar/kecil berpengaruh. Cek dengan `train.columns`. |
| `Tidak menemukan file train di /kaggle/input` | Data belum ditambahkan di panel **Input** notebook. |
| Skor Kaggle 0,0 / error saat submit | Format submission salah: cek nama kolom & jumlah baris sama dengan `sample_submission.csv`. |
| Skor CV 0,99+ di masalah sulit | Hampir pasti **data leakage**. Lihat feature importance; kolom teratas yang "terlalu pintar" biasanya pelakunya. |
| Kolom ID / nama ada di feature importance teratas | Masukkan ke `DROP`. Nomor/teks unik per baris tidak bisa digeneralisasi. |
| Latihan sangat lama | Kurangi model (`MODELS=["lightgbm"]`) atau fold (`FOLDS=3`), atau ambil sampel data dulu. |
| Mengejar leaderboard publik Kaggle terus | Overfitting ke leaderboard. Pilih model berdasarkan skor CV. |

---

## 10. Rencana belajar 12 minggu

Sisihkan ±1 jam per hari. Semua sumber di bawah **gratis**.

| Minggu | Fokus | Sumber | Target akhir minggu |
|---|---|---|---|
| 1 | Jalankan proyek Titanic dengan dstools (bab 4–6) | panduan ini | submission pertama |
| 2–3 | Python dasar: variabel, list, if, for, fungsi | Kaggle Learn: *Python* | bisa membaca kode di `dstools.py` bagian atas |
| 4 | pandas: baca CSV, filter, groupby, merge | Kaggle Learn: *Pandas* | analisis Titanic sendiri ("rata-rata selamat per kelas") |
| 5 | Visualisasi: histogram, bar, scatter | Kaggle Learn: *Data Visualization* | 5 grafik yang menjelaskan Titanic |
| 6 | Statistik dasar: rata-rata, median, sebaran, korelasi, peluang | Khan Academy (Statistics) | paham arti std, korelasi |
| 7 | Machine learning dasar | Kaggle Learn: *Intro to Machine Learning* | melatih model tanpa dstools |
| 8 | ML lanjut: validasi, data kosong, kategori, leakage | Kaggle Learn: *Intermediate ML* | paham setiap langkah di bab 3 |
| 9 | Feature engineering | Kaggle Learn: *Feature Engineering* | menaikkan skor Titanic |
| 10 | Regresi: **House Prices** (Kaggle) | `LOG_TARGET=True`, `METRIC="rmse"` | submission House Prices |
| 11 | SQL (wajib di hampir semua pekerjaan data) | Kaggle Learn: *Intro to SQL* | query join & group by |
| 12 | **Proyek portofolio** dengan data Indonesia | data.go.id, BPS, Kaggle Datasets | notebook publik + tulisan singkat |

Kompetisi latihan yang ramah pemula di Kaggle: **Titanic**, **House Prices**, **Spaceship Titanic**,
dan **Playground Series** (kompetisi bulanan, data tabel — sangat cocok untuk dstools).

---

## 11. Karier data science

Jalur umum untuk pemula:

```
Data Analyst  ──►  Data Scientist  ──►  Senior DS / ML Engineer
(SQL, Excel,       (Python, ML,          (produksi model, MLOps,
 dashboard)         eksperimen)            deep learning)
```

- **Paling cepat dapat kerja: Data Analyst.** Kuasai SQL, Excel/Google Sheets, satu alat dashboard
  (Looker Studio / Power BI / Tableau), dan komunikasi.
- **Portofolio > sertifikat.** 3 proyek yang rapi di GitHub/Kaggle lebih meyakinkan daripada 10
  sertifikat. Setiap proyek: pertanyaan bisnis → data → analisis → model → kesimpulan dalam bahasa awam.
- **Ceritakan dampak, bukan algoritma**: "mengurangi pelanggan hilang 15%" lebih menarik daripada
  "memakai LightGBM dengan AUC 0,83".
- Kenali cara kerja alat AutoML seperti dstools — di wawancara Anda akan ditanya *kenapa* memakai
  cross-validation, *apa itu* overfitting, *bagaimana* menghindari leakage. Panduan ini sudah
  menyentuh semuanya.

---

## 12. Glosarium

| Istilah | Arti singkat |
|---|---|
| AutoML | Otomatisasi pemilihan & pelatihan model |
| AUC / ROC-AUC | Seberapa baik model mengurutkan yang "ya" di atas yang "tidak" (0,5 = asal tebak, 1 = sempurna) |
| CV (cross-validation) | Mengukur model dengan bergantian menyisihkan sebagian data latih |
| EDA | Exploratory Data Analysis — mengenal data sebelum memodelkan |
| Ensemble | Menggabungkan beberapa model (di dstools: rata-rata) |
| Feature engineering | Membuat kolom baru yang membantu model |
| Feature importance | Seberapa banyak model memakai suatu fitur |
| Fold | Satu bagian data dalam cross-validation |
| Imbalanced | Satu kelas target jauh lebih jarang dari kelas lain |
| Imputasi | Mengisi nilai yang kosong |
| Leakage | Fitur yang membocorkan jawaban / informasi masa depan |
| LightGBM / XGBoost / CatBoost | Model "gradient boosting", juara banyak kompetisi data tabel |
| Logloss | Metrik untuk probabilitas; makin kecil makin baik; menghukum tebakan yakin yang salah |
| OOF (out-of-fold) | Prediksi untuk data latih yang dibuat model yang tidak melihat baris itu |
| One-hot encoding | Mengubah kategori jadi kolom 0/1 |
| Overfitting | Model menghafal data latih, buruk di data baru |
| RMSE / MAE | Rata-rata besar kesalahan tebakan angka; makin kecil makin baik |
| Submission | File jawaban yang dikirim ke Kaggle |

---

**Langkah selanjutnya:** kerjakan bab 4 sekarang juga. Data science dipelajari dengan mengerjakan,
bukan hanya membaca. Selamat belajar! 🚀
