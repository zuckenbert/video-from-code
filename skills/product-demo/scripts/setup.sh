#!/usr/bin/env bash
# Installs the engine into a WRITABLE folder (skill folders are often read-only synced mirrors).
# usage: scripts/setup.sh [destination=~/apps/product-demo]
set -eo pipefail
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; DST="${1:-$HOME/apps/product-demo}"
mkdir -p "$DST"; rsync -a --delete --exclude node_modules --exclude '.git' --exclude 'assets/*.ttf' --exclude 'assets/*-OFL.txt' "$SRC/" "$DST/"
cd "$DST"
if ! command -v node >/dev/null || [[ "$(node -v | cut -c2-3)" -lt 22 ]]; then
  export NVM_DIR="$HOME/.nvm"; [[ -s "$NVM_DIR/nvm.sh" ]] || curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  . "$NVM_DIR/nvm.sh"; nvm install 22 >/dev/null; nvm use 22 >/dev/null
fi
# fonts are not shipped in the repo, each one comes with its SIL OFL 1.1 license:
# Manrope Medium and SemiBold (display and body), IBM Plex Mono Medium (metadata: url bar, timer)
MANROPE=https://github.com/googlefonts/manrope/raw/468c0dbe38efa331b80bfe9448256abe27be44c3
PLEX=https://github.com/IBM/plex/raw/v6.4.0
mkdir -p assets
for w in Medium SemiBold; do
  lw=$(echo "$w" | tr '[:upper:]' '[:lower:]')
  [[ -s "assets/Manrope-$w.ttf" ]] || curl -fsSL "$MANROPE/fonts/ttf/manrope-$lw.ttf" -o "assets/Manrope-$w.ttf"
done
[[ -s assets/Manrope-OFL.txt ]] || curl -fsSL "$MANROPE/OFL.txt" -o assets/Manrope-OFL.txt
[[ -s assets/IBMPlexMono-Medium.ttf ]] || curl -fsSL "$PLEX/IBM-Plex-Mono/fonts/complete/ttf/IBMPlexMono-Medium.ttf" -o assets/IBMPlexMono-Medium.ttf
[[ -s assets/IBMPlexMono-OFL.txt ]] || curl -fsSL "$PLEX/LICENSE.txt" -o assets/IBMPlexMono-OFL.txt
npm install --no-audit --no-fund
npx playwright-core --version >/dev/null 2>&1 || true
node -e "import('playwright-core').then(async ({chromium})=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});await b.close();console.log('chromium ok')}).catch(e=>{console.error('chromium missing: run  npx playwright install chromium  (or export CHROMIUM_PATH)');process.exit(1)})"
command -v ffmpeg >/dev/null || { echo 'ffmpeg missing'; exit 1; }
echo "engine ready in $DST"
