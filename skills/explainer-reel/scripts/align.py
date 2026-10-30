"""Per-word timing OF THE SCRIPT (not of the ASR) for the captions: transcribes with word timestamps and matches by sequence.
Usage: python3 align.py script.txt <project>/public/vo.mp3 [--lang pt|en]  ->  <project>/public/vo_words.json
ASR: mlx_whisper on Apple Silicon, faster-whisper elsewhere (pip install mlx-whisper | faster-whisper)."""
import argparse, difflib, json, re, sys, unicodedata

ap = argparse.ArgumentParser()
ap.add_argument("script"); ap.add_argument("audio"); ap.add_argument("--lang", default="pt", help="ASR language (pt, en, ...)")
a = ap.parse_args()
txt, audio = a.script, a.audio
script = [w for l in open(txt) for w in l.split()]

def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))

asr = []
try:
    import mlx_whisper
    r = mlx_whisper.transcribe(audio, path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language=a.lang, word_timestamps=True)
    for s in r["segments"]:
        asr += [(w["word"].strip(), w["start"], w["end"]) for w in s.get("words", [])]
except ImportError:
    from faster_whisper import WhisperModel
    m = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(audio, language=a.lang, word_timestamps=True)
    for s in segs:
        asr += [(w.word.strip(), w.start, w.end) for w in s.words]

sa, sb = [norm(w) for w in script], [norm(w[0]) for w in asr]
times = [None] * len(script)
for blk in difflib.SequenceMatcher(None, sa, sb, autojunk=False).get_matching_blocks():
    for k in range(blk.size):
        times[blk.a + k] = (asr[blk.b + k][1], asr[blk.b + k][2])
# unmatched words (spelled-out numbers, contractions): interpolate between neighbors
known = [i for i, x in enumerate(times) if x]
if not known: sys.exit("!! alignment failed: ASR did not match the script")
for i in range(len(times)):
    if times[i]: continue
    lo = max([k for k in known if k < i], default=None); hi = min([k for k in known if k > i], default=None)
    s0 = times[lo][1] if lo is not None else 0.0
    s1 = times[hi][0] if hi is not None else s0 + 0.4
    n = (hi if hi is not None else len(times)) - (lo if lo is not None else -1)
    j = i - (lo if lo is not None else -1)
    st = s0 + (s1 - s0) * (j - 1) / n
    times[i] = (st, s0 + (s1 - s0) * j / n)
matched = len(known) / len(script)
words = [{"w": w, "s": round(t[0], 3), "e": round(t[1], 3)} for w, t in zip(script, times)]
out = audio.replace(".mp3", "_words.json")
json.dump(words, open(out, "w"), ensure_ascii=False, indent=0)
print(f"ok: {len(words)} words, {matched:.0%} matched by ASR, speech ends at {words[-1]['e']:.2f} s -> {out}")
if matched < 0.85: print("warning: under 85% matched; listen to the voice, it may have skipped or swapped words")
