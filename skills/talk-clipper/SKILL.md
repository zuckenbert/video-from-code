---
name: talk-clipper
description: Cuts a long webinar, panel or call recording into topic clips per speaker, with every cut landed on the silence between words, burned-in captions and an identification lower third, plus an .srt per clip. Use when the user asks for "clips from the webinar", "cut the recording into clips", "pull X's answers by topic", "make shorts from this call", "caption and cut this panel video", "cortes do webinar", "clipes da gravação", or hands over a one-hour recording asking for pieces for LinkedIn, Reels or YouTube.
---

# talk-clipper

Turns a one-hour recording into 30 to 90 second clips, one per topic, ready for
the feed. Everything runs locally with ffmpeg and Pillow, except the transcription.

What each clip gets: a 1080p MP4 with the shared screen full bleed, the speaker's
camera in a PiP in the corner, large burned-in captions at the bottom, a lower
third with name and role in the first seconds, audio normalized to -16 LUFS, and
an `.srt` next to it for upload.

## Flow

```bash
cp config.example.json config.json     # point at the video, name the speakers, tune the layout
cp plan.example.json plan.json

python3 scripts/transcribe.py          # audio -> scribe.json (per-word timestamps + diarization)
python3 scripts/index.py               # -> _work/speakers.txt and _work/sentences.txt
# pick the topics by reading sentences.txt, fill plan.json with the in/out pairs
python3 scripts/dry.py                 # review cuts and captions in the terminal, no render
python3 scripts/render.py              # render everything
python3 scripts/render.py 3_analogy    # render only what matches the filter
```

`scripts/probe.py 130 900` grabs frames to measure the recording's layout.

**Working outside the skill folder.** Every path in the config (`video`,
`workdir`, `outdir`) resolves relative to the config file, and `plan.json` is read
from the config's folder. So a project folder with its own `config.json` and
`plan.json` works without touching the skill:

```bash
cd my_project
python3 <skill>/scripts/transcribe.py config.json      # positional config
python3 <skill>/scripts/index.py config.json           # positional config
python3 <skill>/scripts/dry.py --config config.json
python3 <skill>/scripts/render.py --config config.json
python3 <skill>/scripts/probe.py --config config.json --grid 12
```

## Prerequisites

- `ffmpeg` and `ffprobe` (`brew install ffmpeg`)
- Python 3 with `pillow`, `numpy`, `requests`
- `ELEVENLABS_API_KEY` in the environment (only for the transcription step)
- A TTF font. Without config it uses Manrope SemiBold (captions, names) and
  IBM Plex Mono Medium (role) from `../captions/assets/fonts/` (shipped in this
  repo with their OFL licenses), then system installs, then Arial/DejaVu.
- Default colors are the repo palette: Ink card and padding, Field text, Slate
  role, Cobalt card edge (`theme.bar`), Beacon only for the highlighted terms.

## The decisions that make the clip good

**1. Per-word timestamps, not per-sentence.** ElevenLabs Scribe with diarization
(`timestamps_granularity=word`). Local whisper gives per-word timestamps with
`-ml 1` but does not diarize, and transcripts from meeting-notes services often
come with an offset relative to the video. The cut needs the silence between two
specific words, not the middle of a sentence.

**2. The cut lands on the silence, and the speech gets a loose edge.** `snap()`
finds the word closest to the requested time and returns four numbers: the video
cut (with slack proportional to the real gap) and the speech interval (no slack,
which is what feeds the captions). Two corrections that only show up when you
watch: the cut picks up the loose conjunction of the next sentence ("...the
other one. And"), so it steps back one token when the last word is a conjunction
after a period; and the cut lands right after a glued article ("the | second
trick"), so it pulls in the little word of up to 3 letters that sits less than
0.22s before.

**3. Caption grouping by dynamic programming, not greedy.** Filling the line up to
the limit splits expressions in the middle and leaves orphan words on screen. The
DP in `cues.py` minimizes a cost that adds distance from the ideal length, a
penalty for breaking away from punctuation and a penalty for short cues.
Expressions in `lexicon.locked` and terms in `lexicon.highlight` become forbidden
boundaries: the DP cannot cut inside them.

**4. Captions are drawn as RGBA PNGs, not by an ffmpeg filter.** Homebrew's ffmpeg
usually ships without `libass` and without `drawtext`. Drawing with Pillow and
composing with `overlay` gives, for free, control over the outline, a locked line
width (the line never runs into the PiP) and painting a term in the accent color
mid-sentence.

**5. Large captions at the bottom, not inside the little box.** A first version
centered the captions inside the camera PiP, under the face. It does not read in a
phone feed. What works is a large left-aligned font at the bottom, with
`caption.max_width` stopping the line before it reaches the PiP. While the lower
third is on screen the captions rise to `caption.bottom_raised`.

## Three ffmpeg traps this code already works around

1. `scale` to a non-proportional size leaves the **SAR different from 1**, and the
   next overlay delivers a frame with an odd height. x264 dies with "height not
   divisible by 2 / Invalid argument" without ever mentioning SAR. **Always
   `setsar=1` after `scale`+`pad`.**
2. `crop` with an odd offset or height in yuv420p is also Invalid argument. Round
   everything to even.
3. A conditional overlay is `enable='between(t,a,b)'`, not `-ss` per layer. One
   overlay per cue, chained.

## Where things live

| File | Role |
|---|---|
| `config.json` | layout, colors, font, lexicon, speaker to name and role map |
| `plan.json` | one item per clip: speaker, slug, in and out in seconds of the original |
| `scripts/config.py` | merges with the defaults, resolves font and color |
| `scripts/transcribe.py` | video -> `_work/audio.mp3` -> `_work/scribe.json` |
| `scripts/index.py` | `scribe.json` -> `speakers.txt` + `sentences.txt` |
| `scripts/cues.py` | words -> caption cues (DP) |
| `scripts/render.py` | cut, composition, captions, card, `.srt` |
| `scripts/dry.py` | text review, no render |
| `scripts/probe.py` | frames to measure the layout and check the detection |

## Config notes

- `language_code` goes to Scribe and picks the per-language defaults: `eng` (or
  `en`) and `por` (or `pt`) ship with lists of orphan words (conjunctions and
  articles a cut must not end on) and a regex of hesitation fillers the captions
  drop. Any other code falls back to the English lists. Override with
  `lexicon.orphans` and `lexicon.fillers`. The built-in default is `por`; the
  example config sets `eng`.
- `num_speakers` is a hint for diarization.
- `speakers` maps each `speaker_id` from `speakers.txt` to `name` and `role`.
- `theme.logo` is an optional PNG drawn on the card after a divider.
- `lexicon.fix` maps a lowercase word to its right form, applied before grouping.

## Adapting to your recording

The default assumes a 1920x1080 call recording with a composite layout: shared
content on the left, camera tile on the right. For another layout:

1. `python3 scripts/probe.py --grid 12` and open the frames.
2. Measure the camera tile rectangle and put it in `pip.source_crop`
   (`[width, height, x, y]`).
3. `share_detect.split_x` is where the content area ends. `share_box()` decides
   between `slide_pip` and `talking_head` by checking whether there is picture
   outside the tile rectangle in the right strip.
4. If the recording is talking head only, `pip.enabled: false`.

**The layout changes during the recording.** Q&A stretches often come without
screen sharing. That is why detection runs per clip, sampling three instants.

## Two things to always check

- **Diarization gets authorship wrong on short and overlapping speech.** It gives
  another person's answer to the main speaker. Confirm in the video, by the name
  tag on the camera tile, before closing `plan.json`.
- **Proper names and acronyms come out wrong in the transcript.** Run `dry.py`,
  read the captions, and send each error to `lexicon.fix`.

## Swapping the transcription provider

Only `transcribe.py` talks to a service. Any provider works as long as it writes
the same `_work/scribe.json`:
`{"words": [{"type": "word", "text", "start", "end", "speaker_id"}]}` with times
in seconds of the original video. Entries whose `type` is not `word` (spacing,
audio events) are ignored.
