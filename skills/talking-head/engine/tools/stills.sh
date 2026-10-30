#!/usr/bin/env bash
# Stills BEFORE the render: one PNG per second given, then a labeled contact sheet. Look at it, fix, repeat.
# usage: tools/stills.sh <CompId> <outdir> <sec> [sec ...]      -> outdir/s_<sec>.png + outdir/stills_sheet.png
set -eo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ID="$1"; OUT="$(mkdir -p "$2" && cd "$2" && pwd)"; shift 2
cd "$ROOT/remotion"
if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh" >/dev/null; nvm use 22 >/dev/null; fi
FPS=$(npx remotion compositions 2>/dev/null | awk -v id="$ID" '$1==id {print $2}')
FPS=${FPS:-30}
for s in "$@"; do
  F=$(python3 -c "print(int(round(float('$s') * float('$FPS'))))")
  npx remotion still "$ID" "$OUT/s_$s.png" --frame="$F" --log=error
done
python3 "$ROOT/tools/montage.py" "$OUT/stills_sheet.png" "$OUT"/s_*.png
