#!/usr/bin/env python3
"""Grabs frames from the video to measure the layout and check the detection.

Usage:
  python3 scripts/probe.py 130 900 2450        # frames at these seconds
  python3 scripts/probe.py --grid 12           # 12 frames spread over the video

Output in workdir/probe/. Open the PNGs and measure the camera tile rectangle to
fill pip.source_crop = [width, height, x, y] in config.json. Next to each frame
the script prints what share_box() found at that instant, which is what decides
between slide_pip and talking_head.
"""
import os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C
import render as R


def duration(src):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                        '-of', 'csv=p=0', src], capture_output=True, text=True)
    return float(r.stdout.strip())


def main():
    argv = sys.argv[1:]
    cfgpath = None
    if '--config' in argv:
        i = argv.index('--config')
        cfgpath = argv[i+1]
        argv = argv[:i] + argv[i+2:]
    cfg = C.load(cfgpath)

    if '--grid' in argv:
        n = int(argv[argv.index('--grid') + 1])
        d = duration(cfg["video"])
        times = [d * (k + 0.5) / n for k in range(n)]
    else:
        times = [float(x) for x in argv]
    if not times:
        raise SystemExit("pass seconds or --grid N")

    out = os.path.join(cfg["workdir"], "probe")
    os.makedirs(out, exist_ok=True)
    for t in times:
        p = os.path.join(out, f"{t:07.1f}.png")
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', cfg["video"],
                        '-frames:v', '1', p], check=True)
        box = R.share_box(cfg, t)
        print(f"{t:8.1f}s  {'share ' + str(box) if box else 'no share (talking head)'}  {p}")


if __name__ == '__main__':
    main()
