#!/usr/bin/env python3
"""Renders the plan.json clips: shared screen + face (PiP) + burned-in captions.

Usage:
  python3 scripts/render.py                 # everything in plan.json
  python3 scripts/render.py left            # only what matches the filter (slug or speaker)
  python3 scripts/render.py --config other.json

Two modes per clip, picked automatically by sampling the frame:
  slide_pip     shared screen full bleed + camera PiP in the corner
  talking_head  speaker full screen (stretch without screen sharing)

Three ffmpeg traps this file already works around:
  1. scale to a non-proportional size leaves the SAR different from 1, and the next
     overlay delivers a frame with an odd height. x264 dies with "height not
     divisible by 2 / Invalid argument" without ever mentioning SAR. Always
     setsar=1 after scale+pad.
  2. crop with an odd offset or height in yuv420p is also Invalid argument.
     Round everything to even.
  3. A cut landed on the silence drags in the conjunction of the next sentence
     ("...the other one. And"). snap() steps back one token in that case.
"""
import io, json, os, subprocess, sys, tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C
import cues as cues_mod


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd[:8]), '...')
        print(r.stderr[-2500:])
        raise SystemExit(1)
    return r


# ------------------------------------------------------------------ detection
def frame_gray(src, t):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', src, '-frames:v', '1',
                        '-f', 'image2pipe', '-vcodec', 'png', '-'], capture_output=True)
    return np.array(Image.open(io.BytesIO(r.stdout)).convert('L'))


def share_box(cfg, t):
    """bbox of the shared content; None when nothing is being shared.

    Heuristic for a call recording with a composite layout (content on the left,
    camera tiles on the right): looks at the left part and finds where the content
    starts and ends. If the right strip has picture OUTSIDE the tile rectangle,
    the camera is full screen, which means: no screen sharing.
    """
    sd = cfg["share_detect"]
    H = cfg["output"]["height"]
    g = frame_gray(cfg["video"], t)
    split = sd["split_x"]
    left = g[:, :split]
    rows = np.where(left.max(axis=1) > sd["threshold"])[0]
    if len(rows) == 0:
        return None
    y0, y1 = int(rows[0]), int(rows[-1])
    tw, th, tx, ty = cfg["pip"]["source_crop"]
    slack = sd["tile_slack"]        # slack: the tile border does not count as "outside"
    right = g[:, split:]
    outside = np.concatenate([right[:max(0, ty - slack), :],
                              right[min(H, ty + th + slack):, :]])
    if outside.size and outside.max() > sd["outside_threshold"]:
        return None
    h = min(y1 - y0 + 1, H - y0)
    y0 += y0 % 2
    h -= h % 2
    return (0, y0, split, min(h, H - y0))


# ------------------------------------------------------------------ captions
def cap_png(cfg, fonts, lines, path, bottom):
    cap, th = cfg["caption"], cfg["theme"]
    W, H = cfg["output"]["width"], cfg["output"]["height"]
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fnt, lh = fonts['cap'], cap["line_height"]
    widest = max(d.textlength(''.join(r[0] for r in ln), font=fnt) for ln in lines)
    if widest > cap["max_width"]:            # keeps the line from running into the PiP
        size = max(cap["min_size"], int(cap["size"] * cap["max_width"] / widest))
        fnt = ImageFont.truetype(th["font_bold"], size)
        lh = int(cap["line_height"] * size / cap["size"])
    y0 = H - bottom - len(lines) * lh
    for i, runs in enumerate(lines):
        y = y0 + i * lh
        for pass_ in (0, 1):                 # 1st pass outline, 2nd pass fill
            x = cap["x"]
            for run_txt, hot in runs:
                if pass_ == 0:
                    d.text((x, y), run_txt, font=fnt, fill=(0, 0, 0, 235),
                           stroke_width=cap["stroke"], stroke_fill=(0, 0, 0, 235))
                else:
                    color = th["_accent"] if hot else th["_text"]
                    d.text((x, y), run_txt, font=fnt, fill=color + (255,))
                x += d.textlength(run_txt, font=fnt)
    img.save(path)


def card_png(cfg, fonts, name, role, path):
    """lower third: accent bar, name, role and optional logo. returns the padding of
    the shadow halo, which the overlay has to subtract from the position."""
    lt, th = cfg["lower_third"], cfg["theme"]
    F_NAME, F_ROLE = fonts['name'], fonts['role']
    logo = None
    if th["logo"]:
        logo = Image.open(th["logo"]).convert('RGBA')
        lh = lt["logo_height"]
        logo = logo.resize((round(logo.width * lh / logo.height), lh), Image.LANCZOS)
    probe = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
    tw = lambda t, f: probe.textbbox((0, 0), t, font=f)[2]
    BAR, PAD_L, PAD_R, PAD_Y, GAP, DIV, R, SH = 9, 32, 34, 24, 6, 30, 14, 26
    NS, RS = lt["name_size"], lt["role_size"]
    text_w = max(tw(name, F_NAME), tw(role, F_ROLE) if role else 0)
    cw = BAR + PAD_L + text_w + PAD_R + ((DIV * 2 + 1 + logo.width) if logo else 0)
    ch = NS + GAP + RS + PAD_Y * 2 + 8
    canvas = Image.new('RGBA', (cw + SH * 2, ch + SH * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([SH, SH + 6, SH + cw, SH + ch + 6], R, fill=(0, 0, 0, 120))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(11)))
    card = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle([0, 0, cw - 1, ch - 1], R, fill=th["_bg"] + (240,))
    bar = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))     # bar only on the left edge,
    db = ImageDraw.Draw(bar)                            # with the same radius as the card
    db.rounded_rectangle([0, 0, BAR + R, ch - 1], R, fill=th["_bar"] + (255,))
    db.rectangle([BAR, 0, cw, ch], fill=(0, 0, 0, 0))
    card.alpha_composite(bar)
    x, y = BAR + PAD_L, PAD_Y
    d.text((x, y - 4), name, font=F_NAME, fill=th["_text"] + (255,))
    if role:
        d.text((x, y + NS + GAP), role, font=F_ROLE, fill=th["_muted"] + (255,))
    if logo:
        dx = x + text_w + DIV
        d.rectangle([dx, PAD_Y + 4, dx, ch - PAD_Y - 4], fill=(255, 255, 255, 46))
        card.alpha_composite(logo, (dx + DIV, (ch - logo.height) // 2))
    canvas.alpha_composite(card, (SH, SH))
    canvas.save(path)
    return SH, ch


# ------------------------------------------------------------------ cut
def snap(cfg, words, t0, t1):
    """lands the cut on the silence between words.
    returns (cut_in, cut_out, speech_in, speech_out): the cut has slack, the speech does not."""
    ORF = set(cfg["lexicon"]["orphans"])
    cand_a = [w for w in words if abs(w['start'] - t0) < 6]
    a = min(cand_a, key=lambda w: abs(w['start'] - t0))['start'] if cand_a else t0
    cand_b = [w for w in words if abs(w['end'] - t1) < 6]
    b = min(cand_b, key=lambda w: abs(w['end'] - t1))['end'] if cand_b else t1
    idx = {round(w['end'], 3): i for i, w in enumerate(words)}
    i = idx.get(round(b, 3))
    for _ in range(2):                       # never end the cut on a loose conjunction
        if i is None or i == 0:
            break
        t = words[i]['text'].strip('.,!?;:"').lower()
        if t in ORF and words[i-1]['text'].rstrip('"').endswith(('.', '!', '?')):
            i -= 1
            b = words[i]['end']
        else:
            break
    j = next((k for k, w in enumerate(words) if abs(w['start'] - a) < 0.001), None)
    if j and j > 0:                          # never start by cutting off a glued article/pronoun
        pw = words[j-1]
        if a - pw['end'] < 0.22 and len(pw['text'].strip()) <= 3 \
                and not pw['text'].rstrip('"').endswith(('.', '!', '?')):
            a = pw['start']
    prev = [w['end'] for w in words if w['end'] <= a - 0.01]
    nxt = [w['start'] for w in words if w['start'] >= b + 0.01]
    gap_a = a - max(prev) if prev else 0.6
    gap_b = (min(nxt) - b) if nxt else 0.6
    return (a - min(0.30, max(0.10, gap_a * 0.5)),
            b + min(0.45, max(0.14, gap_b * 0.5)), a, b)


def clip_cues(cfg, words, fa, fb, a):
    sub = [(w['start'] - a, w['end'] - a, w['text'])
           for w in words if w['start'] >= fa - 0.05 and w['end'] <= fb + 0.05]
    return cues_mod.build(sub, cfg)


def load_words(cfg):
    p = os.path.join(cfg["workdir"], "scribe.json")
    if not os.path.exists(p):
        raise SystemExit(f"missing {p}: run scripts/transcribe.py first")
    d = json.load(open(p))
    return [w for w in d["words"] if w.get("type") == "word"]


def load_plan(cfg):
    p = os.path.join(cfg["_root"], "plan.json")
    raw = json.load(open(p))
    out = []
    for e in raw:
        if isinstance(e, dict):
            out.append((e["speaker"], e["slug"], float(e["in"]), float(e["out"])))
        else:                                # short form [speaker, slug, in, out]
            out.append((e[0], e[1], float(e[2]), float(e[3])))
    return out


# ------------------------------------------------------------------ render
def render(cfg, fonts, words, speaker, slug, t0, t1):
    who = cfg["speakers"].get(speaker, {})
    name, role = who.get("name", speaker), who.get("role", "")
    out_cfg, cap, lt, pip = cfg["output"], cfg["caption"], cfg["lower_third"], cfg["pip"]
    W, H, FPS = out_cfg["width"], out_cfg["height"], out_cfg["fps"]

    a, b, fa, fb = snap(cfg, words, t0, t1)
    dur = b - a

    boxes = ([share_box(cfg, a + dur * f) for f in cfg["share_detect"]["probe_at"]]
             if pip["enabled"] else [])
    share = next((x for x in boxes if x), None)
    mode = 'slide_pip' if sum(1 for x in boxes if x) >= 2 else 'talking_head'

    cs = clip_cues(cfg, words, fa, fb, a)

    tmp = tempfile.mkdtemp()
    card_out = lt["out"] if lt["enabled"] else -1
    pngs = []
    for i, c in enumerate(cs):
        raised = lt["enabled"] and c['start'] < card_out + lt["fade"] and c['end'] > lt["in"]
        p = f'{tmp}/c{i}.png'
        cap_png(cfg, fonts, c['lines'], p, cap["bottom_raised"] if raised else cap["bottom"])
        pngs.append((p, c['start'], c['end']))

    def fit(iw, ih):
        k = min(W / iw, H / ih)
        sw, sh = int(iw * k) // 2 * 2, int(ih * k) // 2 * 2
        return sw, sh, (W - sw) // 2 // 2 * 2, (H - sh) // 2 // 2 * 2

    bg = '0x%02X%02X%02X' % cfg["theme"]["_bg"]
    if mode == 'slide_pip':
        x, y, w, h = share
        sw, sh, ox, oy = fit(w, h)
        tw_, th_, tx, ty = pip["source_crop"]
        bd = pip["border"]
        base = (f"[0:v]split=2[sa][sb];"
                f"[sa]crop={w}:{h}:{x}:{y},scale={sw}:{sh}:flags=lanczos,"
                f"pad={W}:{H}:{ox}:{oy}:color={bg},setsar=1[slide];"
                f"[sb]crop={tw_}:{th_}:{tx}:{ty},"
                f"scale={pip['w']-2*bd}:{pip['h']-2*bd}:flags=lanczos,"
                f"pad={pip['w']}:{pip['h']}:{bd}:{bd}:color={bg},setsar=1[pip];"
                f"[slide][pip]overlay={pip['x']}:{pip['y']}[bg]")
    else:
        sw, sh, ox, oy = fit(W, H)
        base = (f"[0:v]scale={sw}:{sh}:flags=lanczos,"
                f"pad={W}:{H}:{ox}:{oy}:color={bg},setsar=1[bg]")

    inputs = ['-ss', f'{a:.3f}', '-t', f'{dur:.3f}', '-i', cfg["video"]]
    fc = [base]
    last = 'bg'
    if lt["enabled"]:
        cardp = f'{tmp}/card.png'
        pad, card_h = card_png(cfg, fonts, name, role, cardp)
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', f'{dur:.3f}', '-i', cardp]
        fc.append(f"[1:v]format=rgba,fade=in:st={lt['in']}:d=0.45:alpha=1,"
                  f"fade=out:st={lt['out']}:d={lt['fade']}:alpha=1[card]")
        cy = H - cap["bottom"] - card_h - pad - 52     # the card sits above the captions
        fc.append(f"[bg][card]overlay={cap['x']-6-pad}:{cy}:"
                  f"enable='between(t,{lt['in']},{lt['out']+lt['fade']})'[v0]")
        last = 'v0'
    off = 2 if lt["enabled"] else 1
    for p, _, _ in pngs:
        inputs += ['-i', p]
    for i, (p, s, e) in enumerate(pngs):
        lbl = f'k{i}'
        fc.append(f"[{last}][{i+off}:v]overlay=0:0:enable='between(t,{s:.3f},{e:.3f})'[{lbl}]")
        last = lbl
    fc.append(f"[{last}]format=yuv420p[vout]")

    outdir = os.path.join(cfg["outdir"], speaker)
    os.makedirs(outdir, exist_ok=True)
    out = os.path.join(outdir, f'{slug}.mp4')
    run(['ffmpeg', '-y', '-v', 'error', *inputs,
         '-filter_complex', ';'.join(fc), '-map', '[vout]', '-map', '0:a',
         '-af', 'afade=in:st=0:d=0.03,afade=out:st=%.3f:d=0.05,'
                'loudnorm=I=%d:TP=-1.5:LRA=11' % (dur - 0.05, out_cfg["loudness"]),
         '-c:v', 'libx264', '-crf', str(out_cfg["crf"]), '-preset', 'medium',
         '-r', str(FPS), '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out])

    with open(os.path.join(outdir, f'{slug}.srt'), 'w') as f:
        ts = lambda t: f'{int(t//3600):02d}:{int(t%3600//60):02d}:{t%60:06.3f}'.replace('.', ',')
        for i, c in enumerate(cs, 1):
            body = '\n'.join(''.join(r[0] for r in l) for l in c['lines'])
            f.write(f'{i}\n{ts(c["start"])} --> {ts(c["end"])}\n{body}\n\n')

    return {'speaker': speaker, 'slug': slug, 'in': round(a, 2), 'out': round(b, 2),
            'dur': round(dur, 1), 'mode': mode, 'cues': len(cs), 'file': out}


def build_fonts(cfg):
    th, cap, lt = cfg["theme"], cfg["caption"], cfg["lower_third"]
    return {'cap': ImageFont.truetype(th["font_bold"], cap["size"]),
            'name': ImageFont.truetype(th["font_bold"], lt["name_size"]),
            'role': ImageFont.truetype(th["font_medium"], lt["role_size"])}


def main():
    argv = sys.argv[1:]
    cfgpath = None
    if '--config' in argv:
        i = argv.index('--config')
        cfgpath = argv[i+1]
        argv = argv[:i] + argv[i+2:]
    only = argv[0] if argv else None

    cfg = C.load(cfgpath)
    fonts = build_fonts(cfg)
    words = load_words(cfg)
    res = []
    for speaker, slug, t0, t1 in load_plan(cfg):
        if only and only not in slug and only != speaker:
            continue
        r = render(cfg, fonts, words, speaker, slug, t0, t1)
        print(f"[ok] {speaker}/{slug}  {r['dur']}s  {r['mode']}  {r['cues']} cues")
        res.append(r)
    if not res:
        print("nothing matched the filter")
        return
    p = os.path.join(cfg["workdir"], "result.json")
    json.dump(res, open(p, "w"), ensure_ascii=False, indent=1)
    print(f"-> {p}")


if __name__ == '__main__':
    main()
