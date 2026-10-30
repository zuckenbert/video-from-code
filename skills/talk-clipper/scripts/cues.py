"""Groups words into caption cues with dynamic programming.

Input:  list of (start, end, text) with time ALREADY relative to the clip.
Output: [{start, end, lines: [[(text, highlighted?), ...], ...]}]

Greedy grouping (fill the line up to the limit) splits expressions in the middle
and leaves an orphan word on screen. Here a DP minimizes a cost that adds:
distance from the ideal length, a penalty for breaking away from punctuation, and
a penalty for cues that are too short. Locked expressions (lexicon.locked) and
highlighted terms (lexicon.highlight) become forbidden boundaries: the DP cannot
cut inside them.
"""
import re


def build(words, cfg):
    cap = cfg["caption"]
    lx = cfg["lexicon"]
    MAX_LINE, MAX_CUE = cap["max_line_chars"], cap["max_cue_chars"]
    MAX_DUR, MIN_DUR = cap["max_dur"], cap["min_dur"]
    HIGHLIGHTS, LOCKED, FIX = lx["highlight"], lx["locked"], lx["fix"]
    drop = lx["_fillers_re"]

    W = []
    words = [w for w in words if not drop.match(w[2].strip())]
    for a, b, t in words:
        core = t.strip('.,!?;:')
        punct = t[len(t.rstrip('.,!?;:')):]
        rep = FIX.get(core.lower())
        W.append([a, b, (rep + punct) if rep else t])
    N = len(W)
    if N == 0:
        return []
    plain = [re.sub(r'[.,!?;:]', '', w[2]).lower() for w in W]
    forbidden = set()
    for ph in list(dict.fromkeys(list(HIGHLIGHTS) + list(LOCKED))):
        tk = ph.lower().split()
        for s in range(N - len(tk) + 1):
            if plain[s:s+len(tk)] == tk:
                forbidden.update(range(s+1, s+len(tk)))

    def cost(i, j):
        chars = len(' '.join(w[2] for w in W[i:j]))
        dur = W[j-1][1] - W[i][0]
        if chars > MAX_CUE or dur > MAX_DUR + 0.7:
            return None
        last = W[j-1][2]
        brk = 0 if last.endswith(('.', '!', '?')) else (8 if last.endswith(',') else 34)
        short = 0 if chars >= 16 or brk == 0 else (16 - chars) * 4
        return (chars - MAX_CUE*0.74)**2/45 + brk + short

    INF = float('inf')
    best = [INF]*(N+1); back = [0]*(N+1); best[0] = 0
    for j in range(1, N+1):
        if j < N and j in forbidden:
            continue
        for i in range(max(0, j-24), j):
            if best[i] == INF or (i and i in forbidden):
                continue
            c = cost(i, j)
            if c is not None and best[i]+c < best[j]:
                best[j] = best[i]+c; back[j] = i
    if best[N] == INF:
        raise SystemExit('DP did not close: loosen caption.max_cue_chars or caption.max_dur')
    cues, j = [], N
    while j > 0:
        i = back[j]; cues.append(W[i:j]); j = i
    cues.reverse()
    bases, acc = [], 0
    for c in cues:
        bases.append(acc); acc += len(c)

    def wrap(cue, base):
        parts = [w[2] for w in cue]; text = ' '.join(parts)
        if len(text) <= MAX_LINE:
            return [text]
        pick, sb = None, 1e9
        for k in range(1, len(parts)):
            a, b = ' '.join(parts[:k]), ' '.join(parts[k:])
            if len(a) > MAX_LINE+4 or len(b) > MAX_LINE+4:
                continue
            sc = abs(len(a)-len(b)) + 6*max(0, len(a)-MAX_LINE) + 6*max(0, len(b)-MAX_LINE) \
                 + (40 if (base+k) in forbidden else 0) - (8 if parts[k-1].endswith((',', '.')) else 0)
            if sc < sb:
                pick, sb = [a, b], sc
        return pick or [text]

    def runs(line):
        """splits the line into runs (text, highlighted?) to paint the terms."""
        marks = [False]*len(line); low = line.lower()
        for h in HIGHLIGHTS:
            hl, st = h.lower(), 0
            while True:
                k = low.find(hl, st)
                if k < 0:
                    break
                if (k == 0 or not low[k-1].isalpha()) and \
                   (k+len(hl) >= len(low) or not low[k+len(hl)].isalpha()):
                    for z in range(k, k+len(hl)):
                        marks[z] = True
                st = k+1
        out = []
        for ch, m in zip(line, marks):
            if out and out[-1][1] == m:
                out[-1][0] += ch
            else:
                out.append([ch, m])
        return out

    res = []
    for i, c in enumerate(cues):
        start, end = c[0][0], c[-1][1]
        nxt = cues[i+1][0][0] if i+1 < len(cues) else end+1
        if end-start < MIN_DUR:
            end = min(start+MIN_DUR, nxt-0.02)
        if nxt-end > 0.18:
            end = min(end+0.16, nxt-0.04)
        res.append({'start': start, 'end': end, 'lines': [runs(l) for l in wrap(c, bases[i])]})
    return res
