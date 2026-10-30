import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, T, THEME, fmt } from './tokens';
import { arrive, clamp, riseStyle, present, E } from './anim';
import { Wordmark, hasWordmark } from './Wordmark';

const tab = { fontVariantNumeric: 'tabular-nums' as const };

/** Side panel (one column); enters with a wipe, children cascade in. */
export const Panel: React.FC<{ inS: number; outS: number; x: number; y: number; w: number; h: number; children: React.ReactNode; light?: boolean }> = ({ inS, outS, x, y, w, h, children, light }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = present(f, inS * fps, outS * fps, 0.45 * fps, 0.3 * fps);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: light ? C.paper : C.ink, color: light ? C.ink : C.white, fontFamily: FONT,
      boxShadow: '0 30px 90px rgba(0,0,0,.22)', clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`, opacity: Math.min(1, p * 2) }}>
      <div style={{ position: 'absolute', inset: 0, borderTop: `1px solid rgba(255,255,255,.1)` }} />
      {children}
    </div>
  );
};

const tone = { muted: C.grey, ink: C.white, loss: C.loss, ok: C.ok } as const;
/** Leak / rows: "expected x actual x difference" with counters. Use only numbers the speaker actually said. Last row is the big one. */
export const Leak: React.FC<{ startS: number; title: string; rows: Array<[string, number, keyof typeof tone]>; prefix?: string; decimals?: number }> = ({ startS, title, rows, prefix = '', decimals = 2 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const l = f - startS * fps;
  return (
    <div style={{ padding: '56px 64px', display: 'flex', flexDirection: 'column', gap: 34 }}>
      <div style={{ ...T.small, color: C.greyMid, ...riseStyle(arrive(l, 0)) }}>{title}</div>
      {rows.map(([k, v, col], i) => {
        const p = arrive(l, 18 + i * 14, 20);
        const n = interpolate(l, [18 + i * 14, 18 + i * 14 + 40], [0, v], { ...clamp, easing: E.out });
        const last = i === rows.length - 1;
        return (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: `1px solid ${C.greyDark}`, paddingBottom: 14, ...riseStyle(p) }}>
            <span style={{ ...T.secondary, fontSize: 38, color: C.grey }}>{k}</span>
            <span style={{ ...T.statement, fontSize: last ? 92 : 64, color: tone[col], ...tab }}>{prefix}{fmt(n, decimals)}</span>
          </div>
        );
      })}
    </div>
  );
};

/** List whose items enter one by one at given (output) times. */
export const Steps: React.FC<{ title: string; items: Array<[string, number]> }> = ({ title, items }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ padding: '56px 64px', display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div style={{ ...T.small, color: C.greyMid }}>{title}</div>
      {items.map(([txt, s], i) => {
        const p = arrive(f, s * fps, 20);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 24, ...riseStyle(p, 20) }}>
            <div style={{ width: 16, height: 16, background: C.accent, scale: `${p}` }} />
            <span style={{ ...T.secondary, color: C.white }}>{txt}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Chat: a question and an answer (use a sentence that was really said), with a thinking ellipsis between. */
export const Chat: React.FC<{ qS: number; aS: number; label: string; question: string; answer: string }> = ({ qS, aS, label, question, answer }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pq = arrive(f, qS * fps, 18), pa = arrive(f, aS * fps, 22);
  const think = f > qS * fps + 20 && f < aS * fps;
  return (
    <div style={{ padding: '56px 56px', display: 'flex', flexDirection: 'column', gap: 26, height: '100%', boxSizing: 'border-box' }}>
      <div style={{ ...T.small, color: C.greyMid, display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ width: 10, height: 10, background: C.ok, borderRadius: 5 }} />{label}</div>
      <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: C.greyDark, padding: '22px 28px', ...T.secondary, fontSize: 38, ...riseStyle(pq) }}>{question}</div>
      {think && <div style={{ ...T.secondary, color: C.greyMid, fontSize: 38, paddingLeft: 8 }}>{'.'.repeat(1 + (Math.floor(f / 8) % 3))}</div>}
      <div style={{ alignSelf: 'flex-start', maxWidth: '92%', background: C.accent, color: C.ink, padding: '22px 28px', ...T.secondary, fontSize: 38, ...riseStyle(pa) }}>{answer}</div>
    </div>
  );
};

/** Big sentence, one line at a time. */
export const Statement: React.FC<{ lines: Array<[string, number]>; accentLast?: boolean; size?: number; color?: string }> = ({ lines, accentLast, size = T.statement.fontSize, color = C.white }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ padding: '64px 64px', display: 'flex', flexDirection: 'column', gap: 8, fontFamily: FONT }}>
      {lines.map(([txt, s], i) => {
        const p = arrive(f, s * fps, 22);
        const last = i === lines.length - 1;
        return <div key={i} style={{ ...T.statement, fontSize: size, color: accentLast && last ? C.accent : color, ...riseStyle(p, 30) }}>{txt}</div>;
      })}
    </div>
  );
};

/** End card: optional wordmark + line + url. */
export const EndCard: React.FC<{ inS: number; line: string; url?: string }> = ({ inS, line, url = THEME.url }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = arrive(f, inS * fps, 0.5 * fps);
  const p2 = arrive(f, (inS + 0.35) * fps, 0.5 * fps);
  const p3 = arrive(f, (inS + 0.7) * fps, 0.5 * fps);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.ink, opacity: p, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, fontFamily: FONT }}>
      {hasWordmark && <div style={{ ...riseStyle(p2) }}><Wordmark height={96} /></div>}
      <div style={{ ...T.statement, fontSize: 72, color: C.white, textAlign: 'center', maxWidth: 1400, ...riseStyle(p3) }}>{line}</div>
      {url && <div style={{ ...T.secondary, color: C.accent, ...riseStyle(p3) }}>{url}</div>}
    </div>
  );
};
