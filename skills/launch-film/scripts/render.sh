#!/usr/bin/env bash
# Renders a composition and normalizes the audio to -14 LUFS (measure integrated loudness, apply a FIXED gain, then a
# peak limiter; loudnorm, even in two passes, falls back to dynamic mode and lifts quiet passages).
# usage: [PUBLIC_DIR=public] scripts/render.sh <CompId> [out/<name>.mp4]
set -eo pipefail
cd "$(dirname "$0")/.."
source ~/.nvm/nvm.sh >/dev/null 2>&1 && nvm use 22 >/dev/null 2>&1 || true
ID="$1"; OUT="${2:-out/$ID.mp4}"; TMP="${OUT%.mp4}.raw.mp4"; PUB="${PUBLIC_DIR:-public}"
mkdir -p "$(dirname "$OUT")"
# the default theme font (theme.fontFile) is downloaded on first use, with its OFL license
FF=$(python3 -c "import json;print(json.load(open('src/film.json'))['theme'].get('fontFile',''))")
if [[ -n "$FF" && ! -s "$PUB/$FF" && "$FF" == fonts/Manrope-Medium.ttf ]]; then scripts/fonts.sh "$PUB"; fi
npx remotion render src/index.ts "$ID" "$TMP" --public-dir="$PUB" --codec=h264 --crf=18 --log=error --concurrency="${CONCURRENCY:-4}"
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$TMP" | grep -q audio; then
  II=$(ffmpeg -hide_banner -nostats -i "$TMP" -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p' | python3 -c 'import json,sys;print(json.load(sys.stdin)["input_i"])')
  GAIN=$(python3 -c "print(round(-14 - float('$II'), 2))")
  ffmpeg -v error -y -i "$TMP" -c:v copy -af "volume=${GAIN}dB,alimiter=limit=0.84:attack=5:release=50:level=false" -c:a aac -b:a 192k -movflags +faststart "$OUT"
else
  mv "$TMP" "$OUT"
fi
rm -f "$TMP"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of csv=p=0 "$OUT"
