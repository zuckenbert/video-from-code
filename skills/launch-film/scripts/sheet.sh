#!/usr/bin/env bash
# Contact sheet at 1 fps with the second number on every frame. Look at it BEFORE showing any MP4 to anyone.
# Vertical videos keep only the top half (the demo area); landscape keeps the full frame.
# usage: scripts/sheet.sh <mp4> [outdir]   -> outdir/sheet_1.png, sheet_2.png ... (30 frames per sheet, 6 columns)
set -eo pipefail
IN="$1"; OUT="${2:-$(dirname "$IN")/sheet_$(basename "${IN%.mp4}")}"
mkdir -p "$OUT"; rm -rf "$OUT"/sheet_*.png "$OUT"/q; mkdir -p "$OUT/q"
H=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "$IN")
W=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$IN")
CROP="crop=${W}:$((H/2)):0:0"; [ "$H" -le "$W" ] && CROP="crop=${W}:${H}:0:0"
ffmpeg -v error -y -i "$IN" -vf "fps=1,${CROP},scale=540:-1" -fps_mode passthrough "$OUT/q/q_%04d.png"
python3 - "$OUT" <<'PY'
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
out = sys.argv[1]; files = sorted(glob.glob(os.path.join(out, 'q', 'q_*.png')))
font = None
for p in ['/System/Library/Fonts/Helvetica.ttc', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
    if os.path.exists(p): font = ImageFont.truetype(p, 34); break
font = font or ImageFont.load_default()
COLS, ROWS, PAD = 6, 5, 4
w, h = Image.open(files[0]).size
for k in range(0, len(files), COLS * ROWS):
    chunk = files[k:k + COLS * ROWS]
    sheet = Image.new('RGB', (COLS * (w + PAD) + PAD, ROWS * (h + PAD) + PAD), (51, 51, 51))
    for j, f in enumerate(chunk):
        im = Image.open(f).convert('RGB'); d = ImageDraw.Draw(im)
        label = f'{k + j}s'; tw = d.textlength(label, font=font)
        d.rectangle([6, 6, 6 + tw + 16, 50], fill=(0, 0, 0)); d.text((14, 8), label, fill=(255, 221, 0), font=font)
        sheet.paste(im, (PAD + (j % COLS) * (w + PAD), PAD + (j // COLS) * (h + PAD)))
    sheet.save(os.path.join(out, f'sheet_{k // (COLS * ROWS) + 1}.png'))
print(len(files), 'frames,', (len(files) + COLS * ROWS - 1) // (COLS * ROWS), 'sheets in', out)
PY
