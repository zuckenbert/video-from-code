import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { C } from './tokens';
import { E, clamp } from './anim';

/*
 * Logical stage 960 x 720. The caller picks the box; children draw in stage coordinates.
 * Scenes read the current time from context (useT) so every cue can be a spoken-word time in seconds.
 */
export const SW = 960, SH = 720;
export type Theme = 'dark' | 'light';
type Ctx = { t: number; theme: Theme };
export const CtxR = React.createContext<Ctx>({ t: 0, theme: 'dark' });
export const useT = () => React.useContext(CtxR);
export const ink = (th: Theme) => (th === 'dark' ? C.white : C.ink);
export const soft = (th: Theme) => (th === 'dark' ? C.greyDark : C.grey);

/** Stage: applies the box and the scale. */
export const Stage: React.FC<{ box: { x: number; y: number; w: number; h: number }; theme: Theme; children: React.ReactNode }> = ({ box, theme, children }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const s = Math.min(box.w / SW, box.h / SH);
  return (
    <CtxR.Provider value={{ t, theme }}>
      <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: (box.w - SW * s) / 2, top: (box.h - SH * s) / 2, width: SW, height: SH, transformOrigin: '50% 50%', transform: `scale(${s})` }}>
          {children}
        </div>
      </div>
    </CtxR.Provider>
  );
};

/** Scene window with the house curves (eased fade in/out). */
export const Scene: React.FC<{ inS: number; outS: number; children: React.ReactNode }> = ({ inS, outS, children }) => {
  const { t } = useT();
  const p = Math.min(interpolate(t, [inS, inS + 0.45], [0, 1], { ...clamp, easing: E.out }), interpolate(t, [outS - 0.3, outS], [1, 0], { ...clamp, easing: E.in }));
  if (p <= 0) return null;
  return <div style={{ position: 'absolute', inset: 0, opacity: p }}>{children}</div>;
};
export const ar = (t: number, s: number, d = 0.5) => interpolate(t, [s, s + d], [0, 1], { ...clamp, easing: E.out });
export const ease = (t: number, s: number, e: number) => interpolate(t, [s, e], [0, 1], { ...clamp, easing: E.inOut });

/** Path that draws itself (draw 0..1). Gate short paths by time: draw=0 on a short path still leaves a dot. */
export const Path: React.FC<{ d: string; draw?: number; color?: string; dashed?: boolean; width?: number; len?: number }> = ({ d, draw = 1, color, dashed, width = 5, len = 2000 }) => {
  const { theme } = useT();
  if (draw <= 0.001) return null;
  return (
    <svg style={{ position: 'absolute', inset: 0, overflow: 'visible' }} width={SW} height={SH}>
      <path d={d} fill="none" stroke={color ?? soft(theme)} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? `16 18` : `${len}`} strokeDashoffset={dashed ? 0 : len * (1 - draw)} opacity={dashed ? draw : 1} />
    </svg>
  );
};

/** Position along a polyline (0..1), deterministic (no DOM measuring). */
export const along = (pts: Array<[number, number]>, u: number): [number, number] => {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let d = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) { const k = segs[i] ? d / segs[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
    d -= segs[i];
  }
  return pts[pts.length - 1];
};
export const poly = (pts: Array<[number, number]>) => 'M' + pts.map((p) => p.join(' ')).join(' L ');
