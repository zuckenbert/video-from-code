"""TEST HARNESS ONLY (not part of the skill): time-stretches each sentence of a new narration so it fits the
scene windows the reference scenes were hand-timed to. Lets the reference scenes run in sync with any voice.
Usage: python3 fit_to_reference.py <project> <words_of_raw_voice.json>"""
import json, subprocess, sys, pathlib
P = pathlib.Path(sys.argv[1]); words = json.load(open(sys.argv[2]))
lines = [l.split() for l in open(P / "script/script.txt") if l.strip()]
starts = [0, 3.3, 7.65, 12.75, 16.8, 22.9, 30.65, 38.0, 43.18, 50.8]; SPEECH_END = 55.40  # ASR ends words ~0.4 s before the stretched audio tail
idx, k = [], 0
for l in lines: idx.append((k, k + len(l) - 1)); k += len(l)
assert k == len(words) and len(lines) == len(starts)
cuts = [0.0] + [(words[idx[i][1]]["e"] + words[idx[i + 1][0]]["s"]) / 2 for i in range(len(lines) - 1)] + [words[-1]["e"]]
targets = starts + [SPEECH_END]
src = P / "out/vo_raw.mp3"
if not src.exists(): (P / "public/vo.mp3").rename(src)
parts = []
for i in range(len(lines)):
    a, b = cuts[i], cuts[i + 1]; ta, tb = targets[i], targets[i + 1]
    tempo = (b - a) / (tb - ta)
    out = P / f"out/seg{i:02d}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f"atrim={a}:{b},asetpts=N/SR/TB,atempo={tempo:.5f}", "-ar", "44100", "-ac", "1", str(out)], check=True)
    parts.append(out); print(f"sentence {i + 1}: {b - a:.2f}s -> {tb - ta:.2f}s (tempo {tempo:.3f})")
lst = P / "out/segs.txt"; lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-af", "apad=pad_dur=0.6", "-b:a", "128k", str(P / "public/vo.mp3")], check=True)
print("ok: public/vo.mp3 fitted to the reference windows; now run align.py on it")
