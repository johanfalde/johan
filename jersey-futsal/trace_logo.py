# Ubah logo resmi (JPG) menjadi vektor SVG: bagian HIJAU (bingkai + "TK ISLAM PLUS") dan HITAM (kaligrafi + "AL - MUHAAJIR")
# Hasil: assets/logo-resmi.json  {viewBox, green: "d...", black: "d..."}
import json, sys
import numpy as np
import potrace
from PIL import Image, ImageFilter

root = sys.argv[1]
im = Image.open(f'{root}/assets/logo-resmi-sumber.jpg').convert('RGB')
S = 4  # perbesar dulu supaya tepi halus
im = im.resize((im.width * S, im.height * S), Image.LANCZOS)
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
green = (g - r > 25) & (g - b > 25)
black = (r + g + b < 3 * 110) & ~green

def smooth(mask):
    m = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(2.2))
    return np.asarray(m) > 127

def trace(mask):
    bmp = potrace.Bitmap(~mask)
    plist = bmp.trace(turdsize=900, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)
    parts = []
    for curve in plist:
        fs = curve.start_point
        d = [f'M{fs.x / S:.2f} {fs.y / S:.2f}']
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f'L{seg.c.x / S:.2f} {seg.c.y / S:.2f} L{seg.end_point.x / S:.2f} {seg.end_point.y / S:.2f}')
            else:
                d.append(f'C{seg.c1.x / S:.2f} {seg.c1.y / S:.2f} {seg.c2.x / S:.2f} {seg.c2.y / S:.2f} {seg.end_point.x / S:.2f} {seg.end_point.y / S:.2f}')
        d.append('Z')
        parts.append(' '.join(d))
    return ' '.join(parts)

# hanya tulisan 'TK ISLAM PLUS' yang di-trace dari hijau; bingkai dibangun ulang (sumber terpotong kiri-kanan)
H, Wd = green.shape
yy, xx = np.mgrid[0:H, 0:Wd]
text_zone = (yy > 92 * S) & (yy < 142 * S) & (xx > 285 * S) & (xx < 548 * S)
gm, bm = smooth(green & text_zone), smooth(black)
# bingkai (koordinat gambar asli 640px). Ketebalan garis datar 28, garis tegak 43 (rasio sama dg versi banner)
L, R = -33, 673
frame = [[L, 62, 205 - L, 28], [299, 62, 238, 28], [L, 62, 43, 473 - 62], [R - 43, 62, 43, 415 - 62], [L, 445, R - L, 28]]
ys, xs = np.where(bm)
bottom = ys.max() / S
out = {'viewBox': f'{L - 14} 48 {R - L + 28} {bottom - 48 + 14:.1f}', 'frame': frame, 'green': trace(gm), 'black': trace(bm)}
json.dump(out, open(f'{root}/assets/logo-resmi.json', 'w'))
print('ok', out['viewBox'])
