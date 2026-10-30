# TESTED

Date: 2026-10-30. Machine: macOS (Apple Silicon), ffmpeg from Homebrew (no libass,
no drawtext), whisper-cli from Homebrew `whisper-cpp`, Python 3 + Pillow 12,
model `ggml-large-v3-turbo.bin` in `~/.cache/whisper/` (size 1624555275 bytes,
same as the Hugging Face file; the download URL in SKILL.md answered HTTP 200).

All media lived in `.scratch/captions/` at the repo root (not committed).

## Test clips

Synthetic: `testsrc2` video at 1280x720 (to exercise the scale to 1080p) with a
macOS `say` voice track, one clip per language.

```bash
say -v Luciana -o pt.aiff "Olá, hoje eu vou falar sobre a rede de ciclovias da cidade. No dia 10 de agosto, às 18 horas, a prefeitura abre a consulta pública. A rede de ciclovias liga o centro aos bairros em menos de vinte minutos, com segurança e sem trânsito. Traga suas ideias e ajude a desenhar o novo mapa."
say -v Samantha -o en.aiff "Hi, today I want to talk about the city bike lane network. On August 10th, at six in the evening, the city opens its public hearing. The bike lane network links downtown to every neighborhood in under twenty minutes, safely and without traffic. Bring your ideas and help us draw the new map."
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 pt.aiff)
ffmpeg -f lavfi -i "testsrc2=size=1280x720:rate=30:duration=$d" -i pt.aiff -shortest \
  -c:v libx264 -pix_fmt yuv420p -c:a aac test_pt.mp4      # same for en
```

## Runs

| # | Command | Result |
|---|---|---|
| 1 | `run.sh -i test_pt.mp4 -o out_pt.mp4 -c examples/config.pt.json -w work_pt` | 20.6s clip, 6 cues, 619 frames, 1920x1080 h264 + aac, 21s wall time |
| 2 | `run.sh -i test_en.mp4 -o out_en.mp4 -c examples/config.en.json -w work_en` | 16.9s clip, 6 cues, 505 frames |
| 3 | same as 1 and 2 with `--skip-asr` after adding `fix` entries | whisper skipped, "Prefeitura" -> "prefeitura", "City Bike Lane Network" -> "city bike lane network" |
| 4 | `run.sh -i test_en.mp4 -o out_en_nocard.mp4 -w work_en --skip-asr` (no name) | "no card.name: skipping the lower third", captions at the low margin from frame 0 |
| 5 | config.en.json + `card.logo` pointing at a test PNG | card 560x142 with divider and logo |
| 6 | `02_cues.py` alone on the PT words with `max_line=18`, `max_cue=30`, with and without locks | see below |

Cues from run 1 (`[ ]` = highlighted):

```
  0.00 ->   4.06  Olá, hoje eu vou falar sobre / a [rede de ciclovias] da cidade.
  4.06 ->   7.14  No dia 10 de agosto, às 18 horas,
  7.14 ->   9.82  a prefeitura abre / a consulta pública.
  9.82 ->  12.95  A [rede de ciclovias] liga / o centro aos bairros em
 12.95 ->  16.98  menos de 20 minutos, / com segurança e sem trânsito.
 16.98 ->  20.62  Traga suas ideias e ajude / a desenhar um novo mapa.
```

Cues from run 2:

```
  0.05 ->   3.44  Hi. Today I want to talk about / the city [bike lane network].
  3.44 ->   6.00  On August 10th, / at 6 in the evening,
  6.00 ->   8.10  the city opens its public hearing.
  8.10 ->  11.07  The [bike lane network] links / downtown to every neighborhood
 11.07 ->  14.22  in under 20 minutes, / safely and without traffic.
 14.22 ->  17.00  Bring your ideas and / help us draw the new map.
```

Run 6, the locked expressions doing their job under pressure:

```
no locks:  No dia 10 / de agosto,          A rede de / ciclovias liga      em menos de / 20 minutos,
locks:     No dia / 10 de agosto,          A [rede de ciclovias] / liga    em / menos de 20 minutos,
```

## Frames checked by eye

Extracted with `ffmpeg -ss <t> -i out.mp4 -frames:v 1`:

- PT t=0.75s: card mid slide-in (cut by the left edge, partly transparent), captions
  already at the high margin.
- PT t=2.5s: card fully in, name and role legible, accent bar on the left edge,
  two-line caption above the card, "rede de ciclovias" in the accent color.
- PT t=10.5s: card gone, caption back at the low margin, highlight intact.
- EN t=3s: same layout with a custom accent (`#4CC9F0`) on both the bar and the
  highlight.
- EN without name, t=3s: no card, caption low.
- EN with logo, t=4s: divider and logo vertically centered on the card.

No problems found that needed a code change after the first run. The only fix
was to the example config: lock "6 in the evening" (the form whisper writes)
instead of "six in the evening".

## 2026-10-30: re-test with the palette defaults

`defaults.json` now uses the repo palette (accent Beacon for highlights only, new `theme.bar` Cobalt for the card
edge, Ink card, Field text, Slate role) and the shipped fonts are Manrope SemiBold (captions, name) and IBM Plex
Mono Medium (role) with their OFL files. Re-ran runs 1 and 2 with `--skip-asr` on the same work folders:
PT 20.6 s and EN 16.9 s rendered, frames at 2.5 s (PT) and 3 s (EN) checked: card with Cobalt edge, name in
Manrope, role in Plex Mono, highlight in Beacon (PT) and in the example's custom accent (EN).
