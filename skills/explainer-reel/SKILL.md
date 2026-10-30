---
name: explainer-reel
description: >-
  Produces a vertical 1080x1920 explainer reel (45 to 58 s) that explains a company, a product, a
  business model or an idea, Draw-My-Life style, made fully in code (Remotion + SVG): facts table with
  primary sources, script with a strong hook, voice with per-word timing, a motion-beats table with a
  rejection gate, continuity contracts between scenes, scenes built from a kit of pure functions of
  time, micro-SFX, karaoke captions, Reels safe area, an on-screen narrator character whose mouth
  follows the voice, a seamless loop ending, contact sheets reviewed visually, render at -14 LUFS and
  a cover still. Use when asked to "explain company X in a reel", "make an explainer video", "explainer
  reel", "draw my life style video", "explain how X makes money in 60 seconds", or a new episode in the
  format of the reference example. Works in Portuguese and English.
---

# Explainer reel: production runbook

Delivery: one MP4, 1080x1920, 30 fps, 45 to 58 s, audio at -14 LUFS, whose last frame equals its
first (loop), plus the cover still, the contact sheet and a short report. Quality reference:
`reference/nvidia-pt/` (facts, script, BEATS.md and the 10 scenes of an approved episode, in
Portuguese).

The video is a Draw My Life at 1.5x speed, not a presentation with elements sliding in. If at any
point the output looks like "a finished layout with objects sliding", it is rejected.

## Rules that always apply

1. Never use an em dash or an en dash in any file, script, caption or message.
2. Every number and every fact comes from a primary source with a link (earnings release, 10-K/20-F,
   paper, official site, founder interview in a major outlet). No source, no fact. Never invent or
   round "to look nice"; round only as far as the data allows ("almost 216 billion" for 215.9).
3. Follow the phases in order. Each phase has a gate: do not move on with the gate open.
4. Keep progress in a `HANDOFF.md` in the project, as short addenda (what landed, decisions, open
   items, next step). Resuming always starts by reading that file.
5. Do not skip the visual review. You must look at the contact sheets (images) of every scene.

## Environment

- node >= 20 (`scripts/_node.sh` loads nvm and `nvm use 22` if present), ffmpeg, python3 with numpy.
- Fonts: Manrope (display and body) and IBM Plex Mono (metadata), both SIL OFL 1.1; `setup.sh` downloads them
  with their license files into `public/fonts/` and `kit/fonts.ts` loads them.
- ASR for alignment: `mlx-whisper` on Apple Silicon, `faster-whisper` elsewhere.
- Voice: ElevenLabs (`ELEVENLABS_API_KEY` in the environment, nothing else is read) or Kokoro locally
  (`pip install kokoro soundfile`; Portuguese also uses espeak-ng). Never paste or copy keys into files.
- Fact research: your web search and page-reading tools.
- Parallelism: subagents.
- Remotion has its own license (free for individuals and small teams, company license above that):
  check https://www.remotion.dev/license before commercial use.

Scripts (all in `scripts/` of this skill; `SK` = this skill folder):

| Script | Purpose |
|---|---|
| `setup.sh <proj> [--sprites <dir>]` | copies the template, `npm install`, headless Chrome, fonts, character sprites (placeholder if none) |
| `tts_elevenlabs.py script.txt <proj>/public/vo.mp3 [--voice ID] [--speed 1.15]` | voice + `vo_words.json` (exact per-word timing) |
| `tts_kokoro.py script.txt <proj>/public/vo.mp3 [--lang pt\|en] [--voice NAME] [--speed 1.15]` | local voice + automatic alignment |
| `align.py script.txt <proj>/public/vo.mp3 [--lang pt\|en]` | rebuilds `vo_words.json` for any audio (ASR + match to the script) |
| `mouth.py <proj>` | `public/vo_mouth.json`: character mouth level per frame from voice loudness |
| `new_video.py <proj> --tag "X / 01" --date "30 OCT 2026"` | validates `scenes.json`, writes `video.json`, stubs and `index.ts` |
| `sheet.sh <proj> <start> <end> <step> <out.png>` | contact sheet of a range (to review) |
| `render.sh <proj> <out.mp4>` | final render, loudnorm -14 LUFS, sheet of the whole video |
| `sfx.py <proj>/public/sfx` | recreates or extends the synthesized SFX library |
| `placeholder_character.py <dir>` | draws placeholder sprites that satisfy the sprite contract |

## Phase 0: prepare

```bash
bash $SK/scripts/setup.sh ~/videos/explainer-<company> [--sprites ~/my-character]
```

Create `HANDOFF.md` in the project with the request and addendum 1. Decide the language (pt or en)
and the voice now; keep the same voice for every video of a series (the voice is the identity).

## Phase 1: research and facts

Build `facts.md` in the project: table `fact | exact number | source (URL) | source date`. Aim for
10 to 15 facts and pick the 6 to 8 that tell the best story. Always look for:

- What the company sells, who uses it, who pays and why it captures value.
- Numbers of the last closed fiscal year (revenue, growth, profit, dominant segment).
- A surprising origin fact (almost went bankrupt, was born somewhere unlikely, pivoted).
- The mechanism that explains the success (the "why", not only the "how much").
- The moat (what keeps competitors out) and the real risk (who could take its place).

Gate 1: every number in the script points to a row of `facts.md` with a URL that was opened and read.

## Phase 2: script

File `script/script.txt`, one sentence per line. Rules:

- 130 to 155 words, for 45 to 55 s of speech.
- **Hook (0 to 5 s):** a concrete consequence in the viewer's life or an economic question with
  tension. Never open with chronology ("founded in..."). Approved model: "Every question you ask
  ChatGPT goes through a toll booth. And whoever collects it started in video games."
- **Structure:** hook, surprising origin in 2 sentences, mechanism (how it works, who uses, who pays),
  historical turn, scale today, numbers, "My take:" with thesis and risk, and a memorable one-line
  close. Model close: "In the AI gold rush, NVIDIA does not dig. It sells the shovel." The end has no
  call to action, because the loop closes the video.
- Short sentences. Each sentence must suggest an image that moves: concrete noun, action verb, quantity.
- Write for the voice: numbers spelled out ("two hundred sixteen billion"), years spoken ("in
  ninety-three"), acronyms the way they are said ("Chat GPT").

Gate 2: read it aloud in your head. If a sentence does not fit a moving image, rewrite it. If the
hook does not raise a question in the viewer's head, rewrite it.

## Phase 3: voice with per-word timing

- With a key: `python3 $SK/scripts/tts_elevenlabs.py script/script.txt public/vo.mp3 --voice <ID>`
  (`eleven_multilingual_v2`, speed 1.15, detects pt or en from the text). Default voice
  `JBFqnCBsd6RMkjVDRZzb` ("George", a premade public voice of the ElevenLabs library); pass your own
  voice id for a series. Do not switch voices between episodes on your own.
- Without a key: `python3 $SK/scripts/tts_kokoro.py script/script.txt public/vo.mp3 --lang pt`
  (or `--lang en`; voices listed in the script header). Say in the report that the local voice was used.
- After the voice, ALWAYS: `python3 $SK/scripts/mouth.py <proj>` (writes `public/vo_mouth.json`,
  the character mouth frame by frame from voice loudness). Without this file the project does not compile.

Gate 3: `vo_mouth.json` exists and the script reported "mouth open" between 45% and 70% of the time;
speech lasts 45 to 56 s (if longer, cut text, do not speed up beyond 1.2); `vo_words.json` covers
every word of the script. Transcribe the audio back (`align.py --lang <pt|en>` prints the match
rate) and check proper names and numbers.

## Phase 4: scenes and the motion-beats table (before any code)

1. Split the speech into 8 to 10 scenes of 3 to 7 s, cutting at pauses (see the times in
   `public/vo_words.json`). Write `scenes.json` at the project root:
   `[{"id": "S01", "name": "Toll", "start": 0, "end": 5.7, "title": ["WHO COLLECTS", "THE AI TOLL?"]}]`.
   Title: at most 2 lines of 16 characters, uppercase, and it is a mini-hook itself.
2. Run `python3 $SK/scripts/new_video.py <proj> --tag "COMPANY / 01" --date "DD MMM YYYY"`.
   It computes the video end and the moment the character leaves (0.2 s after the last word).
3. Write `BEATS.md` in the format of `reference/nvidia-pt/BEATS.md`: one table per scene with the
   columns time, trigger (word), object, physical action, transformation, SFX and final state.
   Break the narration into visual units of 0.5 to 1.5 s.

Motion rules, all mandatory:

1. No composition starts finished: it is built, transformed or destroyed in front of the viewer.
2. One relevant visual change every 0.5 to 1.5 s.
3. Nouns appear, plurals multiply, quantities accumulate and verbs cause actions.
4. Objects interact with each other. Entering, floating or changing position is not enough.
5. Whenever possible, the last object of a scene becomes the first object of the next.
6. Every relevant action gets a micro-SFX (pop, snap, impact, counter, whoosh, click).
7. Motion explains the causality of the narration, it does not decorate the screen.
8. The character stays almost still (breathes and sways with the speech); the energy comes from the
   world around it. It does the big hop at most 1 or 2 times, at opinion moments ("My take") via `hops`.
9. Fade-in, slide-in or a check mark cannot be the main motion in consecutive scenes.
10. Except key numbers and conclusions, nothing stays still for more than 1.2 s. Even a held number
    is alive (coins settling, a shine passing).

Decomposition example (the sentence "Its chips do the work"):

```
0.0 s  one GPU drops with an impact
0.5 s  another snaps in beside it
0.8 s  four multiply
1.2 s  eight stack into a rack
1.7 s  cables connect the racks
2.1 s  pulses run through the network
2.6 s  the whole thing becomes a data center
```

4. In the same `BEATS.md`, write the **continuity contracts**: the exact state (object, x, y,
   scale) at every scene boundary. This is what lets scenes be produced in parallel with no visible seam.

Gate 4 (rejection): for each scene, answer in writing at the end of `BEATS.md`: (a) can it be
summarized as "a finished layout with objects sliding"? (b) is anything still for more than 1.2 s?
(c) does the main motion repeat the previous scene's? (d) does every sentence have at least 2
physical actions? Any "yes" in a, b or c, or "no" in d, forces you to redo that scene in the table
before coding.

## Phase 5: implement the scenes

Each scene is a file `src/scenes/SXX_Name.tsx` exporting a `Scene`:
`{ id, start, end, title, Comp, cues, hops?, acts? }`. `Comp` receives `t` (absolute narration
seconds) and draws SVG on the stage. Use `reference/nvidia-pt/scenes/S01_Hook.tsx` as the structure
model and `S07_Dinheiro.tsx` (a rack that multiplies to a thousand) as the accumulation model.

Stage: SVG 1080 x 1100 (scene coordinates), drawn from y=470 of the screen and scaled 0.88 with 6%
side margins (`REEL` in `Layout.tsx`). The main action lives in y 40 to 720 of the stage. The
character occupies x 64 to 394, y 770 to 1130 of the stage; captions sit below. Make objects BIG,
filling the width, not small icons in the middle.

Reels safe area: the app UI covers ~270 px at the top, ~310 to 420 px at the bottom (handle, post
caption, audio) and ~130 px on the right from mid-height down; the profile grid shows only the 3:4
middle (y 240 to 1680) and the feed 4:5 (y 285 to 1635). That is why the video has no header and no
footer, the title starts at y 290 and the karaoke captions at y 1480. Do not change these numbers per
video. (Learned the hard way: a first post went out with its header under the "Reels" tab and the
title cut in the grid.)

Kit (`src/kit/`), everything a pure function of time:

- `anim.ts`: `prog(t, a, d, ease)` (0 to 1), `pop(t, a)` (scale with overshoot), `out(t, a)`,
  `drop(t, a, d, h)` (fall with bounce), `shake(t, a, amp)`, `squash(t, a)` ([sx, sy] on landing),
  `arc(p, x0, y0, x1, y1, h)` (throw), `stepCount(t, [[t, n], ...])` (stepped multiplication),
  `ease.{out, in, inOut, back, bounce, elastic}`, `lerp`, `clamp`, `vis`, `along`. Type `Cue = [t, sfx, vol?]`.
- `shapes.tsx`: `G` (x, y, s, sx, sy, r, o), `Box3D` (box with extruded accent side), `Txt`, `Gpu`,
  `Rack`, `Coin`, `Bubble`, `Building`, `Person`, `DrawPath` (stroke that draws itself), `Pulse`,
  `Stamp`, `Tag`, `Floor`, `Controller`, `Cam` (camera zoom). A new primitive goes in the scene file;
  if another scene reuses it, export it from there.
- `tokens.ts`: the theme. `C` holds roles, not hues: `bg, dot, ink, accent, accentSoft, positive,
  positiveDark, highlight, paper, warm, negative, line, muted, sand`. Change the look of a series by
  changing these values; scenes never use hex colors and never invent colors outside the theme.
  The default is the repo palette: Field canvas, Ink outlines and text, Cobalt for structure (`accent`,
  `positiveDark`, tints in `accentSoft`/`positive`), Slate for secondary objects and inactive parts, and
  Beacon (`highlight`, `negative`) for the one thing that matters in the scene. Keep Beacon off large
  fills and give each scene a single Beacon focus. `FONT` is Manrope, `MONO` (IBM Plex Mono) is only for
  metadata such as the cover kicker.
- `Layout.tsx`: title that stamps in word by word, karaoke captions, the character and the loop. No
  header and no footer (they sat under the Reels UI). Do not change the Layout or the loop per video.

### The on-screen narrator character

Configured in `character.json` at the project root:

```json
{ "enabled": true, "dir": "character", "spriteWidth": 346,
  "arm": { "file": "arm.png", "x": 196, "y": 248, "w": 150, "px": 18, "py": 52 },
  "introSfx": "pop", "introSfxVolume": 1.2 }
```

Sprite contract (files in `public/<dir>/`):

- `m0.png` to `m4.png`: mouth closed (m0) to wide open (m4); `blink.png` (eyes closed) and
  `blink_half.png` (eyes half closed, mouth closed).
- PNG with transparency, all the SAME canvas size, aspect 346:375 (346 x 375 or any multiple),
  character facing the camera, feet on the bottom edge. They are drawn in a 330 x 358 box.
- All aligned pixel for pixel: only the mouth and the eyes change between files. Any body shift
  between sprites shows as jitter when the mouth flaps.
- `spriteWidth`: the real pixel width of your PNGs (all arm values are in sprite pixels).
- Optional `arm`: a separate PNG of the pointing limb, drawn at (`x`, `y`) of the sprite with width
  `w`, rotating around its pivot (`px`, `py`, in arm pixels). At rest it should lie along the body;
  `point` rotates it up to about -82 degrees. Use `"arm": null` if you have no arm sprite (`point`
  then only leans the body).
- `introSfx`: any short sound of `public/sfx/` played on frame 0 (default `pop`). `INTRO_MOUTH` in
  `Layout.tsx` is the mouth shape during that sound (a short syllable, then a strong open accent at
  0.33 s); adjust it if your intro sound has a different shape.
- `"enabled": false` removes the character; the video then starts with a 0.3 s empty lead-in so that
  the loop still holds.

Without `--sprites`, `setup.sh` draws a geometric placeholder (`placeholder_character.py`) so the
project renders; replace it before publishing.

How it moves (all automatic): the mouth follows `vo_mouth.json` (loudness per frame, closed outside
words, syllable-like flapping); it blinks by itself every 2.8 to 4.4 s; it breathes and sways with
each word. The loop is fixed and works as the hook: the reel OPENS with the character in the
camera's face (intro sound, impact rays) and going back home; narration and scenes start at
`LOOP.intro` (0.85 s). At the end it runs to the corner, winds up and dashes at the camera; the last
frame is frame 0, so the replay lands straight on the intro. Scene times and acts are in NARRATION
time (the kit adds the intro). Do not use the intro sound inside scenes.

Character acts per scene (`acts: [{ t, act, d? }]` in the `Scene`), always facing the camera, NEVER
turned sideways (a mirrored character was rejected): `point` (arm points at the stage, d ~0.8 to 1.0),
`up` (looks up at what appears), `hop` (small hop), `nod` (stress a word), `wiggle` (celebration) and
`flinch` (startle on an impact). At most 2 per scene, spaced, at moments the narration asks for (key
number, reveal, joke). The big opinion hop is `hops` (only at "My take").

SFX available in `public/sfx/`: alarm, alert, boing, cash, chord, click, clink, coin, crack, dig,
ding, impact, pop, powerup, scribble, snip, splash, stamp, tick, ticker, whir, whoosh, zip. Master
level 0.34, and 30% lower when an effect lands on a spoken word. New sound: add it to `scripts/sfx.py`
and run it with the project folder.

Parallelism: with 8 to 10 scenes, write S01 yourself (it sets the standard) and split the rest into
3 subagents of 3 scenes each, on the strongest model available. Each subagent gets: the project
path, the `BEATS.md` rows of its scenes, the boundary contracts, the rule to edit only its own files
and the duty to review its own contact sheets until gate 4 passes.

Gate 5: `npx tsc --noEmit` clean in the project folder (run `source $SK/scripts/_node.sh` first).

## Phase 6: visual review

For each scene: `bash $SK/scripts/sheet.sh <proj> <start> <end> 0.25 out/sXX.png` and LOOK at the
image. `sheet.sh` takes REAL video time: add `LOOP.intro` (0.85 s with the character) to the scene
times. Then one sheet of the boundaries (0.6 s each side of every cut) and one of the end joining the
start. Reject and fix if:

- An object appears before its time. An object "off screen" by offset is still drawn: hide it with
  `t >= start` instead of position.
- Something passes over the title, the character or the captions (the stage SVG has visible overflow).
- There is tiny text: nothing under 26 px on the stage, and key numbers at 40 px or more.
- The seam between scenes jumps (the continuity contract was not met).
- Any stretch looks like a static slide (gate 4 again, now in pixels).
- The last frame does not match frame 0 (character home, stage empty, title out).

## Phase 7: render and delivery

```bash
bash $SK/scripts/render.sh <proj> <proj>/out/explainer-<company>.mp4
```

Cover per video (mandatory): the `Cover` composition (1 frame, 1080x1920) in `src/Cover.tsx` with a
kicker (`video.json` tag), the company name big, the hook title and the S01 symbol object with the
character, everything inside y 240 to 1680 (model: `reference/nvidia-pt/Cover.tsx`). Render with
`npx remotion still Cover out/cover.png` and check the 3:4 crop
(`ffmpeg -i out/cover.png -vf crop=1080:1440:0:240 out/cover_3x4.png`). Without a cover, Instagram
picks a random frame and the grid looks off.

Check: duration between 45 and 58 s, loudness around -14 LUFS, and the `_sheet.png` the script
writes. Deliver the MP4, the cover and the sheet. In the report, say in a few lines: the hook, the
thesis, the facts used with sources, which voice was used (and whether it was the local fallback),
what was left out of `BEATS.md` and what needs a decision.

## Lessons already paid for

- Sprites: if you cut them from footage, pick frames with the body in the same position (difference
  under 1 color level outside the mouth). A wide-open mouth made by warping looked artificial; the
  intro uses m4 with a jolt and a body stretch instead.
- ElevenLabs: `output_format=mp3_44100_192` returns 403 on plans below Creator; use 128. Send a
  `User-Agent`, or Cloudflare may block `urllib`. The key may lack `voices_read` (listing voices
  returns 401) while text-to-speech still works: use known premade voice ids. A key can create voices
  but not delete them (`voices_write` only through the web UI), and custom voices are capped per plan.
- Kokoro pt-BR mispronounces foreign words ("videogame" becomes "videogami"); rewrite the term or
  accept it, and check it in the ASR.
- Remotion: a composition id accepts only letters, numbers and `-`. `noUnusedLocals` is on: a stray
  import breaks `tsc`.
- Homebrew ffmpeg may come without `drawtext`; the sheets do not depend on it.
- zsh treats `=====` as a command; in scripts use `echo '---'`.
- Some skill sync tools do not carry `.ttf`/`.otf`; the fonts always come from `setup.sh`.
- A full render takes about 30 s on a recent Apple Silicon Mac; on a small VPS expect minutes (use `--concurrency`).
