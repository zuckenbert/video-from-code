import React from 'react';
import { clamp, Cue, drop, ease, lerp, pop, prog, shake, squash } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { G, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';

// S01 "A empresa mais valiosa do mundo não tem uma única fábrica."

/** Chip da NVIDIA (contrato S01->S02 e S09->S10): centrado na origem, 300x300 na escala 1. */
export const NvChip: React.FC<{ glow?: number }> = ({ glow = 0 }) => (
  <g>
    {[0, 1, 2, 3].map((side) => (
      <g key={side} transform={`rotate(${side * 90})`}>
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x={-105 + i * 33} y={-178} width={14} height={36} rx={3} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
        ))}
      </g>
    ))}
    <rect x={-150} y={-150} width={300} height={300} rx={18} fill={C.ink} stroke={C.ink} strokeWidth={SW} />
    <rect x={-90} y={-90} width={180} height={180} rx={10} fill={C.positive} stroke={C.paper} strokeWidth={3} />
    {glow > 0 && <rect x={-90} y={-90} width={180} height={180} rx={10} fill={C.highlight} opacity={glow * 0.6} />}
    <Txt size={40} weight={900}>NVIDIA</Txt>
  </g>
);

const BASE = 610;
const NV_W = 170;
const NV_H = 470;
const GRAY = [
  { x: 170, h: 150, a: 0.0 },
  { x: 340, h: 220, a: 0.1 },
  { x: 740, h: 190, a: 0.3 },
  { x: 910, h: 130, a: 0.4 },
];
const FAC = { x: 830, y: 520, w: 280, h: 180 };
const T_FAC = 1.7, T_X = 2.29, T_BREAK = 2.55, T_MORPH = 2.88;

/** Barra de ranking ancorada no chão, com lateral roxa. */
const Bar: React.FC<{ x: number; w: number; h: number; fill: string; y0?: number }> = ({ x, w, h, fill, y0 = BASE }) => {
  if (h <= 1) return null;
  const top = y0 - h, r = x + w / 2, l = x - w / 2;
  return (
    <g>
      <path d={`M ${r} ${top} L ${r + 16} ${top - 10} L ${r + 16} ${y0 - 10} L ${r} ${y0} Z`} fill={C.accent} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <path d={`M ${l} ${top} L ${l + 16} ${top - 10} L ${r + 16} ${top - 10} L ${r} ${top} Z`} fill={C.ink} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      <rect x={l} y={top} width={w} height={h} fill={fill} stroke={C.ink} strokeWidth={SW} />
    </g>
  );
};

const Crown: React.FC = () => (
  <g>
    <path d="M -50 18 L -56 -26 L -28 -4 L 0 -38 L 28 -4 L 56 -26 L 50 18 Z" fill={C.highlight} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
    {[-28, 0, 28].map((x) => <circle key={x} cx={x} cy={6} r={6} fill={C.negative} stroke={C.ink} strokeWidth={2.5} />)}
  </g>
);

const Globe: React.FC<{ t: number }> = ({ t }) => {
  const r = 78;
  return (
    <g>
      <circle r={r} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
      <path d={`M ${-r * 0.5} ${-r * 0.35} q 20 -22 46 -6 q 18 14 -4 30 q -30 10 -42 -24 Z`} fill={C.positive} stroke={C.ink} strokeWidth={3} transform={`translate(${Math.sin(t * 2) * 24} 0)`} />
      <path d={`M ${r * 0.1} ${r * 0.2} q 22 -10 34 8 q 6 22 -22 24 q -20 -6 -12 -32 Z`} fill={C.positive} stroke={C.ink} strokeWidth={3} transform={`translate(${Math.sin(t * 2 + 1.5) * 24} 0)`} />
      {[0, 1, 2].map((k) => (
        <ellipse key={k} rx={Math.abs(Math.cos(t * 2.4 + k * 1.05)) * r} ry={r} fill="none" stroke={C.ink} strokeWidth={2.5} opacity={0.45} />
      ))}
      <line x1={-r} x2={r} y1={0} y2={0} stroke={C.ink} strokeWidth={2.5} opacity={0.45} />
    </g>
  );
};

const Factory: React.FC<{ t: number; on: boolean }> = ({ t, on }) => {
  const { w, h } = FAC;
  const teeth = 4, tw = w / teeth;
  return (
    <g>
      {/* chaminé e fumaça */}
      <rect x={w * 0.22} y={-h / 2 - 120} width={36} height={110} fill={C.line} stroke={C.ink} strokeWidth={SW} />
      {on && [0, 1, 2].map((k) => {
        const p = ((t * 0.9 + k / 3) % 1);
        return <circle key={k} cx={w * 0.22 + 18 + Math.sin(p * 6 + k) * 10} cy={-h / 2 - 130 - p * 110} r={14 + p * 18} fill={C.paper} stroke={C.ink} strokeWidth={3} opacity={1 - p} />;
      })}
      {/* telhado serrilhado */}
      {Array.from({ length: teeth }).map((_, i) => (
        <path key={i} d={`M ${-w / 2 + i * tw} ${-h / 2} L ${-w / 2 + i * tw} ${-h / 2 - 46} L ${-w / 2 + (i + 1) * tw} ${-h / 2} Z`} fill={C.warm} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      ))}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
      {[0, 1, 2].map((i) => <rect key={i} x={-w / 2 + 24 + i * 82} y={-h / 2 + 30} width={52} height={40} rx={4} fill={C.highlight} stroke={C.ink} strokeWidth={3} />)}
      <rect x={-34} y={h / 2 - 76} width={68} height={76} fill={C.ink} />
      <Txt y={h / 2 + 34} size={30}>fábrica</Txt>
    </g>
  );
};

const BRICKS = Array.from({ length: 12 }).map((_, i) => {
  const c = i % 4, r = Math.floor(i / 4);
  return { x: -FAC.w / 2 + 35 + c * 70, y: -FAC.h / 2 + 30 + r * 60, vx: (c - 1.5) * 160 + ((i * 37) % 50) - 25, rot: ((i * 53) % 90) - 45 };
});

const Comp: React.FC<{ t: number }> = ({ t }) => {
  const groundP = prog(t, 0.0, 0.3);
  const fadeEnd = 1 - prog(t, 2.78, 0.18);
  // barras cinza: brotam e saem em 1,55 pra dar lugar à fábrica
  const grayOut = 1 - prog(t, 1.5, 0.2, ease.in);
  // barra NVIDIA: brota baixa, dispara em "mais valiosa"
  const nvH = t < 0.2 ? 0 : lerp(170 * pop(t, 0.2, 0.3), NV_H, ease.back(clamp((t - 0.61) / 0.42)));
  const morph = prog(t, T_MORPH, 0.25, ease.inOut);
  const chipIn = prog(t, 3.02, 0.2, ease.back);
  const value = 5.16 * prog(t, 0.61, 0.62, ease.out);
  const crownY = BASE - NV_H - 26 + drop(t, 1.0, 0.4, 70);
  const [csx, csy] = squash(t, 1.16);
  const facY = drop(t, T_FAC, 0.42, 700);
  const [fsx, fsy] = squash(t, T_FAC + 0.28);
  const broken = t >= T_BREAK;
  const xP = clamp((t - T_X) / 0.12);
  const shk = shake(t, T_FAC + 0.28, 10) + shake(t, T_BREAK, 12);

  return (
    <g transform={`translate(${shk} 0)`}>
      {/* chão */}
      <line x1={80} x2={80 + 920 * groundP} y1={BASE} y2={BASE} stroke={C.ink} strokeWidth={SW} strokeLinecap="round" opacity={fadeEnd} />
      {/* globo "do mundo" */}
      {t >= 1.39 && (
        <G x={900} y={110} s={pop(t, 1.39, 0.3) * fadeEnd}>
          <Globe t={t} />
        </G>
      )}
      {/* barras cinza */}
      {GRAY.map((b, i) => t >= b.a && (
        <Bar key={i} x={b.x} w={110} h={b.h * pop(t, b.a, 0.3) * grayOut + Math.sin(t * 5 + i) * 3 * grayOut} fill={C.line} />
      ))}
      {/* barra NVIDIA que vira chip */}
      {t >= 0.2 && t < 3.16 && (morph <= 0 ? (
        <Bar x={540} w={NV_W} h={nvH} fill={C.positive} />
      ) : (
        <rect x={lerp(540 - NV_W / 2, 390, morph)} y={lerp(BASE - NV_H, 210, morph)} width={lerp(NV_W, 300, morph)} height={lerp(NV_H, 300, morph)}
          rx={lerp(2, 18, morph)} fill={morph < 0.5 ? C.positive : C.ink} stroke={C.ink} strokeWidth={SW} opacity={1 - prog(t, 3.06, 0.1)} />
      ))}
      {t >= 0.2 && t < T_MORPH && <Txt x={540} y={BASE - 34} size={30} weight={900} color={C.ink}>NVIDIA</Txt>}
      {/* coroa */}
      {t >= 1.0 && (
        <G x={540} y={crownY} sx={csx} sy={csy} o={fadeEnd} r={Math.sin(t * 4) * 3}>
          <Crown />
        </G>
      )}
      {/* contador de valor de mercado */}
      {t >= 0.61 && (
        <G x={255} y={190} o={clamp((t - 0.61) / 0.1) * fadeEnd} s={1 + 0.06 * Math.sin(clamp((t - 1.2) / 0.25) * Math.PI)}>
          <Txt size={58} weight={900}>{`US$ ${value.toFixed(2).replace('.', ',')} TRI`}</Txt>
          <Txt y={46} size={28} color={C.muted}>valor de mercado</Txt>
        </G>
      )}
      {/* fábrica que cai e desmonta */}
      {t >= T_FAC && !broken && (
        <G x={FAC.x} y={FAC.y + facY} sx={fsx} sy={fsy}>
          <Factory t={t} on={true} />
        </G>
      )}
      {broken && BRICKS.map((b, i) => {
        const dt = t - T_BREAK;
        const o = 1 - clamp(dt / 0.4);
        if (o <= 0) return null;
        return (
          <rect key={i} x={FAC.x + b.x + b.vx * dt - 30} y={FAC.y + b.y - 300 * dt + 1400 * dt * dt - 25} width={60} height={50} rx={4}
            fill={i % 3 === 0 ? C.warm : C.paper} stroke={C.ink} strokeWidth={4} opacity={o}
            transform={`rotate(${b.rot * dt * 4} ${FAC.x + b.x + b.vx * dt} ${FAC.y + b.y - 300 * dt + 1400 * dt * dt})`} />
        );
      })}
      {/* X vermelho carimbado */}
      {t >= T_X && t < T_BREAK + 0.3 && (
        <G x={FAC.x} y={FAC.y - 40} s={lerp(1.7, 1, ease.out(xP))} o={clamp(xP * 3) * (1 - prog(t, T_BREAK, 0.25))} r={-6}>
          <line x1={-130} y1={-130} x2={130} y2={130} stroke={C.negative} strokeWidth={30} strokeLinecap="round" />
          <line x1={130} y1={-130} x2={-130} y2={130} stroke={C.negative} strokeWidth={30} strokeLinecap="round" />
        </G>
      )}
      {/* chip final: contrato da S02 */}
      {t >= 3.02 && (
        <G x={540} y={360} s={lerp(0.85, 1, chipIn)} o={clamp((t - 3.02) / 0.08)}>
          <NvChip />
        </G>
      )}
    </g>
  );
};

const cues: Cue[] = [
  [0.0, 'pop', 0.7], [0.1, 'pop', 0.7], [0.2, 'pop', 0.8], [0.3, 'pop', 0.7], [0.4, 'pop', 0.7],
  [0.61, 'whoosh'], [0.61, 'ticker', 0.5], [1.16, 'ding', 0.7], [1.39, 'tick'],
  [1.5, 'whoosh', 0.4], [T_FAC + 0.28, 'impact'], [T_X, 'stamp'], [T_BREAK, 'crack'], [T_MORPH, 'whoosh'], [3.05, 'pop', 0.7],
];

export const S01: Scene = { id: 'S01', start: 0, end: 3.3, title: ["5 TRILHÕES E", "ZERO FÁBRICAS"], Comp, cues, acts: [{ t: 0.65, act: 'up', d: 0.9 }, { t: 2.3, act: 'point', d: 0.8 }] };
