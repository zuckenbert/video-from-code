import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/fonts';
import { E, clamp, arrive, leave } from './anim';

// Launch film, three layers:
//   1. archival footage + its original audio (the spine; the only voice of the film)
//   2. the continuous browser recording of the product (scripts/record.mjs) with a camera and a drawn cursor on top
//   3. minimal cards and pills
// Everything is placed by src/film.json (seconds of the final film). The recording starts at film.recAt, so inside the
// product layer the clock is t_rec = t_video - recAt, the same clock the recorder used to cue every action.

export type Rect = { x: number; y: number; w: number; h: number; cx: number; cy: number };
export type Ev = { kind: string; t: number; cursor: { x: number; y: number }; rect?: Rect | null; zoom?: number | null; nav?: boolean; dur?: number; from?: { x: number; y: number }; to?: { x: number; y: number } };
export type Cut = { fps: number; viewport: { width: number; height: number }; video: string; videoT0: number; offset?: number; events: Ev[]; lang: string };
type Clip = { name: string; src: string; at: number; to: number; from: number; sat?: number; fadeIn?: number; fadeOut?: number };
type Sound = { name: string; src: string; at: number; from: number; dur: number; volume?: number; fadeIn?: number; fadeOut?: number };
type CardSpec = { key: string; at: number; to: number; outAt?: number; color?: string; size?: number; y?: number; stagger?: number };
type PillSpec = { key: string; at: number; to: number };
export type Film = {
  fps: number; width: number; height: number; duration: number;
  recAt: number; endAt: number; productFadeIn?: number; productFadeOut?: number;
  theme: { bg: string; ink: string; accent: string; side: string; font: string; fontFile?: string; fontWeight?: string };
  archive: Clip[]; audio: Sound[]; cards: CardSpec[]; pills: PillSpec[];
  end: { wordmark: string; line: string };
  text: Record<string, Record<string, string>>;
};

const CAM_T = 0.6; // camera travel (s)

// Camera from the event log: every event with a zoom is a keyframe (rect = what to frame; no rect + zoom > 1 = frame the
// cursor; zoom 1 = whole screen). Eased travel of CAM_T, slow drift after settling (1%/s, cap 5%), clamped to the frame.
function camera(cut: Cut, t: number) {
  const VW = cut.viewport.width, VH = cut.viewport.height;
  let z = 1, fx = VW / 2, fy = VH / 2; let cz = 1, cfx = fx, cfy = fy; let lastAt = 0;
  for (const e of cut.events) {
    if (e.zoom == null) continue;
    const nz = e.zoom; let nfx = fx, nfy = fy;
    if (nz > 1.001) {
      if (e.rect) { const vw = VW / nz, vh = VH / nz; const left = e.rect.x - 70, top = e.rect.y - 110; nfx = e.rect.w + 140 <= vw ? e.rect.cx : left + vw / 2; nfy = e.rect.h + 220 <= vh ? e.rect.cy - 40 : top + vh / 2; }
      else { nfx = e.cursor.x; nfy = e.cursor.y; }
    } else { nfx = VW / 2; nfy = VH / 2; }
    const hw = VW / nz / 2, hh = VH / nz / 2; nfx = Math.min(Math.max(nfx, hw), VW - hw); nfy = Math.min(Math.max(nfy, hh), VH - hh);
    if (Math.abs(nz - z) > 0.01 || Math.abs(nfx - fx) > 2 || Math.abs(nfy - fy) > 2) {
      if (e.t > t) break;
      const p = interpolate(t, [e.t, e.t + CAM_T], [0, 1], { ...clamp, easing: E.inOut });
      cz = cz + (nz - cz) * p; cfx = cfx + (nfx - cfx) * p; cfy = cfy + (nfy - cfy) * p; lastAt = e.t + CAM_T;
      z = nz; fx = nfx; fy = nfy;
    }
  }
  cz *= 1 + Math.min(0.05, Math.max(0, t - lastAt) * 0.010); // the camera never fully stops
  { const hw = VW / cz / 2, hh = VH / cz / 2; cfx = Math.min(Math.max(cfx, hw), VW - hw); cfy = Math.min(Math.max(cfy, hh), VH - hh); }
  let cx = cut.events[0]?.cursor.x ?? VW / 2, cy = cut.events[0]?.cursor.y ?? VH / 2; let clickAt = -10;
  for (const e of cut.events) {
    if (e.t > t) break;
    if (e.kind === 'move' && e.from && e.to && e.dur) { const p = interpolate(t, [e.t, e.t + e.dur], [0, 1], { ...clamp, easing: E.inOut }); cx = e.from.x + (e.to.x - e.from.x) * p; cy = e.from.y + (e.to.y - e.from.y) * p; }
    if (['click', 'open', 'confirm'].includes(e.kind) && e.rect) clickAt = e.t;
  }
  return { cz, cfx, cfy, cx, cy, clickAt };
}

// headless recordings carry no cursor: it is drawn from the `move` events, with a ring on each click
const Cursor: React.FC<{ x: number; y: number; scale: number; clickP: number; accent: string }> = ({ x, y, scale, clickP, accent }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
    {clickP > 0 && clickP < 1 && <div style={{ position: 'absolute', left: -40 * scale, top: -40 * scale, width: 80 * scale, height: 80 * scale, borderRadius: '50%', border: `${3 * scale}px solid ${accent}`, opacity: 1 - clickP, transform: `scale(${0.25 + clickP * 0.9})` }} />}
    <svg width={30 * scale} height={38 * scale} viewBox="0 0 30 38" style={{ position: 'absolute', left: -2 * scale, top: -2 * scale, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
      <path d="M3 2 L3 30 L10 23 L15 35 L20 33 L15 21 L25 21 Z" fill="#111" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  </div>
);

// product recording at full height, raw (no window chrome, no grain); side bands filled with theme.side
const Product: React.FC<{ cut: Cut; film: Film }> = ({ cut, film }) => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig(); const t = frame / fps; // t = t_rec
  const VW = cut.viewport.width, VH = cut.viewport.height; const S = height / VH, W = Math.round(VW * S), X = Math.round((width - W) / 2);
  const st = camera(cut, t);
  const tx = W / 2 - st.cfx * S * st.cz, ty = height / 2 - st.cfy * S * st.cz;
  const clickP = st.clickAt >= 0 ? interpolate(t, [st.clickAt, st.clickAt + 0.45], [0, 1], clamp) : 1;
  return (
    <AbsoluteFill style={{ background: film.theme.side }}>
      <div style={{ position: 'absolute', left: X, top: 0, width: W, height, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height, transform: `translate(${tx}px, ${ty}px) scale(${st.cz})`, transformOrigin: '0 0' }}>
          <OffthreadVideo src={staticFile(cut.video)} startFrom={Math.round(cut.videoT0 * fps)} muted style={{ position: 'absolute', left: 0, top: 0, width: W, height }} />
          <Cursor x={st.cx * S} y={st.cy * S} scale={1 / Math.sqrt(st.cz)} clickP={clickP} accent={film.theme.accent} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// archival clip: full frame (the source already carries the 4:3 film with real black bars), desaturated; cuts are hard
const Archive: React.FC<{ clip: Clip }> = ({ clip }) => {
  const frame = useCurrentFrame(); const { fps, width, height } = useVideoConfig();
  const len = Math.round((clip.to - clip.at) * fps);
  const o = Math.min(clip.fadeIn ? arrive(frame, 0, clip.fadeIn) : 1, clip.fadeOut ? leave(frame, len - clip.fadeOut, clip.fadeOut) : 1);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <OffthreadVideo src={staticFile(clip.src)} startFrom={Math.round(clip.from * fps)} muted style={{ width, height, objectFit: 'cover', filter: `saturate(${clip.sat ?? 0.85})` }} />
    </AbsoluteFill>
  );
};

// card: words enter one by one with a short spring-like ease, exit is dry
const Card: React.FC<{ text: string; font: string; color: string; size: number; y: number; outFrame?: number; stagger: number }> = ({ text, font, color, size, y, outFrame, stagger }) => {
  const frame = useCurrentFrame();
  const lines = text.split('\n'); let k = 0;
  const outP = outFrame != null ? leave(frame, outFrame, 6) : 1;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, transform: 'translateY(-50%)', textAlign: 'center', fontFamily: font, fontWeight: 500, fontSize: size, lineHeight: 1.3, color, opacity: outP, letterSpacing: '-0.01em', whiteSpace: 'pre' }}>
      {lines.map((ln, li) => (
        <div key={li}>
          {ln.split(' ').map((w, wi, arr) => { const p = arrive(frame, (k++) * stagger, 10); return <span key={wi} style={{ display: 'inline-block', opacity: p, transform: `translateY(${(1 - p) * 14}px)`, marginRight: wi < arr.length - 1 ? '0.6em' : 0 }}>{w}</span>; })}
        </div>
      ))}
    </div>
  );
};

// pill over the product: one short line at the bottom, theme colors, never covering the action
const Pill: React.FC<{ text: string; dur: number; film: Film }> = ({ text, dur, film }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const p = Math.min(arrive(frame, 0, 10), leave(frame, Math.round(dur * fps) - 8, 8));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 10}px)` }}>
      <span style={{ display: 'inline-block', fontFamily: film.theme.font, fontWeight: 500, fontSize: 34, color: film.theme.ink, background: film.theme.bg, padding: '14px 28px', borderRadius: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.18)' }}>{text}</span>
    </div>
  );
};

// end wordmark: product name + a blinking accent caret
const Wordmark: React.FC<{ film: Film; size?: number }> = ({ film, size = 150 }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const blink = Math.floor((frame / fps) * 2) % 2 === 0;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', fontFamily: film.theme.font, fontWeight: 500, fontSize: size, color: film.theme.ink, letterSpacing: '-0.02em' }}>
      {film.end.wordmark}<span style={{ display: 'inline-block', width: size * 0.2, height: size * 0.82, background: film.theme.accent, marginLeft: size * 0.12, opacity: blink ? 1 : 0.15 }} />
    </div>
  );
};

const loaded = new Set<string>();
const useFont = (film: Film) => {
  const f = film.theme;
  if (f.fontFile && !loaded.has(f.fontFile)) { loaded.add(f.fontFile); loadFont({ family: f.font.split(',')[0].replace(/["']/g, '').trim(), url: staticFile(f.fontFile), weight: f.fontWeight ?? '500' }); }
};

export const LaunchFilm: React.FC<{ lang: string; film: Film; cut: Cut }> = ({ lang, film, cut }) => {
  useFont(film);
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const t = frame / fps;
  const X = film.text[lang] ?? film.text.en; const F = (s: number) => Math.round(s * fps);
  const seq = (name: string, from: number, to: number, children: React.ReactNode) => <Sequence key={name} name={name} from={F(from)} durationInFrames={Math.max(1, F(to) - F(from))} layout="none">{children}</Sequence>;
  const productOpacity = Math.min(arrive(frame - F(film.recAt), 0, film.productFadeIn ?? 8), interpolate(t, [film.endAt - (film.productFadeOut ?? 0.4), film.endAt], [1, 0], clamp));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {/* layer 2: the product (t_rec = t_video - recAt) */}
      {seq('product', film.recAt, film.endAt, <AbsoluteFill style={{ opacity: productOpacity }}><Product cut={cut} film={film} /></AbsoluteFill>)}
      {/* layer 1: archive, always a hard cut over the product */}
      {film.archive.map((c) => seq(c.name, c.at, c.to, <Archive clip={c} />))}
      {/* layer 3: pills and cards */}
      {film.pills.map((p) => seq('p_' + p.key, p.at, p.to, <Pill text={X[p.key] ?? p.key} dur={p.to - p.at} film={film} />))}
      {film.cards.map((c) => seq('c_' + c.key, c.at, c.to, <Card text={X[c.key] ?? c.key} font={film.theme.font} color={c.color ?? film.theme.ink} size={c.size ?? 76} y={c.y ?? film.height / 2} outFrame={c.outAt != null ? F(c.outAt) - F(c.at) : undefined} stagger={c.stagger ?? 4} />))}
      {/* end card */}
      {seq('end', film.endAt, film.duration, <AbsoluteFill style={{ background: film.theme.bg, alignItems: 'center', justifyContent: 'center', opacity: arrive(frame - F(film.endAt), 0, 10) }}>
        <Wordmark film={film} />
        <div style={{ marginTop: 34, fontFamily: film.theme.font, fontWeight: 500, fontSize: 40, color: film.theme.ink, opacity: arrive(frame - F(film.endAt), 12, 14) }}>{X[film.end.line] ?? ''}</div>
      </AbsoluteFill>)}
      {/* archival audio: the only voice of the film */}
      {film.audio.map((a) => {
        const n = F(a.dur); const v = a.volume ?? 0.9;
        return <Sequence key={a.name} name={'a_' + a.name} from={F(a.at)} durationInFrames={n} layout="none">
          <Audio src={staticFile(a.src)} trimBefore={F(a.from)} trimAfter={F(a.from) + n} volume={(f) => interpolate(f, [0, a.fadeIn ?? 0.001, n - (a.fadeOut ?? 0.001), n], [a.fadeIn ? 0 : v, v, v, a.fadeOut ? 0 : v], clamp)} />
        </Sequence>;
      })}
    </AbsoluteFill>
  );
};
