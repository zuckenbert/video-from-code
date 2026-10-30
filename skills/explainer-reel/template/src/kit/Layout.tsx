import React from 'react';
import { AbsoluteFill, Audio, Img, Sequence, staticFile } from 'remotion';
import { C, FONT, STAGE_H, STAGE_TOP, STAGE_W } from './tokens';
import { clamp, Cue, ease, FPS, lerp, prog } from './anim';
import CHAR from '../../character.json';

export type Word = { w: string; s: number; e: number };

export type Scene = {
  id: string;
  start: number;
  end: number;
  title: string[];
  Comp: React.FC<{ t: number }>;
  cues: Cue[];
  hops?: number[]; // moments where the character does the big opinion hop
  acts?: CharAct[]; // the character reacts to the scene: looks up, points, flinches
};

/** Character vocabulary (always facing the camera, never turned sideways). At most 2 per scene, spaced:
 *  point: raises the arm toward the stage (d s) | up: looks up at what appears (d s)
 *  hop: small hop | nod: head nod to stress a word | wiggle: celebration wiggle
 *  flinch: startle on an impact. */
export type CharAct = { t: number; act: 'point' | 'up' | 'hop' | 'nod' | 'wiggle' | 'flinch'; d?: number };

/** character.json at the project root (see SKILL.md, "Character sprite contract"). */
type CharConfig = {
  enabled: boolean;
  dir: string;
  spriteWidth: number;
  arm: { file: string; x: number; y: number; w: number; px: number; py: number } | null;
  introSfx: string;
  introSfxVolume: number;
};
export const CHARACTER = CHAR as CharConfig;

export const Background: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <svg width="1080" height="1920" style={{ position: 'absolute' }}>
      <defs>
        <pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill={C.dot} />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="url(#dots)" />
    </svg>
  </AbsoluteFill>
);

/** Scene title: words drop in and stamp; on a scene change the previous one leaves upward. */
export const Title: React.FC<{ t: number; scenes: Scene[]; cut?: number; top?: number }> = ({ t, scenes, cut = Infinity, top = 180 }) => {
  const i = scenes.findIndex((s) => t >= s.start && t < s.end);
  const sc = scenes[Math.max(0, i)];
  const outP = Math.max(prog(t, sc.end - 0.18, 0.18, ease.in), prog(t, cut, 0.18, ease.in));
  let k = 0;
  return (
    <div style={{ position: 'absolute', left: 60, top, width: 960, fontFamily: FONT, fontWeight: 800, fontSize: 80, lineHeight: 0.98, color: C.ink, letterSpacing: -3.5 }}>
      {sc.title.map((line, li) => (
        <div key={li} style={{ display: 'flex', flexWrap: 'wrap', gap: '0 22px' }}>
          {line.split(' ').map((wd, wi) => {
            const at = sc.start + 0.04 + k++ * 0.07;
            const p = clamp((t - at) / 0.28);
            const e = ease.back(p);
            const y = (1 - e) * -70 - outP * 120;
            const rot = (1 - e) * (wi % 2 ? 8 : -8);
            return (
              <span key={wi} style={{ display: 'inline-block', transform: `translateY(${y}px) rotate(${rot}deg)`, opacity: clamp(p * 3) * (1 - outP) }}>
                {wd}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Stage: React.FC<{ t: number; scenes: Scene[]; top?: number; scale?: number }> = ({ t, scenes, top = STAGE_TOP, scale = 1 }) => (
  <svg width={STAGE_W * scale} height={STAGE_H * scale} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
    style={{ position: 'absolute', left: (STAGE_W - STAGE_W * scale) / 2, top, overflow: 'visible' }}>
    {scenes.map((s) => (t >= s.start && t < s.end ? <s.Comp key={s.id} t={t} /> : null))}
  </svg>
);

/** The character: almost still, breathes, moves its mouth with the voice (vo_mouth.json), blinks and
 *  performs the scene acts. Reel loop: the video OPENS with the character in the camera's face playing
 *  the intro sound and going back home; at the end it runs to the corner, winds up and dashes at the
 *  camera; the last frame is frame 0, so the replay lands straight on the intro. Times in LOOP;
 *  `end` = 0.2 s after the last word. */
export type CharHome = { cx: number; cy: number; s: number };
const BOX_W = 330, BOX_H = 358; // sprite box on screen at scale 1 (sprites keep a 346:375 aspect)
export const HOME = { cx: 64 + BOX_W / 2, cy: 1130 + BOX_H / 2 };
/** Reels safe area: the app UI covers ~270 px at the top, ~310 to 420 px at the bottom (handle, post
 *  caption, audio) and ~130 px on the right from mid-height down; the profile grid shows only the 3:4
 *  middle (y 240 to 1680) and the feed 4:5 (y 285 to 1635). So the video has no header or footer, the
 *  title starts at 290, the stage shrinks 0.88 with 6% side margins and captions sit at 1480. */
export const REEL = { titleTop: 290, stageTop: 470, stageScale: 0.88, captionTop: 1480 };
const RS = REEL.stageScale, RX = (1080 - 1080 * RS) / 2;
export const REEL_HOME: CharHome = { cx: RX + 229 * RS, cy: REEL.stageTop + (1309 - 360) * RS, s: RS };
const CORNER = { cx: 860, cy: 1420, s: 0.3 };
const FACE = { cx: 540, cy: 1010, s: 4.2 };
/** intro: narration and scenes start here (real seconds). Without a character the intro is a 0.3 s empty
 *  lead-in, so frame 0 (empty stage, no title, no caption) still equals the last frame. */
export const LOOP = { intro: CHARACTER.enabled ? 0.85 : 0.3, hold: 0.55, ack: 0.33, run: 0.4, peek: 0.75, dash: 0.95 };
// Mouth during the intro sound, frame by frame from t=0: a short syllable, then a strong open accent at
// LOOP.ack. Tune it to your intro sfx if the sound has a different shape.
const INTRO_MOUTH = [3, 4, 4, 4, 4, 3, 1, 0, 0, 1, 4, 4, 4, 4, 4, 4, 3, 1, 0];

type Pose = { cx: number; cy: number; s: number; r: number; flip: number; blur: number; sx: number; sy: number };
const HOME_POSE: Pose = { cx: HOME.cx, cy: HOME.cy, s: 1, r: 0, flip: 1, blur: 0, sx: 1, sy: 1 };
const facePose = (t: number): Pose => {
  // pose in the camera's face, with the jolt on the accent
  const q = t - LOOP.ack;
  const k = q > 0 && q < 0.3 ? Math.sin((q / 0.3) * Math.PI) : 0;
  const shakeX = q > 0 && q < 0.25 ? Math.sin(q * 110) * 12 * (1 - q / 0.25) : 0;
  return { cx: FACE.cx + shakeX, cy: FACE.cy, s: FACE.s * (1 + k * 0.06), r: -6 - k * 4, flip: 1, blur: 0, sx: 1 - k * 0.05, sy: 1 + k * 0.09 };
};

/** Character home and opening/closing modes. Reel: home in the corner, intro = face the camera, outro = loop.
 *  Highlight (stories): home in the center and larger; intro/outro chosen per piece. */
export type Outro = 'loop' | 'face' | 'none';
export const OUTRO_FACE = { dash: 0.3 }; // home -> camera face, then the intro mouth (INTRO_MOUTH)

export const loopState = (t: number, end: number, home: CharHome = { ...HOME, s: 1 }, intro = true, outro: Outro = 'loop'): Pose => {
  const HP: Pose = { ...HOME_POSE, cx: home.cx, cy: home.cy, s: home.s };
  if (intro && t < LOOP.hold) return facePose(t);
  if (intro && t < LOOP.intro) {
    const p = ease.inOut(clamp((t - LOOP.hold) / (LOOP.intro - LOOP.hold)));
    return { ...HP, cx: lerp(FACE.cx, HP.cx, p), cy: lerp(FACE.cy, HP.cy, p), s: lerp(FACE.s, HP.s, p), r: lerp(-6, 0, p), blur: Math.sin(p * Math.PI) * 5 };
  }
  const u = t - end;
  if (u < 0 || outro === 'none') return HP;
  if (outro === 'face') {
    if (u < OUTRO_FACE.dash) {
      const p = ease.out(u / OUTRO_FACE.dash);
      return { ...HP, cx: lerp(HP.cx, FACE.cx, p), cy: lerp(HP.cy, FACE.cy, p), s: lerp(HP.s, FACE.s, p), r: lerp(0, -6, p), blur: Math.sin(p * Math.PI) * 7 };
    }
    return facePose(u - OUTRO_FACE.dash);
  }
  const k = home.s;
  if (u < LOOP.run) {
    const p = ease.inOut(u / LOOP.run);
    return { ...HP, cx: lerp(HP.cx, CORNER.cx, p), cy: lerp(HP.cy, CORNER.cy, p) - Math.sin(p * Math.PI) * 170, s: lerp(k, CORNER.s, p), flip: -1, r: Math.sin(u * 40) * 6 };
  }
  if (u < LOOP.peek) {
    const b = u - LOOP.run;
    const lean = prog(t, end + 0.58, 0.17, ease.inOut);
    return { ...HP, cx: CORNER.cx, cy: CORNER.cy - Math.abs(Math.sin(b * 18)) * 14 * (b < 0.2 ? 1 : 0), s: CORNER.s, r: lean * 12, sx: 1 + lean * 0.12, sy: 1 - lean * 0.12 };
  }
  const p = clamp((u - LOOP.peek) / (LOOP.dash - LOOP.peek));
  const f = facePose(0);
  return { ...HP, cx: lerp(CORNER.cx, f.cx, ease.out(p)), cy: lerp(CORNER.cy, f.cy, ease.out(p)), s: lerp(CORNER.s, f.s, ease.out(p)), r: lerp(12, f.r, ease.out(p)), blur: Math.sin(p * Math.PI) * 7 };
};

const SPRITES = ['m0', 'm1', 'm2', 'm3', 'm4', 'blink', 'blink_half'];

/** Deterministic blinks every ~2.8 to 4.4 s: half, closed, half. */
const blinkAt = (t: number) => {
  let at = 1.6;
  for (let k = 1; at < t + 1; k++) {
    const d = t - at;
    if (d >= 0 && d < 3 / FPS) return d < 1 / FPS || d >= 2 / FPS ? 'blink_half' : 'blink';
    const r = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;
    at += 2.8 + r * 1.6;
  }
  return null;
};

/** t = real video time; tv = narration time (t - intro). */
const faceAt = (t: number, tv: number, mouth: number[], end: number, intro = true, outro: Outro = 'loop') => {
  const qf = Math.round(t * FPS);
  if (intro && qf < INTRO_MOUTH.length) return `m${INTRO_MOUTH[qf]}`;
  const u = t - end;
  if (outro === 'face' && u >= 0) {
    const f = Math.round((u - OUTRO_FACE.dash) * FPS);
    return f < 0 ? 'm1' : `m${INTRO_MOUTH[f] ?? 0}`;
  }
  if (outro === 'loop' && u >= LOOP.peek) return u > LOOP.dash - 0.08 ? 'm3' : 'm1'; // mouth opens on the dash: joins the intro of frame 0
  if (outro === 'loop' && u >= 0) return 'm0';
  const m = mouth[Math.round(tv * FPS)] ?? 0;
  if (m > 0) return `m${m}`;
  return blinkAt(tv) ?? 'm0';
};

const K = BOX_W / CHARACTER.spriteWidth;

const actState = (t: number, acts: CharAct[]) => {
  let arm = 0, poke = 0, up = 0, hop = 0, nod = 0, wig = 0, flinch = 0;
  for (const a of acts) {
    const d = a.d ?? ({ point: 1.0, up: 1.0, hop: 0.45, nod: 0.5, wiggle: 0.6, flinch: 0.3 } as const)[a.act];
    const u = t - a.t;
    if (u < 0 || u > d + 0.25) continue;
    const env = u < 0.2 ? ease.out(u / 0.2) : u > d ? 1 - ease.inOut(clamp((u - d) / 0.2)) : 1;
    if (a.act === 'point') {
      arm = Math.max(arm, u < 0.24 ? ease.back(u / 0.24) : u > d ? 1 - ease.inOut(clamp((u - d) / 0.22)) : 1);
      if (u > 0.24 && u < d) poke = Math.sin((u - 0.24) * 16) * 0.12;
    }
    if (a.act === 'up') up = Math.max(up, env);
    if (a.act === 'hop' && u < d) hop = Math.max(hop, Math.sin((u / d) * Math.PI));
    if (a.act === 'nod' && u < d) nod = Math.max(nod, Math.abs(Math.sin((u / d) * Math.PI * 2)) * (1 - u / d));
    if (a.act === 'wiggle' && u < d) wig = Math.sin((u / d) * Math.PI * 6) * Math.sin((u / d) * Math.PI);
    if (a.act === 'flinch' && u < d) flinch = Math.max(flinch, Math.sin((u / d) * Math.PI));
  }
  return { arm: clamp(arm, 0, 1.15), poke, up, hop, nod, wig, flinch };
};

export const Character: React.FC<{ t: number; tv: number; end: number; words: Word[]; mouth: number[]; hops: number[]; acts?: CharAct[]; home?: CharHome; intro?: boolean; outro?: Outro }> = ({
  t, tv, end, words, mouth, hops, acts = [], home, intro = true, outro = 'loop' }) => {
  if (!CHARACTER.enabled) return null;
  const live = t >= (intro ? LOOP.intro : 0) && t < end ? 1 : 0;
  const breathe = Math.sin(t * 2.4) * 0.012 * live;
  const w = [...words].reverse().find((x) => tv >= x.s);
  const talk = w && tv < w.e ? Math.sin(clamp((tv - w.s) / 0.18) * Math.PI) * 2.2 * live : 0;
  let bigHop = 0, sq = 0;
  for (const h of hops) {
    if (tv >= h && tv < h + 0.5) {
      const p = (tv - h) / 0.5;
      bigHop = Math.sin(p * Math.PI) * 70;
      sq = p > 0.85 ? Math.sin(((p - 0.85) / 0.15) * Math.PI) * 0.08 : p < 0.12 ? Math.sin((p / 0.12) * Math.PI) * 0.06 : 0;
    }
  }
  const A = live ? actState(tv, acts) : { arm: 0, poke: 0, up: 0, hop: 0, nod: 0, wig: 0, flinch: 0 };
  const L = loopState(t, end, home, intro, outro);
  const face = faceAt(t, tv, mouth, end, intro, outro);
  const rot = talk - 9 * A.up - 3 * A.arm + 7 * A.nod + 5 * A.wig;
  const ty = -bigHop - 40 * A.hop + 8 * A.nod + 10 * A.flinch;
  const sxx = 1 + sq + 0.06 * A.flinch - 0.03 * A.up;
  const syy = 1 + breathe - sq - 0.1 * A.flinch + 0.04 * A.up + 0.05 * A.hop;
  const armRot = -(82 * A.arm + A.poke * 40);
  const arm = CHARACTER.arm;
  return (
    <div style={{ position: 'absolute', left: L.cx - BOX_W / 2, top: L.cy - BOX_H / 2, width: BOX_W, height: BOX_H,
      transform: `rotate(${L.r}deg) scale(${L.s * L.flip * L.sx}, ${L.s * L.sy})`, filter: L.blur > 0.3 ? `blur(${L.blur}px)` : undefined }}>
      <div style={{ position: 'relative', width: BOX_W, height: BOX_H, transformOrigin: '50% 100%',
        transform: `translateY(${ty}px) translateX(${Math.sin(t * 80) * 4 * A.flinch}px) rotate(${rot}deg) scale(${sxx}, ${syy})` }}>
        {SPRITES.map((k) => (
          <Img key={k} src={staticFile(`${CHARACTER.dir}/${k}.png`)} style={{ position: 'absolute', left: 0, top: 0, width: BOX_W, opacity: k === face ? 1 : 0 }} />
        ))}
        {arm && (
          <Img src={staticFile(`${CHARACTER.dir}/${arm.file}`)} style={{ position: 'absolute', left: arm.x * K, top: arm.y * K, width: arm.w * K, transformOrigin: `${arm.px * K}px ${arm.py * K}px`,
            transform: `translate(${30 * A.arm}px, ${-62 * A.arm}px) rotate(${armRot}deg) scale(${1 + 0.22 * A.arm})` }} />
        )}
      </div>
    </div>
  );
};

/** Impact rays behind the character at the intro accent. */
export const IntroBurst: React.FC<{ t: number; at?: number }> = ({ t, at = 0 }) => {
  if (!CHARACTER.enabled) return null;
  const a = at + LOOP.ack - 0.05;
  if (t < a || t > a + 0.5) return null;
  const p = (t - a) / 0.5;
  return (
    <svg width="1080" height="1920" style={{ position: 'absolute', left: 0, top: 0 }}>
      {Array.from({ length: 18 }).map((_, i) => {
        const ang = (i / 18) * Math.PI * 2 + 0.2;
        const r0 = 430 + ease.out(p) * 260, r1 = r0 + 140 * (1 - p);
        return <line key={i} x1={540 + Math.cos(ang) * r0} y1={1010 + Math.sin(ang) * r0} x2={540 + Math.cos(ang) * r1} y2={1010 + Math.sin(ang) * r1}
          stroke={i % 3 === 0 ? C.highlight : C.ink} strokeWidth={14} strokeLinecap="round" opacity={1 - p} />;
      })}
    </svg>
  );
};

/** Karaoke captions: blocks of up to ~24 characters, the spoken word gets a highlight bar. */
export const Captions: React.FC<{ t: number; words: Word[]; until?: number; top?: number }> = ({ t, words, until = Infinity, top = 1530 }) => {
  if (t > until) return null;
  const chunks: Word[][] = [];
  let cur: Word[] = [];
  for (const w of words) {
    const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
    if (cur.length && len > 24) { chunks.push(cur); cur = []; }
    cur.push(w);
    if (/[.?:,!]$/.test(w.w) && cur.length >= 2) { chunks.push(cur); cur = []; }
  }
  if (cur.length) chunks.push(cur);
  const idx = chunks.findIndex((c, i) => t >= c[0].s - 0.05 && (i === chunks.length - 1 || t < chunks[i + 1][0].s - 0.05));
  if (idx < 0) return null;
  const ch = chunks[idx];
  const last = ch[ch.length - 1];
  if (t > last.e + 0.9) return null;
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 16px',
      fontFamily: FONT, fontWeight: 800, fontSize: 62, color: C.ink, letterSpacing: -1.5 }}>
      {ch.map((w, i) => {
        const on = t >= w.s && t < (ch[i + 1]?.s ?? w.e + 0.6);
        const said = t >= w.s;
        const p = clamp((t - w.s) / 0.12);
        const txt = w.w.replace(/\.\.\.$/, '…');
        return (
          <span key={i} style={{ position: 'relative', display: 'inline-block', opacity: said ? 1 : 0.32, transform: `scale(${on ? 1 + 0.06 * Math.sin(p * Math.PI) : 1})` }}>
            {on && <span style={{ position: 'absolute', left: -8, right: -8, top: 4, bottom: -2, background: C.positive, transform: `scaleX(${ease.out(p)})`, transformOrigin: 'left', zIndex: -1 }} />}
            {txt}
          </span>
        );
      })}
    </div>
  );
};

/** SFX: master level 0.34, and 30% lower when the effect lands on a spoken word (do not fight the voice). */
export const SFX_GAIN = 0.34;
export const SFX_UNDER_VOICE = 0.7;
export const Sfx: React.FC<{ cues: Cue[]; words?: Word[] }> = ({ cues, words = [] }) => (
  <>
    {cues.map(([t, name, vol], i) => {
      const speaking = words.some((w) => t >= w.s - 0.05 && t <= w.e + 0.05);
      return (
        <Sequence key={i} from={Math.max(0, Math.round(t * FPS))} durationInFrames={FPS * 2} layout="none">
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={(vol ?? 1) * SFX_GAIN * (speaking ? SFX_UNDER_VOICE : 1)} />
        </Sequence>
      );
    })}
  </>
);
