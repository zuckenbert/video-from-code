#!/bin/bash
# Contact sheet of a time range (no audio). Usage: sheet.sh <project> <start_s> <end_s> <step_s> <out.png>
set -eo pipefail
source "$(dirname "$0")/_node.sh"
cd "$1"; A=$2; B=$3; STEP=$4; OUT=$5
F0=$(python3 -c "print(round($A*30))"); F1=$(python3 -c "print(round($B*30)-1)")
TMP=out/tmp_$A; mkdir -p "$TMP"
npx remotion render Explainer-Reel "$TMP/clip.mp4" --frames=$F0-$F1 --muted --log=error --concurrency=50% >/dev/null
N=$(python3 -c "import math;print(math.ceil(($B-$A)/$STEP))"); ROWS=$(( (N + 5) / 6 ))
ffmpeg -v error -i "$TMP/clip.mp4" -vf "fps=1/$STEP,scale=300:-1,tile=6x${ROWS}" -frames:v 1 "$OUT" -y
echo "$OUT"
