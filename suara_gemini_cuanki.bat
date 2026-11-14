@echo off
REM Buat narasi Gemini (wanita + pria) untuk template Cuanki Buhaji Factory.
REM Klik dua kali file ini. Key diminta di layar dan tidak disimpan di file mana pun.
cd /d "%~dp0"
echo.
echo === Narasi Gemini untuk video Cuanki ===
echo Ambil key gratis di aistudio.google.com  (Get API key - Create API key)
echo.
python buat_suara_gemini.py --template cuanki --gaya jualan
echo.
echo Selesai. Buka aplikasi (python serve.py), tab Template:
echo pilih "Gemini - wanita (tersimpan)" atau "Gemini - pria (tersimpan)", lalu klik Cuanki Buhaji Factory.
pause
