import React from 'react';
import { Composition } from 'remotion';
import { ExplainerReel, FRAMES } from './Video';
import { Cover } from './Cover';
import './kit/fonts';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Explainer-Reel" component={ExplainerReel} durationInFrames={FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={30} width={1080} height={1920} />
  </>
);
