import React from 'react';
import { Audio, Sequence, staticFile, useVideoConfig } from 'remotion';
import { Person } from './people';

/** Source audio following the person's EDL (use with Cutout, which is image only). */
export const EdlAudio: React.FC<{ person: Person }> = ({ person }) => {
  const { fps } = useVideoConfig();
  let acc = 0;
  return (
    <>
      {person.segs.map(([i, o], k) => {
        const from = Math.round(acc * fps), dur = Math.round((o - i) * fps); acc += o - i;
        return <Sequence key={k} from={from} durationInFrames={dur}><Audio src={staticFile(person.src)} trimBefore={Math.round(i * fps)} trimAfter={Math.round(o * fps)} /></Sequence>;
      })}
    </>
  );
};
