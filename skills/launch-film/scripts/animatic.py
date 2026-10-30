#!/usr/bin/env python3
"""Animatic: the REAL archival audio and footage on the film's clock, with flat cards where the product will be.
Built before any recording, to approve the pitch and the beats. Every journey step with a `cue` shows up as a label at its
`at`, so you can hear whether "zero" really lands on the click.
usage: python3 scripts/animatic.py <lang> <public_dir> [out.mp4]   (reads src/film.json and $JOURNEY or examples/journey.json)
Needs ffmpeg and Pillow."""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANG = sys.argv[1] if len(sys.argv) > 1 else 'en'
PUB = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'public'))
OUT = os.path.abspath(sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, 'out', f'animatic_{LANG}.mp4'))
F = json.load(open(os.path.join(ROOT, 'src', 'film.json')))
J = json.load(open(os.path.join(ROOT, os.environ.get('JOURNEY', 'examples/journey.json'))))
T = F['text'].get(LANG, F['text']['en']); TH = F['theme']; W, H, FPS = F['width'], F['height'], F['fps']
SEG = tempfile.mkdtemp(prefix='animatic_'); os.makedirs(os.path.dirname(OUT), exist_ok=True)

def font_path():
    if TH.get('fontFile') and os.path.exists(os.path.join(PUB, TH['fontFile'])): return os.path.join(PUB, TH['fontFile'])
    for p in ['/System/Library/Fonts/Menlo.ttc', '/System/Library/Fonts/Monaco.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf']:
        if os.path.exists(p): return p
    raise SystemExit('no monospace TTF found: set theme.fontFile in src/film.json')
FONT = font_path()

def run(args): subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)

def png(name, lines, bg=None):
    """lines: list of (text, size, color, y). bg None = transparent overlay."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0) if bg is None else bg); d = ImageDraw.Draw(im)
    for text, size, color, y in lines:
        f = ImageFont.truetype(FONT, size); rows = text.split('\n'); lh = size * 1.3; yy = y - lh * len(rows) / 2
        for r in rows:
            d.text(((W - d.textlength(r, font=f)) / 2, yy), r, font=f, fill=color); yy += lh
    p = os.path.join(SEG, name + '.png'); im.save(p); return p

# ---- what is on screen at time t
steps = [s for s in J.get('steps', []) if s.get('at') is not None]
def active(items, t): return [x for x in items if x['at'] <= t < x['to']]
def label_at(t):
    prev = [s for s in steps if s['at'] <= t]
    if not prev: return ''
    s = prev[-1]; return f"{s['s']} @ {s['at']:.1f}" + (f"  ({s['cue']})" if s.get('cue') else '')

cuts = {0.0, float(F['duration']), float(F['recAt']), float(F['endAt'])}
for group in (F['archive'], F['cards'], F['pills']):
    for x in group: cuts |= {float(x['at']), float(x['to'])}
cuts |= {float(s['at']) for s in steps if s['at'] < F['endAt']}
cuts = sorted(c for c in cuts if 0 <= c <= F['duration'])

segs = []
for i, (a, b) in enumerate(zip(cuts, cuts[1:])):
    if b - a < 1 / FPS: continue
    mid = (a + b) / 2; out = os.path.join(SEG, f'{i:03d}.mp4')
    arch = active(F['archive'], mid); cards = active(F['cards'], mid); pills = active(F['pills'], mid)
    lines = [(T.get(c['key'], c['key']), int(c.get('size', 76) * 0.8), c.get('color', TH['ink']), c.get('y', H / 2)) for c in cards]
    if arch:
        c = arch[-1]; ov = png(f'o{i}', lines)
        vf = f"[0:v]scale=-2:{H},eq=saturation={c.get('sat', 0.85)},pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:black[b];[b][1:v]overlay=0:0[v]"
        run(['-ss', str(c['from'] + a - c['at']), '-t', str(b - a), '-i', os.path.join(PUB, c['src']), '-i', ov,
             '-filter_complex', vf, '-map', '[v]', '-an', '-r', str(FPS), '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '20', out])
    else:
        if F['recAt'] <= mid < F['endAt']:  # the product: a flat card standing in for the recording
            bg = TH['bg']; lines += [('[ product recording ]', 40, TH['ink'], H * 0.42), (label_at(mid), 34, TH['accent'], H * 0.52)]
            lines += [(T.get(p['key'], p['key']), 34, TH['ink'], H - 90) for p in pills]
        elif mid >= F['endAt']:
            bg = TH['bg']; lines += [(F['end']['wordmark'], 120, TH['ink'], H * 0.45), (T.get(F['end']['line'], ''), 40, TH['ink'], H * 0.58)]
        else:
            bg = '#000000'
        p = png(f's{i}', lines, bg=bg)
        run(['-loop', '1', '-framerate', str(FPS), '-i', p, '-t', str(b - a), '-r', str(FPS), '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '20', out])
    segs.append(out)

lst = os.path.join(SEG, 'list.txt'); open(lst, 'w').write(''.join(f"file '{s}'\n" for s in segs))
video = os.path.join(SEG, 'video.mp4'); run(['-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', video])
# audio: every archival entry placed on the film clock, radio band (300 to 3400 Hz) on the voice
ins, fc = [], []
for k, s in enumerate(F['audio']):
    ins += ['-ss', str(s['from']), '-t', str(s['dur']), '-i', os.path.join(PUB, s['src'])]
    ms = int(s['at'] * 1000); fc.append(f"[{k + 1}:a]aresample=48000,highpass=f=200,lowpass=f=5000,adelay={ms}|{ms}[a{k}]")
mix = ''.join(f'[a{k}]' for k in range(len(F['audio'])))
fc.append(f"{mix}amix=inputs={len(F['audio'])}:normalize=0,apad,atrim=0:{F['duration']}[a]")
run(['-i', video, *ins, '-filter_complex', ';'.join(fc), '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-t', str(F['duration']), OUT])
print(OUT)
