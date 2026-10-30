"""Draws a placeholder character that satisfies the sprite contract, so a project renders before you have
your own art. Geometric face with Pillow: m0..m4 (mouth closed to wide open), blink, blink_half, arm.
Usage: python3 placeholder_character.py <project>/public/character
Output: 346 x 375 RGBA sprites, all aligned (only eyes and mouth change), plus arm.png 150 x 97 with its
pivot at (18, 52), placed at (196, 248) of the sprite. These are the values in template/character.json."""
import os, sys
from PIL import Image, ImageDraw

OUT = sys.argv[1] if len(sys.argv) > 1 else "public/character"
os.makedirs(OUT, exist_ok=True)
W, H, S = 346, 375, 4  # sprite size and supersampling factor
INK, BODY, BELLY, WHITE, MOUTH, TONGUE = (18, 20, 26, 255), (29, 74, 165, 255), (129, 149, 176, 255), (251, 249, 244, 255), (60, 20, 30, 255), (229, 72, 77, 255)  # Ink, Cobalt, Slate, Field
LW = 6


def canvas(w=W, h=H):
    im = Image.new("RGBA", (w * S, h * S), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def box(x0, y0, x1, y1):
    return [x0 * S, y0 * S, x1 * S, y1 * S]


def body(d):
    d.ellipse(box(110, 340, 236, 372), fill=(0, 0, 0, 40))                       # floor shadow
    for fx in (128, 196):                                                          # feet
        d.rounded_rectangle(box(fx, 330, fx + 34, 360), radius=10 * S, fill=INK)
    d.ellipse(box(33, 70, 313, 350), fill=INK)                                    # body outline
    d.ellipse(box(33 + LW, 70 + LW, 313 - LW, 350 - LW), fill=BODY)
    d.ellipse(box(98, 230, 248, 335), fill=BELLY)                                 # belly


def eyes(d, state):
    for cx in (128, 218):
        cy = 175
        if state == "blink":
            d.line(box(cx - 26, cy + 4, cx + 26, cy + 4), fill=INK, width=LW * S)
            continue
        d.ellipse(box(cx - 28, cy - 30, cx + 28, cy + 30), fill=INK)
        d.ellipse(box(cx - 28 + LW, cy - 30 + LW, cx + 28 - LW, cy + 30 - LW), fill=WHITE)
        d.ellipse(box(cx - 11, cy - 6, cx + 11, cy + 16), fill=INK)
        if state == "half":  # upper lid down to the middle of the eye
            d.chord(box(cx - 28, cy - 30, cx + 28, cy + 30), 180, 360, fill=BODY, outline=INK, width=LW * S)
            d.line(box(cx - 28, cy, cx + 28, cy), fill=INK, width=LW * S)


def mouth(d, level):
    cx, cy = 173, 248
    if level == 0:
        d.arc(box(cx - 34, cy - 22, cx + 34, cy + 10), 20, 160, fill=INK, width=LW * S)
        return
    h = [0, 14, 26, 40, 56][level]
    w = [0, 46, 56, 64, 72][level]
    d.ellipse(box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), fill=INK)
    d.ellipse(box(cx - w / 2 + 5, cy - h / 2 + 5, cx + w / 2 - 5, cy + h / 2 - 5), fill=MOUTH)
    if level >= 2:
        d.chord(box(cx - w / 3, cy, cx + w / 3, cy + h / 2 - 5), 0, 180, fill=TONGUE)


def save(im, name, w=W, h=H):
    im.resize((w, h), Image.LANCZOS).save(os.path.join(OUT, name + ".png"))


for lv in range(5):
    im, d = canvas(); body(d); eyes(d, "open"); mouth(d, lv); save(im, f"m{lv}")
for name, st in (("blink", "blink"), ("blink_half", "half")):
    im, d = canvas(); body(d); eyes(d, st); mouth(d, 0); save(im, name)

# arm: capsule from the pivot (18, 52) down-right; at rest it lies along the right side of the body
AW, AH = 150, 97
im, d = canvas(AW, AH)
d.line(box(18, 52, 120, 76), fill=INK, width=34 * S)
d.line(box(18, 52, 120, 76), fill=BODY, width=(34 - 2 * LW) * S)
for x, y in ((18, 52), (120, 76)):
    d.ellipse(box(x - 17, y - 17, x + 17, y + 17), fill=INK)
    d.ellipse(box(x - 17 + LW, y - 17 + LW, x + 17 - LW, y + 17 - LW), fill=BODY)
save(im, "arm", AW, AH)
print(sorted(os.listdir(OUT)))
