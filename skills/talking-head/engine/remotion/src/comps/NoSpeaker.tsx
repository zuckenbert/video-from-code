import React from 'react';
import { AbsoluteFill } from 'remotion';
import { C, FONT } from '../engine/tokens';

/** Shown when src/data has no speaker yet (fresh clone). Run the pipeline in SKILL.md first. */
export const NoSpeaker: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink, color: C.white, fontFamily: FONT, alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 600, textAlign: 'center', padding: 96 }}>
    No speaker yet: run engine/tools (transcribe, face_track, face_smooth) and fill src/data/speaker.json
  </AbsoluteFill>
);
