"""Narration with ElevenLabs, with per-character timestamps, saved as words with timing.
Usage: python3 tts_elevenlabs.py script.txt <project>/public/vo.mp3 [--voice ID] [--speed 1.15] [--model eleven_multilingual_v2]
Also writes <project>/public/vo_words.json. Key: ELEVENLABS_API_KEY environment variable only.
Default voice: JBFqnCBsd6RMkjVDRZzb ("George", a premade public voice of the ElevenLabs library).
eleven_multilingual_v2 detects the language from the text (pt and en both work); pick a voice that
suits the language and keep it for every video of the series."""
import argparse, base64, json, os, sys, urllib.error, urllib.request

ap = argparse.ArgumentParser()
ap.add_argument("script"); ap.add_argument("out_mp3")
ap.add_argument("--voice", default="JBFqnCBsd6RMkjVDRZzb")
ap.add_argument("--speed", type=float, default=1.15)
ap.add_argument("--model", default="eleven_multilingual_v2")
a = ap.parse_args()
text = " ".join(l.strip() for l in open(a.script) if l.strip())
key = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("!! ELEVENLABS_API_KEY not set: use tts_kokoro.py")

req = urllib.request.Request(
    f"https://api.elevenlabs.io/v1/text-to-speech/{a.voice}/with-timestamps?output_format=mp3_44100_128",
    data=json.dumps({
        "text": text,
        "model_id": a.model,
        "voice_settings": {"stability": 0.38, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True, "speed": a.speed},
    }).encode(),
    headers={"xi-api-key": key, "Content-Type": "application/json", "User-Agent": "curl/8"},
)
try:
    d = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f"!! ElevenLabs {e.code}: {e.read()[:300]!r}")
open(a.out_mp3, "wb").write(base64.b64decode(d["audio_base64"]))

al = d["alignment"]
chars, st, en = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
words, cur = [], None
for c, s, e in zip(chars, st, en):
    if c.isspace():
        if cur: words.append(cur); cur = None
        continue
    if cur is None: cur = {"w": c, "s": s, "e": e}
    else: cur["w"] += c; cur["e"] = e
if cur: words.append(cur)
json.dump(words, open(a.out_mp3.replace(".mp3", "_words.json"), "w"), ensure_ascii=False, indent=0)
print(len(words), "words,", round(words[-1]["e"], 2), "s")
