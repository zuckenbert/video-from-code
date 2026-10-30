import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SpeakerBody } from './SpeakerBody';
import { EndCard } from '../engine/Overlays';
import { SPEAKER, hasSpeaker } from '../engine/people';
import { NoSpeaker } from './NoSpeaker';

/** Style 2 composition: body + end card (3 s after the speech). */
export const FX_DUR = SPEAKER.dur + (SPEAKER.cfg.endCard ? 3.2 : 0.4);
export const SpeakerFx: React.FC = () => {
  if (!hasSpeaker || !SPEAKER.cfg.fx) return <NoSpeaker />;
  return (
    <AbsoluteFill>
      <SpeakerBody />
      {SPEAKER.cfg.endCard && <EndCard inS={SPEAKER.dur + 0.2} line={SPEAKER.cfg.endCard.line} />}
    </AbsoluteFill>
  );
};
