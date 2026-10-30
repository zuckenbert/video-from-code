import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT, T, SAFE } from './tokens';
import { Cue } from './words';

/** Caption per cue: current word and keywords in the accent, left aligned at the bottom (or in a box). */
export const Captions: React.FC<{ cues: Cue[]; isKey?: (w: string) => boolean; box?: { x: number; y: number; w: number }; lift?: number; size?: number; dark?: boolean }> =
  ({ cues, isKey = () => false, box, lift = 0, size = T.caption.fontSize, dark }) => {
    const f = useCurrentFrame();
    const { fps } = useVideoConfig();
    const t = f / fps;
    const cue = cues.find((c) => t >= c.s - 0.08 && t < c.e + 0.35);
    if (!cue) return null;
    const x = box?.x ?? SAFE.x, w = box?.w ?? 1180;
    const bottom = box ? undefined : 92 + lift;
    return (
      <div style={{ position: 'absolute', left: x, top: box?.y, bottom, width: w, fontFamily: FONT, ...T.caption, fontSize: size, color: dark ? C.ink : C.white,
        textShadow: dark ? 'none' : `0 0 2px ${C.ink}, 0 2px 14px rgba(0,0,0,.55)`, WebkitTextStroke: dark ? '0px transparent' : `1.5px rgba(0,0,0,.85)`, paintOrder: 'stroke fill' as never, display: 'flex', flexWrap: 'wrap', gap: '0 0.28em' }}>
        {cue.words.map((wd, i) => {
          const spoken = t >= wd.s - 0.03;
          const hot = isKey(wd.w) || (spoken && t < wd.e + 0.12);
          return <span key={i} style={{ color: hot ? (dark ? C.accentOnLight : C.accent) : dark ? C.ink : C.white, opacity: spoken ? 1 : 0.55 }}>{wd.w}</span>;
        })}
      </div>
    );
  };
