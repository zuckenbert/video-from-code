#!/usr/bin/env python3
"""Extracts the audio from the video and transcribes it with PER-WORD timestamps and diarization.

Usage: python3 scripts/transcribe.py [config.json]

Why ElevenLabs Scribe and not whisper: we need (a) per-word timestamps matched to
the original video, to land each cut on the silence between words, and (b)
diarization, to know who said what. Local whisper solves (a) with -ml 1 but not (b).

Requires ELEVENLABS_API_KEY in the environment. Reuses audio.mp3 and does not
overwrite scribe.json if it already exists (use --force).
"""
import json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C

ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text"


def main():
    argv = [a for a in sys.argv[1:] if a != '--force']
    force = '--force' in sys.argv
    cfg = C.load(argv[0] if argv else None)
    os.makedirs(cfg["workdir"], exist_ok=True)
    audio = os.path.join(cfg["workdir"], "audio.mp3")
    out = os.path.join(cfg["workdir"], "scribe.json")

    if os.path.exists(out) and not force:
        print(f"{out} already exists (use --force to redo it)")
        return

    if not os.path.exists(cfg["video"]):
        raise SystemExit(f"video not found: {cfg['video']}")

    if not os.path.exists(audio):
        print("extracting audio...", file=sys.stderr)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", cfg["video"],
                        "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio], check=True)

    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is missing from the environment")

    import requests
    print("transcribing (may take minutes)...", file=sys.stderr)
    r = requests.post(
        ENDPOINT,
        headers={"xi-api-key": key},
        files={"file": open(audio, "rb")},
        data={"model_id": "scribe_v1",
              "language_code": cfg["language_code"],
              "diarize": "true",
              "timestamps_granularity": "word",
              "num_speakers": str(cfg["num_speakers"])},
        timeout=3600,
    )
    if r.status_code != 200:
        print(r.status_code, r.text[:2000], file=sys.stderr)
        sys.exit(1)
    json.dump(r.json(), open(out, "w"), ensure_ascii=False)
    print(f"ok -> {out}")


if __name__ == "__main__":
    main()
