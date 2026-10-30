#!/usr/bin/env python3
"""Writes the RGBA PNG sequence with captions + the animated lower third.

All animation happens here, not in ffmpeg: the card slides in with a cubic
ease-out, holds, and slides out with a fade. While it is on screen the captions
use the high margin so they never collide. Each caption block is drawn once and
reused across all of its frames.
"""
import json, os, shutil, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from lib import CFG, wpath, asset, rgb, has_card

W, H, FPS = CFG['out_w'], CFG['out_h'], CFG['fps']
DUR = float(os.environ['CAP_DUR'])

C, K, T = CFG['caption'], CFG['card'], CFG['theme']
SIZE, LINE_H, STROKE_W, FADE = C['size'], C['line_h'], C['stroke_w'], C['fade']
TEXT, ACCENT, STROKE = rgb(T['text']) + (255,), rgb(T['accent']) + (255,), (10, 11, 11, 235)

font = ImageFont.truetype(asset(C['font']), SIZE)
probe = ImageDraw.Draw(Image.new('RGBA', (8, 8)))

CARD = has_card() and os.path.exists(wpath('card.png'))
if CARD:
    card = Image.open(wpath('card.png')).convert('RGBA')
    CJ = json.load(open(wpath('card.json')))
    CARD_X = K['margin_x'] - CJ['pad']
    CARD_Y = H - K['margin_y'] - CJ['card_h'] - CJ['pad']
    CW = card.width
    CARD_END = K['out_at'] + K['out_dur'] + 0.3    # until when captions stay high
else:
    CARD_END = -1.0


def render_block(lines):
    widths = [probe.textlength(''.join(r[0] for r in l), font=font) for l in lines]
    bw = int(max(widths)) + STROKE_W * 2 + 8
    bh = LINE_H * len(lines) + STROKE_W * 2 + 20
    pad = 22
    img = Image.new('RGBA', (bw + pad * 2, bh + pad * 2), (0, 0, 0, 0))
    txt = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    for i, line in enumerate(lines):
        x = pad + (bw - widths[i]) / 2
        y = pad + STROKE_W + i * LINE_H
        for run, hi in line:
            d.text((x, y), run, font=font, fill=ACCENT if hi else TEXT,
                   stroke_width=STROKE_W, stroke_fill=STROKE)
            x += probe.textlength(run, font=font)
    sh = txt.copy()
    sh.putdata([(0, 0, 0, min(255, int(p[3] * 0.55))) for p in sh.getdata()])
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(9)), (0, 5))
    img.alpha_composite(txt)
    return img


cues = json.load(open(wpath('cues.json'), encoding='utf-8'))
for c in cues:
    c['img'] = render_block(c['lines'])

OUT = wpath('frames')
shutil.rmtree(OUT, ignore_errors=True)
os.makedirs(OUT)


def scale_alpha(img, a):
    if a >= 0.999:
        return img
    out = img.copy()
    out.putalpha(img.getchannel('A').point(lambda p: int(p * a)))
    return out


def clamp01(v):
    return 0.0 if v < 0 else (1.0 if v > 1 else v)


nframes = int(DUR * FPS)
for n in range(nframes):
    t = n / FPS
    frame = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    if CARD and K['in_at'] - 0.05 <= t <= K['out_at'] + K['out_dur'] + 0.1:
        if t < K['out_at']:
            p = clamp01((t - K['in_at']) / K['in_dur'])
            x = -CW + (CARD_X + CW) * (1 - (1 - p) ** 3)          # cubic ease-out
            a = clamp01((t - K['in_at']) / 0.30)
        else:
            p = clamp01((t - K['out_at']) / K['out_dur'])
            x = CARD_X - 56 * p ** 2
            a = 1 - clamp01((t - K['out_at'] - 0.05) / 0.45)
        if a > 0.004:
            frame.alpha_composite(scale_alpha(card, a), (int(round(x)), CARD_Y))

    for c in cues:
        if c['start'] - FADE <= t <= c['end'] + FADE:
            a = min(clamp01((t - c['start'] + FADE) / FADE),
                    clamp01((c['end'] + FADE - t) / FADE))
            if a <= 0.004:
                continue
            img = c['img']
            base = C['margin_high'] if c['start'] < CARD_END else C['margin_low']
            frame.alpha_composite(scale_alpha(img, a),
                                  ((W - img.width) // 2, H - base - img.height + 22))
            break

    frame.save(f'{OUT}/{n:05d}.png')
    if n % 150 == 0:
        print(f'{n}/{nframes}', file=sys.stderr, flush=True)

print(f'{nframes} frames in {OUT}/')
