import speakerCfg from '../data/speaker.json';
import speakerWords from '../data/speaker_words.json';
import speakerFace from '../data/speaker_face.json';
import { Segs, edlDur } from './edl';
import { makeTranscript, Transcript, Word, BeatRef, keyTester } from './words';

export type Face = { t: number; cx: number; cy: number };

/** Style 2 panel configs (see examples/speaker.json). */
export type PanelCfg = { in: BeatRef; out?: BeatRef; pad?: number; light?: boolean } & (
  | { type: 'steps'; title: string; items: Array<[string, BeatRef, number?]> }
  | { type: 'statement'; lines: Array<[string, BeatRef]>; size?: number; accentLast?: boolean; underline?: BeatRef }
  | { type: 'rows'; title: string; at: BeatRef; rows: Array<[string, number, 'muted' | 'ink' | 'loss' | 'ok']>; prefix?: string; decimals?: number }
  | { type: 'chat'; label: string; question: string; answer: string; q: BeatRef; a: BeatRef }
);

export type SpeakerCfg = {
  name: string; role: string; src: string; segs: Segs;
  fillers?: string[]; keywords?: string[];
  lowerThird?: { inS: number; outS: number } | null;
  sfx?: boolean;
  /** style 5 (vertical stage story) */
  story?: {
    zoom?: number; faceY?: number; join?: { at: number; zoom: number } | null;
    beats: Record<string, BeatRef>;
    items?: BeatRef[];
    number?: { at: BeatRef; value: number; suffix?: string; cells?: BeatRef } | null;
  };
  /** style 2 (speaker + effects) */
  fx?: {
    split: BeatRef;
    chapters?: { kicker: string; title: string; items: Array<{ label: string; at: BeatRef }> } | null;
    panels: PanelCfg[];
  };
  /** style 3 (mixed) */
  mixed?: { coldOpen: { seconds: number; words: string[]; accent?: 'last' | 'loss' }; close: { seconds: number; line: string } };
  endCard?: { line: string } | null;
};

export type Person = { name: string; role: string; src: string; faces: Face[]; segs: Segs; dur: number; tr: Transcript; isKey: (w: string) => boolean; cfg: SpeakerCfg };

/** A person = config + word-timestamped transcript + smoothed face track (all produced by engine/tools). */
export const person = (cfg: SpeakerCfg, words: Word[], faces: Face[]): Person => {
  const segs: Segs = cfg.segs.length ? cfg.segs : words.length ? [[0, words[words.length - 1].e + 0.4]] : [];
  return {
    name: cfg.name, role: cfg.role, src: cfg.src, faces, segs, dur: edlDur(segs), cfg,
    tr: makeTranscript(words, segs, cfg.fillers ?? []), isKey: keyTester(cfg.keywords ?? []),
  };
};

// One example speaker. A second person = a second set of files in src/data and one more line here.
export const SPEAKER = person(speakerCfg as unknown as SpeakerCfg, speakerWords as unknown as Word[], speakerFace as unknown as Face[]);
export const hasSpeaker = SPEAKER.dur > 0.5 && SPEAKER.tr.WORDS.length > 0;
