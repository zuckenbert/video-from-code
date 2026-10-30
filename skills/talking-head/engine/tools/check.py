#!/usr/bin/env python3
"""Automatic reviewer of a rendered MP4, by pixel, at 10 frames per second.

  black    near-black / near-flat frame (nothing on screen)
  static   nothing moves for more than --static seconds (a still zoom bores)
  safe     content touching the safe-area margins (96 px sides, 64 px top/bottom)
  flash    abrupt brightness jump between neighboring frames (cut pop without fade)
usage: tools/check.py out/video.mp4 [--static 2.5] [--json]
"""
import sys, subprocess, json, argparse, tempfile, os
import numpy as np
from PIL import Image

FPS = 10
SAFE_X, SAFE_Y = 96, 64

def size(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True, check=True)
    w, h = r.stdout.strip().split(',')[:2]
    return int(w), int(h)

def frames(path, w, h):
    d = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={FPS},scale={w}:{h}', f'{d}/f%05d.png'], check=True)
    for i, n in enumerate(sorted(os.listdir(d))):
        yield i / FPS, np.asarray(Image.open(f'{d}/{n}').convert('L'), dtype=np.float32)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('mp4'); ap.add_argument('--static', type=float, default=2.5); ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    w, h = size(a.mp4)
    issues = []
    prev = None; static_since = None; last_t = 0
    for t, g in frames(a.mp4, w, h):
        last_t = t
        mean = g.mean(); std = g.std()
        if std < 2:
            issues.append(('black', t, f'flat frame, nothing on screen (mean {mean:.0f})'))
        # safe area: compare the margin with the background (median of the margin); content = pixel far from it
        edge = np.concatenate([g[:SAFE_Y].ravel(), g[-SAFE_Y:].ravel(), g[:, :SAFE_X].ravel(), g[:, -SAFE_X:].ravel()])
        bg = np.median(edge)
        inner_bg = np.median(g[SAFE_Y:-SAFE_Y, SAFE_X:-SAFE_X])
        # only meaningful on a flat stage (margin background = center background); full-screen video is skipped
        if abs(bg - inner_bg) < 8 and std > 2 and edge.std() < 25:
            frac = (np.abs(edge - bg) > 40).mean()
            if frac > 0.02:
                issues.append(('safe', t, f'{frac*100:.1f}% of the margin has content'))
        if prev is not None:
            diff = np.abs(g - prev).mean()
            if diff < 0.15:
                if static_since is None: static_since = t - 1 / FPS
            else:
                if static_since is not None and t - static_since >= a.static:
                    issues.append(('static', static_since, f'still for {t - static_since:.1f}s'))
                static_since = None
            if abs(mean - prev.mean()) > 60:
                issues.append(('flash', t, f'brightness jump {prev.mean():.0f} -> {mean:.0f}'))
        prev = g
    if static_since is not None and last_t - static_since >= a.static:
        issues.append(('static', static_since, f'still for {last_t - static_since:.1f}s (until the end)'))
    grouped = []  # merge same-kind findings into continuous ranges (0.5 s tolerance)
    for k, t, m in issues:
        if grouped and grouped[-1][0] == k and t - grouped[-1][2] <= 0.5 and k in ('safe', 'black'):
            grouped[-1][2] = t; grouped[-1][4] += 1
        else:
            grouped.append([k, t, t, m, 1])
    issues = [(k, t0, f'{m}' + (f' ... until {t1:.2f}s ({n} frames)' if n > 1 else '')) for k, t0, t1, m, n in grouped]
    if a.json:
        print(json.dumps([{'kind': k, 't': round(t, 2), 'msg': m} for k, t, m in issues])); return
    print(f'{a.mp4}: {len(issues)} finding(s)')
    for k, t, m in issues:
        print(f'  [{k:6}] {t:6.2f}s  {m}')

if __name__ == '__main__':
    main()
