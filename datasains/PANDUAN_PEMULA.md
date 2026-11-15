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
7. [Tuning hyperparameter](#7-tuning-hyperparameter)
8. [Memakai aplikasi web di laptop](#8-memakai-aplikasi-web-di-laptop)
9. [Untuk pekerjaan: memakai data sendiri](#9-untuk-pekerjaan-memakai-data-sendiri)
10. [Kesalahan umum pemula](#10-kesalahan-umum-pemula)
11. [Belajar Python & coding di Kaggle](#11-belajar-python--coding-di-kaggle)
12. [LLM, chatbot & Asisten AI](#12-llm-chatbot--asisten-ai)
13. [Menghasilkan uang dari data science](#13-menghasilkan-uang-dari-data-science)
14. [Rencana belajar 12 minggu](#14-rencana-belajar-12-minggu)
15. [Karier data science](#15-karier-data-science)
16. [Glosarium](#16-glosarium)

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

**dstools mengotomatiskan langkah 3–7 (termasuk tuning)** supaya Anda bisa fokus ke langkah 1, 5, dan 8
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
[5b] Tuning (opsional) ─ cari hyperparameter terbaik dengan Optuna → model "<nama>_tuned"
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

## 7. Tuning hyperparameter

### Apa itu hyperparameter?
Setiap model punya **"tombol pengaturan"** yang ditentukan *sebelum* belajar. Contoh di LightGBM:

| Halusinasi | LLM menjawab dengan yakin tapi salah/mengarang |
| Hyperparameter | Arti sehari-hari |
|---|---|
| `n_estimators` | berapa banyak "pohon keputusan" yang dibuat |
| `learning_rate` | seberapa besar langkah belajar tiap pohon (kecil = pelan tapi teliti) |
| `num_leaves` | seberapa rumit tiap pohon (besar = lebih detail, rawan menghafal) |
| `min_child_samples` | minimal data di tiap ujung pohon (besar = lebih hati-hati) |
| `subsample`, `colsample_bytree` | pakai sebagian baris/kolom secara acak (mengurangi menghafal) |
| `reg_alpha`, `reg_lambda` | "rem" agar model tidak terlalu rumit |

Bedanya dengan *parameter* biasa: parameter dipelajari model dari data, sedangkan hyperparameter
**dipilih oleh kita**. **Tuning** = mencari kombinasi tombol yang memberi skor CV terbaik.

### Cara dstools melakukan tuning
1. Latih semua model dengan setelan bawaan seperti biasa.
2. Untuk model yang dipilih, coba banyak kombinasi hyperparameter (`N_TRIALS` kali). Percobaan
   pertama selalu memakai setelan bawaan, jadi hasil tuning **tidak akan lebih buruk** di CV.
3. Pemilihan kombinasi berikutnya memakai **Optuna**: ia "belajar" dari percobaan sebelumnya dan
   mencoba daerah yang menjanjikan — jauh lebih efisien daripada menebak acak.
4. Percobaan yang sudah kelihatan jelek di fold-fold awal **dihentikan dini** (*pruning*) supaya hemat waktu.
5. Kombinasi terbaik dilatih ulang dengan cross-validation dan masuk leaderboard sebagai
   `lightgbm_tuned`. Ia ikut bersaing — dan bisa ikut ensemble — dengan model lain.

### Cara memakai
**Di Kaggle** (sel konfigurasi notebook):
```python
TUNE = ["lightgbm"]     # atau "auto" = tuning model terbaik, None = tanpa tuning
N_TRIALS = 50           # makin banyak makin teliti, makin lama
TUNE_TIMEOUT = 600      # berhenti setelah 10 menit per model walau percobaan belum habis
```
**Di aplikasi web**: tab *Latih model* → buka **🎛 Hyperparameter tuning** → centang *Aktifkan tuning*.
**Di terminal**: `python dstools.py train ... --tune lightgbm --trials 50 --tune-timeout 600`

Hasilnya:
- `auto.best_params_` → kombinasi terbaik (juga ada di `laporan_model.html`),
- grafik skor tiap percobaan → kalau garisnya sudah datar, menambah percobaan tidak banyak gunanya.

Contoh nyata (Titanic, 25 percobaan, ±1 menit): LightGBM naik dari **0,799 → 0,816** (skor CV).

### Tips tuning
- **Feature engineering dulu, tuning belakangan.** Fitur yang bagus biasanya menaikkan skor jauh
  lebih banyak daripada tuning. Tuning adalah "polesan terakhir".
- Tuning **model boosting** (`lightgbm`, `xgboost`, `catboost`) paling sering memberi hasil.
  Logistic regression hampir tidak berubah.
- Mulai dari `N_TRIALS = 30`; naikkan ke 100+ hanya bila waktu tersedia. Sesi notebook Kaggle punya
  batas waktu (beberapa jam, cek di halaman kompetisi), jadi selalu pasang `TUNE_TIMEOUT`.
- Kenaikan yang lebih kecil dari `std_fold` bisa jadi hanya kebetulan. Jangan tuning berulang-ulang
  sampai "pas" dengan data — itu overfitting juga (ke data validasi).

---

## 8. Memakai aplikasi web di laptop

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
   - Tab **💬 Asisten AI**: chatbot untuk bertanya tentang data & hasil Anda (lihat bab 12).
   - Tab **📖 Panduan**: panduan ini dalam bentuk ebook per bab, bisa dibaca langsung di aplikasi.

Belum upload data pun, tab **Panduan** dan **Asisten AI** sudah bisa dipakai.

Belum punya data? Centang **Pakai data contoh** (data pelanggan fiktif: siapa yang akan membeli).

---

## 9. Untuk pekerjaan: memakai data sendiri

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
- **Privasi**: jangan upload data pelanggan/pasien ke Kaggle publik. Pakai aplikasi lokal (bab 8).
- **Keadilan**: hati-hati memakai fitur seperti jenis kelamin, suku, agama untuk keputusan tentang orang.

### Batasan dstools
Hanya untuk data tabel. Untuk **gambar** (mis. rontgen, foto produk), **teks** (ulasan, chat), atau
**suara**, Anda perlu deep learning (PyTorch / TensorFlow / Hugging Face) — itu langkah lanjutan
setelah dasar-dasar di panduan ini dikuasai.

---

## 10. Kesalahan umum pemula

| Gejala | Penyebab & solusi |
|---|---|
| `KeyError: 'Survived'` | Nama kolom target salah ketik. Huruf besar/kecil berpengaruh. Cek dengan `train.columns`. |
| `Tidak menemukan file train di /kaggle/input` | Data belum ditambahkan di panel **Input** notebook. |
| Skor Kaggle 0,0 / error saat submit | Format submission salah: cek nama kolom & jumlah baris sama dengan `sample_submission.csv`. |
| Skor CV 0,99+ di masalah sulit | Hampir pasti **data leakage**. Lihat feature importance; kolom teratas yang "terlalu pintar" biasanya pelakunya. |
| Kolom ID / nama ada di feature importance teratas | Masukkan ke `DROP`. Nomor/teks unik per baris tidak bisa digeneralisasi. |
| Latihan sangat lama | Matikan tuning atau pasang `TUNE_TIMEOUT`, kurangi model (`MODELS=["lightgbm"]`) atau fold (`FOLDS=3`), atau ambil sampel data dulu. |
| Mengejar leaderboard publik Kaggle terus | Overfitting ke leaderboard. Pilih model berdasarkan skor CV. |

---

## 11. Belajar Python & coding di Kaggle

Kaggle cocok untuk belajar coding: semuanya jalan di browser, gratis, dan tidak perlu install apa pun.

### Langkah 1 — Kursus gratis Kaggle Learn
Buka menu **Learn** di kaggle.com. Setiap kursus singkat (beberapa jam), berisi latihan yang dicek
otomatis, dan memberi sertifikat. Urutan yang disarankan:

1. **Python** → variabel, list, if, for, fungsi
2. **Pandas** → mengolah tabel
3. **Data Visualization** → grafik
4. **Intro to Machine Learning** → **Intermediate Machine Learning**
5. **Feature Engineering**
6. **Intro to SQL**
7. **Intro to Deep Learning** (persiapan sebelum masuk ke LLM)

### Langkah 2 — Mengenal notebook

| Yang dilakukan | Caranya |
|---|---|
| Membuat notebook baru | **Code → New Notebook** |
| Menjalankan satu sel | klik sel → **Shift + Enter** |
| Menambah sel kode / catatan | tombol **+ Code** / **+ Markdown** |
| Memasang data | panel kanan → **Add Input** |
| Menyalakan GPU / internet | panel kanan → **Session options** (internet butuh verifikasi nomor HP) |
| Memasang library tambahan | `!pip install nama_library` di sebuah sel |
| Menyimpan | **Save Version** (bisa dibuat publik sebagai portofolio) |
| Menyimpan rahasia (API key) | menu **Add-ons → Secrets** (lihat bab 12) |

Coba sel pertama Anda:

```python
nama = "Budi"
umur = 25
print(f"Halo, saya {nama}, umur {umur} tahun, sedang belajar data science!")

angka = [3, 7, 1, 9]
print("Terbesar:", max(angka), "| Rata-rata:", sum(angka) / len(angka))
```

### Langkah 3 — Cara belajar yang efektif
- **Ketik ulang, jangan hanya membaca.** Kode yang Anda ketik sendiri jauh lebih melekat.
- **Fork notebook orang lain** (tombol *Copy & Edit*) di kompetisi yang Anda ikuti. Jalankan sel
  satu per satu, ubah sedikit, lihat apa yang berubah.
- **Baca `dstools.py`** setelah kursus Python & Pandas. Sebagian besar sudah akan bisa Anda pahami.
- **Error itu normal.** Baca baris terakhir pesan error dulu, lalu tanyakan ke tab **💬 Asisten AI**:
  tempel kode dan pesan error-nya, minta dijelaskan *kenapa* salah, bukan hanya perbaikannya.
- **1 jam setiap hari** lebih baik daripada 7 jam sekali seminggu.

---

## 12. LLM, chatbot & Asisten AI

### Apa itu LLM?
**LLM (Large Language Model)** adalah AI yang dilatih dengan sangat banyak teks sehingga bisa
memahami dan menulis bahasa manusia. Contohnya Claude. LLM bisa menjelaskan konsep, menulis kode,
merangkum dokumen, mengklasifikasi teks, dan menjawab pertanyaan.

| Istilah | Arti sehari-hari |
|---|---|
| **Prompt** | Pertanyaan/perintah yang Anda kirim ke LLM |
| **System prompt** | "Peran & aturan" untuk LLM, mis. "Kamu CS toko, jawab sopan" |
| **Token** | Potongan kata. Biaya & batas panjang dihitung dalam token |
| **Konteks** | Semua teks yang dilihat LLM sekaligus (prompt + riwayat + dokumen) |
| **Halusinasi** | LLM menjawab dengan yakin tapi salah/mengarang. **Selalu cek fakta penting** |
| **API** | Cara program Anda "menelepon" LLM lewat internet |
| **RAG** | LLM menjawab berdasarkan dokumen Anda sendiri (lihat di bawah) |
| **Fine-tuning** | Melatih ulang model agar ahli di bidang tertentu |

### Memakai Asisten AI di aplikasi
Aplikasi ini punya tab **💬 Asisten AI**: chatbot yang paham data science dan bisa melihat
**ringkasan data & hasil model Anda**.

1. Buat akun di **platform.claude.com** → isi saldo kredit → menu **API Keys** → **Create Key**.
   Pemakaian API dibayar per token; harga terbaru ada di halaman pricing situs tersebut.
2. Di aplikasi buka tab **💬 Asisten AI** → **⚙️ Pengaturan asisten** → tempel API key.
   (Supaya tidak mengetik ulang: set environment `ANTHROPIC_API_KEY`, atau buat file
   `.streamlit/secrets.toml` berisi `ANTHROPIC_API_KEY = "..."` — jangan di-commit ke GitHub!)
3. Pilih model:
   - **Opus 5.5**: paling pintar, untuk analisis & penjelasan yang penting,
   - **Sonnet 5.5**: lebih cepat & murah,
   - **Haiku 5.5**: paling murah, untuk pertanyaan ringan.
4. Klik salah satu **contoh pertanyaan** atau ketik sendiri, misalnya:
   - *"Jelaskan hasil leaderboard saya dengan bahasa sederhana"*
   - *"Apakah ada tanda data leakage di data saya?"*
   - *"Buatkan kode fitur baru dari kolom tanggal_daftar"*
   - *"Bagaimana cara menjelaskan hasil ini ke klien?"*

**Privasi:** secara bawaan yang dikirim hanya **ringkasan** (nama kolom, statistik, leaderboard),
bukan isi data. Opsi *contoh baris* mengirim sebagian isi data — jangan aktifkan untuk data rahasia
klien atau data pribadi.

Asisten juga bisa dipakai di Kaggle atau terminal:
```python
import asisten
bot = asisten.Asisten()                       # pakai ANTHROPIC_API_KEY
bot.set_konteks(asisten.ringkas_data(train, target="Survived", auto=auto))
for potongan in bot.tanya("Kenapa skor saya segini? Apa yang bisa diperbaiki?"):
    print(potongan, end="")
```
atau langsung mengobrol di terminal: `python asisten.py`.

### Memanggil LLM dari Python (tingkat 1)
Inilah dasar dari semua aplikasi LLM. Di Kaggle, simpan API key di **Add-ons → Secrets** dengan
nama `ANTHROPIC_API_KEY`, nyalakan **Internet**, lalu:

```python
!pip install -q anthropic
import os, anthropic
from kaggle_secrets import UserSecretsClient          # khusus Kaggle
os.environ["ANTHROPIC_API_KEY"] = UserSecretsClient().get_secret("ANTHROPIC_API_KEY")

client = anthropic.Anthropic()
jawaban = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=2000,
    messages=[{"role": "user", "content": "Jelaskan apa itu overfitting dalam 3 kalimat."}],
)
print(jawaban.content[-1].text)
```

### Contoh proyek 1 — klasifikasi ulasan pelanggan
LLM bisa jadi "model" tanpa perlu data latih. Cocok untuk ulasan marketplace, komentar media sosial,
atau tiket keluhan:

```python
import pandas as pd

ulasan = pd.DataFrame({"teks": [
    "Pengiriman cepat, barang sesuai foto!",
    "Kemasan rusak dan penjual tidak membalas chat.",
    "Lumayan, harga sesuai kualitas.",
]})

def sentimen(teks):
    r = client.messages.create(
        model="claude-haiku-5-5",           # model murah untuk tugas sederhana & banyak data
        max_tokens=10,
        system="Balas HANYA dengan satu kata: positif, negatif, atau netral.",
        messages=[{"role": "user", "content": teks}],
    )
    return r.content[-1].text.strip().lower()

ulasan["sentimen"] = ulasan["teks"].apply(sentimen)
ulasan
```
Untuk ribuan baris: coba dulu di 20–50 baris, cek hasilnya secara manual, baru jalankan semua.
Hasil LLM tetap perlu dicek seperti model lain — hitung akurasinya pada sampel yang Anda beri label sendiri.

### Contoh proyek 2 — chatbot dokumen sendiri (RAG mini)
**RAG** = (1) cari bagian dokumen yang relevan dengan pertanyaan, (2) kirim bagian itu ke LLM
bersama pertanyaannya. Hasilnya chatbot yang menjawab sesuai info **Anda**, bukan mengarang:

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

dokumen = [
    "Jam buka toko: Senin-Sabtu pukul 08.00-20.00. Minggu tutup.",
    "Pengembalian barang maksimal 7 hari setelah diterima, dengan nota pembelian.",
    "Ongkos kirim gratis untuk belanja di atas Rp200.000 ke seluruh Jawa.",
    "Pembayaran bisa lewat transfer bank, QRIS, atau bayar di tempat (COD).",
]
# potongan huruf (bukan kata utuh): "dikembalikan" tetap cocok dengan "pengembalian"
vektorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5)).fit(dokumen)
matriks = vektorizer.transform(dokumen)

def tanya_toko(pertanyaan, k=2):
    skor = cosine_similarity(vektorizer.transform([pertanyaan]), matriks)[0]
    relevan = [dokumen[i] for i in skor.argsort()[::-1][:k]]          # 1. cari dokumen
    konteks = "\n".join(f"- {d}" for d in relevan)
    r = client.messages.create(                                         # 2. tanya LLM + dokumen
        model="claude-opus-5-5",
        max_tokens=1000,
        system="Kamu CS toko. Jawab HANYA berdasarkan informasi berikut. "
               "Jika tidak ada jawabannya, bilang belum tahu dan sarankan hubungi admin.\n" + konteks,
        messages=[{"role": "user", "content": pertanyaan}],
    )
    return r.content[-1].text

print(tanya_toko("Kalau barangnya rusak bisa dikembalikan?"))
```
Ganti `dokumen` dengan SOP, katalog produk, atau FAQ milik klien — inilah jasa chatbot yang banyak
dicari UMKM. Untuk dokumen besar, versi lanjutnya memakai *embedding* dan *vector database*.

### Tingkat 3 — fine-tuning (lanjutan)
Fine-tuning = melatih ulang model open-source kecil (mis. Llama, Gemma, Qwen) dengan contoh Anda
sendiri, memakai teknik hemat memori **LoRA** dan GPU gratis Kaggle. Pelajari setelah paham deep
learning dasar; sumber terbaik: **Hugging Face LLM Course** (huggingface.co/learn). Untuk kebanyakan
kebutuhan bisnis, tingkat 1–2 (API + RAG) sudah cukup dan jauh lebih cepat jadi.

### Bidang lain setelah dasar kuat
- **Computer vision**: gambar (rontgen, foto produk, deteksi cacat).
- **NLP**: teks (sentimen, ringkasan, ekstraksi data dari dokumen).
- **Time series**: peramalan penjualan/stok.
- **MLOps**: memasang model agar dipakai aplikasi sungguhan.
- **Data engineering**: SQL & pipeline data — banyak lowongan, sering dilupakan pemula.

---

## 13. Menghasilkan uang dari data science

**Bisa**, tapi realistis: uang biasanya datang dari **pekerjaan & proyek**, bukan hadiah Kaggle.
Kaggle adalah tempat latihan dan etalase portofolio.

| Jalur | Contoh pekerjaan | Kapan mulai |
|---|---|---|
| **Freelance analisis data** | merapikan data Excel, dashboard (Looker Studio/Power BI), laporan penjualan UMKM | setelah ±2–3 bulan (pandas + visualisasi) |
| **Data analyst** (full/part-time) | SQL, laporan rutin, dashboard | setelah ±3–6 bulan + portofolio |
| **Proyek machine learning** | prediksi penjualan, churn, segmentasi pelanggan — dstools untuk baseline | setelah paham bab 6–9 |
| **Otomasi dengan LLM** | chatbot toko (RAG), klasifikasi ulasan, ekstraksi data faktur/PDF | setelah bab 12 |
| **Mengajar / konten** | tutorial YouTube/TikTok, kelas privat, artikel | setelah bisa menjelaskan dengan sederhana |
| **Hadiah kompetisi Kaggle** | hadiah besar, pesaing para ahli dunia | jadikan latihan, bukan sumber uang |

**Tempat mencari klien:** Upwork, Fiverr, Freelancer (internasional); Sribulancer, Projects.co.id
(lokal); LinkedIn; dan UMKM di sekitar Anda. Tarif sangat bervariasi tergantung portofolio.

**Tips mendapatkan klien pertama:**
1. Buat **3 proyek portofolio** yang menjawab masalah bisnis nyata, mis. *"Produk mana yang harus
   distok lebih banyak?"* — lebih menjual daripada *"Titanic akurasi 0,8"*.
2. Tawarkan proyek kecil yang jelas hasilnya: satu dashboard, satu laporan, satu chatbot FAQ.
3. Sampaikan hasil dalam **bahasa bisnis** (uang, waktu, pelanggan), bukan istilah teknis.
4. **Jujur soal batasan.** Jangan menjanjikan akurasi tertentu sebelum melihat datanya.

**Bekerja bersama AI** (Asisten AI atau Claude): AI bisa mengerjakan banyak bagian teknis dengan
cepat, tapi **Anda** tetap yang memahami masalah klien, memeriksa apakah hasilnya masuk akal, dan
bertanggung jawab atas hasilnya. AI bisa salah; pemahaman dasar dari panduan ini yang membuat Anda
bisa menangkap kesalahan itu — dan yang membuat klien percaya kepada Anda.

---

## 14. Rencana belajar 12 minggu

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
| 9 | Feature engineering + tuning (bab 6–7) | Kaggle Learn: *Feature Engineering* | menaikkan skor Titanic |
| 10 | Regresi: **House Prices** (Kaggle) | `LOG_TARGET=True`, `METRIC="rmse"` | submission House Prices |
| 11 | SQL (wajib di hampir semua pekerjaan data) | Kaggle Learn: *Intro to SQL* | query join & group by |
| 12 | **Proyek portofolio** dengan data Indonesia | data.go.id, BPS, Kaggle Datasets | notebook publik + tulisan singkat |
| 13+ | LLM: API, klasifikasi teks, RAG (bab 12) | Hugging Face LLM Course, docs.claude.com | chatbot dokumen pertama |

Kompetisi latihan yang ramah pemula di Kaggle: **Titanic**, **House Prices**, **Spaceship Titanic**,
dan **Playground Series** (kompetisi bulanan, data tabel — sangat cocok untuk dstools).

---

## 15. Karier data science

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

## 16. Glosarium

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
| Halusinasi | LLM menjawab dengan yakin tapi salah/mengarang |
| Hyperparameter | Pengaturan model yang dipilih sebelum belajar (mis. jumlah pohon) |
| Imbalanced | Satu kelas target jauh lebih jarang dari kelas lain |
| Imputasi | Mengisi nilai yang kosong |
| LLM | Large Language Model — AI yang memahami & menulis teks |
| Leakage | Fitur yang membocorkan jawaban / informasi masa depan |
| LightGBM / XGBoost / CatBoost | Model "gradient boosting", juara banyak kompetisi data tabel |
| Logloss | Metrik untuk probabilitas; makin kecil makin baik; menghukum tebakan yakin yang salah |
| OOF (out-of-fold) | Prediksi untuk data latih yang dibuat model yang tidak melihat baris itu |
| One-hot encoding | Mengubah kategori jadi kolom 0/1 |
| Optuna | Library pencari hyperparameter terbaik secara cerdas |
| Overfitting | Model menghafal data latih, buruk di data baru |
| Prompt | Perintah/pertanyaan untuk LLM |
| Pruning | Menghentikan dini percobaan tuning yang jelas jelek |
| RAG | LLM menjawab berdasarkan dokumen yang dicari lebih dulu |
| RMSE / MAE | Rata-rata besar kesalahan tebakan angka; makin kecil makin baik |
| Submission | File jawaban yang dikirim ke Kaggle |
| Token | Potongan kata; satuan biaya & panjang teks LLM |

---

**Langkah selanjutnya:** kerjakan bab 4 sekarang juga. Data science dipelajari dengan mengerjakan,
bukan hanya membaca. Selamat belajar! 🚀
