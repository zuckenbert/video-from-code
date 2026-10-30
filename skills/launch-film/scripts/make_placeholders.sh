#!/usr/bin/env bash
# Builds STAND-IN archival files for testing, with the same names and the same internal offsets as the real cuts made by
# fetch_archival.sh, so src/film.json works unchanged with either set.
#   <public>/archive/room.mp4     12 s, 1280x720 with a 4:3 picture and real black bars, grain (stand-in for the room B-roll)
#   <public>/archive/liftoff.mp4  38 s, same framing, visible timestamp (stand-in for the liftoff cut)
#   <public>/archive/count.m4a    41 s spoken countdown, radio EQ; "twenty seconds and counting" at 7.3 s, "zero" at 27.0 s,
#                                 "liftoff" at 29.6 s + engine rumble (stand-in for the countdown cut)
#   <public>/archive/radio.m4a    26 s, "Copy." at 3.4 s, confirmation lines from 17.0 s (stand-in for the radio replies)
# Voice: macOS `say` when present (any voice, it is a placeholder), otherwise sine beeps on the same beats.
# usage: scripts/make_placeholders.sh <public_dir>
set -eo pipefail
PUB="${1:?usage: make_placeholders.sh <public_dir>}"; A="$PUB/archive"; TMP="$A/_tmp"
mkdir -p "$A" "$TMP"
VOICE="${VOICE:-Fred}"

# ---- video: 4:3 picture inside 16:9 with real black bars, desaturated by the composition later
ffmpeg -v error -y -f lavfi -i "testsrc2=size=960x720:rate=30:duration=12" \
  -vf "noise=alls=18:allf=t,hue=s=0.4,pad=1280:720:160:0:black" -c:v libx264 -crf 22 -pix_fmt yuv420p "$A/room.mp4"
ffmpeg -v error -y -f lavfi -i "testsrc=size=960x720:rate=30:duration=38" \
  -vf "hue=h=25:s=1.6,noise=alls=14:allf=t,pad=1280:720:160:0:black" -c:v libx264 -crf 22 -pix_fmt yuv420p "$A/liftoff.mp4"

# ---- audio: words placed on exact beats (seconds inside the file)
speak() { # speak <name> <text>
  if command -v say >/dev/null 2>&1; then say -v "$VOICE" -o "$TMP/$1.aiff" "$2" 2>/dev/null || say -o "$TMP/$1.aiff" "$2"
  else ffmpeg -v error -y -f lavfi -i "sine=f=880:d=0.22" "$TMP/$1.aiff"; fi
}
place() { # place <out.m4a> <length_s> <rumble_at or -> then pairs "<t> <name>"
  local out="$1" len="$2" rumble="$3"; shift 3
  local args=() fc="" n=0 labels=""
  while [ $# -gt 0 ]; do
    local t="$1" name="$2"; shift 2
    local ms; ms=$(python3 -c "print(int(float('$t')*1000))")
    args+=(-i "$TMP/$name.aiff"); fc+="[$n:a]aresample=48000,aformat=channel_layouts=mono,adelay=${ms}[a$n];"; labels+="[a$n]"; n=$((n+1))
  done
  fc+="${labels}amix=inputs=$n:normalize=0,highpass=f=300,lowpass=f=3400[v];"
  if [ "$rumble" != "-" ]; then
    local rms; rms=$(python3 -c "print(int(float('$rumble')*1000))")
    args+=(-f lavfi -i "anoisesrc=d=11:c=brown:a=0.6:r=48000")
    fc+="[$n:a]afade=t=in:d=0.4,afade=t=out:st=8:d=3,adelay=${rms}[r];[v][r]amix=inputs=2:normalize=0[m];[m]"
  else fc+="[v]"; fi
  fc+="apad,atrim=0:$len[o]"
  ffmpeg -v error -y "${args[@]}" -filter_complex "$fc" -map "[o]" -ac 2 -c:a aac -b:a 160k "$out"
}

speak twenty "T minus twenty seconds and counting."; speak guidance "Guidance is internal."
speak twelve "Twelve."; speak eleven "Eleven."; speak ten "Ten."; speak nine "Nine."
speak ignition "Ignition sequence start."
speak six "Six."; speak five "Five."; speak four "Four."; speak three "Three."; speak two "Two."; speak one "One."; speak zero "Zero."
speak engines "All engines running."; speak liftoff "Liftoff. We have a liftoff."; speak tower "Tower cleared."
speak copy "Copy."; speak confirm "Copy. We confirm the queue."; speak copytower "Copy, tower."

place "$A/count.m4a" 41 29.6 \
  7.3 twenty 13.3 guidance 15.0 twelve 15.9 eleven 16.7 ten 17.8 nine 18.8 ignition \
  21.0 six 22.0 five 23.0 four 24.0 three 25.0 two 26.0 one 27.0 zero \
  28.3 engines 29.6 liftoff 37.3 tower
place "$A/radio.m4a" 26 - 3.4 copy 17.0 confirm 21.0 copytower
rm -rf "$TMP"
for f in room.mp4 liftoff.mp4 count.m4a radio.m4a; do printf '%s ' "$f"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$A/$f"; done
