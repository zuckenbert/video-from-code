import React from 'react';
import { Composition, staticFile } from 'remotion';
import { DemoFilm, type Cut } from './DemoFilm';

// Duration comes from the project's cut.json (publicDir), read at bundle/render time.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Demo"
    component={DemoFilm}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={30}
    defaultProps={{ cut: null as unknown as Cut }}
    calculateMetadata={async () => {
      const cut = (await fetch(staticFile('cut.json')).then((r) => r.json())) as Cut;
      return { durationInFrames: Math.max(1, Math.round(cut.total * cut.fps)), fps: cut.fps, props: { cut } };
    }}
  />
);
