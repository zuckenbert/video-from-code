import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Background, CHARACTER } from './kit/Layout';
import { C, FONT, MONO } from './kit/tokens';
import { NvChip } from './scenes/S01_Hook';

// Cover of this example (copy to src/Cover.tsx). Everything that matters stays inside the 3:4 grid
// crop (y 240 to 1680) and away from the bottom band the Reels UI covers.
export const Cover: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 44, color: C.accent, letterSpacing: 6 }}>
      EXPLICA · EP. 01
    </div>
    <div style={{ position: 'absolute', left: 60, right: 60, top: 360, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 150, lineHeight: 1, color: C.ink, letterSpacing: -6 }}>
      NVIDIA
    </div>
    <div style={{ position: 'absolute', left: 60, right: 60, top: 540, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 84, lineHeight: 1.02, color: C.ink, letterSpacing: -3 }}>
      <span style={{ background: C.positive, padding: '0 14px' }}>5 TRILHÕES</span><br />E ZERO FÁBRICAS
    </div>
    <svg width="1080" height="1920" style={{ position: 'absolute', left: 0, top: 0 }}>
      <g transform="translate(540 990) rotate(-8) scale(1.0)"><NvChip /></g>
    </svg>
    {CHARACTER.enabled && <Img src={staticFile(`${CHARACTER.dir}/m2.png`)} style={{ position: 'absolute', left: 540 - 200, top: 1190, width: 400 }} />}
  </AbsoluteFill>
);
