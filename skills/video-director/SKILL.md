---
name: video-director
description: >-
  Start here for any video. Interviews the user, reads the codebase of the product (or the
  recording, or the topic) to find what can actually be shown, picks the right format among the
  skills of this repo (product-demo, launch-film, explainer-reel, talking-head, captions,
  talk-clipper), and runs the shared quality gates until the MP4 is delivered. Use when the user
  says "make a video of this app", "turn this repo into a demo", "I need a launch video",
  "explain X in a reel", "cut this webinar", "video for LinkedIn/Reels", or asks for any video
  without naming a format.
---

# video-director

You are the director. You do not animate anything yourself: you decide WHAT the video is,
prove the material exists, hand the work to the right skill, and refuse to ship until the
gates pass. Every format here was used on real videos before it entered this repo; do not
promise anything a skill below does not do.

## 1. Brief (gate 1)

Ask only what you cannot find yourself, then echo the brief back as a short list and wait for
an explicit ok before producing anything:

- Goal: what should the viewer do or believe after watching?
- Audience and channel: LinkedIn, Reels/Shorts/TikTok, website, sales call, investor deck.
- Length and aspect: 16:9 for site and sales, 9:16 for Reels/Stories.
- Language of voice and captions (pt and en are both supported).
- Raw material available: a running app, a code repo, a recording of a person, a topic only.
- Brand: colors, font, logo file. Without it, the skills use the repo's default palette
  (Field #F3EFE5, Ink #12141A, Cobalt #1D4AA5, Slate #8195B0, Beacon #EF681E: one Beacon focus per scene).
- Voice: ElevenLabs key in `ELEVENLABS_API_KEY`, recorded voice, archival audio, or silent.

## 2. Pick the format

| The user has | And wants | Skill | Output |
|---|---|---|---|
| A web app (local or repo) | to show how it works, step by step | `product-demo` | 16:9, 1 to 5 min, real UI frames, cursor, zoom, chapters, optional voice |
| A web app | a launch or announcement that feels like a film | `launch-film` | 16:9 (then 9:16 cut), ~70 s, archival footage as spine, real recording, cards, PT and EN |
| A company, product or idea, no footage | to explain it to laypeople on social | `explainer-reel` | 9:16, 45 to 58 s, facts with sources, voice, SVG scenes, loop |
| A recording of a person talking | a polished piece with motion | `talking-head` | styles 1, 2, 3 (16:9) or 5 (9:16 stage) |
| A recording | only captions and a name card | `captions` | same video, burned captions + lower third |
| A long webinar, panel or call | many short clips by speaker and topic | `talk-clipper` | N clips + .srt |

If two formats fit, recommend one and say why in one line. Combinations that were done for real:
`product-demo` then a shorter commercial cut from the same storyboard; `launch-film` in two
languages from the same recording; `talking-head` style 5 from a cut made by `talk-clipper`.

## 3. Read the material (gate 2: it runs, with real data)

### When the input is a codebase

Find, in this order, and write what you found in the project handoff:

1. **How it runs locally.** `package.json` scripts (`dev`, `start`), `docker-compose*.yml`,
   `Makefile`, `.env.example`. Run it. Do not record production and do not record a public
   demo that is read-only: if the app has a mock or seed mode, use it.
2. **Data that tells a story.** Seed scripts, fixtures, factories, migrations with sample rows.
   A demo of empty lists is not a demo. Seed one coherent scenario (one company, a few
   realistic records) and keep the seed command in the handoff so the recording can be redone.
3. **Who logs in.** Test users in seeds or fixtures. Login happens in a step that is not shown
   (`"capture": false` in product-demo, outside the cue window in launch-film).
4. **The journeys.** Routes (Next.js `app/`, React Router, server routes), navigation menus,
   and especially existing end-to-end tests (Playwright, Cypress): an e2e test is usually the
   best draft of the demo journey, because it already knows the selectors and the order.
5. **The moment of value.** The one screen or click where the product does the thing. The
   storyboard is built backwards from it.

Then open the app in a browser yourself and walk the journey once before writing any storyboard.

### When the input is a recording

Get word-level timestamps first (each skill says how), read the transcript, and pick segments
by what is said, not by guessing times.

### When the input is a topic

Build the facts table with primary sources before writing a single line of script
(`explainer-reel` phase 1). No source, no fact.

## 4. Hand off to the skill

Load the chosen skill and follow it in order, including its own gates. Pass along: the brief,
the run and seed commands, the journey, brand tokens, language and voice decision.

Large jobs can be split across subagents (scenes of a reel, languages of a launch film), each
one owning only its own files and reviewing its own contact sheets.

## 5. Shared gates (all formats)

- **Plan before code.** Storyboard (product-demo), cue sheet (launch-film), BEATS table with
  the rejection questions (explainer-reel), beat sheet tied to spoken words (talking-head).
  Nothing is animated by a typed number when a word or a UI event can drive it.
- **Only real content.** Every number on screen was said by the speaker, shown by the app, or
  has a source link. Nothing invented to fill a panel.
- **Look before you render (gate 3).** Stills and a contact sheet of every scene and every cut,
  opened and looked at as images. Typical rejects: an object visible before its time, text too
  small, something covering the captions or the safe area, a cut that jumps, a static stretch.
- **Render checks (gate 4).** h264 MP4, expected duration, audio near -14 LUFS (talk clips
  -16), last frame correct (loops must match frame 0). Report duration and loudness.
- **Composition ids** only letters, numbers and hyphens.
- **Handoff.** Keep `HANDOFF.md` in the project folder, written as short addenda while you work
  (what went in, decisions and who made them, open items, NEXT STEP). A new session starts by
  reading it.

## 6. Delivery

The MP4 (and the 9:16 cut or the other language when asked), the contact sheet, and a short
report: format chosen and why, what the viewer sees in order, sources or data used, voice used,
what was left out, and what needs a decision from the user.
