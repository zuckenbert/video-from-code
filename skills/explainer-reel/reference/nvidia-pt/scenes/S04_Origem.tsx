import React from 'react';
import { arc, clamp, Cue, drop, ease, lerp, pop, prog, shake, squash } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { Box3D, Controller, G, Gpu, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';

// S04 "Tudo começou numa lanchonete, em noventa e três, com placa de vídeo pra game."

const T_SPIN = 12.81, T_DINER = 13.61, T_MUGS = [14.42, 14.6, 14.78], T_GPU = 15.42, T_GAME = 16.38, T_OUT = 16.5;
const SIGN = { x: 540, y: 140 };
const COUNTER_Y = 470;

/** Moeda grande: frente com $, verso com o ano (flip em radianos). */
const BigCoin: React.FC<{ r: number; flip: number; back: string }> = ({ r, flip, back }) => {
  const c = Math.cos(flip);
  const showBack = c < 0;
  return (
    <g transform={`scale(${Math.max(0.06, Math.abs(c))} 1)`}>
      <circle r={r} fill={C.highlight} stroke={C.ink} strokeWidth={SW + 1} />
      <circle r={r * 0.78} fill="none" stroke={C.ink} strokeWidth={3} opacity={0.5} />
      {showBack ? <Txt size={r * 0.52} weight={900} ls={-2}>{back}</Txt> : <Txt size={r * 1.0} weight={900}>$</Txt>}
    </g>
  );
};

const Stool: React.FC = () => (
  <g>
    <rect x={-6} y={0} width={12} height={110} fill={C.ink} />
    <rect x={-40} y={104} width={80} height={10} rx={5} fill={C.ink} />
    <ellipse cy={0} rx={58} ry={16} fill={C.negative} stroke={C.ink} strokeWidth={SW} />
  </g>
);

const Mug: React.FC<{ t: number; seed: number }> = ({ t, seed }) => (
  <g>
    <path d="M 30 -50 Q 58 -50 58 -28 Q 58 -6 30 -6" fill="none" stroke={C.ink} strokeWidth={8} />
    <rect x={-34} y={-70} width={68} height={74} rx={8} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
    <rect x={-34} y={-40} width={68} height={14} fill={C.accent} />
    <rect x={-34} y={-70} width={68} height={74} rx={8} fill="none" stroke={C.ink} strokeWidth={SW} />
    <ellipse cy={-70} rx={30} ry={6} fill={C.ink} />
    {[-12, 10].map((sx, i) => {
      const ph = (t * 1.6 + seed * 0.37 + i * 0.5) % 1;
      return <path key={i} d={`M ${sx} ${-82 - ph * 50} q 10 -12 0 -24 q -10 -12 0 -24`} fill="none" stroke={C.muted} strokeWidth={4} strokeLinecap="round" opacity={Math.sin(ph * Math.PI) * 0.8} />;
    })}
  </g>
);

/** Fliperama com cubo 3D girando na tela. */
const Arcade: React.FC<{ t: number }> = ({ t }) => {
  const a = t * 2.4, b = t * 1.3;
  const V = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])));
  const P = V.map(([x, y, z]) => {
    const x1 = x * Math.cos(a) - z * Math.sin(a), z1 = x * Math.sin(a) + z * Math.cos(a);
    const y1 = y * Math.cos(b) - z1 * Math.sin(b);
    return [x1 * 38, y1 * 38];
  });
  const E: [number, number][] = [];
  V.forEach((p, i) => V.forEach((q, j) => { if (j > i && Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) === 2) E.push([i, j]); }));
  return (
    <g>
      <Box3D w={270} h={420} fill={C.accent} depth={22} rx={10} />
      <rect x={-135} y={-210} width={270} height={70} rx={8} fill={C.ink} stroke={C.ink} strokeWidth={SW} />
      <Txt y={-175} size={34} weight={900} color={C.highlight}>GAME</Txt>
      <rect x={-105} y={-125} width={210} height={170} rx={10} fill={C.ink} stroke={C.ink} strokeWidth={SW} />
      <g transform="translate(0 -40)">
        {E.map(([i, j], k) => <line key={k} x1={P[i][0]} y1={P[i][1]} x2={P[j][0]} y2={P[j][1]} stroke={C.positive} strokeWidth={4} strokeLinecap="round" />)}
      </g>
      <rect x={-120} y={70} width={240} height={60} rx={8} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
      <circle cx={-60} cy={100} r={14} fill={C.negative} stroke={C.ink} strokeWidth={3} />
      <circle cx={0} cy={100} r={14} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
      <rect x={50} y={92} width={30} height={16} rx={4} fill={C.ink} />
      <rect x={-60} y={150} width={120} height={14} rx={5} fill={C.ink} />
    </g>
  );
};

const Comp: React.FC<{ t: number }> = ({ t }) => {
  // moeda: gira e mostra 1993, depois sobe e vira o selo do letreiro
  const spin = prog(t, T_SPIN, 0.55, ease.inOut) * Math.PI * 3;
  const toSign = prog(t, T_DINER - 0.1, 0.4, ease.inOut);
  const [cx, cy] = arc(toSign, 540, 330, 250, SIGN.y, 80);
  const cr = lerp(90, 62, toSign);
  const yearPulse = t >= 14.5 && t < 14.85 ? 1 + 0.25 * Math.sin(((t - 14.5) / 0.35) * Math.PI) : 1;

  // lanchonete
  const signS = pop(t, T_DINER, 0.35);
  const counterY = t < T_DINER + 0.05 ? 800 : (1 - ease.back(clamp((t - T_DINER - 0.05) / 0.32))) * 340;
  const dinerOut = prog(t, 15.25, 0.35, ease.in);
  const neon = Math.sin(t * 22) > -0.6 ? 1 : 0.45;

  // fliperama + placa
  const arcS = pop(t, 15.3, 0.35);
  const gpuP = prog(t, T_GPU, 0.45, ease.back);
  const outP = prog(t, T_OUT, 0.25, ease.in);
  const center = prog(t, T_OUT, 0.28, ease.inOut);
  const gx = lerp(lerp(290, 760, gpuP), 540, center);
  const gy = lerp(lerp(330, 300, gpuP), 300, center);
  const gw = lerp(lerp(140, 400, gpuP), 420, center);
  const fan = t * 900;
  const ctlS = pop(t, T_GAME, 0.28) * (1 - outP);
  const gsq = squash(t, T_GPU + 0.45, 0.12);

  return (
    <g>
      {/* lanchonete */}
      {t >= T_DINER && dinerOut < 1 && (
        <G y={dinerOut * 260} o={1 - dinerOut}>
          <G x={SIGN.x} y={SIGN.y} s={signS}>
            <rect x={-300} y={-70} width={600} height={140} rx={24} fill={C.ink} stroke={C.ink} strokeWidth={SW} />
            <rect x={-284} y={-54} width={568} height={108} rx={16} fill="none" stroke={C.negative} strokeWidth={5} opacity={neon} />
            <Txt x={50} size={64} weight={900} color={C.highlight} ls={2}>LANCHONETE</Txt>
          </G>
          <g transform={`translate(0 ${counterY + shake(t, T_DINER + 0.37, 6, 0.25)})`}>
            <rect x={110} y={COUNTER_Y + 30} width={860} height={90} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
            <rect x={90} y={COUNTER_Y} width={900} height={36} rx={8} fill={C.warm} stroke={C.ink} strokeWidth={SW} />
            {[300, 540, 780].map((x, i) => t >= T_DINER + 0.1 + i * 0.1 && (
              <G key={x} x={x} y={COUNTER_Y + 150} s={pop(t, T_DINER + 0.1 + i * 0.1, 0.25)}><Stool /></G>
            ))}
            {T_MUGS.map((at, i) => t >= at && (
              <G key={i} x={380 + i * 160} y={COUNTER_Y + drop(t, at, 0.35, 170)}><Mug t={t} seed={i} /></G>
            ))}
            {t >= 15.0 && (
              <G x={860} y={COUNTER_Y - 150} s={pop(t, 15.0, 0.3)}>
                <rect x={-120} y={-30} width={240} height={60} rx={30} fill={C.ink} />
                <Txt size={30} color={C.paper} weight={800}>3 fundadores</Txt>
              </G>
            )}
          </g>
        </G>
      )}
      {/* moeda / selo 1993 */}
      {(t < 15.25 || dinerOut < 1) && (
        <G x={cx} y={cy + dinerOut * 260} s={yearPulse} o={1 - dinerOut}>
          <BigCoin r={cr} flip={spin} back="1993" />
        </G>
      )}
      {/* fliperama */}
      {arcS > 0 && outP < 1 && (
        <G x={290} y={390} s={arcS * 1.2 * (1 - outP)}><Arcade t={t} /></G>
      )}
      {/* placa de vídeo saindo do fliperama */}
      {t >= T_GPU && (
        <G x={gx} y={gy} sx={gsq[0]} sy={gsq[1]}>
          <Gpu w={gw} fan={fan} label="" />
        </G>
      )}
      {t >= T_GPU + 0.2 && outP < 1 && (
        <G x={760} y={470} s={pop(t, T_GPU + 0.2, 0.3) * (1 - outP)}>
          <rect x={-150} y={-30} width={300} height={60} rx={30} fill={C.ink} />
          <Txt size={30} color={C.paper} weight={800}>placa de vídeo</Txt>
        </G>
      )}
      {/* controle do game */}
      {ctlS > 0 && (
        <G x={700} y={620} s={ctlS} r={Math.sin((t - T_GAME) * 16) * 5}>
          <Controller w={260} />
          {Math.floor(t * 10) % 2 === 0 && <circle cx={52} cy={-20} r={12} fill={C.paper} opacity={0.9} />}
        </G>
      )}
    </g>
  );
};

const cues: Cue[] = [
  [T_SPIN, 'whoosh', 0.6], [13.1, 'tick', 0.5], [T_DINER, 'pop'], [T_DINER + 0.37, 'impact'],
  [T_DINER + 0.1, 'pop', 0.6], [T_DINER + 0.2, 'pop', 0.6], [T_DINER + 0.3, 'pop', 0.6],
  ...T_MUGS.map((a) => [a + 0.3, 'clink', 0.8] as Cue), [14.5, 'stamp', 0.6], [15.0, 'pop', 0.6],
  [15.25, 'whoosh', 0.6], [15.3, 'pop'], [T_GPU, 'powerup'], [T_GAME, 'boing'], [T_OUT, 'whoosh', 0.5],
];

export const S04: Scene = { id: 'S04', start: 12.75, end: 16.8, title: ["1993: TUDO", "COMEÇOU NO GAME"], Comp, cues, acts: [{ t: 13.65, act: 'up', d: 0.9 }, { t: 16.38, act: 'hop' }] };
