import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { outToSrc } from './edl';
import { Person } from './people';

/** Person cut out of the background (WebP with alpha per source frame, from tools/cutout.py), EDL applied. Pair with EdlAudio. */
export const Cutout: React.FC<{ person: Person; dir: string; srcFps: number; frames: number; style?: React.CSSProperties }> = ({ person, dir, srcFps, frames, style }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const srcT = outToSrc(person.segs, f / fps);
  const idx = Math.max(0, Math.min(Math.floor(srcT * srcFps), frames - 1));
  return <Img src={staticFile(`${dir}/f${String(idx).padStart(5, '0')}.webp`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }} />;
};
