"""Character mouth: opening level (0 to 4) per frame, at 30 fps, from the loudness of the narration.
Usage: python3 mouth.py <project>   (reads public/vo.mp3 and public/vo_words.json, writes public/vo_mouth.json)
Outside words the mouth closes; inside, it follows the envelope with fast attack and short release,
which gives syllable-like flapping without any phoneme model."""
import json, subprocess, sys
import numpy as np

P = sys.argv[1]
SR, FPS = 16000, 30
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{P}/public/vo.mp3", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32)
hop = SR // FPS
n = len(x) // hop
rms = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
env = np.zeros(n)
for i in range(n):  # instant attack, ~2 frame release
    env[i] = rms[i] if i == 0 or rms[i] > env[i - 1] else env[i - 1] * 0.55 + rms[i] * 0.45
words = json.load(open(f"{P}/public/vo_words.json"))
inside = np.zeros(n, bool)
for w in words:
    inside[int(w["s"] * FPS):int(w["e"] * FPS) + 1] = True
ref = np.percentile(env[inside], 85) if inside.any() else 1
v = np.clip(env / ref, 0, 1) * inside
lv = np.digitize(v, [0.08, 0.2, 0.36, 0.56]).astype(int)
# flapping: a mouth held open for 2 frames drops 2 levels on the next one (reads as a syllable)
for i in range(2, n):
    if lv[i] >= 2 and lv[i] == lv[i - 1] == lv[i - 2]:
        lv[i] -= 2
json.dump(lv.tolist(), open(f"{P}/public/vo_mouth.json", "w"))
print(f"ok: {n} frames, mouth open {np.mean(lv > 0):.0%} of the time, levels {np.bincount(lv, minlength=5).tolist()}")
