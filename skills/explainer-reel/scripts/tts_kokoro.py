"""Local voice without a key (ElevenLabs fallback): Kokoro-82M on CPU, then aligns the script words (align.py).
Usage: python3 tts_kokoro.py script.txt <project>/public/vo.mp3 [--lang pt|en] [--voice NAME] [--speed 1.15]
Install once: pip install kokoro soundfile mlx-whisper (or faster-whisper off Apple Silicon); pt also needs espeak-ng
(macOS: brew install espeak-ng; Linux: apt-get install -y espeak-ng).
Voices: pt-BR pm_alex, pm_santa (male), pf_dora (female); en-US am_michael, am_adam (male), af_heart, af_bella (female)."""
import argparse, os, subprocess, sys
import numpy as np
import soundfile as sf
from kokoro import KPipeline

LANGS = {"pt": ("p", "pm_alex"), "en": ("a", "am_michael")}
ap = argparse.ArgumentParser()
ap.add_argument("script"); ap.add_argument("out_mp3")
ap.add_argument("--lang", default="pt", choices=sorted(LANGS))
ap.add_argument("--voice"); ap.add_argument("--speed", type=float, default=1.15)
a = ap.parse_args()
code, default_voice = LANGS[a.lang]
text = " ".join(l.strip() for l in open(a.script) if l.strip())
pipe = KPipeline(lang_code=code, repo_id="hexgrad/Kokoro-82M")
gap = np.zeros(int(24000 * 0.18), dtype=np.float32)
parts = []
for _, _, audio in pipe(text, voice=a.voice or default_voice, speed=a.speed, split_pattern=r"(?<=[.?!:])\s+"):
    parts += [np.asarray(audio, dtype=np.float32), gap]
wav = a.out_mp3.replace(".mp3", ".wav")
sf.write(wav, np.concatenate(parts), 24000)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ar", "44100", "-b:a", "192k", a.out_mp3], check=True)
os.remove(wav)
subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "align.py"), a.script, a.out_mp3, "--lang", a.lang], check=True)
