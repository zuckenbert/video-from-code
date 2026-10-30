import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { C, FONT, THEME } from './tokens';
import { E, clamp } from './anim';
import { Person } from './people';
import { Cue } from './words';
import { useT, SW, SH } from './Stage';
import { EdlVideo, crop, faceAt } from './Talking';
import { outToSrc } from './edl';

/*
 * Style 5 vocabulary: flat colored stage, ink, white cards with a hard shadow, duotone icons (Phosphor),
 * motion only by springs with a light overshoot, stagger of 3 to 6 frames, one focus per beat.
 * Every cue comes from at('word'), never from a typed number.
 */
export const Y = { stage: THEME.stage, accent: C.accent, ink: C.ink, paper: THEME.card, red: THEME.danger, soft: 'rgba(0,0,0,.45)' } as const;
const FPS = 30;

/* ---------- springs and helpers ---------- */
export type Cfg = { damping?: number; stiffness?: number; mass?: number };
export const POP: Cfg = { damping: 12, stiffness: 170, mass: 0.8 };     // arrival with light overshoot (~108%)
export const SOFT: Cfg = { damping: 18, stiffness: 120, mass: 1 };      // move without bounce
export const SNAP: Cfg = { damping: 14, stiffness: 260, mass: 0.6 };    // stamp, dry hit
/** spring 0..1 starting at second s (0 before). Can pass 1 (overshoot). */
export const sp = (t: number, s: number, cfg: Cfg = POP) => (t < s ? 0 : spring({ frame: (t - s) * FPS, fps: FPS, config: cfg }));
/** clamped spring, for positions. */
export const spc = (t: number, s: number, cfg: Cfg = SOFT) => Math.min(1, Math.max(0, sp(t, s, cfg)));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const fade = (t: number, s: number, d = 0.35) => interpolate(t, [s, s + d], [0, 1], { ...clamp, easing: E.out });
/** damped shake (problem hit). */
export const decay = (t: number, s: number, hz = 9, life = 0.7) => (t < s ? 0 : Math.sin((t - s) * Math.PI * 2 * hz) * Math.max(0, 1 - (t - s) / life));

/** Beat (scene): enters with a spring and a small rise, leaves with fade and drop. */
export const Beat: React.FC<{ inS: number; outS: number; children: React.ReactNode }> = ({ inS, outS, children }) => {
  const { t } = useT();
  const i = sp(t, inS, SOFT), o = interpolate(t, [outS - 0.3, outS], [1, 0], { ...clamp, easing: E.in });
  if (t < inS || o <= 0) return null;
  return <div style={{ position: 'absolute', inset: 0, opacity: Math.min(i * 1.5, 1) * o, translate: `0 ${(1 - i) * 24 - (1 - o) * 16}px` }}>{children}</div>;
};

/** White card with a hard shadow; p = arrival spring (may pass 1). ink = the platform / the hero (dark card, accent icon). */
export const Card: React.FC<{ x: number; y: number; p?: number; w?: number; h?: number; rot?: number; lift?: number; dim?: number; danger?: number; ink?: boolean; children?: React.ReactNode; shake?: number }> =
  ({ x, y, p = 1, w = 150, h = 170, rot = 0, lift = 0, dim = 0, danger = 0, ink = false, children, shake = 0 }) => {
    if (p <= 0.001) return null;
    const stroke = danger > 0 ? Y.red : Y.ink;
    return (
      <div style={{ position: 'absolute', left: x, top: y - lift, width: w, height: h, translate: '-50% -50%', scale: `${p}`, rotate: `${rot + shake}deg`, opacity: 1 - dim * 0.7,
        background: ink ? Y.ink : Y.paper, border: `4px solid ${stroke}`, borderRadius: 26, boxShadow: `${8 + lift * 0.3}px ${8 + lift * 0.3}px 0 ${stroke}`, display: 'grid', placeItems: 'center', color: ink ? Y.accent : stroke }}>
        {children}
      </div>
    );
  };

/** Round badge, dark (or red) with an icon; the border takes the stage color so it reads as cut out. */
export const Badge: React.FC<{ x: number; y: number; p?: number; red?: boolean; size?: number; children: React.ReactNode; rot?: number }> = ({ x, y, p = 1, red, size = 64, children, rot = 0 }) => {
  if (p <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, translate: '-50% -50%', scale: `${p}`, rotate: `${rot}deg`, borderRadius: 999, background: red ? Y.red : Y.ink, color: red ? Y.paper : Y.accent, display: 'grid', placeItems: 'center', border: `4px solid ${Y.stage}` }}>
      {children}
    </div>
  );
};

/** Cable: a curve between two points that draws itself; wobble = light sine sway. */
export const Cable: React.FC<{ a: [number, number]; b: [number, number]; draw?: number; color?: string; dashed?: boolean; wobble?: number; width?: number; bend?: number }> =
  ({ a, b, draw = 1, color = Y.ink, dashed, wobble = 0, width = 5, bend = 0.35 }) => {
    const { t } = useT();
    if (draw <= 0.001) return null;
    const mx = (a[0] + b[0]) / 2 + Math.sin(t * 2.1 + a[0]) * wobble, my = lerp(a[1], b[1], bend) + Math.cos(t * 1.7 + b[0]) * wobble;
    const d = `M${a[0]} ${a[1]} Q ${mx} ${my} ${b[0]} ${b[1]}`;
    const L = 1600;
    return (
      <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }} width={SW} height={SH}>
        <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? '14 16' : `${L}`} strokeDashoffset={dashed ? 0 : L * (1 - Math.min(1, draw))} opacity={dashed ? Math.min(1, draw) : 1} />
      </svg>
    );
  };

/** Signature scribble that draws itself on a card (= a contract). */
export const Signature: React.FC<{ draw: number }> = ({ draw }) => (
  <svg width={92} height={34} viewBox="0 0 92 34" style={{ position: 'absolute', bottom: 12, left: '50%', translate: '-50% 0' }}>
    <path d="M4 24 C 14 2, 20 34, 30 14 S 46 30, 56 10 S 72 28, 88 8" fill="none" stroke={Y.ink} strokeWidth={3.2} strokeLinecap="round" strokeDasharray="200" strokeDashoffset={200 * (1 - Math.min(1, draw))} />
  </svg>
);

/** Big kinetic number. */
export const Num: React.FC<{ x: number; y: number; value: string; p?: number; size?: number; color?: string; sub?: string }> = ({ x, y, value, p = 1, size = 220, color = Y.ink, sub }) => {
  if (p <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, translate: '-50% -50%', scale: `${p}`, display: 'flex', alignItems: 'baseline', fontFamily: FONT, fontWeight: 600, color, letterSpacing: '-0.05em', lineHeight: 1 }}>
      <span style={{ fontSize: size, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      {sub && <span style={{ fontSize: size * 0.42, marginLeft: 6, letterSpacing: '-0.02em' }}>{sub}</span>}
    </div>
  );
};

/** Roll (e.g. 5 -> 1): two stacked numbers that slide together; k = 0..1. */
export const Roll: React.FC<{ x: number; y: number; from: string; to: string; k: number; p?: number; size?: number }> = ({ x, y, from, to, k, p = 1, size = 220 }) => {
  if (p <= 0.001) return null;
  const h = size * 0.92;
  return (
    <div style={{ position: 'absolute', left: x, top: y, translate: '-50% -50%', scale: `${p}`, height: h, overflow: 'hidden', fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: '-0.05em', lineHeight: 0.92, color: Y.ink }}>
      <div style={{ translate: `0 ${-k * h}px` }}>
        <div style={{ height: h }}>{from}</div>
        <div style={{ height: h }}>{to}</div>
      </div>
    </div>
  );
};

/* =============================== camera and captions ============================== */

/**
 * The person in a box, crop following the face (face at faceY of the box), EDL applied, short fade in.
 * NO gradient over the video: a dry cut between stage and person (a gradient here reads as AI slop).
 * zoomFrom = punch-in from a time on, to hide a join between two takes.
 */
export const Cam: React.FC<{ person: Person; box: { x: number; y: number; w: number; h: number }; zoom?: number; zoomFrom?: { at: number; zoom: number } | null; faceY?: number }> = ({ person, box, zoom = 1.3, zoomFrom, faceY = 0.4 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const { cx, cy } = faceAt(person.faces, outToSrc(person.segs, t));
  const z = zoomFrom && t >= zoomFrom.at ? zoomFrom.zoom : zoom;
  const hello = interpolate(f, [0, 0.6 * fps], [0, 1], { ...clamp, easing: E.out });
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', background: Y.ink, opacity: hello }}>
      <EdlVideo person={person} style={crop(box, z, cx, cy, faceY)} />
    </div>
  );
};

/** Captions on the dark seam: white, centered, keywords in the accent once said, unsaid words at 38%, spring entrance. */
export const Subs: React.FC<{ cues: Cue[]; isKey: (w: string) => boolean; box: { x: number; y: number; w: number }; size?: number }> = ({ cues, isKey, box, size = 62 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const cue = cues.find((c) => t >= c.s - 0.08 && t < c.e + 0.35);
  if (!cue) return null;
  const k = spring({ frame: (t - cue.s + 0.08) * fps, fps, config: { damping: 18, stiffness: 160 } });
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: '-0.015em', lineHeight: 1.15, color: C.white, textAlign: 'center',
      display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.26em', translate: `0 ${(1 - Math.min(1, k)) * 12}px`, opacity: Math.min(1, k * 1.4) }}>
      {cue.words.map((wd, i) => {
        const said = t >= wd.s - 0.03;
        return <span key={i} style={{ color: isKey(wd.w) && said ? Y.accent : C.white, opacity: said ? 1 : 0.38 }}>{wd.w}</span>;
      })}
    </div>
  );
};
