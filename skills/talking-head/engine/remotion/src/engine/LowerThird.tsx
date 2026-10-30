import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from './tokens';
import { Wordmark, hasWordmark } from './Wordmark';
import { present, riseStyle } from './anim';

/** Name + role, accent bar growing from the bottom, optional wordmark block. Default 0.6 s to 7 s. */
export const LowerThird: React.FC<{ name: string; role: string; inS?: number; outS?: number; x?: number; bottom?: number; scale?: number }> = ({ name, role, inS = 0.6, outS = 7.0, x = 96, bottom = 92, scale = 1 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = present(f, inS * fps, outS * fps, 0.5 * fps, 0.4 * fps);
  if (p <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x, bottom, transformOrigin: 'left bottom', scale: `${scale}`, display: 'flex', alignItems: 'stretch', gap: 0, ...riseStyle(p, 36) }}>
      <div style={{ width: 10, background: C.accent, transformOrigin: 'bottom', scale: `1 ${p}` }} />
      <div style={{ background: C.ink, padding: '22px 36px 24px 30px', fontFamily: FONT }}>
        <div style={{ color: C.white, fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>{name}</div>
        <div style={{ color: C.grey, fontSize: 26, fontWeight: 500, marginTop: 10 }}>{role}</div>
      </div>
      {hasWordmark && (
        <div style={{ background: C.ink, display: 'flex', alignItems: 'center', padding: '0 36px 0 10px', borderLeft: `1px solid ${C.greyDark}` }}>
          <Wordmark height={34} />
        </div>
      )}
    </div>
  );
};
