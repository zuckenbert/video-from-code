"""Cut the person out of the background frame by frame (rembg u2net_human_seg), with temporal smoothing
of the mask, and write WebP with alpha to <out_dir>/f%05d.webp. Used by the Cutout component.
usage: cutout.py <video.mp4> <out_dir> [--zero X0 Y0 X1 Y1]
  --zero clears the mask inside a pixel rectangle (e.g. a meeting app name tag in a corner).
Needs requirements-cutout.txt. Known defect: a bright lamp behind the head can leak into the mask;
inpaint it in the source first or erode the mask more."""
import argparse, os
import cv2, numpy as np
from rembg import remove, new_session

ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--zero', nargs=4, type=int)
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)
cap = cv2.VideoCapture(a.src); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); fps = cap.get(cv2.CAP_PROP_FPS)
s = new_session('u2net_human_seg')
prev = None; i = 0
while True:
    ok, fr = cap.read()
    if not ok: break
    m = np.array(remove(cv2.cvtColor(fr, cv2.COLOR_BGR2RGB), session=s, only_mask=True)).astype(np.float32) / 255
    if a.zero:
        x0, y0, x1, y1 = a.zero; m[y0:y1, x0:x1] = 0
    m = cv2.GaussianBlur(m, (0, 0), 1.2)
    if prev is not None: m = 0.65 * m + 0.35 * prev
    prev = m
    alpha = (np.clip(m, 0, 1) * 255).astype(np.uint8)
    cv2.imwrite(f'{a.out}/f{i:05d}.webp', np.dstack([fr, alpha]), [cv2.IMWRITE_WEBP_QUALITY, 88])
    i += 1
    if i % 100 == 0: print(i, '/', n, flush=True)
print('done', i, 'frames at', fps, 'fps')
