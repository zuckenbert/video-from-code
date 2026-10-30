import React from 'react';
import { Audio, Sequence, staticFile, interpolate, useVideoConfig } from 'remotion';

export type Hit = { at: number; name: string; vol?: number };
/**
 * Short effects on cues (public/sfx/<name>.mp3). Few kinds, low volume ("no overdoing it").
 * Music goes in ffmpeg afterwards (tools/add_music.sh): Remotion volume at low levels is not predictable in the render.
 */
export const Sound: React.FC<{ hits: Hit[]; endS: number; music?: string | null; musicVol?: number; sfxVol?: number }> = ({ hits, endS, music = null, musicVol = 0.05, sfxVol = 0.6 }) => {
  const { fps } = useVideoConfig();
  const total = Math.round(endS * fps);
  return (
    <>
      {music && <Sequence from={0} durationInFrames={total}>
        <Audio src={staticFile(music)} volume={(f) => musicVol * interpolate(f, [0, fps * 1.5, total - fps * 2.5, total], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      </Sequence>}
      {hits.map((h, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(h.at * fps))} durationInFrames={Math.round(1.2 * fps)}>
          <Audio src={staticFile(`sfx/${h.name}.mp3`)} volume={(h.vol ?? 1) * sfxVol} />
        </Sequence>
      ))}
    </>
  );
};
