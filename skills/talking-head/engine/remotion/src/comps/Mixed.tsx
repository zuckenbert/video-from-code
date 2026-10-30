import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, T, THEME } from '../engine/tokens';
import { arrive, riseStyle, leave } from '../engine/anim';
import { Wordmark, hasWordmark } from '../engine/Wordmark';
import { SPEAKER, hasSpeaker } from '../engine/people';
import { SpeakerBody } from './SpeakerBody';
import { NoSpeaker } from './NoSpeaker';

/*
 * Style 3, mixed: motion cold open (5 to 6 s, the question the speaker answers) + speaker body (style 2) + motion close (4 s).
 * Config: mixed.coldOpen (seconds, words) and mixed.close (seconds, line) in src/data/speaker.json.
 */
const cfg = SPEAKER.cfg.mixed;
export const OPEN_S = cfg?.coldOpen.seconds ?? 5, CLOSE_S = cfg?.close.seconds ?? 4;

/** Cold open: 100 accent blocks fill in, 3 come loose in red and fall; the question rises word by word. */
const ColdOpen: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = leave(f, OPEN_S * fps - 8, 8);
  const cols = 25, s = 56, g = 10;
  const leak = new Set([7, 48, 91]);
  const words = cfg?.coldOpen.words ?? [];
  const accent = cfg?.coldOpen.accent === 'loss' ? C.loss : C.accent;
  return (
    <AbsoluteFill style={{ background: C.ink, fontFamily: FONT, opacity: o }}>
      <div style={{ position: 'absolute', left: 96, top: 120, width: cols * (s + g), display: 'flex', flexWrap: 'wrap', gap: g }}>
        {Array.from({ length: 100 }, (_, i) => {
          const p = arrive(f, 2 + i * 0.4, 12);
          const isLeak = leak.has(i) && f > 1.6 * fps;
          const drop = isLeak ? Math.min(560, Math.max(0, (f - 1.6 * fps) ** 2 * 0.25)) : 0;
          return <div key={i} style={{ width: s, height: s, background: isLeak ? C.loss : C.accent, opacity: p, scale: `${p}`, translate: `0px ${drop}px` }} />;
        })}
      </div>
      <div style={{ position: 'absolute', left: 96, bottom: 64, ...T.statement, fontSize: 120, display: 'flex', flexWrap: 'wrap', gap: '0 0.3em', maxWidth: 1728 }}>
        {words.map((w, i) => <span key={i} style={{ color: i === words.length - 1 ? accent : C.white, ...riseStyle(arrive(f, 0.9 * fps + i * 7, 20), 40) }}>{w}</span>)}
      </div>
    </AbsoluteFill>
  );
};

/** Close on the light stage: the line, the accent line drawing, wordmark (optional) + url. */
const Close: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 96, bottom: 64, display: 'flex', flexDirection: 'column', gap: 30 }}>
        <div style={{ ...T.statement, fontSize: 112, color: C.ink, ...riseStyle(arrive(f, 4, 22), 40) }}>{cfg?.close.line}</div>
        <div style={{ height: 12, width: 1728, background: C.accent, transformOrigin: 'left', scale: `${arrive(f, 0.5 * fps, 36)} 1` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 36, ...riseStyle(arrive(f, 1.2 * fps, 24)) }}>
          {hasWordmark && <Wordmark onLight height={64} />}
          <span style={{ ...T.secondary, color: C.greyDark }}>{THEME.url}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MIXED_DUR = OPEN_S + SPEAKER.dur + CLOSE_S;
export const Mixed: React.FC = () => {
  const { fps } = useVideoConfig();
  if (!hasSpeaker || !cfg || !SPEAKER.cfg.fx) return <NoSpeaker />;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence from={0} durationInFrames={Math.round(OPEN_S * fps)}><ColdOpen /></Sequence>
      <Sequence from={Math.round(OPEN_S * fps)} durationInFrames={Math.round(SPEAKER.dur * fps)}><SpeakerBody /></Sequence>
      <Sequence from={Math.round((OPEN_S + SPEAKER.dur) * fps)} durationInFrames={Math.round(CLOSE_S * fps)}><Close /></Sequence>
    </AbsoluteFill>
  );
};
