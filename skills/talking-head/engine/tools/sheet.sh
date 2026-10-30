#!/usr/bin/env bash
# Contact sheet of a RENDERED MP4 at 1 fps, each frame labeled with its second (30 frames per sheet, 6 columns).
# Vertical video: only the TOP half (the stage), where the animation lives. Pass --full for the whole frame.
# usage: tools/sheet.sh <mp4> [outdir] [--full]   -> outdir/sheet_1.png, sheet_2.png ...
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="$1"; OUT="${2:-$(dirname "$IN")/sheet_$(basename "${IN%.mp4}")}"; FULL="$3"
mkdir -p "$OUT"; rm -rf "$OUT"/sheet_*.png "$OUT/q"; mkdir -p "$OUT/q"
H=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "$IN")
W=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$IN")
CROP="crop=${W}:$((H/2)):0:0"; { [ "$H" -le "$W" ] || [ "$FULL" = "--full" ]; } && CROP="crop=${W}:${H}:0:0"
ffmpeg -v error -y -i "$IN" -vf "fps=1,${CROP},scale=540:-2" -vsync 0 "$OUT/q/q_%04d.png"
N=$(ls "$OUT"/q/q_*.png | wc -l | tr -d ' ')
k=0; i=1
while [ $k -lt "$N" ]; do
  FILES=$(ls "$OUT"/q/q_*.png | sed -n "$((k+1)),$((k+30))p")
  LABELS=$(python3 -c "print(' '.join(f'{s}s' for s in range($k, min($k+30, $N))))")
  python3 "$ROOT/tools/montage.py" "$OUT/sheet_$i.png" $FILES --cols 6 --width 540 --labels $LABELS >/dev/null
  k=$((k+30)); i=$((i+1))
done
echo "$N frames, $((i-1)) sheet(s) in $OUT"
