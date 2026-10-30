---
name: talking-head
description: Edit a real person speaking on camera into a finished video with motion graphics, in code (Remotion + ffmpeg + a word-timestamped transcript). Four proven styles - (1) pure motion with no person, (2) speaker + effects (face-following crop, captions, lower third, side panels that enter on spoken words), (3) mixed (motion cold open, speaker body, motion close), (5) the default vertical 9:16 "stage" story (flat colored stage with duotone icons in cards moving by springs, captions on the seam, speaker below with face-following crop). Use when the user asks to "cut this webinar and make it nice", "edit a talking head", "founder video", "testimonial with captions", "reel/story/vertical video of someone talking", "speaker with lower third and captions", "add motion graphics to this clip", "video in code", or any short video where a person talks to camera.
---

# talking-head

Engine in `engine/` (Remotion project + Python/ffmpeg tools). Every new piece is one more composition in
`engine/remotion/src/comps/`, reusing `engine/remotion/src/engine/`. Tested end to end, see `TESTED.md`.

## Setup (once)

```bash
engine/setup.sh        # Node 22 deps, engine/.venv with OpenCV 4.10, stub data in src/data
```

Requirements: Node 22 (`nvm use 22`; Remotion fails on Node 18), ffmpeg/ffprobe, Python 3 with venv,
Pillow for the contact sheets. Transcription: `ELEVENLABS_API_KEY` in the environment (Scribe), otherwise a
local Whisper with per-word timestamps (`pip install mlx-whisper` on Apple Silicon or `faster-whisper`).
Never put a key in a file.

## Which style

| Style | Composition | Use for |
|---|---|---|
| 1 Pure motion | `Motion-Example` (`MotionExample.tsx`, 1920x1080 60 fps) | a number, a thesis, a launch teaser; nobody on screen |
| 2 Speaker + effects | `Speaker-Fx` (`SpeakerFx.tsx`, body in `SpeakerBody.tsx`) | webinar cut, testimonial, explanation to camera |
| 3 Mixed | `Mixed` (`Mixed.tsx`) | motion cold open (5 to 6 s) + speaker body + motion close (4 s) |
| 5 Stage story (DEFAULT for vertical) | `Stage-Story` (`StageStory.tsx`, journey in `StageJourney.tsx`) | Reels, Stories, Shorts, vertical LinkedIn with a person talking |

When the person talks and the target is vertical, it is style 5 unless the user asks otherwise.

## Data: one speaker = files in `engine/remotion/src/data/` (gitignored)

| File | Made by |
|---|---|
| `public/speaker_raw.mp4` | step 1 (ffmpeg) |
| `src/data/speaker_words.json` `[{w,s,e}]` | step 2 (`tools/transcribe.py`) |
| `src/data/speaker_face.json` `[{t,cx,cy}]` | step 3 (`tools/face_track.py` + `tools/face_smooth.py`) |
| `src/data/speaker.json` | you: name, role, `segs` (EDL), fillers, keywords, `story` beats (style 5), `fx` panels (style 2/3) |
| `src/data/theme.json` | colors, font, optional wordmark, url, locale (`examples/theme.json`) |

`examples/speaker.json` documents every field. A second person = a second set of files and one more
`person(...)` line in `src/engine/people.ts`. Product or story specific panels go in your own component
files; keep the engine generic.

## Pipeline (mandatory order)

All commands from `engine/`. `PY=.venv/bin/python`.

1. **Source.** Cut the excerpt: `ffmpeg -ss IN -to OUT -i in.mp4 -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac remotion/public/speaker_raw.mp4`.
   4K source: add `-vf scale=1920:-2`. Dark footage: add `-vf eq=gamma=1.15`. From a meeting recording with
   slides + a camera tile, prefer stretches where the person is full screen: a ~476 px tile looks soft blown up.
2. **Words with timestamps.** `python3 tools/transcribe.py remotion/public/speaker_raw.mp4 remotion/src/data/speaker_words.json --raw work/raw.json`
   (Scribe, diarized; `--lang en` optional). Never a transcript without per-word timestamps. Long recording
   already transcribed: `--from-raw raw.json --cut IN OUT` keeps that range and rebases time to 0.
   Proper names the ASR gets wrong: `--fix "Wrong=Right"`. Two voices: check the speaker id, Scribe mixes them up
   when people overlap (`--speaker speaker_0`).
3. **Face.** `$PY tools/face_track.py remotion/public/speaker_raw.mp4 work/face_raw.json` then
   `$PY tools/face_smooth.py work/face_raw.json remotion/src/data/speaker_face.json` (median + ~3 s gaussian;
   without it the crop shakes and jumps).
4. **EDL.** `python3 tools/list_words.py remotion/src/data/speaker_words.json --fillers "um,,uh," --suggest`.
   READ the listing before cutting. `segs` in `speaker.json` are kept ranges in SOURCE seconds; every cut falls in
   the silence between two words (the `--suggest` proposal cuts fillers mid-silence). Words outside the kept ranges
   and words listed in `fillers` disappear from the captions automatically.
5. **Beat sheet.** Every cue comes from a spoken word: `beat("word")` or `beat(["word", after])` (output seconds),
   never a typed time. A panel enters 0.2 to 0.3 s after the word that justifies it and leaves before the topic
   changes. Panel content only with real data: numbers and sentences the person actually said, nothing invented.
   `at()` ignores case and matches the word start: ANY word that appears more than once in the speech needs
   `after`, and punctuation is part of the match (`"five."` does not match `five`). `list_words.py` marks repeats with (xN).
6. **Stills and contact sheet BEFORE the render.** `tools/stills.sh Stage-Story work/stills 1 4 7 12 16 20 24 27`
   renders 6 to 8 stills and `stills_sheet.png`. Look at it (overlaps, cut-off text, beats firing early).
   A wrong beat word throws `word not found: X` in the stills/studio: fix the config. Only then render.
7. **Render.** `tools/render.sh Stage-Story work/out/story.mp4` (h264 crf 18; audio measured and set to
   -14 LUFS integrated with a fixed gain + peak limiter). Then `python3 tools/check.py work/out/story.mp4`
   (flat frames, still stretches, safe-area, flashes) and `tools/sheet.sh work/out/story.mp4` (1 fps sheet of
   the top half of a vertical video) and look again.
8. **Optional sound.** Six short effects ship in `remotion/public/sfx/` (chime, lock, pop, stop, type, whoosh). To make new ones: `tools/make_sfx.py remotion/public/sfx` (ElevenLabs, serial calls) or your own
   `pop.mp3`, `whoosh.mp3`, `stop.mp3`, then `"sfx": true`. Music bed only after the render:
   `tools/add_music.sh in.mp4 music.mp3 out.mp4 -15` (fixed dB gain, fades, limiter).

## Design rules (`src/engine/tokens.ts`, `anim.ts`)

- Dark stage `ink`, light stage `paper`. ONE accent with ONE meaning ("what matters now"), never a large fill and
  never two accent focuses at once; `line` carries structure (rules, routes, chart series, the style 1 device).
  `loss` red only for money lost or mismatch, `ok` green only for success. Numbers always `tabular-nums`.
- Default theme (`examples/theme.json`) is the repo palette: `paper` and `stage` Field #F3EFE5, `ink` Ink #12141A,
  `line` Cobalt #1D4AA5, `grey`/`greyMid` Slate #8195B0, `accent` Beacon #EF681E (`accentOnLight` a darker Beacon so
  caption keywords stay legible on Field). `loss`, `danger` and `ok` keep their red and green on purpose: they are
  semantic, not decoration. Fonts: Manrope (display and body) and IBM Plex Mono (`mono`, metadata only), shipped in
  `public/fonts/` with their SIL OFL license files.
- Safe area 96 px on the sides, 64 px top and bottom.
- Three curves only: `E.out` arrival, `E.inOut` camera, `E.in` exit. No loose bezier in scenes. Text enters
  rising 28 px and unblurring (`riseStyle`).
- One idea per film, one device that crosses the scenes (in style 1, the structure line), cuts on the bar
  (60 fps, 120 BPM = 30 f per beat). No emoji, particles, glow, multi-color gradients, italics or serif in motion.

## Style 2 in detail

- `Talking` gets a `Frame` (x, y, w, h, zoom) and crops explicitly around the face. Zoom 1.08 on the full frame
  hides a meeting app's name tag.
- `SpeakerBody` splits ONCE at `fx.split` from full frame to a 1040 px left column with the panel column on the
  right (0.6 s, `E.inOut`), and stays split. `Chapters` is the resting state of the right column.
- Captions: cues of up to 5 words or 2.4 s, break on punctuation, current word and keywords in the accent,
  left aligned; they rise 190 px while the lower third is on screen (0.6 s to 7 s).
- Panels: `steps` (list item by item), `statement` (big sentence line by line, optional underline),
  `rows` (expected x actual x difference with counters), `chat` (question and answer), then `EndCard`.

## Style 5 in detail (the default vertical format)

1080x1920, 30 fps, three bands:
- 0 to 830: flat `stage` color, no logo, no wordmark. Logical stage 960x720 (`Stage`) in `{x:40, y:60, w:1000, h:720}`.
- 830 to 1040: dark seam with the captions (`Subs`): weight 600, 62 px, white, centered, keyword in the accent,
  unsaid words at 38% opacity, spring entrance.
- 1040 to 1920: the person (`Cam`), crop following the face, face at 42% of the box, zoom 1.32. NO gradient over
  the video (it reads as AI slop): a dry cut. Two takes joined: `story.join = {at, zoom: 1.44}` punches in at the join.

Visual language of the stage (no text in the animations except a kinetic number when the speech has a number):
- Phosphor icons `weight="duotone"` (`@phosphor-icons/react`, MIT), ink color, inside a white `Card` with a 4 px
  border and an 8 px hard black shadow. Dark card with an accent icon = the hero / the platform.
- `danger` red only for a problem (`WarningIcon` badge). A question = dark `Badge` with `QuestionIcon`.
- `Cable` (curve with a light sway) links things; `Signature` (scribble) = a contract; `SealCheckIcon` in a
  `Badge` = a stamp; `Roll` = a number rolling (5 -> 1); `Num` = a number counting up with overshoot.
- Motion only by springs (`sp`, `spc`): POP for arrivals (~108% overshoot), SOFT for moves, SNAP for stamps/hits.
  Stagger 3 to 6 frames between siblings, one focus per beat, nothing enters together.
- One scene (`Beat`) per stretch of speech, each happening tied to a word. `StageJourney.tsx` is the example
  (hub + question, five cards, signatures, problem, nobody owns it -> one dark card, links, stamp, arrow ->
  optional number); write your own journey per video with the same vocabulary.

## Optional: person cut out of the background

`pip install -r engine/requirements-cutout.txt`, then `tools/cutout.py speaker_raw.mp4 remotion/public/cut
[--zero X0 Y0 X1 Y1]` writes WebP frames with alpha; `Cutout` shows them with the EDL and `EdlAudio` plays
the sound. Known defect: a lamp behind the head leaks into the mask. Not covered by `TESTED.md`.

## Paid lessons

- Composition id with `_` breaks the render: use `-`.
- `objectFit: cover` on the `<Video>` of `@remotion/media` leaves black bars (it draws on a canvas): explicit crop.
- `opencv-python-headless` 5.x has no `CascadeClassifier`: pin 4.10.0.84. Install with `.venv/bin/python -m pip`
  (a bare `pip` can land in another Python).
- Node 18 is often the nvm default; Remotion needs `nvm use 22`.
- `at()` ignores case: a capitalized word that also appears lowercase earlier fired a scene 30 s early. Repeats need `after`.
- A short path with `draw=0` still leaves a dot: gate drawing by time.
- `loudnorm` (even two-pass) falls into dynamic mode with quiet voices and lifts quiet stretches: measure, then fixed gain + limiter.
- Remotion volume at low levels is not predictable in the render: music goes in ffmpeg (`add_music.sh`).
- Sound generation calls in parallel return 429: run them in series.
- Face samples are not exactly 0.25 s apart (29.97 fps sources): interpolate by each sample's real time (`faceAt`).

## Delivery

MP4 from `render.sh`, contact sheet from `sheet.sh`, both looked at before handing over. Never commit footage,
transcripts, face tracks or renders (`.gitignore` covers `src/data/*.json` and `public/*` except fonts).
No em dash or en dash in on-screen text.
