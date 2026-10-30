import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { Talking, FULL, Frame } from '../engine/Talking';
import { Captions } from '../engine/Captions';
import { LowerThird } from '../engine/LowerThird';
import { Panel, Statement, Steps, Leak, Chat } from '../engine/Overlays';
import { Chapters } from '../engine/Chapters';
import { Person, PanelCfg, SPEAKER } from '../engine/people';
import { C } from '../engine/tokens';
import { E, clamp } from '../engine/anim';

/*
 * Style 2, speaker + effects. Full frame with face-following crop, lower third, captions; on the first
 * panel cue the camera splits ONCE into a left column (0.6 s, camera curve) and the right column shows
 * chapters at rest and panels that enter 0.2 to 0.3 s after the word that justifies them.
 * Everything is driven by fx in src/data/speaker.json; every time is a spoken word.
 */
const LEFT: Frame = { x: 0, y: 0, w: 1040, h: 1080, zoom: 1.02 };
const PX = 1080, PW = 1920 - 96 - PX; // right panel, inside the safe area
const lerpF = (a: Frame, b: Frame, s: number): Frame => ({
  x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s, w: a.w + (b.w - a.w) * s, h: a.h + (b.h - a.h) * s,
  zoom: (a.zoom ?? 1) + ((b.zoom ?? 1) - (a.zoom ?? 1)) * s,
});

const PanelBody: React.FC<{ p: PanelCfg; person: Person; t: number }> = ({ p, person, t }) => {
  const b = person.tr.beat;
  switch (p.type) {
    case 'steps':
      return <Steps title={p.title} items={p.items.map(([txt, ref, d]) => [txt, b(ref) + (d ?? 0.2)] as [string, number])} />;
    case 'statement':
      return (
        <>
          <Statement lines={p.lines.map(([txt, ref]) => [txt, b(ref) + 0.1] as [string, number])} accentLast={p.accentLast} color={p.light ? C.ink : C.white} size={p.size ?? 96} />
          {p.underline && <div style={{ position: 'absolute', left: 64, bottom: 64, height: 14, width: PW - 128, background: C.accent, transformOrigin: 'left', scale: `${interpolate(t, [b(p.underline), b(p.underline) + 0.6], [0, 1], { ...clamp, easing: E.out })} 1` }} />}
        </>
      );
    case 'rows':
      return <Leak startS={b(p.at) + 0.2} title={p.title} rows={p.rows} prefix={p.prefix} decimals={p.decimals} />;
    case 'chat':
      return <Chat qS={b(p.q) + 0.2} aS={b(p.a) + 0.5} label={p.label} question={p.question} answer={p.answer} />;
  }
};

export const SpeakerBody: React.FC<{ person?: Person }> = ({ person = SPEAKER }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const fx = person.cfg.fx!;
  const b = person.tr.beat;
  const END = person.dur;
  const splitAt = b(fx.split) - 0.3;
  const D = 0.6;
  const s = Math.min(
    interpolate(t, [splitAt, splitAt + D], [0, 1], { ...clamp, easing: E.inOut }),
    interpolate(t, [END + 10 - D, END + 10], [1, 0], { ...clamp, easing: E.inOut }));
  const frame = lerpF(FULL, LEFT, s);
  const split = s > 0.5;
  const lt = person.cfg.lowerThird === undefined ? { inS: 0.6, outS: 7.0 } : person.cfg.lowerThird;
  const lift = lt && t < lt.outS + 0.4 ? 190 : 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Talking person={person} frame={frame} />
      {lt && <LowerThird name={person.name} role={person.role} inS={lt.inS} outS={lt.outS} />}
      {fx.chapters && <Chapters kicker={fx.chapters.kicker} title={fx.chapters.title} inS={splitAt + 0.3} x={PX} y={120} w={PW} h={840}
        chapters={fx.chapters.items.map((c) => ({ label: c.label, s: b(c.at) }))} />}
      {fx.panels.map((p, i) => (
        <Panel key={i} inS={b(p.in)} outS={p.out ? b(p.out) + (p.pad ?? 2.2) - 0.2 : END + 10} x={PX} y={120} w={PW} h={840} light={p.light}>
          <PanelBody p={p} person={person} t={t} />
        </Panel>
      ))}
      {/* captions rise 190 px while the lower third is on screen (also in the split column) */}
      <Captions cues={person.tr.CUES} isKey={person.isKey} box={split ? { x: 72, y: 1080 - 92 - 150 - lift, w: 900 } : undefined} lift={lift} size={split ? 48 : 56} />
    </AbsoluteFill>
  );
};
