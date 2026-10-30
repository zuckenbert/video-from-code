import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { DEFAULT_BRAND, T, type Brand } from './brand/tokens';
import { E, clamp, arrive, leave, riseStyle } from './brand/anim';
import './brand/fonts';

// Screen Studio style in code: real UI frames (2x), synthetic cursor, zoom on clicks, chapters, voice.
export type Ev = { kind: string; img: string; cursor: { x: number; y: number }; rect: { x: number; y: number; w: number; h: number; cx: number; cy: number } | null; zoom: number | null; start: number; move: number; hold: number };
export type Scene = { id: string; kind: 'card' | 'ui'; chapter?: string | null; timer?: boolean; title?: string; line?: string; sub?: string | null; start: number; dur: number; vo: string | null; events: Ev[] };
export type Cut = { fps: number; viewport: { width: number; height: number }; total: number; scenes: Scene[]; frames: string; brand?: Partial<Brand> };

const CAM_T = 0.6;
const BrandCtx = React.createContext<Brand>(DEFAULT_BRAND);
const CutCtx = React.createContext<Cut | null>(null);

function useSceneState(sc: Scene, t: number, VW: number, VH: number) {
  const ev = sc.events;
  const keys: { at: number; z: number; fx: number; fy: number }[] = [];
  let z = 1, fx = VW / 2, fy = VH / 2;
  for (const e of ev) {
    if (e.zoom != null) {
      const nz = e.zoom; let nfx = fx, nfy = fy;
      if (nz > 1.001) { if (e.rect) { nfx = e.rect.cx; nfy = e.rect.cy; } else { nfx = e.cursor.x; nfy = e.cursor.y; } } else { nfx = VW / 2; nfy = VH / 2; }
      const hw = VW / nz / 2, hh = VH / nz / 2;
      nfx = Math.min(Math.max(nfx, hw), VW - hw); nfy = Math.min(Math.max(nfy, hh), VH - hh);
      if (Math.abs(nz - z) > 0.01 || Math.abs(nfx - fx) > 2 || Math.abs(nfy - fy) > 2) { keys.push({ at: e.start + e.move, z: nz, fx: nfx, fy: nfy }); z = nz; fx = nfx; fy = nfy; }
    }
  }
  let cz = 1, cfx = VW / 2, cfy = VH / 2;
  for (const k of keys) { const p = interpolate(t, [k.at, k.at + CAM_T], [0, 1], { ...clamp, easing: E.inOut }); cz += (k.z - cz) * p; cfx += (k.fx - cfx) * p; cfy += (k.fy - cfy) * p; }
  let cx = ev[0]?.cursor.x ?? VW / 2, cy = ev[0]?.cursor.y ?? VH / 2; let px = cx, py = cy; let clickAt = -10;
  for (const e of ev) {
    if (t < e.start) break;
    if (e.move > 0) { const p = interpolate(t, [e.start, e.start + e.move], [0, 1], { ...clamp, easing: E.inOut }); cx = px + (e.cursor.x - px) * p; cy = py + (e.cursor.y - py) * p; } else { cx = e.cursor.x; cy = e.cursor.y; }
    if (t >= e.start + e.move) { px = e.cursor.x; py = e.cursor.y; }
    if (['click', 'open', 'confirm'].includes(e.kind)) clickAt = e.start + e.move;
  }
  let img = ev[0]?.img ?? ''; let imgAt = 0; let prevImg = img;
  for (const e of ev) { const at = e.start + e.move + (['click', 'open', 'confirm'].includes(e.kind) ? 0.09 : 0); if (t >= at) { if (e.img !== img) { prevImg = img; imgAt = at; } img = e.img; } }
  return { cz, cfx, cfy, cx, cy, clickAt, img, prevImg, imgAt };
}

const Cursor: React.FC<{ x: number; y: number; scale: number; clickP: number; accent: string }> = ({ x, y, scale, clickP, accent }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, pointerEvents: 'none' }}>
    {clickP > 0 && clickP < 1 && <div style={{ position: 'absolute', left: -40 * scale, top: -40 * scale, width: 80 * scale, height: 80 * scale, borderRadius: '50%', border: `${3 * scale}px solid ${accent}`, opacity: 1 - clickP, transform: `scale(${0.25 + clickP * 0.9})` }} />}
    <svg width={30 * scale} height={38 * scale} viewBox="0 0 30 38" style={{ position: 'absolute', left: -2 * scale, top: -2 * scale, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
      <path d="M3 2 L3 30 L10 23 L15 35 L20 33 L15 21 L25 21 Z" fill="#111" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  </div>
);

const Timer: React.FC<{ t: number }> = ({ t }) => { const B = React.useContext(BrandCtx); const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t % 1) * 100); return <div style={{ position: 'absolute', right: 96, top: 20, fontFamily: B.mono, fontSize: 32, fontWeight: 500, color: B.white, background: B.line, padding: '6px 18px', borderRadius: 10, fontVariantNumeric: 'tabular-nums' }}>{`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`}</div>; };

const UiScene: React.FC<{ sc: Scene }> = ({ sc }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const B = React.useContext(BrandCtx); const cut = React.useContext(CutCtx)!;
  const VW = cut.viewport.width, VH = cut.viewport.height;
  const WIN_W = 1728, BAR = 44, WIN_H = Math.round(WIN_W * VH / VW), WIN_X = 96, WIN_Y = Math.round((1080 - (WIN_H + BAR)) / 2), S = WIN_W / VW;
  const t = frame / fps; const st = useSceneState(sc, t, VW, VH); const zoom = st.cz;
  const tx = WIN_W / 2 - st.cfx * S * zoom, ty = WIN_H / 2 - st.cfy * S * zoom;
  const xfade = interpolate(t, [st.imgAt, st.imgAt + 0.16], [0, 1], clamp);
  const clickP = st.clickAt >= 0 ? interpolate(t, [st.clickAt, st.clickAt + 0.45], [0, 1], clamp) : 1;
  const inP = arrive(frame, 0, 14), outP = leave(frame, Math.round(sc.dur * fps) - 10, 10);
  const chP = sc.chapter ? Math.min(arrive(frame, 6, 18), leave(frame, Math.round(2.6 * fps), 12)) : 0;
  const timerStart = cut.scenes.find((x) => x.timer)?.start ?? 0; const timerT = sc.timer ? Math.max(0, sc.start + t - timerStart) : null;
  const frames = cut.frames;
  return (
    <AbsoluteFill style={{ opacity: Math.min(inP, outP) }}>
      <div style={{ position: 'absolute', left: WIN_X, top: WIN_Y, width: WIN_W, height: WIN_H + BAR, borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)', background: B.paper }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: WIN_W, height: BAR, background: '#232733', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, boxSizing: 'border-box' }}>
          {[0, 1, 2].map((c) => <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: B.grey, opacity: 0.55 }} />)}
          <div style={{ margin: '0 auto', background: B.ink, color: B.grey, borderRadius: 8, padding: '4px 14px', fontFamily: B.mono, fontSize: 15, fontWeight: 500 }}>{B.url}</div>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ position: 'absolute', left: 0, top: BAR, width: WIN_W, height: WIN_H, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: WIN_W, height: WIN_H, transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            {st.prevImg !== st.img && xfade < 1 && <Img src={staticFile(`${frames}/${st.prevImg}`)} style={{ position: 'absolute', left: 0, top: 0, width: WIN_W, height: WIN_H }} />}
            <Img src={staticFile(`${frames}/${st.img}`)} style={{ position: 'absolute', left: 0, top: 0, width: WIN_W, height: WIN_H, opacity: st.prevImg !== st.img ? xfade : 1 }} />
            <Cursor x={st.cx * S} y={st.cy * S} scale={1 / Math.sqrt(zoom)} clickP={clickP} accent={B.accent} />
          </div>
        </div>
      </div>
      {timerT != null && <Timer t={timerT} />}
      {sc.chapter && chP > 0 && (
        <div style={{ position: 'absolute', left: 96, bottom: 54, display: 'flex', alignItems: 'center', gap: 18, ...riseStyle(chP, 20) }}>
          <div style={{ width: 10, height: 44, background: B.line }} />
          <div style={{ fontFamily: B.font, ...T.caption, color: B.white, background: 'rgba(18,20,26,0.88)', padding: '8px 22px', borderRadius: 10 }}>{sc.chapter}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const CardScene: React.FC<{ sc: Scene }> = ({ sc }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); const B = React.useContext(BrandCtx);
  const o = leave(frame, Math.round(sc.dur * fps) - 12, 12); const line = arrive(frame, 10, 40);
  return (
    <AbsoluteFill style={{ background: B.ink, color: B.white, fontFamily: B.font, opacity: o }}>
      {B.wordmark && <div style={{ position: 'absolute', left: 96, top: 64 }}><Img src={staticFile(B.wordmark)} style={{ height: 44, width: 'auto' }} /></div>}
      <div style={{ position: 'absolute', left: 96, bottom: 64, display: 'flex', flexDirection: 'column', gap: 36, maxWidth: 1600 }}>
        <div style={{ ...T.hero, ...riseStyle(arrive(frame, 4, 26), 44) }}>{sc.title}</div>
        <div style={{ height: 12, width: 1728, background: B.line, transformOrigin: 'left', transform: `scaleX(${line})` }} />
        <div style={{ ...T.secondary, color: B.grey, ...riseStyle(arrive(frame, 18, 26), 30) }}>{sc.line}</div>
        {sc.sub && <div style={{ ...T.small, color: B.accent, ...riseStyle(arrive(frame, 30, 26), 24) }}>{sc.sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

export const DemoFilm: React.FC<{ cut: Cut }> = ({ cut }) => {
  const { fps } = useVideoConfig();
  const brand = { ...DEFAULT_BRAND, ...(cut.brand ?? {}) } as Brand;
  return (
    <BrandCtx.Provider value={brand}><CutCtx.Provider value={cut}>
      <AbsoluteFill style={{ background: brand.ink }}>
        <AbsoluteFill style={{ background: `radial-gradient(1200px 700px at 50% 45%, #232733 0%, ${brand.ink} 70%)` }} />
        {cut.scenes.map((sc) => (
          <Sequence key={sc.id} from={Math.round(sc.start * fps)} durationInFrames={Math.round(sc.dur * fps) + 2} name={sc.id}>
            {sc.kind === 'card' ? <CardScene sc={sc} /> : <UiScene sc={sc} />}
            {sc.vo && <Audio src={staticFile(sc.vo)} />}
          </Sequence>
        ))}
      </AbsoluteFill>
    </CutCtx.Provider></BrandCtx.Provider>
  );
};
