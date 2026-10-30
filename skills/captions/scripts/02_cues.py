#!/usr/bin/env python3
"""words.json (whisper token-level) -> cues.json + captions.srt

Groups words into cues with dynamic programming, minimizing a cost that weighs
cue length, breaking at punctuation and cues that are too short. Boundaries inside
a locked expression are forbidden, so "bike lane network" never splits between
two cues nor between two lines.
"""
import json, re, sys
from lib import CFG, wpath

C = CFG['caption']
MAX_LINE, MAX_CUE = C['max_line'], C['max_cue']
MAX_DUR, MIN_DUR = C['max_dur'], C['min_dur']

HIGHLIGHTS = CFG.get('highlights', [])
LOCKED = list(dict.fromkeys(HIGHLIGHTS + CFG.get('locked', [])))
FIX = {k.lower(): v for k, v in CFG.get('fix', {}).items()}

# ---------- 1. tokens -> words ----------
d = json.load(open(wpath('words.json'), encoding='utf-8'))
toks = [(s['offsets']['from'] / 1000, s['offsets']['to'] / 1000, s['text'])
        for s in d['transcription'] if s['text'].strip()]

words = []
for a, b, t in toks:
    if t.startswith(' ') or not words:
        words.append([a, b, t.strip()])
    else:                                    # subtoken: glue to the previous word
        words[-1][1] = b
        words[-1][2] += t

merged = []                                  # loose punctuation sticks to the word
for a, b, t in words:
    if merged and re.fullmatch(r'[.,!?;:]+', t):
        merged[-1][1] = b
        merged[-1][2] += t
    else:
        merged.append([a, b, t])
words = merged

for w in words:                              # fix ignores trailing punctuation
    core = w[2].rstrip('.,!?;:')
    rep = FIX.get(core.lower())
    if rep:
        w[2] = rep + w[2][len(core):]

if not words:
    sys.exit('whisper returned no words: check the audio track and the -l language')

# ---------- 2. forbidden boundaries ----------
N = len(words)
plain = [re.sub(r'[.,!?;:]', '', w[2]).lower() for w in words]
forbidden = set()
for ph in LOCKED:
    tk = ph.lower().split()
    for s in range(N - len(tk) + 1):
        if plain[s:s + len(tk)] == tk:
            forbidden.update(range(s + 1, s + len(tk)))


# ---------- 3. DP words -> cues ----------
def cue_cost(i, j):
    chars = len(' '.join(w[2] for w in words[i:j]))
    dur = words[j - 1][1] - words[i][0]
    if chars > MAX_CUE or dur > MAX_DUR + 0.7:
        return None
    last = words[j - 1][2]
    brk = 0 if last.endswith(('.', '!', '?')) else (8 if last.endswith(',') else 34)
    short = 0 if chars >= 16 or brk == 0 else (16 - chars) * 4
    return (chars - MAX_CUE * 0.74) ** 2 / 45 + brk + short


INF = float('inf')
best = [INF] * (N + 1)
back = [0] * (N + 1)
best[0] = 0
for j in range(1, N + 1):
    if j < N and j in forbidden:
        continue
    for i in range(max(0, j - 20), j):
        if best[i] == INF or (i and i in forbidden):
            continue
        c = cue_cost(i, j)
        if c is not None and best[i] + c < best[j]:
            best[j] = best[i] + c
            back[j] = i
if best[N] == INF:
    sys.exit('DP did not close: loosen caption.max_cue / caption.max_dur in the config')

cues, j = [], N
while j > 0:
    i = back[j]
    cues.append(words[i:j])
    j = i
cues.reverse()

bases, _acc = [], 0
for c in cues:
    bases.append(_acc)
    _acc += len(c)


# ---------- 4. break into 2 lines ----------
def wrap(cue, base):
    parts = [w[2] for w in cue]
    text = ' '.join(parts)
    if len(text) <= MAX_LINE:
        return [text]
    pick, score_best = None, 1e9
    for k in range(1, len(parts)):
        a, b = ' '.join(parts[:k]), ' '.join(parts[k:])
        if len(a) > MAX_LINE + 4 or len(b) > MAX_LINE + 4:
            continue
        sc = abs(len(a) - len(b)) \
            + 6 * max(0, len(a) - MAX_LINE) + 6 * max(0, len(b) - MAX_LINE) \
            + (40 if (base + k) in forbidden else 0) \
            - (8 if parts[k - 1].endswith((',', '.')) else 0)
        if sc < score_best:
            pick, score_best = [a, b], sc
    return pick or [text]


# ---------- 5. colored runs ----------
def runs(line):
    marks = [False] * len(line)
    low = line.lower()
    for h in HIGHLIGHTS:
        hl, st = h.lower(), 0
        while True:
            k = low.find(hl, st)
            if k < 0:
                break
            # whole words only: "API" must not light up inside "rapid"
            if (k == 0 or not low[k - 1].isalpha()) and \
               (k + len(hl) >= len(low) or not low[k + len(hl)].isalpha()):
                for z in range(k, k + len(hl)):
                    marks[z] = True
            st = k + 1
    out = []
    for ch, m in zip(line, marks):
        if out and out[-1][1] == m:
            out[-1][0] += ch
        else:
            out.append([ch, m])
    return out


# ---------- 6. output ----------
out = []
for i, c in enumerate(cues):
    start, end = c[0][0], c[-1][1]
    nxt = cues[i + 1][0][0] if i + 1 < len(cues) else end + 1
    if end - start < MIN_DUR:
        end = min(start + MIN_DUR, nxt - 0.02)
    if nxt - end > 0.18:
        end = min(end + 0.16, nxt - 0.04)
    out.append({'start': start, 'end': end,
                'lines': [runs(l) for l in wrap(c, bases[i])]})

json.dump(out, open(wpath('cues.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def srt_ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h:02d}:{m:02d}:{s:06.3f}'.replace('.', ',')


srt = []
for i, c in enumerate(out, 1):
    body = '\n'.join(''.join(r[0] for r in l) for l in c['lines'])
    srt.append(f"{i}\n{srt_ts(c['start'])} --> {srt_ts(c['end'])}\n{body}\n")
open(wpath('captions.srt'), 'w', encoding='utf-8').write('\n'.join(srt))

for c in out:
    print(f"{c['start']:6.2f} -> {c['end']:6.2f}  " +
          ' / '.join(''.join(('[' + r[0] + ']') if r[1] else r[0] for r in l)
                     for l in c['lines']))
print(f'\n{len(out)} cues  ([brackets] = highlighted)', file=sys.stderr)
