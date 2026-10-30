---
name: captions
description: Burns captions into a spoken video and adds an animated lower third (name, role, optional logo). Transcribes locally with whisper.cpp (English, Portuguese or any whisper language), groups words into cues that never split a locked expression, paints highlight terms in an accent color, and composes everything at 1080p with ffmpeg. Outputs the MP4 plus a loose .srt. Use when the user asks to "caption this video", "add subtitles", "burn in captions", "add a lower third", "name card for the speaker", "legendar esse vídeo", "põe legenda", or hands over a talking-head clip to publish on LinkedIn, Reels or YouTube.
---

# captions

Local pipeline, no external service. Input: a spoken video. Output: a 1920x1080
MP4 with burned-in captions and an animated lower third, plus a loose `.srt` to
upload alongside on LinkedIn or YouTube.

## Usage

```bash
./scripts/run.sh -i talk.mp4 -o talk_captioned.mp4 \
                 -n "Ada Example" -r "Head of Product" -l en
```

Portuguese (or any whisper language code; `auto` lets whisper detect it):

```bash
./scripts/run.sh -i fala.mp4 -o fala_legendada.mp4 -n "Ana Exemplo" -r "Coordenadora" -l pt
```

With your own config (deep merged over `defaults.json`, see `examples/`):

```bash
./scripts/run.sh -i talk.mp4 -o out.mp4 -c examples/config.en.json
```

Reusing the transcription from a previous run (useful to tune style, highlights,
locks and fixes without paying for whisper again):

```bash
./scripts/run.sh -i talk.mp4 -o out.mp4 -c my_config.json --skip-asr
```

Flags: `-i` input, `-o` output (default `<input>_captioned.mp4`), `-n` name,
`-r` role, `-l` language, `-c` config, `-w` work dir (default
`.work/<video-name>/` inside the skill), `--skip-asr`.

Without a name (no `-n` and no `card.name`) the lower third is skipped and the
captions stay at the low margin for the whole video.

## Prerequisites

- `ffmpeg` and `ffprobe` (`brew install ffmpeg`)
- `whisper-cli` (`brew install whisper-cpp`) and a `ggml-*.bin` model. The default
  path is `~/.cache/whisper/ggml-large-v3-turbo.bin`. Download it once (about 1.6 GB):

  ```bash
  mkdir -p ~/.cache/whisper && curl -L -o ~/.cache/whisper/ggml-large-v3-turbo.bin \
    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
  ```

  Any other ggml model works: point `whisper_model` in your config at it.
- Python 3 with Pillow (`pip3 install pillow`)

**Heads up:** Homebrew's ffmpeg usually ships without `libass` and without
`drawtext`. That is why this pipeline does not use any ffmpeg caption filter:
captions and card are drawn as RGBA PNGs with Pillow and composed with a single
`overlay`. Side benefit: full control over kerning, outline, shadow and easing.

## What each stage does

| Stage | File | Input -> output |
|---|---|---|
| 1 | `run.sh` (inline) | video -> `audio.wav` -> `words.json` (whisper `-ml 1`, one timestamp per token) |
| 2 | `scripts/02_cues.py` | `words.json` -> `cues.json` + `captions.srt` |
| 3 | `scripts/03_card.py` | config -> `card.png` (RGBA with shadow) |
| 4 | `scripts/04_overlay.py` | `cues.json` + `card.png` -> `frames/%05d.png` |
| 5 | `run.sh` (inline) | video + frames -> final MP4 |

Intermediate files live in the work dir.

## The two decisions that make the captions good

**1. Grouping by dynamic programming, not greedy.** A greedy version (fill the cue
up to the limit) splits a two-word term across two cues and leaves its last word
alone on screen. `02_cues.py` solves a DP that minimizes a cost made of: distance
from the ideal length, a penalty for breaking away from punctuation, and a penalty
for cues that are too short.

**2. Locked expressions.** Everything in `highlights` or `locked` becomes a
forbidden boundary: the DP cannot cut there, and the line break inside a cue also
avoids that point. That is what keeps "August 10th", "6 in the evening", "public
hearing" and proper names whole. Measured on the test clip with a tight
`max_cue` of 30: without locks the DP produced "No dia 10 / de agosto" and "A
rede de / ciclovias liga"; with locks it produced "No dia / 10 de agosto" and
"A rede de ciclovias / liga".

Run stage 2 alone (with `--skip-asr`, it is the first thing printed) and read the
cue list in the terminal before spending the render minutes. It is cheap and it
is where problems show up. Highlighted runs print in `[brackets]`.

Lock the form whisper actually writes, not the one you say: whisper writes
numbers as digits ("10 de agosto", "6 in the evening"), so a lock on "six in the
evening" never matches.

## Config (`defaults.json`)

| Key | What it does |
|---|---|
| `lang` | whisper language (`en`, `pt`, ... or `auto`). `-l` overrides it |
| `whisper_model` | path to the ggml model |
| `highlights` | terms painted in `theme.accent`, whole words only, case insensitive. Locked automatically |
| `locked` | expressions that never split, even without highlight |
| `fix` | transcription corrections, lowercase word -> right form, applied word by word (trailing punctuation kept) |
| `theme.accent` / `bar` / `background` / `text` / `muted` | highlights (Beacon #EF681E), card edge bar (Cobalt #1D4AA5; falls back to `accent` when empty), card background (Ink #12141A), caption and name text (Field #F3EFE5), role text (Slate #8195B0) |
| `card.name` / `role` | lower third text. `-n` and `-r` override them. Empty name = no card |
| `card.logo` | optional PNG with alpha (white logo on transparent works best), drawn after a thin divider. Relative paths resolve from the skill root |
| `card.in_at` / `out_at` | when the lower third enters and leaves (seconds) |
| `caption.margin_low` / `margin_high` | caption baseline outside and during the card window |
| `caption.max_line` / `max_cue` | 34 and 62 characters, calibrated for 58px at 1080p |
| `caption.font`, `card.font_name`, `card.font_role` | TTF paths |

## Look

Font: Manrope SemiBold (captions and name) and IBM Plex Mono Medium (role, a
label), shipped in `assets/fonts/` under the SIL Open Font License
(`assets/fonts/Manrope-OFL.txt`, `assets/fonts/IBMPlexMono-OFL.txt`).

Colors: the default theme is the repo palette. The accent is reserved for the
highlighted terms (the one thing to notice); the card edge is structure, so it
uses `theme.bar` and never competes with a highlight.

Card: edge bar on the left, name, role, and an optional divider plus logo.
It slides in from the left with a cubic ease-out over 0.55s, holds, and leaves
with a fade plus a push to the left. While it is on screen the captions rise to
`margin_high` so they never collide.

## Known limits

- Calibrated and tested on 16:9 sources rendered at 1920x1080. The input is scaled
  to `out_w` x `out_h` without letterboxing, so a source with a different aspect
  ratio gets stretched. `out_w`/`out_h` accept 9:16, but then `max_line` has to
  drop (around 22 characters) and the card has to shrink. Not validated in that
  format.
- The PNG sequence takes about 100 MB per minute of video. The work dir can be
  deleted after the render.
- Audio is normalized to -16 LUFS / -1.5 dBTP, the usual target for social
  networks. For another target, change the `loudnorm` in `run.sh`.
- `fix` matches single words only.
