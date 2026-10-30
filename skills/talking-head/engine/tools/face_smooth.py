"""Smooth the face track: fill gaps, moving median (9 samples) then gaussian (~3 s at 0.25 s/sample).
Without this the crop shakes and jumps.
usage: face_smooth.py <face_raw.json> <face.json>   -> [{"t", "cx", "cy"}] normalized 0..1"""
import json, sys, numpy as np
src, out = sys.argv[1], sys.argv[2]
f = json.load(open(src))
boxes = [r['box'] for r in f]
first = next(b for b in boxes if b)
last = first
for i, b in enumerate(boxes):
    if b is None: boxes[i] = last
    else: last = b
cx = np.array([b[0] + b[2] / 2 for b in boxes]); cy = np.array([b[1] + b[3] / 2 for b in boxes])
def smooth(a, med=9, sig=6):
    m = np.array([np.median(a[max(0, i - med // 2):i + med // 2 + 1]) for i in range(len(a))])
    k = np.exp(-0.5 * (np.arange(-3 * sig, 3 * sig + 1) / sig) ** 2); k /= k.sum()
    return np.convolve(np.pad(m, 3 * sig, mode='edge'), k, mode='valid')
sx, sy = smooth(cx), smooth(cy)
json.dump([{'t': r['t'], 'cx': round(float(x), 4), 'cy': round(float(y), 4)} for r, x, y in zip(f, sx, sy)], open(out, 'w'))
print('cx', round(float(sx.min()), 3), round(float(sx.max()), 3), 'cy', round(float(sy.min()), 3), round(float(sy.max()), 3), 'max step', round(float(np.abs(np.diff(sx)).max()), 4))
