# Loads node >= 20: nvm if present, otherwise ~/.local/bin or whatever is on PATH.
if [ -s "$HOME/.nvm/nvm.sh" ]; then source "$HOME/.nvm/nvm.sh" >/dev/null; nvm use 22 >/dev/null 2>&1 || true; fi
export PATH="$HOME/.local/bin:$PATH"
NODE_MAJOR=$(node -v 2>/dev/null | sed 's/v\([0-9]*\).*/\1/')
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then echo "!! needs node >= 20 (found: $(node -v 2>/dev/null))" >&2; exit 1; fi
