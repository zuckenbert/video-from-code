#!/bin/bash
# Full pipeline: raw spoken video -> captioned video with an animated lower third.
#
#   ./scripts/run.sh -i input.mp4 -o output.mp4 -n "Ada Example" -r "Head of Product" -l en
#
# Optional: -c config.json (deep merge over defaults.json), -w workdir, -l language
#           (en, pt, or any whisper code, "auto" to detect), --skip-asr
set -euo pipefail

CAP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export CAP_ROOT
SRC=""; OUT=""; NAME=""; ROLE=""; USERCFG=""; WORK=""; WLANG=""; SKIP_ASR=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -i) SRC="$2"; shift 2 ;;
    -o) OUT="$2"; shift 2 ;;
    -n) NAME="$2"; shift 2 ;;
    -r) ROLE="$2"; shift 2 ;;
    -l) WLANG="$2"; shift 2 ;;
    -c) USERCFG="$2"; shift 2 ;;
    -w) WORK="$2"; shift 2 ;;
    --skip-asr) SKIP_ASR=1; shift ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done
[[ -n "$SRC" ]] || { echo "missing -i <video>" >&2; exit 1; }
[[ -f "$SRC" ]] || { echo "video not found: $SRC" >&2; exit 1; }
[[ -n "$OUT" ]] || OUT="${SRC%.*}_captioned.mp4"
WORK="${WORK:-$CAP_ROOT/.work/$(basename "${SRC%.*}" | tr -c 'A-Za-z0-9_-' _)}"
mkdir -p "$WORK"
export CAP_WORK="$WORK"
export PYTHONPATH="$CAP_ROOT/scripts:${PYTHONPATH:-}"

for bin in ffmpeg ffprobe python3; do
  command -v "$bin" >/dev/null || { echo "missing $bin (brew install ffmpeg / python3)" >&2; exit 1; }
done

# ---- config: defaults + user file + flags ----
python3 - "$CAP_ROOT/defaults.json" "${USERCFG:-}" "$NAME" "$ROLE" "$WLANG" <<'PY'
import json, os, sys
base = json.load(open(sys.argv[1], encoding='utf-8'))
if sys.argv[2]:
    def deep(a, b):
        for k, v in b.items():
            a[k] = deep(a[k], v) if isinstance(v, dict) and isinstance(a.get(k), dict) else v
        return a
    deep(base, json.load(open(os.path.expanduser(sys.argv[2]), encoding='utf-8')))
if sys.argv[3]: base['card']['name'] = sys.argv[3]
if sys.argv[4]: base['card']['role'] = sys.argv[4]
if sys.argv[5]: base['lang'] = sys.argv[5]
json.dump(base, open(os.path.join(os.environ['CAP_WORK'], 'config.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
PY

cfg() { python3 -c "import json,os;c=json.load(open(os.path.join(os.environ['CAP_WORK'],'config.json')));print($1)"; }

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
export CAP_DUR="$DUR"
FPS=$(cfg "c['fps']")
OW=$(cfg "c['out_w']")
OH=$(cfg "c['out_h']")

# ---- 1. token-level transcription ----
if [[ $SKIP_ASR -eq 0 || ! -f "$WORK/words.json" ]]; then
  command -v whisper-cli >/dev/null || { echo "missing whisper-cli (brew install whisper-cpp)" >&2; exit 1; }
  MODEL=$(cfg "os.path.expanduser(c['whisper_model'])")
  if [[ ! -f "$MODEL" ]]; then
    echo "whisper model not found: $MODEL" >&2
    echo "download it (about 1.6 GB):" >&2
    echo "  mkdir -p ~/.cache/whisper && curl -L -o ~/.cache/whisper/ggml-large-v3-turbo.bin \\" >&2
    echo "    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin" >&2
    exit 1
  fi
  ASR_LANG=$(cfg "c['lang']")
  echo "==> transcribing (lang=$ASR_LANG)"
  ffmpeg -y -loglevel error -i "$SRC" -vn -ac 1 -ar 16000 -c:a pcm_s16le "$WORK/audio.wav"
  # -ml 1 returns one timestamp per token; 02_cues.py glues tokens back into words
  whisper-cli -m "$MODEL" -l "$ASR_LANG" -f "$WORK/audio.wav" -oj -of "$WORK/words" -ml 1 >/dev/null 2>"$WORK/whisper.log" \
    || { tail -20 "$WORK/whisper.log" >&2; exit 1; }
fi

echo "==> building cues"
python3 "$CAP_ROOT/scripts/02_cues.py"

echo "==> drawing card"
python3 "$CAP_ROOT/scripts/03_card.py"

echo "==> rendering overlay ($(python3 -c "print(int($DUR*$FPS))") frames)"
python3 "$CAP_ROOT/scripts/04_overlay.py"

echo "==> composing video"
ffmpeg -y -loglevel error -stats -i "$SRC" -framerate "$FPS" -i "$WORK/frames/%05d.png" \
  -filter_complex "
   [0:v]scale=$OW:$OH:flags=lanczos,setsar=1[bg];
   [bg][1:v]overlay=0:0:eof_action=pass:shortest=0,format=yuv420p[v]
  " -map '[v]' -map 0:a \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -profile:v high -level 4.1 \
  -c:a aac -b:a 160k -ar 48000 -movflags +faststart "$OUT"

cp "$WORK/captions.srt" "${OUT%.*}.srt"
echo
echo "OK  video -> $OUT"
echo "    srt   -> ${OUT%.*}.srt"
echo "    work  -> $WORK  (run again with --skip-asr to reuse the transcription)"
