# talk-clipper

Cuts a long webinar, panel or call recording into topic clips per speaker: every
cut lands on the silence between words, with burned-in captions and an
identification lower third. Built to run as a [Claude Code
skill](https://docs.claude.com/en/docs/claude-code/skills), but the scripts also
work on their own from the command line.

Input: a one-hour MP4. Output: 30 to 90 second clips at 1080p, each with an `.srt` next to it.

```
recording -> transcribe.py -> scribe.json -> index.py -> sentences.txt
                                                              |
                                                  you pick the topics
                                                              v
                                                          plan.json
                                                              |
                                            dry.py <----------+
                                                              v
                                                          render.py -> clips/
```

## Install

```bash
pip3 install pillow numpy requests
brew install ffmpeg
# fonts: Manrope + IBM Plex Mono from ../captions/assets/fonts (OFL), else Arial/DejaVu
```

As a Claude Code skill, copy or symlink this folder:

```bash
ln -s "$PWD" ~/.claude/skills/talk-clipper
```

## Use

```bash
cp config.example.json config.json     # point at the video, name the speakers
cp plan.example.json plan.json

export ELEVENLABS_API_KEY=...
python3 scripts/transcribe.py          # per-word timestamps + diarization
python3 scripts/index.py               # sentence index for picking the topics
python3 scripts/dry.py                 # review cuts and captions without a render
python3 scripts/render.py              # render
```

`SKILL.md` explains why each decision is the way it is, what to do when the
recording layout is different, and the ffmpeg traps the code already avoids.

## Output format

- **slide_pip**: shared screen full bleed, speaker camera in a PiP at the bottom
  right, captions left-aligned at the bottom.
- **talking_head**: speaker full screen, for stretches without screen sharing.
- Lower third with name, role and optional logo enters and leaves in the first
  seconds. While it is on screen the captions rise so they never collide.
- H.264 CRF 19, AAC audio normalized to -16 LUFS, `+faststart`.

Everything lives in `config.json`: size, fps, colors, font, PiP geometry, caption
size and position, terms painted in the accent color, expressions the captions
must not split, transcription fixes, and the `speaker_id` to name and role map.

## External service

Only the transcription, and only once per recording: ElevenLabs Scribe, because
it needs per-word timestamps **and** diarization in the same response. Cutting,
composition, captions and render are local. Switching providers means rewriting
`transcribe.py` to emit the same `scribe.json`: `{"words": [{"type": "word",
"text", "start", "end", "speaker_id"}]}`.

## License

MIT, see `LICENSE`.
