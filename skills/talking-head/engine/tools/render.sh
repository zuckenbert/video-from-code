#!/usr/bin/env bash
# Render a composition and normalize audio to -14 LUFS integrated (when there is audio).
# usage: tools/render.sh <CompId> <out.mp4>
# Composition ids: letters, digits and hyphens only (an underscore breaks the render).
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ID="$1"; OUT="${2:-out/$ID.mp4}"; mkdir -p "$(dirname "$OUT")"; OUT="$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT")"
TMP="${OUT%.mp4}.raw.mp4"
cd "$ROOT/remotion"
if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh" >/dev/null; nvm use 22 >/dev/null; fi
npx remotion render "$ID" "$TMP" --codec=h264 --crf=18 --log=error --concurrency=${CONCURRENCY:-4}
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$TMP" | grep -q audio; then
  # Measure integrated loudness and apply a FIXED gain plus a peak limiter. loudnorm (even in two passes)
  # falls into dynamic mode when the voice is quiet and lifts quiet stretches, e.g. music on an end card.
  II=$(ffmpeg -hide_banner -nostats -i "$TMP" -af "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p' | python3 -c 'import json,sys;print(json.load(sys.stdin)["input_i"])')
  GAIN=$(python3 -c "print(round(-14 - float('$II'), 2))")
  ffmpeg -v error -y -i "$TMP" -c:v copy -af "volume=${GAIN}dB,alimiter=limit=0.84:attack=5:release=50:level=false" -c:a aac -b:a 192k -movflags +faststart "$OUT"
else
  mv "$TMP" "$OUT"
fi
rm -f "$TMP"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of csv=p=0 "$OUT"
