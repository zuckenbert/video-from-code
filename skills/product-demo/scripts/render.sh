#!/usr/bin/env bash
# usage: scripts/render.sh <project> [out.mp4]   (runs from anywhere; needs node 22 and ffmpeg)
set -eo pipefail
SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
P="$(cd "$1" && pwd)"; OUT="${2:-$P/out.mp4}"; TMP="${OUT%.mp4}.raw.mp4"
cd "$SKILL"
DEMO_PROJECT="$P" npx remotion render src/index.ts Demo "$TMP" --codec=h264 --crf=18 --log=error --concurrency="${CONC:-4}"
if ffprobe -v error -select_streams a -show_entries stream=codec_type -of csv=p=0 "$TMP" | grep -q audio; then
  ffmpeg -v error -y -i "$TMP" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -movflags +faststart "$OUT"
else mv "$TMP" "$OUT"; fi
rm -f "$TMP"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height -of csv=p=0 "$OUT"
