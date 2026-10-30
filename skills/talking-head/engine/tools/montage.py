#!/usr/bin/env python3
"""Contact sheet from PNG files, each labeled with its name (or seconds). Used by stills.sh and sheet.sh.
usage: montage.py <out.png> <img> [img ...] [--cols 4] [--width 480]"""
import argparse, os, re
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('imgs', nargs='+')
ap.add_argument('--cols', type=int, default=4); ap.add_argument('--width', type=int, default=480); ap.add_argument('--labels', nargs='*')
a = ap.parse_args()
key = lambda p: float(m.group(1)) if (m := re.search(r'_([\d.]+)\.png$', p)) else 0.0
imgs = sorted(a.imgs, key=key)
def font(size):
    for f in ('/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, size)
    return ImageFont.load_default()
F = font(30); PAD = 4
first = Image.open(imgs[0]); w = a.width; h = round(first.height * w / first.width)
cols = min(a.cols, len(imgs)); rows = (len(imgs) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (w + PAD) + PAD, rows * (h + PAD) + PAD), (51, 51, 51))
for j, p in enumerate(imgs):
    im = Image.open(p).convert('RGB').resize((w, h)); d = ImageDraw.Draw(im)
    label = a.labels[j] if a.labels else (f'{key(p):g}s' if re.search(r'_[\d.]+\.png$', p) else os.path.basename(p))
    tw = d.textlength(label, font=F); d.rectangle([6, 6, 6 + tw + 16, 46], fill=(0, 0, 0)); d.text((14, 8), label, fill=(255, 221, 0), font=F)
    sheet.paste(im, (PAD + (j % cols) * (w + PAD), PAD + (j // cols) * (h + PAD)))
sheet.save(a.out); print(len(imgs), 'frames ->', a.out)
