@echo off
REM Klik dua kali file ini untuk menjalankan Data Science Studio di Windows.
cd /d "%~dp0"
where python >nul 2>nul || (echo Python belum terpasang. Install dari python.org dan centang "Add Python to PATH". & pause & exit /b 1)
echo Memasang library (hanya lama saat pertama kali)...
python -m pip install -q -r requirements.txt || (echo Gagal memasang library. & pause & exit /b 1)
echo Membuka aplikasi di browser... Tutup jendela ini untuk menghentikan aplikasi.
python -m streamlit run app.py
pause
