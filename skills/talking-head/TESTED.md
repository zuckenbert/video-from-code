# TESTED

Date: 2026-10-30. macOS (Apple Silicon), Node 22 via nvm, Python 3.14 venv, ffmpeg from Homebrew,
Remotion 4.0.535. Test footage: a 30 s excerpt of a real 1920x1080 29.97 fps talking-head recording in
Portuguese (two takes joined at 23.3 s in the source). Footage, transcript, face track and renders stayed in a
gitignored scratch folder outside the skill; nothing from them is in this folder.

## Commands run (from `engine/`)

```bash
ffmpeg -ss 0 -to 30 -i source.mp4 -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k speaker_raw.mp4
python3 tools/transcribe.py speaker_raw.mp4 speaker_words.json --raw raw.json      # ElevenLabs Scribe
python3 tools/list_words.py speaker_words.json --fillers "é,,né,,tá,,tá?" --suggest
venv/bin/python tools/face_track.py speaker_raw.mp4 face_raw.json
venv/bin/python tools/face_smooth.py face_raw.json speaker_face.json
python3 tools/make_sfx.py sfx                                                     # pop, whoosh, stop
engine/setup.sh                                                                   # deps + stubs
tools/stills.sh Stage-Story stills/story 1 4.5 7 12 16.5 19.6 20.9 23.2 25 26.5
tools/stills.sh Speaker-Fx stills/fx 2 4.6 9 14 17.2 20.8 23.5 26.5 29.5 31
tools/stills.sh Mixed stills/mixed 1 3 6 33.5 35 36.5
tools/stills.sh Motion-Example stills/motion 3 7 11 15 19 23 27 29.5
tools/render.sh <Id> out/<Id>.mp4        # for each of the four
python3 tools/check.py out/<Id>.mp4
tools/sheet.sh out/<Id>.mp4
```

## Results

| Step | Result |
|---|---|
| Scribe transcript | 69 words with per-word timestamps, speech 0.44 to 29.64 s |
| list_words / EDL | no fillers in the excerpt; EDL cut one aside (1.98 s) at mid-silence on both sides: `[[0, 3.62], [5.6, 30.04]]`, output 28.06 s |
| face_track + face_smooth | 129 samples, face found in 129; smoothed cx 0.537 to 0.553, max step 0.0012; 1.6 s wall time |
| make_sfx | 3 mp3 of 0.8 s, called in series |
| tsc | clean, with real data and with the empty stubs (stub data renders the "No speaker yet" card) |

| Composition | Size | Duration | Render (wall) | Loudness | check.py |
|---|---|---|---|---|---|
| `Stage-Story` (style 5) | 1080x1920 30 fps | 28.89 s | 24.4 s | -14.3 LUFS, peak -0.9 dBFS | 0 findings |
| `Speaker-Fx` (style 2) | 1920x1080 30 fps | 31.27 s | 24.9 s | -14.4 LUFS, peak -1.0 dBFS | 1: flat frames 28.6 to 28.9 s while the dark end card fades in over the dark background (expected) |
| `Mixed` (style 3) | 1920x1080 30 fps | 37.08 s | 30.3 s | -14.4 LUFS, peak -1.0 dBFS | 4: first frame empty, dark-to-light cut into the close (flash + flat), still end card (all by design) |
| `Motion-Example` (style 1) | 1920x1080 60 fps | 30.00 s | 25.1 s | no audio | 10: one flat frame at each act start before content arrives, two flashes at the light act 7 (cut on the bar, by design) |

What the contact sheets showed and what was fixed:
- Style 5: hub and question on the first word, five cards on "five", each icon on its own word, signatures,
  red warning with shake on "problem", everything cools with dashed cables on "nobody", dark card with the five
  dropping in, accent links, stamp; punch-in 1.32 to 1.44 at the take join; captions with keyword accent and
  unsaid words dimmed; no gradient over the camera. Optional `number` and `cta` beats checked with stills
  (counter to 80% with overshoot, 8 of 10 cells).
- Style 2: split once on the first panel word; steps item by item, rows with counters (loss red on the last row),
  chat question then answer, light statement with underline, chapters at rest, end card.
  FIXED: when the split happened while the lower third was still on, captions in the split column overlapped it;
  captions now rise 190 px in both layouts while the lower third is on screen.
- A wrong beat (`["cinco.", 17]` where the word had no period) failed loudly with `word not found`, as intended.

## Not covered by this test

- Whisper fallback in `transcribe.py` (no key path): code follows the source method, not executed here.
- `cutout.py` + `Cutout` + `EdlAudio` (background removal): ported, not executed here.
- `add_music.sh`: ported unchanged, not executed here.
- Wordmark: no wordmark configured in the test (neutral default `null`).

## 2026-10-30: re-test with the palette defaults

`examples/theme.json` now holds the repo palette (Field `paper`/`stage`, Ink, Cobalt `line`, Slate greys, Beacon
`accent`; `loss`/`danger`/`ok` keep their semantic red and green). Fonts shipped in `public/fonts` are Manrope
Medium/SemiBold and IBM Plex Mono Medium with their OFL files (IBM Plex Sans removed). In Motion-Example the
structure (blocks, ruler, routes, the device line) moved from the accent to `line`, so each act has one accent.

| Step | Result |
|---|---|
| tsc | clean |
| `stills.sh Motion-Example` (9 stills) | checked by eye: one Beacon focus per act, Cobalt structure |
| `stills.sh Stage-Story` with the empty stubs | "No speaker yet" card in Manrope |
| Stage-Story and Speaker-Fx stills with the first test's data | stage renders on Field with Ink cards; data stayed in `.scratch/`, stubs restored in `src/data` |
| `render.sh Motion-Example` | 1920x1080 60 fps, 30.00 s, 23 s wall |
| `check.py` | the same 10 findings as before (act starts, light act cuts), all by design |
