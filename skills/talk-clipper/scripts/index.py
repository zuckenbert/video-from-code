#!/usr/bin/env python3
"""Turns scribe.json into two readable indexes for choosing the cuts.

Usage: python3 scripts/index.py [config.json]

Output in workdir/:
  speakers.txt   how long each speaker_id talked (to map id -> person)
  sentences.txt  the whole video, one sentence per line, with the timestamp in
                 mm:ss and in absolute seconds. This is where you copy the in/out
                 pairs from into plan.json.

Diarization gets authorship wrong on short and overlapping speech. Check in the
video who is talking in the stretch before closing the plan.
"""
import json, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C


def words_of(cfg):
    d = json.load(open(os.path.join(cfg["workdir"], "scribe.json")))
    return [w for w in d["words"] if w.get("type") == "word"]


def main():
    cfg = C.load(sys.argv[1] if len(sys.argv) > 1 else None)
    W = words_of(cfg)
    names = {k: v.get("name", k) for k, v in cfg["speakers"].items()}

    turns = []
    for x in W:
        sp = x.get("speaker_id", "?")
        if turns and turns[-1]["sp"] == sp and x["start"] - turns[-1]["end"] < 2.0:
            turns[-1]["end"] = x["end"]; turns[-1]["t"] += " " + x["text"]
        else:
            turns.append({"sp": sp, "start": x["start"], "end": x["end"], "t": x["text"]})

    talk = Counter()
    for t in turns:
        talk[t["sp"]] += t["end"] - t["start"]
    sp_path = os.path.join(cfg["workdir"], "speakers.txt")
    with open(sp_path, "w") as f:
        for sp, secs in sorted(talk.items(), key=lambda k: -k[1]):
            f.write(f"{sp:12s} {secs/60:6.1f} min   {names.get(sp,'(unmapped)')}\n")
    print(open(sp_path).read(), end="")

    sents, cur = [], []
    for x in W:
        if cur and x.get("speaker_id") != cur[-1].get("speaker_id"):
            sents.append(cur); cur = []
        cur.append(x)
        if x["text"].endswith(('.', '?', '!')):
            sents.append(cur); cur = []
    if cur:
        sents.append(cur)

    se_path = os.path.join(cfg["workdir"], "sentences.txt")
    with open(se_path, "w") as f:
        for s in sents:
            sp = s[0].get("speaker_id", "?")
            a, b = s[0]["start"], s[-1]["end"]
            txt = " ".join(w["text"] for w in s)
            f.write(f"[{int(a//60):02d}:{a%60:04.1f} {a:8.1f} -> {b:8.1f}] "
                    f"{names.get(sp, sp)}: {txt}\n")
    print(f"{len(turns)} turns, {len(sents)} sentences, {len(W)} words")
    print(f"-> {sp_path}\n-> {se_path}")


if __name__ == "__main__":
    main()
