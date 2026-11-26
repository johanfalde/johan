# Sumber gambar harimau

`tiger-usfws-public-domain.jpg` — "Panthera tigris tigris", foto oleh U.S. Fish and Wildlife Service.
Karya pemerintah federal AS → **domain publik** (bebas dipakai komersial, termasuk dicetak di jersey).
Halaman: https://commons.wikimedia.org/wiki/File:Panthera_tigris_tigris.jpg

Untuk mengganti dengan gambar harimau sendiri (mis. ilustrasi harimau mengaum dari Freepik/Shutterstock yang
sudah dibeli lisensinya): taruh file di folder ini lalu isi `"harimau_gambar": "assets/nama-file.jpg"` di config.json
dan atur `"harimau_crop": [kiri, atas, kanan, bawah]` (piksel) agar kepala harimau ada di tengah.

`harimau-klien.jpg` — ilustrasi harimau putih mengaum, **diberikan oleh klien** (dipakai atas permintaan klien).
`cutout_tiger.py` menghapus latarnya → `harimau-transparan.png` (dipakai di semua desain; disalin ke output/).
`harimau-klien-2.jpg` — kepala harimau putih mengaum (samping), **diberikan oleh klien**; SEKARANG DIPAKAI
(`config.json` → `harimau_klien`). Sumber pudar → kontras dinaikkan 1.9x di `cutout_tiger.py`.
