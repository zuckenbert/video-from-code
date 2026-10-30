#!/usr/bin/env python3
"""Reviews the cuts in the terminal, without spending a render.

Usage: python3 scripts/dry.py [filter] [--config other.json]

Prints, for each plan.json item: where the cut actually landed (after snap), the
duration, and the captions cue by cue. This is where you catch the split
expression, the misspelled name (send it to lexicon.fix) and the clip that opens
or closes on a sentence fragment.
"""
import sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import config as C
import render as R


def main():
    argv = sys.argv[1:]
    cfgpath = None
    if '--config' in argv:
        i = argv.index('--config')
        cfgpath = argv[i+1]
        argv = argv[:i] + argv[i+2:]
    only = argv[0] if argv else None

    cfg = C.load(cfgpath)
    words = R.load_words(cfg)
    total = 0
    for speaker, slug, t0, t1 in R.load_plan(cfg):
        if only and only not in slug and only != speaker:
            continue
        a, b, fa, fb = R.snap(cfg, words, t0, t1)
        cs = R.clip_cues(cfg, words, fa, fb, a)
        total += b - a
        print(f"\n===== {speaker} / {slug}   [{a:.1f} -> {b:.1f}]  {b-a:.0f}s  {len(cs)} cues")
        for c in cs:
            txt = " / ".join("".join(r[0] for r in l) for l in c['lines'])
            print(f"   {c['start']:6.2f}  {txt}")
    print(f"\ntotal {total/60:.1f} min")


if __name__ == '__main__':
    main()
