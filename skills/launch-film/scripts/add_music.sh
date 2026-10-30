#!/usr/bin/env bash
# Optional low bed under an already normalized MP4: fixed gain in dB, fades, peak limiter.
# The method's default is NO music: the archival audio carries the film. Use only for a low drone that stops at the climax.
# usage: scripts/add_music.sh <in.mp4> <music.mp3> <out.mp4> [gain_db=-15] [fade_in=1.5] [fade_out=2.5]
set -eo pipefail
IN="$1"; MUSIC="$2"; OUT="$3"; GAIN="${4:--15}"; FI="${5:-1.5}"; FO="${6:-2.5}"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
ST=$(python3 -c "print(max(0, float('$DUR') - float('$FO')))")
ffmpeg -v error -y -i "$IN" -i "$MUSIC" -filter_complex \
  "[1:a]atrim=0:$DUR,afade=t=in:st=0:d=$FI,afade=t=out:st=$ST:d=$FO,volume=${GAIN}dB[m];[0:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.84:attack=5:release=50:level=false[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
