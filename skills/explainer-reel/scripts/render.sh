#!/bin/bash
# Final render with audio normalized to -14 LUFS. Usage: render.sh <project> <out.mp4>
set -eo pipefail
source "$(dirname "$0")/_node.sh"
cd "$1"; OUT=$2
npx remotion render Explainer-Reel out/raw.mp4 --log=error --concurrency=75% --crf=16
ffmpeg -v error -i out/raw.mp4 -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 "$OUT" -y
ffmpeg -hide_banner -nostats -i "$OUT" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
ffmpeg -v error -i "$OUT" -vf "fps=1,scale=240:-1,tile=9x7" -frames:v 1 "${OUT%.mp4}_sheet.png" -y
echo "$OUT"
