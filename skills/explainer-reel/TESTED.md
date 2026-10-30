# TESTED: explainer-reel end to end on the reference example

Date: 2026-10-30. Machine: Apple Silicon Mac, macOS, node 22 (nvm), ffmpeg (Homebrew), Python 3.12
venv with mlx-whisper, kokoro, soundfile, numpy, scipy, pillow. Remotion 4.0.535.

`SK` = this skill folder, `P` = a scratch project folder outside the repo (the test used
`.scratch/explainer-reel/` at the repo root, which is not committed).

## Why the voice was fitted to the reference

The reference scenes (`reference/nvidia-pt/scenes/`) are hand-timed to the narration of the approved
episode, whose voice does not ship. A new voice speaks each sentence at a different pace, so the test
generated a new voice and then stretched each sentence (ffmpeg `atempo`, factors 0.85 to 1.12) into
the original scene windows with `reference/nvidia-pt/fit_to_reference.py`. That is a test harness only:
a real video writes its own `scenes.json` and `BEATS.md` from its own `vo_words.json` (phase 4). The
stretched audio was then aligned again with `align.py`, which exercises the ASR path for real.

## Commands

```bash
source ~/.nvm/nvm.sh && nvm use 22
bash $SK/scripts/setup.sh $P                       # no --sprites: placeholder character drawn
cp $SK/reference/nvidia-pt/roteiro.txt $P/script/script.txt
cd $P
python3 $SK/scripts/tts_elevenlabs.py script/script.txt public/vo.mp3      # default voice JBFqnCBsd6RMkjVDRZzb
cp public/vo_words.json out/vo_words_eleven.json
python3 $SK/scripts/align.py script/script.txt public/vo.mp3 --lang pt      # ASR vs ElevenLabs timing
python3 $SK/reference/nvidia-pt/fit_to_reference.py . out/vo_words_eleven.json   # harness, see above
python3 $SK/scripts/align.py script/script.txt public/vo.mp3 --lang pt
python3 $SK/scripts/mouth.py .
cp $SK/reference/nvidia-pt/scenes.json .
python3 $SK/scripts/new_video.py . --tag "NVIDIA / 01" --date "30 OCT 2026"
cp $SK/reference/nvidia-pt/scenes/*.tsx src/scenes/ && cp $SK/reference/nvidia-pt/Cover.tsx src/Cover.tsx
source $SK/scripts/_node.sh && npx tsc --noEmit
bash $SK/scripts/sheet.sh . 0 4.2 0.25 out/s01.png        # and 4.15 8.5 for S02; S03..S10 cut from the render
bash $SK/scripts/render.sh . out/explainer-nvidia.mp4
npx remotion still Cover out/cover.png
ffmpeg -i out/cover.png -vf crop=1080:1440:0:240 out/cover_3x4.png
```

## Results

| Check | Result |
|---|---|
| setup.sh | template copied, npm install ok, headless Chrome ok, placeholder sprites drawn |
| ElevenLabs, default premade voice, speed 1.15 | 167 words, 52.24 s raw speech (the key had no `voices_read`: `GET /v1/voices/{id}` returned 401, TTS worked) |
| align.py (mlx-whisper large-v3-turbo, pt) on the raw voice | 89% of words matched by ASR; mean start difference vs ElevenLabs timing 0.10 s (max 0.62 s) |
| align.py on the fitted voice | 89% matched, speech ends at 54.96 s (reference: 54.98 s) |
| mouth.py | 1679 frames, mouth open 71% of the time (gate says 45 to 70%: 1 point over, continuous narrator voice) |
| new_video.py | 10 scenes, character leaves at 55.16 s, video 56.993 s (intro 0.85 s) |
| tsc --noEmit | clean |
| Contact sheets reviewed (all 10 scenes, boundaries, outro, cover) | continuity contracts hold at every cut; mouth, blinks, `point`/`up`/`hop`/`nod`/`wiggle`/`flinch` and the big hop visible; intro burst and dash-to-camera visible |
| Loop | frame 0 and frame 1709 rendered as stills: pixel identical (diff bbox None) |
| Render time | about 28 s for the full video |
| Final MP4 | 1080x1920, 30 fps, video 57.000 s (1710 frames), audio 57.1 s |
| Loudness (ffmpeg ebur128) | integrated -14.3 LUFS, LRA 1.4 LU, true peak -1.5 dBFS |
| Cover still | rendered; title, name, symbol and character inside the 3:4 crop (y 240 to 1680) |
| Character disabled (`"enabled": false`) | tsc clean, video 56.443 s with a 0.3 s lead-in; frame 0 and last frame pixel identical |
| Kokoro fallback, en (am_michael) | 19 words, 100% matched, 6.48 s |
| Kokoro fallback, pt (pm_alex) | 18 words, 89% matched ("videogame" mispronounced, as documented), mouth.py ok |
| sfx.py | regenerates the 23 shipped wav files byte for byte |

## Observed and left as is

- S07 at 37.3 s (narration): the "x 1.000" stamp lands at 1.5x scale right above the character while
  it hops; they come within a few pixels. Inherited from the reference timing, kept to stay faithful.
- The placeholder character is a test asset; its arm at rest sticks out to the right. Real sprites
  should follow the sprite contract in SKILL.md.
- The reference script counts 167 words with `wc -w`, above the 130 to 155 rule of phase 2; at speed
  1.15 it still fits 55 s of speech. Kept as approved.

## 2026-10-30: re-test with the palette defaults

`tokens.ts` now maps the roles to the repo palette (Field background, Ink outlines, Cobalt structure, Slate
secondary, Beacon for `highlight` and `negative`), fonts are Manrope + IBM Plex Mono (`setup.sh` downloads them
with their OFL files into `public/fonts`, `kit/fonts.ts` loads them with `@remotion/fonts`), and the placeholder
character is drawn in Ink, Cobalt and Slate. Fresh project from `setup.sh` in `.scratch/explainer-reel2`, voice,
words, mouth and scenes copied from the first test (no new TTS call), reference scenes and cover copied in:

| Check | Result |
|---|---|
| setup.sh | 258 packages, 5 fonts + 2 OFL files in `public/fonts`, placeholder sprites drawn |
| tsc --noEmit | clean |
| render.sh | 1080x1920, 57.1 s, -14.3 LUFS, about 23 s wall |
| Loop | frame 0 and frame 1709 pixel identical (diff bbox None) |
| Cover still | rendered, kicker in IBM Plex Mono |
| Contact sheet (one frame every 3 s) | looked at; all scenes render in the new palette |

Seen and left as is: several reference scenes use `highlight` on more than one object at once (coins, hats,
bags), so they show more than one Beacon spot; new videos should keep one Beacon focus per scene.
