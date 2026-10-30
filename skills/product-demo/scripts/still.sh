#!/usr/bin/env bash
# Contact sheet BEFORE rendering. usage: scripts/still.sh <project> [n=9]   (needs Pillow: pip3 install --user pillow)
set -eo pipefail
SKILL="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; P="$(cd "$1" && pwd)"; N="${2:-9}"
cd "$SKILL"; mkdir -p "$P/stills"; rm -f "$P/stills"/s_*.png
TOTAL=$(python3 -c "import json;print(json.load(open('$P/cut.json'))['total'])")
for i in $(seq 1 "$N"); do f=$(python3 -c "print(int($TOTAL*30*($i-0.5)/$N))"); DEMO_PROJECT="$P" npx remotion still src/index.ts Demo "$P/stills/s_$f.png" --frame="$f" --log=error; done
python3 - "$P" <<'PY'
import sys,glob; from PIL import Image
P=sys.argv[1]; fs=sorted(glob.glob(f'{P}/stills/s_*.png'), key=lambda p:int(p.split('_')[-1][:-4]))
ims=[Image.open(f).resize((960,540)) for f in fs]; cols=3; rows=(len(ims)+2)//3
sh=Image.new('RGB',(960*cols,540*rows))
for k,im in enumerate(ims): sh.paste(im,((k%cols)*960,(k//cols)*540))
sh.save(f'{P}/stills/sheet.png'); print(f'{P}/stills/sheet.png')
PY
