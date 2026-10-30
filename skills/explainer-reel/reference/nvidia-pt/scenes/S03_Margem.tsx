import React from 'react';
import { arc, clamp, Cue, ease, lerp, pop, prog, shake } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { Coin, G, Gpu, Stamp, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';

// S03 "E de cada cem dólares que ela vende, setenta e um sobram depois de pagar a fabricação."
const COL_X = (c: number) => 120 + c * 76;
const BASE = 660;
const STEP = 13;
const T_TAG = 7.78, T_RAIN = 8.64, T_SOLD = 9.6, T_SPLIT = 10.1, T_TRUCK = 11.16, T_STAMP = 11.9, T_MERGE = 12.3;
const TRUCK = { x: 975, y: 590 };
// moeda k em ordem coluna a coluna (k < 71 = margem)
const COINS = Array.from({ length: 100 }).map((_, k) => {
  const col = Math.floor(k / 10), row = k % 10;
  const rain = row * 10 + col; // chove em linhas atravessando as colunas
  return { k, col, row, x: COL_X(col), y: BASE - row * STEP, land: T_RAIN + rain * 0.0095 };
});
const GRAY = COINS.filter((c) => c.k >= 71);

/** Moeda de lado (empilhável). */
const FlatCoin: React.FC<{ fill: string }> = ({ fill }) => (
  <g>
    <ellipse cy={4} rx={32} ry={10} fill={C.ink} />
    <rect x={-32} y={-4} width={64} height={8} fill={fill} />
    <ellipse cy={-4} rx={32} ry={10} fill={fill} stroke={C.ink} strokeWidth={3} />
    <ellipse cy={-4} rx={18} ry={5} fill="none" stroke={C.ink} strokeWidth={1.5} opacity={0.4} />
  </g>
);

const Truck: React.FC<{ t: number; load: number }> = ({ t, load }) => (
  <g>
    <rect x={-120} y={-60} width={170} height={80} rx={6} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
    {load > 0 && <ellipse cx={-35} cy={-60} rx={75 * load} ry={26 * load} fill={C.line} stroke={C.ink} strokeWidth={3} />}
    <Txt x={-35} y={-18} size={30} weight={900} color={C.paper} ls={1}>TSMC</Txt>
    <path d="M 50 -40 L 92 -40 L 112 -6 L 112 20 L 50 20 Z" fill={C.paper} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
    <rect x={62} y={-32} width={32} height={22} rx={3} fill={C.positive} stroke={C.ink} strokeWidth={3} />
    {[-80, 70].map((x) => (
      <g key={x} transform={`translate(${x} 26) rotate(${-t * 900})`}>
        <circle r={20} fill={C.ink} />
        <line x1={-12} x2={12} y1={0} y2={0} stroke={C.paper} strokeWidth={3} />
      </g>
    ))}
  </g>
);

const Comp: React.FC<{ t: number }> = ({ t }) => {
  const fan = t * 720;
  // Gpu sobe pro topo com etiqueta; sai voando em "vende"
  const up = prog(t, T_TAG, 0.4, ease.inOut);
  const sold = prog(t, T_SOLD, 0.4, ease.in);
  const gx = lerp(540, 540, up) + sold * 800, gy = lerp(330, 160, up), gs = lerp(1, 0.7, up);
  const tagOn = t >= T_TAG;
  const swing = tagOn ? 22 * Math.sin((t - T_TAG) * 9) * Math.exp(-(t - T_TAG) * 2.2) : 0;
  const landed = COINS.filter((c) => t >= c.land + 0.2).length;
  const counterO = clamp((t - T_RAIN) / 0.1) * (1 - prog(t, T_SPLIT, 0.15));
  const truckIn = prog(t, T_TRUCK, 0.3, ease.out);
  const truckOut = prog(t, 11.85, 0.4, ease.in);
  const tx = lerp(1350, TRUCK.x, truckIn) + truckOut * 450;
  const jumps = GRAY.map((c, j) => T_TRUCK + 0.3 + j * 0.012);
  const load = clamp(jumps.filter((a) => t >= a + 0.25).length / GRAY.length);
  const mergeOut = prog(t, T_MERGE - 0.05, 0.15);
  const big = prog(t, T_MERGE + 0.15, 0.3, ease.back);
  const shk = shake(t, T_STAMP, 8) + shake(t, T_MERGE + 0.2, 6);

  return (
    <g transform={`translate(${shk} 0)`}>
      {/* chão das pilhas */}
      {t >= T_RAIN - 0.1 && t < T_MERGE + 0.3 && (
        <line x1={70} x2={70 + 790 * prog(t, T_RAIN - 0.1, 0.2)} y1={BASE + 14} y2={BASE + 14} stroke={C.ink} strokeWidth={SW} strokeLinecap="round" opacity={1 - mergeOut} />
      )}
      {/* 100 moedas: chovem, dividem, 29 vão pro caminhão, 71 viram uma moeda grande */}
      {COINS.map((c) => {
        if (t < c.land) return null;
        const fall = clamp((t - c.land) / 0.2);
        let x = c.x, y = lerp(130, c.y, ease.in(fall));
        const isGray = c.k >= 71;
        const turn = isGray ? T_SPLIT : T_SPLIT + c.k * 0.004;
        const fill = t >= turn ? (isGray ? C.line : C.positive) : C.highlight;
        let s = 1, o = 1;
        if (isGray) {
          const a = jumps[c.k - 71];
          if (t >= a) {
            const p = clamp((t - a) / 0.25);
            if (p >= 1) return null;
            [x, y] = arc(ease.inOut(p), c.x, c.y, tx - 35, TRUCK.y - 70, 160);
            s = lerp(1, 0.6, p);
          }
        } else if (t >= T_MERGE) {
          const p = clamp((t - T_MERGE - c.k * 0.002) / 0.25);
          if (p >= 1) return null;
          x = lerp(c.x, 540, ease.in(p)); y = lerp(c.y, 330, ease.in(p)); s = lerp(1, 0.3, p);
        }
        const bump = fall >= 1 && t < turn + 0.25 && t >= turn ? Math.sin(((t - turn) / 0.25) * Math.PI) * 6 : 0;
        return <G key={c.k} x={x} y={y - bump} s={s} o={o}><FlatCoin fill={fill} /></G>;
      })}
      {/* Gpu vendida, com etiqueta de preço */}
      {sold < 1 && (
        <G x={gx} y={gy} s={gs} r={sold * 20}>
          <Gpu w={360} fan={fan} />
          {tagOn && (
            <g transform={`translate(0 ${83}) rotate(${swing})`} opacity={clamp((t - T_TAG) / 0.08)}>
              <line x1={0} y1={0} x2={0} y2={60} stroke={C.ink} strokeWidth={4} />
              <path d="M -95 60 L 75 60 L 100 95 L 75 130 L -95 130 Z" fill={C.highlight} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
              <circle cx={-72} cy={95} r={8} fill={C.paper} stroke={C.ink} strokeWidth={3} />
              <Txt x={10} y={95} size={46} weight={900}>US$ 100</Txt>
            </g>
          )}
        </G>
      )}
      {/* contador da chuva */}
      {counterO > 0 && (
        <G x={540} y={430} o={counterO} s={1 + (landed >= 100 ? 0.08 * Math.sin(clamp((t - 9.6) / 0.25) * Math.PI) : 0)}>
          <Txt size={72} weight={900}>{`US$ ${landed}`}</Txt>
        </G>
      )}
      {/* rótulos 71 / 29 */}
      {t >= T_SPLIT && t < T_MERGE + 0.2 && (
        <g opacity={1 - mergeOut}>
          <G x={COL_X(3)} y={470} s={pop(t, T_SPLIT, 0.3)}>
            <Txt size={84} weight={900} color={C.positiveDark}>71</Txt>
          </G>
          {t < 11.4 && (
            <G x={COL_X(8)} y={470} s={pop(t, T_SPLIT + 0.1, 0.3) * (1 - prog(t, 11.3, 0.1))}>
              <Txt size={64} weight={900} color={C.muted}>29</Txt>
            </G>
          )}
        </g>
      )}
      {/* caminhão da TSMC leva os 29 */}
      {t >= T_TRUCK && truckOut < 1 && (
        <G x={tx} y={TRUCK.y} r={Math.sin(t * 30) * 1.2}>
          <Truck t={t} load={load} />
        </G>
      )}
      {t >= T_TRUCK + 0.3 && t < 11.85 && (
        <G x={TRUCK.x - 35} y={TRUCK.y + 95} o={clamp((t - T_TRUCK - 0.3) / 0.1)}>
          <Txt size={30} color={C.muted}>fabricação</Txt>
        </G>
      )}
      {/* carimbo da margem */}
      {t >= T_STAMP && t < T_MERGE + 0.2 && (
        <G x={COL_X(3)} y={360} s={lerp(1.8, 1, ease.out(clamp((t - T_STAMP) / 0.12)))} o={clamp((t - T_STAMP) / 0.05) * (1 - mergeOut)}>
          <Stamp text="MARGEM 71%" w={360} color={C.positiveDark} size={46} />
        </G>
      )}
      {/* moeda grande: contrato da S04 */}
      {t >= T_MERGE + 0.15 && (
        <G x={540} y={330} s={big}>
          <Coin r={90} flip={0} />
        </G>
      )}
    </g>
  );
};

const cues: Cue[] = [
  [T_TAG, 'click'], [T_RAIN, 'ticker', 0.6], [8.7, 'coin', 0.6], [9.05, 'coin', 0.6], [9.45, 'coin', 0.6],
  [T_SOLD, 'whoosh'], [T_SPLIT, 'ding'], [T_TRUCK, 'whoosh', 0.7], [11.48, 'coin', 0.8], [11.62, 'coin', 0.8], [11.76, 'coin', 0.8],
  [11.85, 'whoosh', 0.6], [T_STAMP, 'stamp'], [T_MERGE, 'whoosh'], [T_MERGE + 0.4, 'pop'],
];

export const S03: Scene = { id: 'S03', start: 7.65, end: 12.75, title: ["DE CADA US$ 100,", "SOBRAM US$ 71"], Comp, cues, acts: [{ t: 10.1, act: 'point', d: 1.0 }, { t: 11.9, act: 'flinch' }] };
