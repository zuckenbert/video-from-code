import { Segs, srcToOut } from './edl';

export type Word = { w: string; s: number; e: number };
export type Cue = { words: Word[]; s: number; e: number };
/** A beat reference: a spoken word, or [word, after] when the word repeats (at() is case-insensitive). */
export type BeatRef = string | [string, number];

const strip = (w: string) => w.replace(/[.,:;?!]/g, '');
/** Keyword highlight test, from the speaker config (case-insensitive, punctuation ignored). */
export const keyTester = (keywords: string[]) => {
  const set = new Set(keywords.map((k) => strip(k).toLowerCase()));
  return (w: string) => set.has(strip(w).toLowerCase());
};

/** Group words into cues of up to maxWords words or maxDur s, breaking on punctuation and pauses. */
export const toCues = (words: Word[], maxWords = 5, maxDur = 2.4): Cue[] => {
  const cues: Cue[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) { cues.push({ words: cur, s: cur[0].s, e: cur[cur.length - 1].e }); cur = []; } };
  for (const w of words) {
    if (cur.length && (w.s - cur[0].s > maxDur || cur.length >= maxWords || w.s - cur[cur.length - 1].e > 0.7)) flush();
    cur.push(w);
    if (/[.?!]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3)) flush();
  }
  flush();
  return cues;
};

export type Transcript = { WORDS: Word[]; CUES: Cue[]; at: (needle: string, after?: number) => number; beat: (b: BeatRef) => number; has: (b?: BeatRef) => boolean };
/** Words already in OUTPUT time (after the EDL), fillers dropped, with cues and lookup by word. */
export const makeTranscript = (raw: Word[], segs: Segs, fillers: string[] = []): Transcript => {
  const F = new Set(fillers);
  const WORDS = raw
    .map((w) => { const s = srcToOut(segs, w.s), e = srcToOut(segs, w.e); return s === null || e === null ? null : { w: w.w, s, e }; })
    .filter((w): w is Word => w !== null && !F.has(w.w));
  const find = (needle: string, after = 0) => {
    const re = new RegExp('^' + needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return WORDS.find((x) => x.s >= after && re.test(x.w));
  };
  /** Start time (output seconds) of the first word matching needle at or after `after`. Throws if missing. */
  const at = (needle: string, after = 0) => {
    const w = find(needle, after);
    if (!w) throw new Error('word not found: ' + needle + (after ? ` (after ${after}s)` : ''));
    return w.s;
  };
  const beat = (b: BeatRef) => (typeof b === 'string' ? at(b) : at(b[0], b[1]));
  const has = (b?: BeatRef) => !!b && !!(typeof b === 'string' ? find(b) : find(b[0], b[1]));
  return { WORDS, CUES: toCues(WORDS), at, beat, has };
};
