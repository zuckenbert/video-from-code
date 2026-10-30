#!/bin/bash
# Creates a video project from the template and installs everything.
# Usage: setup.sh <project_dir> [--sprites <dir_with_m0..m4,blink,blink_half[,arm].png>]
# Without --sprites it draws placeholder sprites (scripts/placeholder_character.py) so the project renders;
# replace them with your own character before publishing, or set "enabled": false in character.json.
set -eo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"
DIR=${1:?usage: setup.sh <project_dir> [--sprites <dir>]}
SPRITES=""; [ "${2:-}" = "--sprites" ] && SPRITES=${3:?--sprites needs a folder}
source "$SK/scripts/_node.sh"
command -v ffmpeg >/dev/null || { echo "!! ffmpeg missing (Linux: sudo apt-get install -y ffmpeg)" >&2; exit 1; }
python3 -c "import numpy" 2>/dev/null || echo "warning: numpy missing; mouth.py needs it (pip install numpy; sfx.py also needs scipy)"
if [ -e "$DIR/package.json" ]; then echo "!! $DIR already has a project, not overwriting" >&2; exit 1; fi
mkdir -p "$DIR"; cp -R "$SK/template/." "$DIR/"; mkdir -p "$DIR/script" "$DIR/out" "$DIR/public/character"
if [ -n "$SPRITES" ]; then
  for k in m0 m1 m2 m3 m4 blink blink_half; do
    [ -f "$SPRITES/$k.png" ] || { echo "!! $SPRITES/$k.png missing (sprite contract in SKILL.md)" >&2; exit 1; }
  done
  cp "$SPRITES"/*.png "$DIR/public/character/"
  echo "ok: sprites copied from $SPRITES; check spriteWidth and arm in $DIR/character.json"
elif python3 "$SK/scripts/placeholder_character.py" "$DIR/public/character" >/dev/null 2>&1; then
  echo "note: placeholder character drawn in $DIR/public/character (replace with your own sprites)"
else
  python3 - "$DIR/character.json" <<'PY'
import json, sys
p = sys.argv[1]; c = json.load(open(p)); c["enabled"] = False; json.dump(c, open(p, "w"), indent=2)
PY
  echo "warning: Pillow missing, no sprites; character disabled in character.json (pip install pillow to draw placeholders)"
fi
cd "$DIR"
npm install --no-audit --no-fund --loglevel=error
npx remotion browser ensure >/dev/null || { echo "!! Remotion headless Chrome did not start. Linux: sudo apt-get install -y libnss3 libdbus-1-3 libatk1.0-0 libgbm1 libasound2 libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2" >&2; exit 1; }
# Fonts (SIL OFL 1.1, each license saved next to it): Manrope for display and body, IBM Plex Mono for metadata.
MANROPE=https://github.com/googlefonts/manrope/raw/468c0dbe38efa331b80bfe9448256abe27be44c3
PLEX=https://github.com/IBM/plex/raw/v6.4.0
mkdir -p public/fonts
for w in Medium SemiBold Bold ExtraBold; do
  lw=$(echo "$w" | tr '[:upper:]' '[:lower:]')
  curl -fsSL "$MANROPE/fonts/ttf/manrope-$lw.ttf" -o "public/fonts/Manrope-$w.ttf"
done
curl -fsSL "$MANROPE/OFL.txt" -o public/fonts/Manrope-OFL.txt
curl -fsSL "$PLEX/IBM-Plex-Mono/fonts/complete/ttf/IBMPlexMono-SemiBold.ttf" -o public/fonts/IBMPlexMono-SemiBold.ttf
curl -fsSL "$PLEX/LICENSE.txt" -o public/fonts/IBMPlexMono-OFL.txt
echo "ok: project in $DIR. Next: script in $DIR/script/script.txt and the voice (SKILL.md, phase 3)."
