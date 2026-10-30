import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, T, THEME, fmt } from '../engine/tokens';
import { arrive, leave, riseStyle, clamp, E } from '../engine/anim';
import { Wordmark, hasWordmark } from '../engine/Wordmark';

/*
 * Style 1, pure motion (no person). One idea per film, one device that crosses the scenes (the structure line, accent only at the promise),
 * one accent with one meaning, cuts on the bar. Example copy describes this engine's own rules (true facts),
 * replace it with your film's idea and real numbers.
 * Grid: 60 fps, 120 BPM -> 30 f per beat, 120 f per bar. 15 bars = 30 s.
 */
export const FPS = 60, BEAT = 30, BAR = 120;
export const MOTION_FRAMES = 15 * BAR;
const bar = (n: number) => (n - 1) * BAR;
const tab = { fontVariantNumeric: 'tabular-nums' as const };
const Stage: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <AbsoluteFill style={{ background: light ? C.paper : C.ink, color: light ? C.ink : C.white, fontFamily: FONT, padding: '64px 96px', boxSizing: 'border-box' }}>{children}</AbsoluteFill>
);
/** Act exit: cut on the bar, with a 10 f fade so it does not pop. */
const useOut = (len: number) => leave(useCurrentFrame(), len - 10, 10);

// Act 1 (bars 1-2): the sentence, word by word, and the line (the device) is born.
const Act1: React.FC = () => {
  const f = useCurrentFrame();
  const o = useOut(2 * BAR);
  const words = ['Every', 'cue', 'is', 'a', 'word.'];
  const line = arrive(f, BEAT * 5, 40);
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 96, bottom: 64, display: 'flex', flexDirection: 'column', gap: 40, opacity: o }}>
        <div style={{ ...T.statement, fontSize: 128, display: 'flex', flexWrap: 'wrap', gap: '0 0.3em', maxWidth: 1600 }}>
          {words.map((w, i) => <span key={w} style={{ color: i === words.length - 1 ? C.accent : C.white, ...riseStyle(arrive(f, BEAT * (0.5 + i * 0.8), 22), 40) }}>{w}</span>)}
        </div>
        <div style={{ height: 12, width: 1728, background: C.line, transformOrigin: 'left', scale: `${line} 1` }} />
      </div>
    </Stage>
  );
};

// Big counter; the value rises with the arrival easing.
const Counter: React.FC<{ prefix?: string; value: number; suffix?: string; from: number; dur?: number; decimals?: number; size?: number; color?: string }> =
  ({ prefix = '', value, suffix = '', from, dur = 50, decimals = 0, size = T.hero.fontSize, color = C.white }) => {
    const f = useCurrentFrame();
    const n = interpolate(f, [from, from + dur], [0, value], { ...clamp, easing: E.out });
    return <span style={{ ...T.hero, fontSize: size, color, ...tab, ...riseStyle(arrive(f, from, 16), 30) }}>{prefix}{fmt(n, decimals)}{suffix}</span>;
  };

// Act 2 (bars 3-4): A -> B. The line becomes the ruler.
const Act2: React.FC = () => {
  const f = useCurrentFrame();
  const o = useOut(2 * BAR);
  const grow = arrive(f, BAR + BEAT, 70);
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 96, bottom: 64, width: 1728, opacity: o }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 48 }}>
          <Counter value={120} suffix=" bpm" from={BEAT} />
          <span style={{ ...T.hero, color: C.greyMid, ...riseStyle(arrive(f, BAR + BEAT, 16), 30) }}>→</span>
          <Counter value={30} suffix=" f" from={BAR + BEAT} color={C.accent} />
        </div>
        <div style={{ ...T.secondary, color: C.grey, marginTop: 28, ...riseStyle(arrive(f, BEAT * 2, 20)) }}>at 60 fps, one beat every 30 frames</div>
        <div style={{ height: 12, marginTop: 40, width: 1728, background: C.greyDark }}>
          <div style={{ height: 12, width: 1728, background: C.line, transformOrigin: 'left', scale: `${0.28 + 0.72 * grow} 1` }} />
        </div>
      </div>
    </Stage>
  );
};

// Act 3 (bars 5-6): 100 blocks; 3 come loose in red and fall (what gets dropped).
const Act3: React.FC = () => {
  const f = useCurrentFrame();
  const o = useOut(2 * BAR);
  const cols = 25, rows = 4, s = 56, g = 10;
  const leak = new Set([7, 48, 91]);
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 96, top: 120, width: cols * (s + g), display: 'flex', flexWrap: 'wrap', gap: g, opacity: o }}>
        {Array.from({ length: cols * rows }, (_, i) => {
          const p = arrive(f, 4 + i * 0.6, 14);
          const isLeak = leak.has(i);
          const drop = isLeak ? interpolate(f, [BAR + 10 + i * 0.3, BAR + 70 + i * 0.3], [0, 620], { ...clamp, easing: E.in }) : 0;
          return <div key={i} style={{ width: s, height: s, background: isLeak && f > BAR + 5 ? C.loss : C.line, opacity: p, scale: `${p}`, translate: `0px ${drop}px` }} />;
        })}
      </div>
      <div style={{ position: 'absolute', left: 96, bottom: 64, opacity: o }}>
        <Counter value={3} from={BAR + 10} color={C.loss} />
        <div style={{ ...T.secondary, color: C.grey, marginTop: 20, ...riseStyle(arrive(f, BAR + 30, 20)) }}>filler words dropped, every cut inside a silence</div>
      </div>
    </Stage>
  );
};

// Act 4 (bars 7-8): 10 ledger-like rows; 3 turn red (red means loss, nothing else).
const Act4: React.FC = () => {
  const f = useCurrentFrame();
  const o = useOut(2 * BAR);
  const bad = new Set([1, 4, 8]);
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 96, top: 96, width: 860, display: 'flex', flexDirection: 'column', gap: 14, opacity: o }}>
        {Array.from({ length: 10 }, (_, i) => {
          const p = arrive(f, 6 + i * 5, 16);
          const red = bad.has(i) && f > BAR + 10 + i * 4;
          return (
            <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'center', ...riseStyle(p, 16) }}>
              <div style={{ width: 70, height: 16, background: red ? C.loss : C.greyDark }} />
              <div style={{ width: 520, height: 16, background: red ? C.loss : C.greyDark, opacity: 0.7 }} />
              <div style={{ width: 120, height: 16, background: red ? C.loss : C.greyDark }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', right: 96, bottom: 64, textAlign: 'right', width: 820, opacity: o }}>
        <Counter value={1} suffix=" accent" from={BAR} />
        <div style={{ ...T.secondary, color: C.grey, marginTop: 20, ...riseStyle(arrive(f, BAR + 20, 20)) }}>one accent, one meaning</div>
      </div>
    </Stage>
  );
};

// Act 5 (bars 9-10): a short bar against a long one.
const Act5: React.FC = () => {
  const f = useCurrentFrame();
  const o = useOut(2 * BAR);
  const wide = arrive(f, BAR, 60);
  return (
    <Stage>
      <div style={{ position: 'absolute', left: 96, top: 120, width: 1728, display: 'flex', flexDirection: 'column', gap: 24, opacity: o }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, ...riseStyle(arrive(f, 10, 20)) }}>
          <span style={{ ...T.secondary, width: 300, color: C.grey }}>a still</span>
          <div style={{ height: 56, width: 28, background: C.line }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, ...riseStyle(arrive(f, BEAT * 2, 20)) }}>
          <span style={{ ...T.secondary, width: 300, color: C.grey }}>a full render</span>
          <div style={{ height: 56, width: 1388, background: C.loss, transformOrigin: 'left', scale: `${wide} 1` }} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 96, bottom: 64, opacity: o }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 30 }}>
          <Counter value={6} from={BAR} />
          <span style={{ ...T.hero, color: C.greyMid, ...riseStyle(arrive(f, BAR + 20, 16)) }}>to</span>
          <Counter value={8} from={BAR + 20} color={C.accent} />
        </div>
        <div style={{ ...T.secondary, color: C.grey, marginTop: 20, ...riseStyle(arrive(f, BAR + 30, 20)) }}>stills and a contact sheet before every render</div>
      </div>
    </Stage>
  );
};

// Act 6 (bars 11-12): two columns, structure lines pair left with right, one stays red and gets resolved.
const Act6: React.FC = () => {
  const f = useCurrentFrame();
  const o = useOut(2 * BAR);
  const n = 8;
  const pairs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i, (i * 3) % n]);
  const Lx = 96, Rx = 1920 - 96 - 360, top = 96, gap = 66;
  return (
    <Stage>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: o }}>
        {pairs.map(([a, b], i) => {
          const p = arrive(f, BEAT + i * 8, 24);
          const y1 = top + a * gap + 8, y2 = top + b * gap + 8;
          const resolved = i === 5 ? arrive(f, BAR + BEAT * 2, 30) : 1;
          const col = i === 5 && resolved < 1 ? C.loss : C.line;
          return <path key={i} d={`M ${Lx + 360} ${y1} C ${960} ${y1}, ${960} ${y2}, ${Rx} ${y2}`} stroke={col} strokeWidth={6} fill="none" strokeDasharray={1400} strokeDashoffset={1400 * (1 - p)} opacity={i === 5 ? 0.35 + 0.65 * resolved : 1} />;
        })}
      </svg>
      {[Lx, Rx].map((x, side) => (
        <div key={side} style={{ position: 'absolute', left: x, top, display: 'flex', flexDirection: 'column', gap: gap - 16, opacity: o }}>
          {Array.from({ length: n }, (_, i) => <div key={i} style={{ width: 360, height: 16, background: C.greyDark, ...riseStyle(arrive(f, 4 + i * 4 + side * 10, 14), 10) }} />)}
        </div>
      ))}
      <div style={{ position: 'absolute', left: 96, bottom: 64, ...T.statement, opacity: o }}>
        <span style={{ ...riseStyle(arrive(f, BAR, 22), 30), display: 'inline-block', marginRight: '0.28em' }}>Words in,</span>
        <span style={{ color: C.accent, ...riseStyle(arrive(f, BAR + BEAT, 22), 30), display: 'inline-block' }}>motion out.</span>
      </div>
    </Stage>
  );
};

// Act 7 (bars 13-14): the promise, on the light stage. Act 8 (bar 15): lockup.
const Act7: React.FC = () => {
  const f = useCurrentFrame();
  const o = useOut(2 * BAR);
  return (
    <Stage light>
      <div style={{ position: 'absolute', left: 96, bottom: 64, display: 'flex', flexDirection: 'column', gap: 36, opacity: o }}>
        <div style={{ ...T.statement, fontSize: 128, color: C.ink, ...riseStyle(arrive(f, 6, 24), 40) }}>Video</div>
        <div style={{ ...T.statement, fontSize: 128, color: C.ink, ...riseStyle(arrive(f, 6 + BEAT, 24), 40) }}>from code.</div>
        <div style={{ height: 12, width: 1728, background: C.accent, transformOrigin: 'left', scale: `${arrive(f, BAR, 40)} 1` }} />
      </div>
    </Stage>
  );
};
const Act8: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
        {hasWordmark && <div style={{ ...riseStyle(arrive(f, 4, 24)) }}><Wordmark height={110} /></div>}
        <div style={{ ...(hasWordmark ? T.secondary : T.statement), color: C.accent, ...riseStyle(arrive(f, 4 + BEAT, 24)) }}>{THEME.url}</div>
      </div>
    </Stage>
  );
};

export const MotionExample: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Sequence from={bar(1)} durationInFrames={2 * BAR}><Act1 /></Sequence>
    <Sequence from={bar(3)} durationInFrames={2 * BAR}><Act2 /></Sequence>
    <Sequence from={bar(5)} durationInFrames={2 * BAR}><Act3 /></Sequence>
    <Sequence from={bar(7)} durationInFrames={2 * BAR}><Act4 /></Sequence>
    <Sequence from={bar(9)} durationInFrames={2 * BAR}><Act5 /></Sequence>
    <Sequence from={bar(11)} durationInFrames={2 * BAR}><Act6 /></Sequence>
    <Sequence from={bar(13)} durationInFrames={2 * BAR}><Act7 /></Sequence>
    <Sequence from={bar(15)} durationInFrames={BAR}><Act8 /></Sequence>
  </AbsoluteFill>
);
