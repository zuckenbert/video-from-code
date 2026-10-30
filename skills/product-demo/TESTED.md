# Tested

Date: 2026-10-30. macOS (Apple Silicon), Node 22.23.4 via nvm, ffmpeg from Homebrew, Python 3.14 + Pillow 12,
Chromium from the local Playwright cache. Engine dir and video project lived in `<repo>/.scratch/` (not in the skill).

| # | Command (run from the engine dir unless noted) | Result |
|---|---|---|
| 1 | `bash <skill>/scripts/setup.sh <repo>/.scratch/pd-engine` | 259 packages, fonts + OFL license downloaded, "chromium ok", 5.0 s |
| 2 | `python3 -m http.server 8417 --bind 127.0.0.1 --directory <skill>/examples/sample-app` | serving the sample app |
| 3 | `cp <skill>/examples/sample-app.storyboard.json <repo>/.scratch/sample-project/storyboard.json` | project ready |
| 4 | `node scripts/capture.mjs <project>` | 72 frames, 73 events, 0 errors, 25 s |
| 5 | `node scripts/vo.mjs <project>` (ELEVENLABS_API_KEY from the shell env) | 5 clips: hook 7.85 s, create 6.32 s, review 7.29 s, finish 3.02 s, cta 5.80 s |
| 6 | `node scripts/timeline.mjs <project>` | total 38.8 s; hook=8.3 create=11.9 review=7.8 finish=4.4 cta=6.3 |
| 7 | `bash scripts/still.sh <project>` (and with `15`) | `stills/sheet.png`, 23 s for 9 stills; reviewed by eye |
| 8 | `bash scripts/render.sh <project>` | `out.mp4`, 23 s wall time at concurrency 4 |
| 9 | `ffmpeg -i out.mp4 -af ebur128=peak=true -f null -` | integrated -14.1 LUFS, true peak -1.4 dBFS, LRA 3.1 LU |
| 10 | `env -u ELEVENLABS_API_KEY node scripts/vo.mjs <project>` | "skipping voice (video will be silent)", exit 0 |
| 11 | `npx tsc -p .` | no type errors |
| 12 | `bash <skill>/scripts/setup.sh <repo>/.scratch/pd-engine` (second run) | idempotent, fonts kept, 0.7 s |

Output: `out.mp4` 1920x1080, h264 30 fps + AAC, duration 38.9 s, 6.3 MB.

## What the contact sheet caught (and the fixes)

1. First capture: every step timed out. Port 8765 was already held by an unrelated local server.
   Moved the sample to 8417 and added the pitfall "curl the base first".
2. After scrolling the detail page the sidebar scrolled away, leaving a blank strip. Made the
   sample app's sidebar sticky.
3. The `zoom` on "marked it as" centered on a full-width row, so the 1.7x view showed mostly empty
   space with the text cut on the left. Made the row text shrink to its content; zoom now lands on it.
4. After `sheet_submit` the list was shown still zoomed on the vanished button for most of the
   final hold. Raised that `snap` hold to 2.0 s so the zoom-out completes before the fade.

Steps exercised by the sample storyboard: `capture:false` login with `fill` + `press`, cards with
voice, `goto`, `click`, `type` (normal and `fast`), `select` on a custom combobox, `check`, `date`
with `month_next`, `sheet_submit`, `snap`, `scroll` (target and `top`), `zoom` (target and `reset`),
`confirm` on an alertdialog, chapters, timer across two timed scenes with an untimed scene between.
Not exercised: `wait`, `type` with `clear`, `press` with `snap`, `wordmark`.

## 2026-10-30: re-test with the palette defaults

Defaults changed to the repo palette (Ink stage and cards, Field window, Slate secondary text, Cobalt `line`
for the card rule, chapter bar and timer, Beacon `accent` only for the click ripple and the card sub line) and
the fonts to Manrope + IBM Plex Mono (setup.sh downloads both with their OFL files). The sample app was retinted
to the same palette. Re-ran from the same engine and project in `.scratch/`:

| Command | Result |
|---|---|
| `setup.sh <repo>/.scratch/pd-engine` | Manrope Medium/SemiBold, IBM Plex Mono Medium and both OFL files in `assets/`, "chromium ok" |
| `capture.mjs` | 72 frames, 73 events, 0 errors, 25 s |
| `vo.mjs` | the 5 cached clips reused (no ElevenLabs call) |
| `timeline.mjs` | total 38.8 s, fonts copied to the project |
| `npx tsc -p .` | no type errors |
| `still.sh` + `render.sh` | contact sheet checked by eye; `out.mp4` 1920x1080, 38.9 s, -14.1 LUFS, true peak -1.4 dBFS |
