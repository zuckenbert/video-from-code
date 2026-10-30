#!/usr/bin/env bash
# One-time setup: Node deps (Remotion needs Node 22), Python venv for the tools, data stubs in src/data.
# usage: engine/setup.sh          (PYTHON=python3.13 engine/setup.sh to pick the interpreter)
set -eo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh" >/dev/null; nvm use 22 >/dev/null || nvm install 22; fi
node -v | grep -q '^v2[2-9]' || { echo "Node 22+ required (nvm use 22)"; exit 1; }
(cd "$HERE/remotion" && npm install --no-audit --no-fund)
PY="${PYTHON:-python3}"
[ -x "$HERE/.venv/bin/python" ] || "$PY" -m venv "$HERE/.venv"
# always go through the venv's own interpreter (a bare pip can install into another Python)
"$HERE/.venv/bin/python" -m pip install -q -r "$HERE/requirements.txt"
"$HERE/.venv/bin/python" -c "import cv2; assert hasattr(cv2, 'CascadeClassifier'); print('opencv', cv2.__version__)"
D="$HERE/remotion/src/data"; mkdir -p "$D" "$HERE/remotion/public/sfx"
[ -f "$D/theme.json" ] || cp "$HERE/../examples/theme.json" "$D/theme.json"
[ -f "$D/speaker.json" ] || cp "$HERE/../examples/speaker.json" "$D/speaker.json"
[ -f "$D/speaker_words.json" ] || echo '[]' > "$D/speaker_words.json"
[ -f "$D/speaker_face.json" ] || echo '[]' > "$D/speaker_face.json"
echo "ready: cd $HERE/remotion && npx remotion studio"
