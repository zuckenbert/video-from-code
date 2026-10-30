---
name: launch-film
description: Makes a cinematic launch film for a software product from three layers. Public-domain archival footage with its original audio is the spine (for example NASA mission film with a countdown). A continuous real browser recording of the product journey, captured at 2x, is cued by an absolute clock so each action lands on a beat of the archival audio (the click lands on "zero"). Minimal title cards and pills sit on top. One composition renders in two languages. Use when someone asks for a "launch film", "launch video", "cinematic product launch", "trailer for my app", "countdown video", "archival footage launch", "NASA footage launch video", "movie-style product video" or "launch video in two languages".
---

# launch-film

A 70-second launch film, 16:9, built with Playwright, ffmpeg and Remotion:

1. **Archive (the spine).** Public-domain film and its original audio, for example the 1969 launch countdown. That audio
   is the only voice in the film, and its clock is the edit.
2. **Product.** One continuous recording of the real app in a headless browser, captured at 2x. Every action is cued
   on the archival clock: `t_rec = t_video - recAt`. A camera (zoom keyframes plus slow drift) and a drawn cursor sit on top.
3. **Cards.** A few large monospace lines and small pills. One per beat, never over the UI.

The archival audio is identical in both languages, so the same composition renders twice. Only the cards, the pills and
the text typed into the app change.

## The pitch method

- **One spine.** Pick a single public-domain scene whose sound already has a structure: a countdown, a radio exchange, a
  roll call. Its timeline is the edit. Do not write a narration and then look for pictures.
- **A through-line phrase.** Use a film or radio phrase that the archive itself says and that your product "answers". It
  is the acknowledgment that an order was heard and will be executed. It appears three times: the word alone on black
  (act 2), big over the climax footage (act 7), and in the end card. The example uses "Copy that."
- **One voice only.** The voice heard is the archival one. **Zero TTS and no narrator by default** when the archival
  audio carries the film. A synthetic voice next to a real 1969 voice breaks the film.
- **Two worlds, two treatments.** Archive: 4:3 inside 16:9 with real black bars (no blur fill), grain, saturation at
  about 85%. Product: raw and sharp, no window frame, no grain, no word art. The contrast tells the story: a whole room
  then, one sentence now.
- **The countdown is the montage.** Each number lands on one product action. On "zero" the operator clicks the
  irreversible button. On "liftoff" there is a hard cut to the archive. The product and the archive are the same event.
- **An honest promise.** Show the human reviewing and approving. Human-in-the-loop is the feature. The end card says what
  the product does, not what it replaces.
- **Negative reference (do not do this):** TTS narration over a stock rocket photo, word art, and a 3-2-1 that has
  nothing to do with the UI.

### Nine acts (the proven 70 s timeline in `src/film.json`)

| # | Film time | Act | Audio (archive) | Screen | Card |
|---|-----------|-----|-----------------|--------|------|
| 1 | 0 to 8 | The room | room ambience | archive: the room full of people | "1969. A whole room / to say one word." |
| 2 | 9 to 14 | The word | the first radio reply, cut dry | black | the through-line word |
| 3 | 14 to 22 | The sentence | radio silence | product: the operator types the mission and sends it | none |
| 4 | 22 to 28 | Guidance is internal | "twenty seconds and counting..." | the product works, the result list arrives, the camera goes down the list | pill: "Research. Signal. Who decides." |
| 5 | 29 to 33 | Review | "twelve, eleven, ten, nine" | 12: edit, 11: save, 10: approve, 9: the confirmation panel | pill: "You review." |
| 6 | 33 to 42 | Ignition | "ignition sequence start... zero" | the cursor parks on the confirm button through the count and clicks on "zero" | none: the button is the card |
| 7 | 44 to 55 | Liftoff | "liftoff, we have a liftoff", the only loud moment | hard cut to the archive: ignition, then the vehicle clearing the smoke | the through-line phrase, the only text over footage |
| 8 | 56 to 64 | Tower cleared | the confirmation radio lines | product: the queue with the approved items | pill: "You approve. <product> executes." |
| 9 | 64 to 70 | End | fades out | product wordmark with a blinking accent caret | "You give the mission. <phrase>" |

The product navigates to the next screen while the archive covers it (act 7), so the cut back lands on a settled screen.

## Files

```
SKILL.md, TESTED.md, package.json, tsconfig.json, remotion.config.ts, .gitignore
src/LaunchFilm.tsx      composition: archive clips, product layer (camera + cursor), cards, pills, end card, audio
src/film.json           the film: timeline, theme, archive clips, audio clips, cards, pills, texts per language
src/cuts/cut_<lang>.json written by the recorder (events with absolute instants)
src/Root.tsx            LaunchFilm-EN and LaunchFilm-PT
scripts/record.mjs      the recorder (journey.json -> rec_<lang>.mp4 + cut_<lang>.json)
scripts/animatic.py     archive + audio on the film clock with flat cards for the product, to approve beats first
scripts/fetch_archival.sh  downloads the NASA set from images.nasa.gov and cuts it (no footage ships here)
scripts/make_placeholders.sh  stand-in archive with the same offsets (testsrc + spoken countdown), for testing
scripts/render.sh       render + fixed-gain loudness to -14 LUFS + limiter
scripts/sheet.sh        1 fps contact sheet with second labels
scripts/add_music.sh    optional low bed under a finished MP4
scripts/fonts.sh        downloads the default font (Manrope + OFL license) into <public>/fonts
examples/sample-app/    "relay.", a tiny plain HTML/JS sales agent (fictional data) to test the whole chain: a mission in
                        a chat box, ranked accounts with a public signal and who decides, one draft edited, the ready
                        ones approved, the confirm click on "zero" puts them in the Sends queue
examples/journey.json   the journey for the sample app, cued on the countdown
```

Media (archive, recordings) live in a public dir that is never committed. Pass it with `PUBLIC_DIR` (recorder, render)
or as an argument (scripts).

## Step by step

0. **Install.** Node 22, ffmpeg, Python 3 with Pillow.
   `npm install`, then `npx playwright-core install chromium-headless-shell` if no Chromium for playwright-core 1.63 is cached.
1. **Get the archive.** Either run `scripts/fetch_archival.sh <public>` for the NASA set, or cut your own. Make a
   word-level transcript of the audio (any speech-to-text with word timestamps; the original used a hosted one) and a
   contact sheet of the footage (`scripts/sheet.sh`). Write down the source second of every beat you need. For a test
   run, use `scripts/make_placeholders.sh <public>` instead: it builds stand-ins with the same offsets.
2. **Write the pitch.** One sentence for the idea, then the act table above with your beats. Fill `text.en` and
   `text.pt` in `src/film.json`. The default theme is the repo palette: `bg` Field #F3EFE5 (end card, pills), `ink`
   Ink #12141A (text), `side` a Field shade (bands beside the recording), `accent` Beacon #EF681E (only the click ring
   and the end caret, never a fill), card text Field over the archive, font Manrope (`scripts/fonts.sh <public>`
   downloads it with its OFL license; `render.sh` runs it when the file is missing). To match a product instead, use
   its own tokens (background, ink, accent, font) and set `theme.fontFile` to a TTF in the public dir.
3. **Animatic.** `python3 scripts/animatic.py en <public>`. Real archive and audio on the film clock, a flat card where the
   product goes, and every journey cue labeled at its time. Approve the beats here, before recording anything.
4. **Write the journey.** Copy `examples/journey.json`. Every `at` is a **film** time, the second where the archival
   word is heard. The recorder subtracts `recAt`. Give each beat a `cue` label so the log reads like the script.
5. **Make the product ready.** Use synthetic data only. If the real backend is slow (an agent that takes minutes), seed
   the finished state and `nav` to it on cue. Every take needs fresh state (one seed per recording).
6. **Record each language.** `FILM_LANG=en PUBLIC_DIR=<public> node scripts/record.mjs`, then `FILM_LANG=pt`.
   Read the log: each `OVERRUN x.xx s before @t` is a beat that landed late. Fix the journey and record again. The target
   is zero overruns on the countdown beats.
7. **Render.** `PUBLIC_DIR=<public> scripts/render.sh LaunchFilm-EN out/launch_film_en.mp4`, same for `-PT`.
8. **Contact sheet, always.** `scripts/sheet.sh out/launch_film_en.mp4`. Look at every second before anyone sees the
   MP4: cards inside the frame, the zoom on the right thing, no blank screen under the archive cut-back, the click ring on
   the zero second.
9. **Optional.** Add a low drone that stops at "zero" (`scripts/add_music.sh in.mp4 bed.mp3 out.mp4 -15`). The default
   is no music.

## journey.json reference

Top level: `base` (app URL), `viewport` (CSS px layout, default 1440x900), `scale` (2), `zoomMode`
(`documentElement` | `bodyChildren`), `scroller` (CSS selector of the scroll container; auto-detected if absent), `css`
(injected on every navigation: hide dev overlays, validation noise, fix `100vh`), `locale` per language, `cursorStart`,
`vars` per language (`{{name}}` in any step string), `warmup` (untimed steps before the black marker), `steps`.

Targets: `{css}`, `{role, name, exact}`, `{label}` or `{text}`, plus `hasText`, `hasTextRe`, `within` (another target),
`last`, `nth`.

| step | fields | what it does |
|------|--------|--------------|
| `click` | target, at, zoom, hold, settle, kind, keepZoom | scroll into view, measure, start the mouse early so the click lands on `at`, click. If the screen signature (route + h1) changes, the event becomes `zoom 1, nav` |
| `hover` | target, at | move and park the cursor (hold it on the button through the count) |
| `type` | text, at, delay, focus, clear | real keystrokes (48 ms default; 6 ms for a fast edit) |
| `press` | key, at, focus, zoom | a key on the beat (Enter to send) |
| `zoom` | target, at, scale, frac | camera keyframe on an element (scroll it to `frac` of the height first) |
| `frame` | targets, at, scale | camera on the union of several elements |
| `zoomReset` | at | back to the whole screen |
| `reveal` | target, at, frac, zoom | smooth-scroll the container until the target sits at `frac` |
| `scrollTop` | at, zoom | back to the top of the full screen (for "concept" beats) |
| `select` | target, option, at | open a combobox and pick a `role=option` |
| `nav` | hash or url (+ `router: "next"`), at | change screen on the beat (hash, SPA router push, or a hard goto as a fallback) |
| `waitFor` | target, timeout | untimed wait for an element |
| `wait` | ms | untimed pause |
| `mark` | at | logs a marker; use one at `endAt` so the recording covers the whole product window |

Warm-up steps: `goto`, `fill`, `click`, `press`, `hash`, `waitFor`, `wait`.

## film.json reference

`recAt` and `endAt` bound the product layer. `archive[]`: `{name, src, at, to, from, sat, fadeIn, fadeOut}` (from =
second inside the file; fades in frames; omit fades for hard cuts). `audio[]`: `{name, src, at, from, dur, volume,
fadeIn, fadeOut}`. `cards[]`: `{key, at, to, outAt, color, size, y}` (words enter one by one; dry exit at `outAt`).
`pills[]`: `{key, at, to}`. `end`: `{wordmark, line}`. `text`: one dictionary per language.

## Lessons paid for in production

**Recording**
- Screenshots with a synthetic camera look frozen however good the camera is: no real scrolling, dropdowns or typing.
  Record continuous browser video in real time and put the camera on top.
- To record at 2x: viewport = layout x 2, `deviceScaleFactor: 1`, CSS zoom 2. With `deviceScaleFactor: 2`, `recordVideo`
  does not scale (the page lands in a corner of the frame). A CDP screencast came out at 1x and about 10 fps.
- Zoom mode depends on the app. On a plain app `body>*{zoom}` did not take; `document.documentElement.style.zoom` did.
  On Next.js, a loose `<style>` on `<html>` gets removed and html zoom breaks Radix popovers. Zoom the children of
  `<body>`, put the zoom on the popper content (not its wrapper), and reset `select-content` to the trigger width.
- Under CSS zoom, `100vh` is doubled: the shell grows to twice the viewport, the window scrolls, and every visibility
  check lies. Override it in `journey.css` (`height: 100% !important`). This was found while testing this skill.
- Scroll the app's container, never the window. Use `scrollTo({behavior: 'smooth'})`, then poll until it settles.
- `getBoundingClientRect` is in zoomed px and `scrollTop` is in CSS px. Convert before mixing them.
- The mouse travels on an eased path (0.28 to 0.8 s by distance, 30 steps/s) and starts early, so the click lands on the
  word. Wide targets get the cursor at 30% from the left.
- When a wait overruns, shrink the following holds to 35% until the journey catches up. Log every overrun.
- Navigating to another screen 0.3 s after pressing Enter failed: the app ignored the change while sending. At 0.6 s it
  worked.
- Some apps scroll a chat to the end when it opens. Do not force it to the top; frame the surface that matters.
- Use the SPA router (`window.next.router.push`) instead of a hard goto, which shows an empty shell for about a second.
- Choose which item to act on by distance to the next beat: edit the row next to the approve button, so that no long
  scroll eats "eleven" and "ten". Start a typed edit 0.4 s before its beat and type it at 6 ms per key.
- Mark t0 with a 0.6 s full-screen black div and find it with `blackdetect` (pix_th 0.20; 0.10 missed it).
- ffmpeg writes `blackdetect` to stderr. `execFileSync` returns stdout only, and one run lost its events this way.
  Save the event log before post-processing, and keep a `FINISH=<webm>` mode that only post-processes.
- Headless recordings have no cursor. Draw it from the logged moves, with a ring on each click.
- Warm up every screen before the marker (sign-in, caches, fonts), so the take has no cold loads.

**Editing**
- A click that changes the screen never keeps a zoom: the new screen enters whole and the next step zooms in. Otherwise
  the screen swaps under a close-up and the camera jumps.
- The camera never fully stops: after settling it drifts in at 1%/s, capped at 5%.
- On "concept" beats, show the top of the full screen at zoom 1, not a scrolled fragment.
- Cuts between archive and product are always hard. Never fade to black between product screens.
- Change screens while the archive is on (under the liftoff) so the cut back is clean.
- Make a contact sheet before showing any MP4, every round. It is the standing rule of the original productions.
- Loudness: measure integrated LUFS, apply a fixed gain to -14, then a limiter. Two-pass loudnorm falls back to dynamic
  mode and lifts quiet passages.
- Two languages: same app, same archival audio. Only the typed text, the cards and the pills change.
- Fonts in Pillow: a `.woff2` will not open without brotli. Use the TTF release of the font.

## Not included

- The 9:16 cut (archive on top, product below, card at the seam) was planned in the original pitch but never built.
- The low drone bed was planned but never made. Only the mixing tool (`add_music.sh`) is here.
- A transcription tool: bring any speech-to-text with word timestamps.
