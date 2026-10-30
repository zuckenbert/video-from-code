import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, MONO, T } from './tokens';
import { arrive, riseStyle } from './anim';

export type Chapter = { label: string; sub?: string; s: number };

/** Resting state of the right column: kicker + title + chapters, current one lit. Sits under the panels. */
export const Chapters: React.FC<{ kicker: string; title: string; chapters: Chapter[]; inS: number; x: number; y: number; w: number; h: number }> = ({ kicker, title, chapters, inS, x, y, w, h }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const p = arrive(f, inS * fps, 0.5 * fps);
  if (p <= 0) return null;
  const cur = chapters.reduce((a, c, i) => (t >= c.s ? i : a), -1);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, background: C.ink, fontFamily: FONT, padding: '44px 56px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', opacity: p, borderLeft: `1px solid ${C.greyDark}` }}>
      <div style={{ fontFamily: MONO, fontSize: 20, color: C.greyMid, ...riseStyle(p) }}>{kicker}</div>
      <div style={{ ...T.secondary, fontSize: 44, color: C.white, marginTop: 10, ...riseStyle(p) }}>{title}</div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {chapters.map((c, i) => {
          const on = i === cur, done = i < cur;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: on ? 1 : done ? 0.55 : 0.35 }}>
              <div style={{ width: 14, height: 14, background: on ? C.accent : done ? C.grey : C.greyDark }} />
              <div style={{ ...T.secondary, fontSize: 34, color: on ? C.accent : C.white }}>{c.label}</div>
              {c.sub && <div style={{ fontFamily: MONO, fontSize: 18, color: C.greyMid, marginLeft: 'auto' }}>{c.sub}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
