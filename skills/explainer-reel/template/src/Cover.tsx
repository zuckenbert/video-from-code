import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Background, CHARACTER } from './kit/Layout';
import { C, FONT, MONO } from './kit/tokens';
import cfg from '../video.json';

// Reel cover (1080x1920, one frame). Everything that matters stays inside the 3:4 grid crop
// (y 240 to 1680) and away from the bottom band the Reels UI covers.
// Per video: set NAME and HOOK, and put the S01 symbol object in the <svg> (import it from the scene).
const KICKER = cfg.tag; // e.g. "COMPANY / 01"
const NAME = 'COMPANY';
const HOOK: [string, string] = ['HIGHLIGHTED LINE', 'SECOND LINE'];

export const Cover: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 44, color: C.accent, letterSpacing: 6 }}>
      {KICKER}
    </div>
    <div style={{ position: 'absolute', left: 60, right: 60, top: 360, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 150, lineHeight: 1, color: C.ink, letterSpacing: -6 }}>
      {NAME}
    </div>
    <div style={{ position: 'absolute', left: 60, right: 60, top: 540, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 84, lineHeight: 1.02, color: C.ink, letterSpacing: -3 }}>
      <span style={{ background: C.positive, padding: '0 14px' }}>{HOOK[0]}</span><br />{HOOK[1]}
    </div>
    <svg width="1080" height="1920" style={{ position: 'absolute', left: 0, top: 0 }}>
      <g transform="translate(540 990) rotate(-8) scale(1.0)">{/* S01 symbol object here */}</g>
    </svg>
    {CHARACTER.enabled && <Img src={staticFile(`${CHARACTER.dir}/m2.png`)} style={{ position: 'absolute', left: 540 - 200, top: 1190, width: 400 }} />}
  </AbsoluteFill>
);
