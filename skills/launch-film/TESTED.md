# TESTED

Date: 2026-10-30. Machine: macOS (Apple Silicon), Node 22.23.4, ffmpeg 8.1.1 (built without drawtext), Python 3 with
Pillow, playwright-core 1.63.0 (Chromium headless shell 153, revision 1243), Remotion 4.0.535.
Media dir used for every test: `<repo>/.scratch/launch-film/public` (gitignored, outside the skill), called `$PUB` below.
All commands run from `skills/launch-film/`.

## 1. Install and typecheck

```
source ~/.nvm/nvm.sh && nvm use 22
npm install            # 259 packages
npx tsc -p .           # no errors
```

## 2. Stand-in archive (no real footage)

```
scripts/make_placeholders.sh $PUB
```
Result (about 17 s): `room.mp4` 12.0 s, `liftoff.mp4` 38.0 s, `count.m4a` 41.0 s, `radio.m4a` 26.0 s. Voice: macOS `say`.
Check with `silencedetect` (-40 dB): `count.m4a` words start at 7.30, 13.32, 15.00, 15.90, 17.80, 18.80, 21.00, 22.13,
23.13, 24.09, 25.00, 26.00, 27.00 ("zero"), 28.30, so every beat lands where `src/film.json` expects it. "Ten" at 16.7 merges
with "eleven" at that threshold. `radio.m4a`: 3.40 and 17.00.

## 3. Real archive (resolution only)

```
DRY=1 scripts/fetch_archival.sh /tmp/x
```
Both images.nasa.gov ids resolve to `~large.mp4` URLs. HEAD on the launch master: HTTP 200, 2,366,402,930 bytes. The
download and the cuts were NOT run in this test (2.4 GB). The offsets in the script come from the original production,
which used the `~orig` master; the `~large` variant is assumed to keep the same timeline. Check it by ear before
recording.

## 4. Sample app

```
cd examples/sample-app && python3 -m http.server 8817 --bind 127.0.0.1
```
HTTP 200. (Port 8765 was taken by an unrelated local process, so the example uses 8817.)

## 5. Animatic

```
python3 scripts/animatic.py en $PUB $PUB/../out/animatic_en.mp4
python3 scripts/animatic.py pt $PUB $PUB/../out/animatic_pt.mp4
```
Result: 70.0 s each, 1920x1080, about 13 s to build. Contact sheet checked: archive and cards on time, product cards
show each journey cue at its second.

## 6. Recording (real Playwright, continuous video, 2x)

```
FILM_LANG=en PUBLIC_DIR=$PUB node scripts/record.mjs
FILM_LANG=pt PUBLIC_DIR=$PUB node scripts/record.mjs
```
Final run: EN 66.4 s wall, PT 71.3 s wall. Each logs 19 steps ok, 0 ERR, **0 OVERRUN**. Black marker found at 2.44 to
3.04 s (EN) and 2.44 to 3.08 s (PT). 23 events each. `rec_en.mp4` and `rec_pt.mp4`: 2880x1800, about 63.3 s, 7 MB.
The confirm click is logged at film 41.72 s in both, and "zero" is heard at 41.7 s.

Problems found and fixed during the test (both now in SKILL.md):
- First take: the shell used `100vh`, which CSS zoom doubles. The window scrolled, the approve button measured at y=1638
  and the queue page recorded blank. Fixed through the journey `css` override (`height: 100% !important`), without
  touching the app.
- Overruns of 0.36, 0.92 and 0.81 s on "eleven", "ten" and "nine": editing the first card forced a long scroll back to
  the approve button. Fixed by editing the card next to the button and starting the edit 0.4 s before "twelve" (as in
  the original). After that: 0 overruns.

## 7. Render

```
PUBLIC_DIR=$PUB scripts/render.sh LaunchFilm-EN $PUB/../out/launch_film_en.mp4
PUBLIC_DIR=$PUB scripts/render.sh LaunchFilm-PT $PUB/../out/launch_film_pt.mp4
```
Result: EN 79 s wall, PT 91 s wall. Both are 1920x1080, 30 fps, **70.016 s**, h264 + AAC, 112 MB, integrated loudness
**-14.2 LUFS**. Audio onsets in the final MP4s (silencedetect -35 dB): 9.0, 22.1, 28.0, 29.7, 30.6, 32.5, 33.5, 35.7 ...
40.7, 41.7 (zero), 43.0, 56.4, 57.5, 60.4.

## 8. Contact sheets (looked at, every second)

```
scripts/sheet.sh $PUB/../out/launch_film_en.mp4 $PUB/../sheet_en
scripts/sheet.sh $PUB/../out/launch_film_pt.mp4 $PUB/../sheet_pt
```
70 frames, 3 sheets each. Checked:
- 0 to 8 s: the room stand-in, 4:3 with black bars; the card enters word by word.
- 9 to 13 s: "Copy." on black.
- 14 to 43 s: the product; the prompt is typed in the film's language and the list arrives at 21 s. The camera reaches
  the edit (29 s), save, approve and the panel. The cursor stays on "Confirm and queue (3)" from 36 to 41 s.
- 44 to 54 s: hard cut to the liftoff stand-in. Its own timestamp reads 3 at 44 s and 23 from 48 s, which proves the
  `from` offsets 3.5 and 23.0. "Copy that." appears from 46 s.
- 55 to 63 s: the queue page, settled under the cut; the pill shows at 57 s.
- 64 to 69 s: the end card with the wordmark and the line, in EN and PT.

## 9. Hygiene

```
grep -rniE "<forbidden list>" --exclude-dir=node_modules .   # no hits
grep -rnP '\x{2014}|\x{2013}' --exclude-dir=node_modules .   # no hits
du -sh -I node_modules .                                      # 140K
```
`package-lock.json` is shipped (regenerated on 2026-10-30, see below).

## Not tested

- Downloading and cutting the real NASA footage (only URL resolution was checked).
- `zoomMode: "bodyChildren"`, `select`, `frame`, `scrollTop` and `nav` with `router: "next"`. These are ported from the
  production recorder but the sample app does not exercise them.
- `scripts/add_music.sh`, ported unchanged and not run here.
- `theme.fontFile` (the test used the system Menlo).
- Linux.

## 2026-10-30: palette defaults, sales sample app, lockfile

Changes: `src/film.json` theme is the repo palette (Field `bg`, Ink `ink`, a Field shade for `side`, Beacon `accent`
only on the click ring and the end caret, card text Field) with Manrope (`scripts/fonts.sh` downloads it with its
OFL file into `<public>/fonts`; `render.sh` calls it when the file is missing). The sample app "relay." is now a sales
agent with fictional data: the mission "Find fintechs hiring a Head of Sales this month, with the person who
decides." (PT: "Ache fintechs contratando head de vendas este mês, com quem decide."), 5 ranked accounts with a public
signal and who decides, the Fernpay draft edited, 3 approved, the confirm click puts them in the Sends queue. Film
texts unchanged ("Research. Signal. Who decides." / "You review." / "You approve. relay executes.").

| Step | Result |
|---|---|
| `npm install --package-lock-only` (Node 22.23.4, npm 10.9.9, clean folder) | `package-lock.json` with 304 entries, all with `resolved` and `integrity` |
| `rm -rf node_modules && npm ci` | 259 packages |
| `npx tsc -p .` | no errors |
| `scripts/fonts.sh $PUB` | Manrope Medium + OFL in `$PUB/fonts` |
| `animatic.py en` | 70.0 s, Manrope used for the cards |
| `record.mjs` EN and PT | 19 steps ok, 0 ERR, **0 OVERRUN** each; confirm click at film 41.71 s (EN) and 41.73 s (PT), on "zero" |
| `render.sh` EN and PT | 1920x1080, 30 fps, 70.016 s, -14.2 LUFS each |
| `sheet.sh` EN and PT | 70 frames looked at: mission typed 14 to 19 s, ranked list from 21 s with the pill, edit 29 to 31 s, panel from 32 s with the cursor on "Confirm and queue (3)" through the count, Sends queue settled under the cut from 55 s, end card |
