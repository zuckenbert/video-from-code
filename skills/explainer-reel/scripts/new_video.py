"""Writes video.json, the scene stubs and src/scenes/index.ts from scenes.json.
Usage: python3 new_video.py <project> --tag "COMPANY / 01" --date "30 OCT 2026"
scenes.json (project root): [{"id": "S01", "name": "Toll", "start": 0, "end": 5.7, "title": ["LINE 1", "LINE 2"]}, ...]
Checks: starts at 0, scenes touch (end == next start), at least 2 s each, title max 2 lines of 16 characters.
The last scene end is set to the video end. Never overwrites a scene that already has code (use --force)."""
import argparse, json, pathlib, sys

ap = argparse.ArgumentParser()
ap.add_argument("proj"); ap.add_argument("--tag", required=True); ap.add_argument("--date", required=True)
ap.add_argument("--force", action="store_true")
a = ap.parse_args()
P = pathlib.Path(a.proj)
words = json.loads((P / "public/vo_words.json").read_text())
char = json.loads((P / "character.json").read_text())
last = words[-1]["e"]
INTRO = 0.85 if char.get("enabled") else 0.3  # LOOP.intro in src/kit/Layout.tsx
DASH = 0.95                                   # LOOP.dash in src/kit/Layout.tsx
end = round(last + 0.2, 2)          # narration time: the character leaves for the corner
total = round(INTRO + end + DASH + 1 / 30, 3)  # real video length (the last frame is frame 0)
scenes = json.loads((P / "scenes.json").read_text())
scenes[-1]["end"] = round(end + DASH + 0.1, 2)
errs = []
if abs(scenes[0]["start"]) > 1e-6: errs.append("first scene must start at 0")
for x, y in zip(scenes, scenes[1:]):
    if abs(x["end"] - y["start"]) > 1e-6: errs.append(f"{x['id']} ends at {x['end']} but {y['id']} starts at {y['start']}")
for s in scenes:
    if s["end"] - s["start"] < 2.0: errs.append(f"{s['id']} is shorter than 2 s")
    if len(s["title"]) > 2 or any(len(l) > 16 for l in s["title"]): errs.append(f"{s['id']}: title must be at most 2 lines of 16 characters")
if errs: sys.exit("!! invalid scenes.json:\n  " + "\n  ".join(errs))
(P / "video.json").write_text(json.dumps({"tag": a.tag, "date": a.date, "end": end, "total": total}, ensure_ascii=False, indent=2))
sd = P / "src/scenes"; sd.mkdir(parents=True, exist_ok=True)
for s in scenes:
    f = sd / f"{s['id']}_{s['name']}.tsx"
    if f.exists() and not a.force: continue
    f.write_text(f"""import React from 'react';
import {{ Cue }} from '../kit/anim';
import {{ Scene }} from '../kit/Layout';
import {{ Txt }} from '../kit/shapes';

const Comp: React.FC<{{ t: number }}> = () => <Txt x={{540}} y={{360}} size={{40}}>{s['id']} (stub)</Txt>;

const cues: Cue[] = [];

export const {s['id']}: Scene = {{ id: '{s['id']}', start: {s['start']}, end: {s['end']}, title: {json.dumps(s['title'], ensure_ascii=False)}, Comp, cues }};
""")
idx = "\n".join(f"import {{ {s['id']} }} from './{s['id']}_{s['name']}';" for s in scenes)
idx += "\n\nexport const SCENES = [" + ", ".join(s["id"] for s in scenes) + "];\n"
(sd / "index.ts").write_text(idx)
(P / "scenes.json").write_text(json.dumps(scenes, ensure_ascii=False, indent=1))
who = "character leaves" if char.get("enabled") else "outro starts"
print(f"ok: {len(scenes)} scenes, speech ends at {last:.2f} s (narration), {who} at {end} s, video {total} s (intro {INTRO} s)")
