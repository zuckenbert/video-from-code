# TESTED

Date: 2026-10-30. Machine: macOS (Apple Silicon), Homebrew ffmpeg (no libass, no
drawtext), Python 3 + Pillow 12 + numpy + requests, `ELEVENLABS_API_KEY` from the
environment (Scribe called for real, model `scribe_v1`).

All media lived in `.scratch/talk-clipper/` at the repo root (not committed).

## Test recording

A 179.5s synthetic two-speaker panel, built to match the default layout:

- Audio: a 22-turn English dialogue about a city bike lane network, alternating two
  macOS `say` voices (`Samantha` and `Eddy (English (US))`), 0.55s of silence
  between turns. The true turn boundaries were saved to `truth.json`.
- Video, first 107.7s: "call with screen share" layout, `testsrc2` at 1440x810 as
  the shared slide at (0,135), `testsrc` at 476x267 as the camera tile at
  (1443,406), black elsewhere (this is exactly the default `pip.source_crop`).
- Video, rest: full-frame `mandelbrot` as the "talking head" stretch.

Test config: `config.example.json` with `video: panel.mp4`, `num_speakers: 2`,
IBM Plex fonts pointed at explicitly, highlights `bike lane network` and `open
data`, a few locked expressions, two speakers mapped to fictional names.

## Runs

| Step | Command | Result |
|---|---|---|
| transcribe | `python3 scripts/transcribe.py config.json` | `_work/scribe.json` in about 4s, `language_code: eng`, probability 1.0 |
| index | `python3 scripts/index.py config.json` | 22 turns, 56 sentences, 490 words; speaker_0 1.3 min, speaker_1 1.3 min. Diarization matched all 22 true turns |
| probe | `python3 scripts/probe.py --config config.json 30 150` | 30s: `share (0, 134, 1440, 810)`; 150s: `no share (talking head)` |
| dry | `python3 scripts/dry.py --config config.json` | see below |
| render | `python3 scripts/render.py 1_ --config config.json` | `1_street_budget` 11.8s `slide_pip` 3 cues; `1_the_kids_test` 11.9s `talking_head` 4 cues; 5.7s wall time for both |
| render | `python3 scripts/render.py 2_open --config config.json` | 9.5s `slide_pip`, highlight check |

Plan used (in/out given roughly on purpose, so `snap()` has work to do):

```json
[
  { "speaker": "speaker_1", "slug": "1_street_budget", "in": 55.0, "out": 66.3 },
  { "speaker": "speaker_0", "slug": "1_the_kids_test", "in": 133.3, "out": 144.9 },
  { "speaker": "speaker_1", "slug": "9_dry_leading_article", "in": 75.95, "out": 86.3 },
  { "speaker": "speaker_1", "slug": "9_dry_trailing_orphan", "in": 74.4, "out": 75.7 },
  { "speaker": "speaker_0", "slug": "2_open_data", "in": 87.3, "out": 96.3 }
]
```

Dry output, showing both `snap()` corrections:

```
===== speaker_1 / 9_dry_leading_article   [75.7 -> 86.8]  11s  3 cues
     0.10  the second trick is / connecting the pieces.
```
Requested in 75.95 is the word "second"; "the" ends 0.04s before it, so the cut
pulls it in.

```
===== speaker_1 / 9_dry_trailing_orphan   [74.1 -> 75.3]  1s  1 cues
     0.30  Exactly.
```
Requested out 75.7 is the end of "And" after "Exactly."; the cut steps back to
"Exactly." (75.12 + slack).

## Output checked

- `ffprobe`: 1920x1080 h264 at 24 fps + aac.
- `ebur128` on `1_street_budget.mp4`: integrated loudness -16.5 LUFS (target -16).
- `.srt` next to each clip, timings relative to the clip start.
- Frames looked at by eye:
  - `1_street_budget` t=2s: slide full bleed, camera tile in the PiP at the bottom
    right with its border, lower third "Sam Sample / Transport Planner", caption
    raised above the card, the burned timecode of the source reads 00:00:56.
  - `1_street_budget` t=9s: card gone, caption left-aligned and clear of the PiP.
  - `1_the_kids_test` t=2s: talking head full frame, no PiP, card and raised caption.
  - `2_open_data` t=4.5s: "open data" painted in the accent color mid-sentence.

No code changes were needed: the port is a translation of messages, docstrings
and comments, and the code paths are identical to the original.

## 2026-10-30: re-test with the palette defaults

Theme defaults are now the repo palette (Ink card and padding, Field text, Slate role, new `theme.bar` Cobalt
card edge, Beacon only for highlighted terms). Fonts resolve first to Manrope SemiBold and IBM Plex Mono Medium
shipped in `../captions/assets/fonts`. With the theme block removed from the test config (so the defaults
apply), `render.py 1_` and `render.py 2_open` re-rendered from the saved `_work/` transcript (no Scribe call):
`1_street_budget` 11.8 s, `1_the_kids_test` 11.9 s, `2_open_data` 9.5 s; -16.5 LUFS; frames at 2 s and 4.5 s
checked (Cobalt card edge, "open data" in Beacon).
