# Siapkan kepala harimau: crop, perbesar, pertajam, kontras, pudarkan tepi -> assets/tiger-head.png (RGBA)
import json, sys
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageOps
root = sys.argv[1]
cfg = json.load(open(f'{root}/config.json'))
src = cfg.get('harimau_gambar', 'assets/tiger-usfws-public-domain.jpg')
crop = cfg.get('harimau_crop', [190, 0, 450, 260])
im = Image.open(f'{root}/{src}').convert('RGB').crop(tuple(crop))
im = im.resize((1200, 1200), Image.LANCZOS)
im = im.filter(ImageFilter.UnsharpMask(radius=4, percent=160, threshold=2))
im = ImageEnhance.Contrast(im).enhance(1.45)
g = ImageOps.grayscale(im)
g = ImageOps.autocontrast(g, cutoff=1)
# masker: oval lembut supaya latar foto hilang & tepi memudar
m = Image.new('L', (1200, 1200), 0)
ImageDraw.Draw(m).ellipse((190, 60, 1010, 1130), fill=255)
m = m.filter(ImageFilter.GaussianBlur(110))
out = Image.merge('RGBA', (g, g, g, m))
out.save(f'{root}/assets/tiger-head.png')
print('ok', out.size)

# ---- Versi ilustrasi emas (gaya lukisan digital) untuk Desain 4 ----
import random
from PIL import ImageChops
src_rgb = Image.open(f'{root}/{src}').convert('RGB').crop(tuple(crop)).resize((1200, 1200), Image.LANCZOS)
p = src_rgb.filter(ImageFilter.ModeFilter(7)).filter(ImageFilter.UnsharpMask(radius=3, percent=220, threshold=1))
gray = ImageOps.autocontrast(ImageOps.grayscale(p), cutoff=2)
gray = ImageEnhance.Contrast(gray).enhance(1.35)
# peta gradasi: hitam -> coklat tua -> emas -> krem
stops = [(0, (8, 6, 4)), (70, (52, 30, 8)), (140, (198, 132, 24)), (200, (240, 196, 92)), (255, (255, 247, 226))]
lut = []
for ch in range(3):
    for v in range(256):
        for (a, ca), (b, cb) in zip(stops, stops[1:]):
            if a <= v <= b:
                t = (v - a) / (b - a); lut.append(int(ca[ch] + (cb[ch] - ca[ch]) * t)); break
gold = Image.merge('RGB', (gray, gray, gray)).point(lut)
# masker: oval lembut + tepi sapuan kuas acak
m2 = Image.new('L', (1200, 1200), 0)
dm = ImageDraw.Draw(m2)
dm.ellipse((200, 40, 1000, 1120), fill=255)
rnd = random.Random(7)
for _ in range(260):
    ang = rnd.uniform(0, 6.283); r = rnd.uniform(330, 470)
    import math
    cx, cy = 600 + r * math.cos(ang) * 0.95, 580 + r * math.sin(ang) * 1.12
    w = rnd.uniform(8, 40)
    dm.line((cx, cy, cx + rnd.uniform(-90, 90), cy + rnd.uniform(-60, 60)), fill=rnd.choice([0, 255]), width=int(w))
m2 = m2.filter(ImageFilter.GaussianBlur(18))
fade = Image.linear_gradient('L').resize((1200, 1200))           # 0 atas -> 255 bawah
fade = ImageOps.invert(fade).point(lambda v: 255 if v > 90 else int(v * 255 / 90))  # pudar di bagian bawah
m2 = ImageChops.multiply(m2, fade)
out2 = gold.convert('RGBA'); out2.putalpha(m2)
out2.save(f'{root}/assets/tiger-gold.png')
print('ok gold')
