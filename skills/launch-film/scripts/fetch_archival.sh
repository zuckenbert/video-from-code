#!/usr/bin/env bash
# Fetches the proven public-domain archival set from images.nasa.gov and cuts it into the four files src/film.json expects.
# NASA footage is generally not subject to US copyright (works of the US government); read the NASA media usage
# guidelines (nasa.gov/nasa-brand-center/images-and-media) before publishing: no implied endorsement, no NASA insignia
# as your branding, and identifiable people in the footage keep their rights of publicity.
# This repo ships NO footage. Run this yourself; files land in <public>/archive/ (gitignored).
#
#   room.mp4     Mission Control B-roll, 12 s from the start                 (film: the room, 0 to 8 s)
#   count.m4a    launch master from 3365 s, 45 s: "twenty seconds and counting" at 7.3 s of the file, "liftoff" ~29.7 s
#   liftoff.mp4  launch master from 3388 s, 38 s: ignition on the pad at 3.5 s, the rocket clearing the smoke at 23 s
#   radio.m4a    launch master from 3568 s, 30 s: the first radio reply at 3.4 s, the confirmation lines at 16.6 s
# Offsets were found with a word-level speech-to-text transcript of the master and a 1 fps contact sheet; re-check them
# if you use another source. The launch master is about 6.3 GB at ~orig; VARIANT=large (or medium) is much smaller and
# keeps the same timeline.
# usage: [VARIANT=orig|large|medium] [DRY=1] scripts/fetch_archival.sh <public_dir>
set -eo pipefail
PUB="${1:?usage: fetch_archival.sh <public_dir>}"; A="$PUB/archive"; RAW="$A/raw"; V="${VARIANT:-large}"
mkdir -p "$RAW"
LAUNCH_ID="KSC-19690716-MH-NAS01-0001-Apollo_11_Launch_President_Johnson_Jack_King_Narration_Press_Site-B_1372"
ROOM_ID="jsc2019m000563_Apollo_MissionControl_Media_B_roll"

resolve() { # resolve <nasa_id> -> URL of the ~<variant>.mp4 (falls back to ~orig)
  curl -fsS "https://images-api.nasa.gov/asset/$1" | python3 -c "
import json, sys
hrefs = [i['href'] for i in json.load(sys.stdin)['collection']['items'] if i['href'].endswith('.mp4')]
pick = [h for h in hrefs if h.endswith('~$V.mp4')] or [h for h in hrefs if h.endswith('~orig.mp4')] or hrefs
print(pick[0].replace('http://', 'https://'))"
}
LAUNCH_URL=$(resolve "$LAUNCH_ID"); ROOM_URL=$(resolve "$ROOM_ID")
echo "launch: $LAUNCH_URL"; echo "room:   $ROOM_URL"
[ -n "$DRY" ] && exit 0

[ -s "$RAW/launch.mp4" ] || curl -fL --retry 3 -C - -o "$RAW/launch.mp4" "$LAUNCH_URL"
[ -s "$RAW/room.mp4" ] || curl -fL --retry 3 -C - -o "$RAW/room.mp4" "$ROOM_URL"

# cuts (input seeking: fast and frame-accurate enough when re-encoding)
ffmpeg -v error -y -ss 0 -t 12 -i "$RAW/room.mp4" -an -c:v libx264 -crf 18 -pix_fmt yuv420p "$A/room.mp4"
ffmpeg -v error -y -ss 3388 -t 38 -i "$RAW/launch.mp4" -an -c:v libx264 -crf 18 -pix_fmt yuv420p "$A/liftoff.mp4"
ffmpeg -v error -y -ss 3365 -t 45 -i "$RAW/launch.mp4" -vn -c:a aac -b:a 192k -ar 48000 -ac 2 "$A/count.m4a"
ffmpeg -v error -y -ss 3568 -t 30 -i "$RAW/launch.mp4" -vn -c:a aac -b:a 192k -ar 48000 -ac 2 "$A/radio.m4a"
for f in room.mp4 liftoff.mp4 count.m4a radio.m4a; do printf '%s ' "$f"; ffprobe -v error -show_entries format=duration -of csv=p=0 "$A/$f"; done
echo "Check the beats by ear and with scripts/sheet.sh before recording. The raw masters stay in $RAW (delete when done)."
