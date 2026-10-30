import React from 'react';
import { arc, clamp, Cue, ease, lerp, pop, prog, shake } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { Building, Coin, G, Person, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';
import { NvChip } from './S01_Hook';
import { BLD, CHIP_TOP, CUST, LABEL_Y } from './S09_Risco';

// S10 "Na corrida do ouro da IA, a NVIDIA não cava. Ela vende a pá." + implosão (o personagem fecha o loop)

const GROUND = BLD.y + BLD.h / 2;
const SAND = C.sand;
const SHOP = { x: 540, y: 200, s: 0.66 };
const SPOT = [-235, -165, 200]; // pás à venda, fora da frente do chip
const SELL = [53.86, 54.02, 54.18];
const PAY = [54.4, 54.48, 54.56, 54.64, 54.72, 54.8];
const T_IMPLODE = 54.95;
const T_EMPTY = 55.25;

/** Pá: cabo com pega em T; lâmina comum (cinza) ou lâmina-GPU (verde com pinos). Ponta para baixo. */
const Shovel: React.FC<{ gpu?: boolean }> = ({ gpu = false }) => (
  <g>
    <rect x={-5} y={-95} width={10} height={130} fill={C.warm} stroke={C.ink} strokeWidth={3.5} />
    <rect x={-22} y={-104} width={44} height={14} rx={6} fill={C.warm} stroke={C.ink} strokeWidth={3.5} />
    <path d="M -30 30 L 30 30 L 30 70 Q 0 104 -30 70 Z" fill={gpu ? C.positive : C.line} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
    {gpu && (
      <g>
        <rect x={-13} y={40} width={26} height={22} rx={3} fill={C.ink} />
        {[-8, 0, 8].map((v) => <line key={v} x1={v} x2={v} y1={36} y2={66} stroke={C.highlight} strokeWidth={2.5} />)}
      </g>
    )}
  </g>
);

const Nugget: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`scale(${s})`}>
    <path d="M -16 4 L -8 -12 L 8 -14 L 18 0 L 10 12 L -10 13 Z" fill={C.highlight} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
    <path d="M -6 -6 L 2 -8" stroke={C.paper} strokeWidth={3} strokeLinecap="round" />
  </g>
);

const Spark: React.FC<{ s: number }> = ({ s }) => (
  <path transform={`scale(${s})`} d="M 0 -14 L 3 -3 L 14 0 L 3 3 L 0 14 L -3 3 L -14 0 L -3 -3 Z" fill={C.paper} stroke={C.ink} strokeWidth={2} />
);

const NUGGETS = CUST.flatMap((c, i) => [
  { x: c.x - 62, y: GROUND + 34, at: 51.62 + i * 0.05 },
  { x: c.x + 66, y: GROUND + 50, at: 51.74 + i * 0.04 },
  { x: c.x + 4, y: GROUND + 66, at: 51.84 + i * 0.04 },
]);

const Comp: React.FC<{ t: number }> = ({ t }) => {
  if (t >= T_EMPTY) return null;
  // prédios afundam e o chão de areia se desenha ("corrida")
  const sink = prog(t, 50.96, 0.3, ease.in);
  const groundP = prog(t, 51.0, 0.35);
  // chip vira loja ("a NVIDIA")
  const shopP = prog(t, 52.48, 0.35, ease.back);
  const cx = lerp(CHIP_TOP.x, SHOP.x, shopP), cy = lerp(CHIP_TOP.y, SHOP.y, shopP), csc = lerp(CHIP_TOP.s, SHOP.s, shopP);
  const awning = pop(t, 52.6, 0.3);
  const counter = pop(t, 52.85, 0.28);
  const implode = prog(t, T_IMPLODE, T_EMPTY - T_IMPLODE - 0.02, ease.in);
  const shk = shake(t, 53.31, 6, 0.25);

  return (
    <g transform={`translate(${shk} 0)`}>
      <g transform={`translate(540 400) rotate(${implode * 25}) scale(${1 - implode}) translate(-540 -400)`}>
        {/* chão de areia com ouro */}
        {groundP > 0 && <rect x={60} y={GROUND} width={960 * groundP} height={90} fill={SAND} />}
        {groundP > 0 && <line x1={40} x2={40 + 1000 * groundP} y1={GROUND} y2={GROUND} stroke={C.ink} strokeWidth={SW} strokeLinecap="round" />}
        {NUGGETS.map((n, k) => {
          const s = pop(t, n.at, 0.25);
          if (s <= 0) return null;
          const sold = SELL[k % 3] + 0.4;
          const hop = t > sold ? Math.abs(Math.sin((t - sold) * 9 + k)) * 30 : 0;
          return (
            <g key={k}>
              <G x={n.x} y={n.y - hop} s={s * 1.3}><Nugget /></G>
              <G x={n.x + 18} y={n.y - 22 - hop} s={s * (0.5 + 0.5 * Math.abs(Math.sin(t * 6 + k)))}><Spark s={0.9} /></G>
            </g>
          );
        })}
        {/* prédios afundam e viram mineiros cavando com a mão */}
        {CUST.map((c, i) => {
          const minerIn = pop(t, 51.13 + i * 0.08, 0.3);
          const hasShovel = t >= SELL[i] + 0.38;
          const digPhase = hasShovel ? (t - SELL[i]) * 14 : (t - 51.4 - i * 0.3) * 7;
          const digging = t > 51.48 + i * 0.12;
          const lean = digging ? Math.max(0, Math.sin(digPhase)) * (hasShovel ? 22 : 14) : 0;
          return (
            <g key={c.label}>
              {sink < 1 && (
                <g transform={`translate(${c.x} ${GROUND}) scale(${1 + sink * 0.1} ${1 - sink}) translate(0 ${-BLD.h / 2})`}>
                  <Building w={BLD.w} h={BLD.h} lit={1} cols={3} rows={4} />
                </g>
              )}
              {minerIn > 0 && (
                <g transform={`translate(${c.x} ${GROUND - 70}) rotate(${lean} 0 70)`}>
                  <G s={minerIn * 3.7}><Person fill={[C.accent, C.positive, C.warm][i]} hat /></G>
                  {hasShovel && <G x={64} y={12} r={-25 + lean * 1.6}><Shovel gpu /></G>}
                </g>
              )}
              {/* terra voando quando cava */}
              {digging && [0, 1, 2].map((d) => {
                const ph = ((t * (hasShovel ? 3.2 : 2.2) + d / 3 + i * 0.27) % 1);
                const dir = d % 2 ? 1 : -1;
                return <circle key={d} cx={c.x + 50 * dir + ph * 70 * dir} cy={GROUND - Math.sin(ph * Math.PI) * (hasShovel ? 110 : 60)} r={9 * (1 - ph * 0.5)} fill={SAND} stroke={C.ink} strokeWidth={2.5} />;
              })}
              <G x={c.x} y={lerp(LABEL_Y, GROUND + 122, prog(t, 50.96, 0.3, ease.back))}>
                <Txt size={34} weight={900}>{c.label}</Txt>
              </G>
            </g>
          );
        })}
        {/* chip vira loja: toldo + balcão */}
        {awning > 0 && (
          <G x={cx} y={cy - 150 * csc - 30} s={awning}>
            <path d="M -190 0 L 190 0 L 210 50 L -210 50 Z" fill={C.paper} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
            {[0, 1, 2, 3, 4, 5].map((k) => (
              <path key={k} d={`M ${-190 + k * 63.3} 0 L ${-190 + k * 63.3 + 31.6} 0 L ${-210 + k * 70 + 35} 50 L ${-210 + k * 70} 50 Z`} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
            ))}
            {[0, 1, 2, 3, 4, 5].map((k) => <path key={`s${k}`} d={`M ${-210 + k * 70} 50 q 35 30 70 0`} fill={k % 2 ? C.highlight : C.paper} stroke={C.ink} strokeWidth={3} />)}
          </G>
        )}
        <G x={cx} y={cy} s={csc * (1 + (t > 54.4 ? 0.05 * Math.abs(Math.sin((t - 54.4) * 12)) : 0))}><NvChip glow={t > 54.4 ? 0.6 : 0} /></G>
        {counter > 0 && (
          <G x={cx} y={cy + 150 * csc + 24} s={counter}>
            <rect x={-300} y={-16} width={600} height={32} rx={6} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
            {SELL.map((s, k) => (t < s ? <G key={k} x={SPOT[k]} y={-62} s={0.6} r={-12 + k * 12 + Math.sin(t * 5 + k) * 4}><Shovel gpu /></G> : null))}
          </G>
        )}
        {/* a NVIDIA não cava: pá própria riscada */}
        {t >= 53.15 && (
          <G x={915} y={190} s={pop(t, 53.15, 0.22) * 0.9} r={10}>
            <Shovel />
            {t >= 53.31 && (
              <G s={lerp(1.8, 1, ease.out(clamp((t - 53.31) / 0.14)))} o={clamp((t - 53.31) / 0.06)}>
                <line x1={-60} y1={-60} x2={60} y2={80} stroke={C.negative} strokeWidth={18} strokeLinecap="round" />
                <line x1={60} y1={-60} x2={-60} y2={80} stroke={C.negative} strokeWidth={18} strokeLinecap="round" />
              </G>
            )}
          </G>
        )}
        {/* vende a pá: pás-GPU voam do balcão para cada mineiro */}
        {SELL.map((s, k) => {
          const p = clamp((t - s) / 0.38);
          if (t < s || p >= 1) return null;
          const [x, y] = arc(ease.inOut(p), SHOP.x + SPOT[k], SHOP.y + 60, CUST[k].x + 64, GROUND - 58, 170);
          return <G key={k} x={x} y={y} r={p * 360 - 25} s={0.9}><Shovel gpu /></G>;
        })}
        {/* dinheiro volta para a loja */}
        {PAY.map((c, k) => {
          const p = clamp((t - c) / 0.36);
          if (t < c || p >= 1) return null;
          const [x, y] = arc(ease.inOut(p), CUST[k % 3].x, GROUND - 170, SHOP.x, SHOP.y + 30, 140);
          return <G key={k} x={x} y={y}><Coin flip={t * 16} /></G>;
        })}
      </g>
    </g>
  );
};

const cues: Cue[] = [
  [50.96, 'whoosh', 0.5], [51.13, 'pop'], [51.21, 'pop', 0.8], [51.29, 'pop', 0.8],
  [51.48, 'dig'], [51.62, 'tick', 0.7], [51.74, 'ding', 0.35], [51.85, 'dig', 0.8], [52.2, 'dig', 0.8],
  [52.48, 'pop'], [52.6, 'whoosh', 0.4], [52.85, 'click'], [53.15, 'pop', 0.8], [53.31, 'stamp'],
  ...SELL.map((s) => [s, 'whoosh', 0.5] as Cue), ...SELL.map((s) => [s + 0.36, 'cash', 0.8] as Cue),
  [54.5, 'dig', 0.7], [54.56, 'coin', 0.6], [54.75, 'coin', 0.6],
  [T_IMPLODE, 'whoosh', 0.7],
];

export const S10: Scene = { id: 'S10', start: 50.8, end: 56.94, title: ["A PÁ DA", "CORRIDA DO OURO"], Comp, cues, acts: [{ t: 51.6, act: 'up', d: 0.8 }, { t: 54.2, act: 'nod' }] };
