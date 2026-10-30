import React from 'react';
import { AbsoluteFill } from 'remotion';
import { SPEAKER, hasSpeaker } from '../engine/people';
import { Stage } from '../engine/Stage';
import { Sound, Hit } from '../engine/Sound';
import { Y, Cam, Subs } from '../engine/Story';
import { StageJourney, keys } from './StageJourney';
import { NoSpeaker } from './NoSpeaker';

/*
 * Style 5, the default vertical format: 1080x1920, 30 fps, three bands.
 *   0 to 830     flat colored stage, no logo; logical stage 960x720 drawn in {40, 60, 1000, 720}
 *   830 to 1040  dark seam with the captions (62 px, centered, keyword in the accent, unsaid words at 38%)
 *   1040 to 1920 the person, crop following the face, face at 42% of the box, zoom 1.32, NO gradient on top
 */
export const VW = 1080, VH = 1920;
const STAGE = { x: 40, y: 60, w: 1000, h: 720 };
const SUB = { x: 72, y: 862, w: 936 };
const CAM = { x: 0, y: 1040, w: 1080, h: 880 };
const Panel: React.FC = () => <div style={{ position: 'absolute', left: 0, top: 0, width: VW, height: 830, background: Y.stage }} />;

export const STORY_DUR = SPEAKER.dur + 0.8;

/** A few short effects, low volume, one per visual happening (only when public/sfx has pop/whoosh/stop). */
const hits = (): Hit[] => {
  const k = keys(SPEAKER);
  const h: Hit[] = [
    { at: k.many, name: 'pop', vol: 0.5 }, { at: k.problem, name: 'stop', vol: 0.6 }, { at: k.one - 0.1, name: 'whoosh', vol: 0.5 }, { at: k.stamp, name: 'pop', vol: 0.5 },
  ];
  if (k.cta !== undefined) h.push({ at: k.cta, name: 'pop', vol: 0.4 });
  if (k.num !== undefined) h.push({ at: k.num, name: 'pop', vol: 0.5 });
  return h;
};

export const StageStory: React.FC = () => {
  if (!hasSpeaker || !SPEAKER.cfg.story) return <NoSpeaker />;
  const st = SPEAKER.cfg.story;
  return (
    <AbsoluteFill style={{ background: Y.ink }}>
      <Panel />
      <Cam person={SPEAKER} box={CAM} zoom={st.zoom ?? 1.32} zoomFrom={st.join} faceY={st.faceY ?? 0.42} />
      <Stage box={STAGE} theme="dark"><StageJourney person={SPEAKER} /></Stage>
      <Subs cues={SPEAKER.tr.CUES} isKey={SPEAKER.isKey} box={SUB} />
      {SPEAKER.cfg.sfx && <Sound hits={hits()} endS={STORY_DUR} />}
    </AbsoluteFill>
  );
};
