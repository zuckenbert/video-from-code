#!/usr/bin/env python3
"""Print the word-timestamped transcript so you can READ it before cutting, and propose an EDL.

Each line: start, end, gap before the word, the word; fillers marked with *, repeated words with
(xN) so you remember that at('word') needs an `after` for them.
With --suggest, prints segs that drop every filler by cutting in the middle of the silence on each
side of it (never inside a word). Review the proposal: cut stutters and restarts by hand.

usage: list_words.py <words.json> [--fillers "um,uh,um,,uh,"] [--suggest] [--pad 0.04]
"""
import argparse, json, re
from collections import Counter

ap = argparse.ArgumentParser()
ap.add_argument('words')
ap.add_argument('--fillers', default='', help='comma separated, exact tokens incl. punctuation; use ",," for a token ending in a comma')
ap.add_argument('--suggest', action='store_true')
ap.add_argument('--pad', type=float, default=0.04, help='seconds kept around kept words when the gap is tiny')
a = ap.parse_args()

W = json.load(open(a.words))
fillers = set(x for x in re.split(r'(?<!,),(?!,)', a.fillers.replace(',,', ',\0')) if x)
fillers = set(x.replace('\0', ',') for x in fillers)
norm = lambda w: re.sub(r'[.,:;?!]', '', w).lower()
count = Counter(norm(w['w']) for w in W)

prev_e = 0.0
for w in W:
    gap = w['s'] - prev_e
    mark = '*' if w['w'] in fillers else ' '
    rep = f" (x{count[norm(w['w'])]})" if count[norm(w['w'])] > 1 else ''
    print(f"{w['s']:7.2f} {w['e']:7.2f}  +{gap:4.2f} {mark} {w['w']}{rep}")
    prev_e = w['e']

if a.suggest:
    segs, start = [], 0.0
    for i, w in enumerate(W):
        if w['w'] not in fillers:
            continue
        before = W[i - 1]['e'] if i else 0.0
        after = W[i + 1]['s'] if i + 1 < len(W) else w['e']
        cut_in = max(before + a.pad, (before + w['s']) / 2)
        cut_out = min(after - a.pad, (w['e'] + after) / 2)
        if cut_in > start:
            segs.append([round(start, 2), round(cut_in, 2)])
        start = cut_out
    segs.append([round(start, 2), round(W[-1]['e'] + 0.4, 2)])
    print('\nsegs:', json.dumps(segs))
    print('output duration:', round(sum(o - i for i, o in segs), 2), 's')
