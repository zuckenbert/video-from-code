#!/usr/bin/env bash
# Downloads the default theme font into <public>/fonts/: Manrope Medium (display and body of every card, pill and the
# end card) with its SIL OFL 1.1 license next to it. render.sh calls this when theme.fontFile is missing.
# usage: scripts/fonts.sh <public_dir>
set -eo pipefail
PUB="${1:?usage: scripts/fonts.sh <public_dir>}"
MANROPE=https://github.com/googlefonts/manrope/raw/468c0dbe38efa331b80bfe9448256abe27be44c3
mkdir -p "$PUB/fonts"
[[ -s "$PUB/fonts/Manrope-Medium.ttf" ]] || curl -fsSL "$MANROPE/fonts/ttf/manrope-medium.ttf" -o "$PUB/fonts/Manrope-Medium.ttf"
[[ -s "$PUB/fonts/Manrope-OFL.txt" ]] || curl -fsSL "$MANROPE/OFL.txt" -o "$PUB/fonts/Manrope-OFL.txt"
echo "fonts ready in $PUB/fonts"
