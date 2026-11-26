# Hapus latar putih gambar harimau klien (hanya latar yang tersambung ke tepi gambar, bulu putih di dalam tetap)
# -> assets/harimau-transparan.png (RGBA, sudah di-crop)
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
root = sys.argv[1]
im = Image.open(f'{root}/assets/harimau-klien.jpg').convert('RGB')
W, H = im.size
a = np.asarray(im).astype(int)
bg = np.array([245, 249, 250])
dist = np.sqrt(((a - bg) ** 2).sum(-1))
cand = Image.fromarray(np.where(dist < 22, 255, 0).astype('uint8')).copy()
for x in range(0, W, 16):
    for y in (0, H - 1):
        if cand.getpixel((x, y)) == 255: ImageDraw.floodfill(cand, (x, y), 128)
for y in range(0, H, 16):
    for x in (0, W - 1):
        if cand.getpixel((x, y)) == 255: ImageDraw.floodfill(cand, (x, y), 128)
m = np.asarray(cand)
alpha = np.where(m == 128, 0, 255).astype('uint8')
# haluskan tepi + buang sisa halo terang di tepi
al = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
out = im.convert('RGBA'); out.putalpha(al)
bbox = al.point(lambda v: 255 if v > 10 else 0).getbbox()
out = out.crop((bbox[0] - 6, bbox[1] - 6, bbox[2] + 6, bbox[3] + 6))
out.save(f'{root}/assets/harimau-transparan.png')
print('ok', out.size)
