---
name: product-demo
description: >-
  Screen-Studio-style product demo video for any local web app, 100% in code: Playwright
  captures one real UI frame per state (click, key, scroll, dialog) from a storyboard.json,
  and Remotion adds a smooth cursor, click ripple, zoom on action points, title cards,
  chapters, an on-screen timer and optional ElevenLabs narration, rendered to 1080p h264
  at -14 LUFS. Use when asked for a "product demo video", "demo of my app", "walkthrough
  video", "how to do X in 1 minute", "Screen Studio style video", "feature video",
  "commercial for my web app", or a video of any app running on localhost.
---

# product-demo

A demo video is born from ONE file, `storyboard.json`. Nothing is screen-recorded: every UI
state becomes a real PNG (2x device scale), and the montage (cursor, zoom, voice) is computed.
That makes it repeatable: copy changed, re-render; a click changed, recapture one scene.

## Flow (mandatory order)

```bash
# 0. once per machine: engine in a writable folder (node 22, playwright-core, remotion, ffmpeg, fonts)
bash <skill>/scripts/setup.sh ~/apps/product-demo
cd ~/apps/product-demo
# 1. project = a folder with storyboard.json (copy the example and adapt)
mkdir -p ~/videos/myapp && cp examples/sample-app.storyboard.json ~/videos/myapp/storyboard.json
# 2. capture (the app must be up at `base`; login goes in a scene with "capture": false)
node scripts/capture.mjs ~/videos/myapp            # or: ... ~/videos/myapp scene1,scene2
# 3. voice (optional; without ELEVENLABS_API_KEY the video is silent and scenes last as long as their steps)
ELEVENLABS_API_KEY=... node scripts/vo.mjs ~/videos/myapp
# 4. timeline + contact sheet (LOOK at it before rendering) + render
node scripts/timeline.mjs ~/videos/myapp && bash scripts/still.sh ~/videos/myapp && bash scripts/render.sh ~/videos/myapp
```

Output: `<project>/out.mp4` (1920x1080, 30 fps, h264, audio at -14 LUFS), `<project>/stills/sheet.png`.

Requirements: Node 22, ffmpeg/ffprobe, a Chromium for Playwright (`npx playwright install chromium`
or `CHROMIUM_PATH`), Python 3 with Pillow for the contact sheet (`pip3 install --user pillow`).

### Try it on the bundled sample app

```bash
python3 -m http.server 8417 --bind 127.0.0.1 --directory <skill>/examples/sample-app &
mkdir -p /path/to/project && cp <skill>/examples/sample-app.storyboard.json /path/to/project/storyboard.json
# then steps 2 to 4 above with /path/to/project
```

`examples/sample-app/` is a plain HTML/JS task list (login, list, "New task" dialog with a
combobox, checkbox and date popover, detail page, confirm dialog). No build step.

## The storyboard

```json
{
  "base": "http://127.0.0.1:8417", "viewport": {"width":1600,"height":900}, "locale": "en-US", "lang": "en",
  "speed": 1.3, "cardMin": 3.2, "pad": 0.5,
  "warmup": ["/", "/settings"],
  "hideCss": "nextjs-portal,.tsqd-open-btn-container{display:none!important}",
  "brand": {"accent":"#EF681E","line":"#1D4AA5","ink":"#12141A","paper":"#F3EFE5","url":"app.example.com","wordmark":"assets/logo.svg"},
  "voice": "onwK4e9ZLuTAKqWW03F9",
  "scenes": [
    {"id":"login","capture":false,"steps":[{"s":"goto","url":"/login"},{"s":"fill","target":{"label":"Email"},"text":"demo@example.com"},{"s":"fill","target":{"css":"input[type=password]"},"text":"..."},{"s":"press","key":"Enter","settle":2500}]},
    {"id":"hook","kind":"card","title":"1 minute.","line":"That is how long it takes to ...","sub":"app.example.com","vo":"Spoken text."},
    {"id":"scene1","chapter":"Setup","timer":true,"vo":"...", "steps":[
      {"s":"goto","url":"/products","hold":0.9},
      {"s":"click","target":{"role":"button","name":"New product"},"zoom":1.8,"hold":0.6},
      {"s":"click","target":{"role":"textbox","name":"Name"},"zoom":1.7},
      {"s":"type","text":"Starter plan","hold":0.3},
      {"s":"select","target":{"role":"combobox","name":"Region"},"option":"EU","zoom":1.7},
      {"s":"check","target":{"label":"Active"},"zoom":1.8},
      {"s":"date","target":{"role":"button","name":"Start date"},"month_next":1,"day":"20"},
      {"s":"scroll","target":{"text":"Schedule"},"zoom":1.4,"hold":1.2},
      {"s":"zoom","target":{"text":"Exposure"},"scale":1.6,"hold":1.5},
      {"s":"zoom","reset":true},
      {"s":"confirm","hold":0.8},
      {"s":"sheet_submit","name":"Approve"},
      {"s":"snap","hold":1.5}
    ]}
  ]
}
```

Top level: `base` (app URL), `viewport` (CSS px; frames are captured at 2x), `locale` (browser,
default `en-US`), `lang` (ElevenLabs language code, default `en`; `pt`, `es`... work too),
`speed` (all holds are divided by it), `cardMin` (minimum card seconds), `pad` (seconds added
after a scene's voice), `warmup` (URLs visited before capture so first loads are warm),
`hideCss` (CSS injected in every frame to hide dev overlays), `brand`, `voice` (ElevenLabs voice id).

`brand` (all optional; defaults in `src/brand/tokens.ts` are the repo palette: Ink #12141A,
Field #F3EFE5, Slate #8195B0, Cobalt #1D4AA5, Beacon #EF681E): `ink` (stage and card background),
`paper` (window fill), `grey` (card line text, url text), `line` (structure: card rule, chapter bar,
timer), `accent` (the one next move: click ripple and the card sub line; keep it off large fills),
`white` (text on the dark canvas), `url` (text in the fake browser bar), `font` (display and body,
default Manrope), `mono` (metadata: url bar and timer, default IBM Plex Mono), `wordmark` (path
relative to the project folder, shown top-left on cards; empty by default, so no logo). A custom
`font` or `mono` must be installed on the machine or loaded in `src/brand/fonts.ts`.

Steps: `goto`, `click`, `type` (`fast`, `clear`), `fill` (not filmed), `press` (`snap:true` to film),
`select` (`option`), `check`, `date` (`month_next`, `day`), `scroll` (`top` or `target`),
`zoom` (`target`+`scale`, or `reset`), `confirm` (last button in the open dialog that is not
Cancel/Back/Close), `sheet_submit` (`name` of the button inside the sheet/dialog), `snap`, `wait` (`ms`).
Common step keys: `zoom` (camera scale on that action), `hold` (seconds on that frame), `settle` (ms to wait after).
Target: `{role,name}` (name anchored at the start; `any:true` for substring, `exact`, `last`, `nth`),
`{text}` (substring unless `exact:true`), `{label}`, `{placeholder}`, `{css}`. `button` also matches `link`.
Scene: `chapter` (lower third for 2.6 s), `timer` (stopwatch accumulated across timer scenes),
`capture:false` (runs without filming: login, seed), `kind:"card"` (card with `title`, `line`, `sub`),
`vo` (narration text).
`hold` is in seconds (divided by `speed`). If the scene's voice is longer than its steps, holds
>= 0.4 s stretch to fit; if shorter, the voice plays at the start of the scene.

Files per project: `storyboard.json` (you), `frames/` + `events.json` (capture), `vo/` + `vo.json`
(voice), `assets/` + `cut.json` (timeline), `stills/` (contact sheet), `out.mp4` (render).

## Direction rules (what made the video work)

- Zoom on EVERY field that receives a click or typing (1.6x to 1.8x in a commercial, 1.3x to 1.5x in a long demo).
  Zoom returns to 1.0 on `goto` and on advance buttons; explicit `reset` before changing subject.
- Commercial = hook card + timer + 3 to 5 scenes of 8 to 17 s + a quick montage of the rest + CTA card.
  Long demo = one chapter per module, 15 to 25 s of voice per scene. Commercial voice in short sentences;
  no em dash anywhere; name the product consistently.
- Contact sheet BEFORE rendering, always. A 4 min render takes about 8 min on 4 cores.
- Data on screen must be real app data (demo/seed), never painted on top.

## Pitfalls already paid for

- A name regex without `^` matches substrings: "Products" matched "Back to products". The locator anchors names at the start.
- "New X" is often a link, not a button (the locator tries both).
- A date picker is a `role=dialog` on top of the sheet: the skill closes it with Escape before looking for the submit button.
- A success sheet stays open and blocks the sidebar: click "Close" or navigate with `goto`.
- Dev tools (Next, TanStack) show up in screenshots: `hideCss` in the storyboard hides them.
- Checkbox: use the `check` step by label, never a click with an offset.
- Skill folders are often read-only synced mirrors, so `setup.sh` copies the engine to a writable folder.
  Credentials: voice only runs if `ELEVENLABS_API_KEY` is in the environment; no key, silent video.
- Chromium: `playwright-core` does not download a browser; use the machine's Playwright cache or `CHROMIUM_PATH`.
- Pillow is only used for the contact sheet. A 1:30 render takes about 4 min on 8 cores.
- When delivering in a chat channel, send the MP4 as an ATTACHMENT, never just the path.

Found while porting (sample app, 2026-10-30):

- A port already taken by another local server makes every step time out with no obvious reason.
  `curl` the `base` before capturing and check you get your app.
- `zoom` on a `{text}` target centers on the matched element's box: if that element is a wide block,
  the zoom lands on empty space. Target a snug element (or make the element shrink to its content).
- After `sheet_submit`/`confirm` the camera stays zoomed on the button that just vanished; give the
  following `snap` a hold of about 2 s so the zoom-out finishes before the scene fades.

## Delivery

MP4 + contact sheet + versioned storyboard.json. Record in the project notes what went in, content
decisions (what the app did not allow and how the video worked around it) and the next step.
