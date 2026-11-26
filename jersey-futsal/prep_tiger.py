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
