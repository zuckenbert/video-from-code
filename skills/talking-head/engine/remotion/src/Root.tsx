import React from 'react';
import { Composition } from 'remotion';
import './engine/fonts';
import { MotionExample, MOTION_FRAMES } from './comps/MotionExample';
import { SpeakerFx, FX_DUR } from './comps/SpeakerFx';
import { Mixed, MIXED_DUR } from './comps/Mixed';
import { StageStory, STORY_DUR, VW, VH } from './comps/StageStory';

// Composition ids: letters, digits and hyphens only (an underscore breaks the render).
const FPS_V = 30;
const d = (s: number) => Math.max(30, Math.round(s * FPS_V));
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Motion-Example" component={MotionExample} durationInFrames={MOTION_FRAMES} fps={60} width={1920} height={1080} />
    <Composition id="Speaker-Fx" component={SpeakerFx} durationInFrames={d(FX_DUR)} fps={FPS_V} width={1920} height={1080} />
    <Composition id="Mixed" component={Mixed} durationInFrames={d(MIXED_DUR)} fps={FPS_V} width={1920} height={1080} />
    <Composition id="Stage-Story" component={StageStory} durationInFrames={d(STORY_DUR)} fps={FPS_V} width={VW} height={VH} />
  </>
);
