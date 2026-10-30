import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { Cue, FPS } from './kit/anim';
import { Background, Captions, Character, CHARACTER, IntroBurst, LOOP, REEL, REEL_HOME, Sfx, Stage, Title, Word } from './kit/Layout';
import { SCENES } from './scenes';
import cfg from '../video.json';
import words from '../public/vo_words.json';
import mouth from '../public/vo_mouth.json';

// video.json (written by scripts/new_video.py): tag, date, end (end of speech + 0.2 s, in narration
// time) and total (real video length). Narration and scenes start at LOOP.intro: before that the
// character opens the reel in the camera's face with the intro sound; at the end it dashes back to the
// camera and the replay lands on the intro (loop). Without a character LOOP.intro is a 0.3 s empty lead-in.
const W = words as Word[];
const INTRO = LOOP.intro;
const END = cfg.end + INTRO; // real time when the character runs to the corner
const shift = (c: Cue): Cue => [c[0] + INTRO, c[1], c[2]];
const CUES = SCENES.flatMap((s) => s.cues).map(shift);
const HOPS = SCENES.flatMap((s) => s.hops ?? []);
const ACTS = SCENES.flatMap((s) => s.acts ?? []);
const LOOP_CUES: Cue[] = CHARACTER.enabled
  ? [
      [0, CHARACTER.introSfx, CHARACTER.introSfxVolume], [LOOP.ack, 'impact', 0.6], [LOOP.hold, 'whoosh', 0.6],
      [END, 'whoosh', 0.6], [END + LOOP.run + 0.02, 'pop', 0.6], [END + 0.6, 'boing', 0.5], [END + LOOP.peek, 'whoosh', 1],
    ]
  : [];

export const ExplainerReel: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const tv = t - INTRO;
  return (
    <AbsoluteFill>
      <Background />
      <Title t={tv} scenes={SCENES} cut={cfg.end + 0.6} top={REEL.titleTop} />
      <Stage t={tv} scenes={SCENES} top={REEL.stageTop} scale={REEL.stageScale} />
      <Captions t={tv} words={W} until={cfg.end + 0.3} top={REEL.captionTop} />
      <IntroBurst t={t} />
      <Character t={t} tv={tv} end={END} words={W} mouth={mouth as number[]} hops={HOPS} acts={ACTS} home={REEL_HOME} />
      <Sequence from={Math.round(INTRO * FPS)} layout="none">
        <Audio src={staticFile('vo.mp3')} />
      </Sequence>
      <Sfx cues={[...CUES, ...LOOP_CUES]} words={W.map((w) => ({ ...w, s: w.s + INTRO, e: w.e + INTRO }))} />
    </AbsoluteFill>
  );
};

export const FRAMES = Math.round(cfg.total * FPS);
