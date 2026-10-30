"""Track the face by sampling (every ~0.25 s) and write one normalized bbox per sample.
usage: face_track.py <video.mp4> <face_raw.json>   (then run face_smooth.py)
OpenCV Haar cascade; pin opencv-python-headless==4.10.0.84 (5.x dropped CascadeClassifier)."""
import cv2, json, sys
src, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS); W = cap.get(3); H = cap.get(4)
det = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
step = max(1, int(round(fps * 0.25)))
res = []; i = 0; last = None
while True:
    ok, fr = cap.read()
    if not ok: break
    if i % step == 0:
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        faces = det.detectMultiScale(g, 1.2, 5, minSize=(120, 120))
        if len(faces):
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            last = [round(x / W, 4), round(y / H, 4), round(w / W, 4), round(h / H, 4)]
        res.append({'t': round(i / fps, 3), 'box': last})
    i += 1
json.dump(res, open(out, 'w'))
xs = [r['box'][0] + r['box'][2] / 2 for r in res if r['box']]
print(len(res), 'samples;', sum(1 for r in res if r['box']), 'with face; cx mean', round(sum(xs) / len(xs), 3), 'min', round(min(xs), 3), 'max', round(max(xs), 3))
