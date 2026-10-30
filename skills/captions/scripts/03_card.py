#!/usr/bin/env python3
"""Renders the lower third as an RGBA PNG (with drop shadow).

Layout: accent bar on the left edge, name + role, and, when card.logo is set, a
thin divider plus the logo. Width follows the text. The PNG has 26px of slack
around it for the shadow: the compositor subtracts that slack when placing it.

With an empty card.name nothing is drawn and the captions stay low all the time.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from lib import CFG, wpath, asset, rgb, has_card

if not has_card():
    for p in ('card.png', 'card.json'):
        if os.path.exists(wpath(p)):
            os.remove(wpath(p))
    print('no card.name: skipping the lower third')
    sys.exit(0)

K, T = CFG['card'], CFG['theme']
BG, MUTED, TEXT = rgb(T['background']), rgb(T['muted']), rgb(T['text'])
EDGE = rgb(T.get('bar') or T['accent'])   # card edge: theme.bar (structure), accent if unset

f_name = ImageFont.truetype(asset(K['font_name']), 48)
f_role = ImageFont.truetype(asset(K['font_role']), 28)
probe = ImageDraw.Draw(Image.new('RGBA', (8, 8)))


def tw(txt, font):
    return probe.textbbox((0, 0), txt, font=font)[2] if txt else 0


LOGO_H = 34
logo = None
if K.get('logo'):
    lp = asset(K['logo'])
    if os.path.exists(lp):
        logo = Image.open(lp).convert('RGBA')
        logo = logo.resize((round(logo.width * LOGO_H / logo.height), LOGO_H), Image.LANCZOS)
    else:
        print(f'warning: logo {lp} not found, card goes out without it', file=sys.stderr)

BAR, PAD_L, PAD_R, PAD_Y, GAP_TEXT, DIV_GAP, R, SHADOW = 9, 34, 36, 26, 6, 32, 14, 26

text_w = max(tw(K['name'], f_name), tw(K.get('role', ''), f_role))
CARD_H = 48 + GAP_TEXT + 28 + PAD_Y * 2 + 8
CARD_W = BAR + PAD_L + text_w + PAD_R + ((DIV_GAP * 2 + 1 + logo.width) if logo else 0)
W, H = CARD_W + SHADOW * 2, CARD_H + SHADOW * 2

canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(sh).rounded_rectangle(
    [SHADOW, SHADOW + 6, SHADOW + CARD_W, SHADOW + CARD_H + 6], R, fill=(0, 0, 0, 120))
canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(11)))

card = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
d = ImageDraw.Draw(card)
d.rounded_rectangle([0, 0, CARD_W - 1, CARD_H - 1], R, fill=BG + (240,))

# edge bar glued to the left side, following the corner radius
bar = Image.new('RGBA', (CARD_W, CARD_H), (0, 0, 0, 0))
db = ImageDraw.Draw(bar)
db.rounded_rectangle([0, 0, BAR + R, CARD_H - 1], R, fill=EDGE + (255,))
db.rectangle([BAR, 0, CARD_W, CARD_H], fill=(0, 0, 0, 0))
card.alpha_composite(bar)

x, y = BAR + PAD_L, PAD_Y
d.text((x, y - 4), K['name'], font=f_name, fill=TEXT + (255,))
if K.get('role'):
    d.text((x, y + 48 + GAP_TEXT), K['role'], font=f_role, fill=MUTED + (255,))

if logo:
    dx = x + text_w + DIV_GAP
    d.rectangle([dx, PAD_Y + 4, dx, CARD_H - PAD_Y - 4], fill=(255, 255, 255, 46))
    card.alpha_composite(logo, (dx + DIV_GAP, (CARD_H - LOGO_H) // 2))

canvas.alpha_composite(card, (SHADOW, SHADOW))
canvas.save(wpath('card.png'))
json.dump({'card_w': CARD_W, 'card_h': CARD_H, 'pad': SHADOW},
          open(wpath('card.json'), 'w'))
print(f'card {CARD_W}x{CARD_H} -> png {W}x{H} (slack {SHADOW})')
