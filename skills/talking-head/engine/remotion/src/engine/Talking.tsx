import React from 'react';
import { Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video } from '@remotion/media';
import { outToSrc } from './edl';
import { C } from './tokens';
import { Face, Person } from './people';

/** Face position (0..1) at SOURCE time: smoothed track, interpolated by each sample's real time. */
export const faceAt = (F: Face[], srcT: number) => {
  if (!F.length) return { cx: 0.5, cy: 0.42 };
  let i = 0; while (i < F.length - 2 && F[i + 1].t <= srcT) i++;
  const a = F[i], b = F[Math.min(F.length - 1, i + 1)];
  const k = b.t > a.t ? Math.max(0, Math.min(1, (srcT - a.t) / (b.t - a.t))) : 0;
  return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k };
};

export type Frame = { x: number; y: number; w: number; h: number; zoom?: number };
/** Full frame; zoom 1.08 also hides a meeting app's name tag in the corner. */
export const FULL: Frame = { x: 0, y: 0, w: 1920, h: 1080, zoom: 1.08 };

/** Explicit crop: the <Video> of @remotion/media draws on a canvas, objectFit does not apply. Scale by height, face at faceY of the box. */
export const crop = (box: { w: number; h: number }, zoom: number, cx: number, cy: number, faceY = 0.42, aspect = 16 / 9) => {
  const vh = box.h * zoom, vw = vh * aspect;
  const left = Math.max(box.w - vw, Math.min(0, box.w / 2 - cx * vw));
  const top = Math.max(box.h - vh, Math.min(0, box.h * faceY - cy * vh));
  return { left, top, width: vw, height: vh };
};

/** The person's video segments with the EDL applied; each kept range is its own Sequence. */
export const EdlVideo: React.FC<{ person: Person; style: React.CSSProperties; muted?: boolean }> = ({ person, style, muted }) => {
  const { fps } = useVideoConfig();
  let acc = 0;
  return (
    <>
      {person.segs.map(([i, o], k) => {
        const from = Math.round(acc * fps), dur = Math.round((o - i) * fps);
        acc += o - i;
        return (
          <Sequence key={k} from={from} durationInFrames={dur} premountFor={fps}>
            <Video src={staticFile(person.src)} trimBefore={Math.round(i * fps)} trimAfter={Math.round(o * fps)} muted={muted} style={{ position: 'absolute', ...style }} />
          </Sequence>
        );
      })}
    </>
  );
};

/** Person video framed in a box; the crop follows the face. */
export const Talking: React.FC<{ person: Person; frame?: Frame; muted?: boolean; radius?: number }> = ({ person, frame = FULL, muted, radius = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { cx, cy } = faceAt(person.faces, outToSrc(person.segs, f / fps));
  const c = crop(frame, frame.zoom ?? 1, cx, cy);
  return (
    <div style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.w, height: frame.h, overflow: 'hidden', borderRadius: radius, background: C.ink }}>
      <EdlVideo person={person} muted={muted} style={c} />
    </div>
  );
};
