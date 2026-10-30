import React from 'react';
import { clamp, Cue, ease, lerp, pop, prog, shake } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { Coin, G, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';

// S08 "No último ano: duzentos e dezesseis bilhões de receita. Mais da metade virou lucro."
// Começa na barra vazia (contrato S07 -> S08) e termina no bloco de lucro (contrato S08 -> S09).
const rnd = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
const BAR = { x: 110, y: 365, w: 860, h: 110 };
const CUT = BAR.x + BAR.w * (120.067 / 215.938); // 55,6% = lucro líquido / receita
const T_CAL = 38.07, T_COUNT = 39.14, T_SLAM = 40.77, T_SC = 41.68, T_CUT = 41.9, T_LUCRO = 42.46, T_MORPH = 42.75;
const brl = (v: number) => `US$ ${v.toFixed(1).replace('.', ',')} bi`;
const MESES = ['FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ', 'JAN'];

export const Scissors: React.FC<{ open: number }> = ({ open }) => (
  <g>
    {[1, -1].map((d) => (
      <g key={d} transform={`rotate(${d * open * 22})`}>
        <path d={`M -110 ${-d * 4} Q -50 ${-d * 22} 10 ${d * 2} L -100 ${d * 10} Z`} fill={C.paper} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
        <circle cx={38} cy={d * 22} r={22} fill="none" stroke={C.warm} strokeWidth={9} />
      </g>
    ))}
    <circle r={6} fill={C.ink} />
  </g>
);

/** Calendário do ano fiscal: as folhas viram mês a mês. */
const Calendar: React.FC<{ t: number }> = ({ t }) => {
  const k = Math.min(11, Math.floor(clamp((t - (T_CAL + 0.1)) / 0.07, 0, 11.99)));
  const flipP = ((t - (T_CAL + 0.1)) / 0.07) % 1;
  const turning = t > T_CAL + 0.1 && k < 11;
  return (
    <g>
      <rect x={-130} y={-95} width={260} height={190} rx={14} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
      <rect x={-130} y={-95} width={260} height={56} rx={14} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
      {[-70, 70].map((x) => <rect key={x} x={x - 7} y={-112} width={14} height={34} rx={6} fill={C.ink} />)}
      <Txt y={-67} size={30} color={C.paper} weight={900} ls={1}>FY2026</Txt>
      <Txt y={22} size={64} weight={900} ls={-2}>{MESES[k]}</Txt>
      {turning && (
        <g transform={`translate(0 -39) scale(1 ${Math.max(0, Math.cos(flipP * Math.PI))})`}>
          <rect x={-128} y={0} width={256} height={132} fill={C.paper} stroke={C.ink} strokeWidth={3} opacity={0.9} />
        </g>
      )}
    </g>
  );
};

const Comp: React.FC<{ t: number }> = ({ t }) => {
  const v = 215.9 * prog(t, T_COUNT, T_SLAM - T_COUNT, ease.out);
  const numIn = pop(t, T_COUNT - 0.05, 0.25);
  const slam = t >= T_SLAM ? 1 + 0.12 * Math.max(0, 1 - (t - T_SLAM) / 0.2) : 1;
  const numOut = prog(t, 42.4, 0.35, ease.in);
  const fillW = BAR.w * (t < T_SLAM ? 0.9 * (v / 215.9) : lerp(0.9, 1, prog(t, T_SLAM, 0.2, ease.back)));
  const flash = t >= T_SLAM ? Math.max(0, 1 - (t - T_SLAM) / 0.3) : 0;

  // calendário entra, folheia o ano e vira bica de moedas
  const calIn = pop(t, T_CAL, 0.25);
  const calOut = prog(t, 38.95, 0.22, ease.in);

  // corte e separação
  const scP = prog(t, T_SC, 0.2, ease.out);
  const scOut = prog(t, 42.1, 0.25, ease.in);
  const scOpen = 0.6 + 0.4 * Math.sin(t * 40);
  const apart = prog(t, 41.96, 0.2, ease.out) * 14;
  const green = prog(t, T_LUCRO, 0.15);
  const fallP = clamp((t - T_LUCRO) / 0.5);
  const morph = prog(t, T_MORPH, 0.4, ease.inOut);
  const rise = Math.sin(prog(t, T_LUCRO, 0.3) * Math.PI) * -24 * (1 - morph);

  // pedaço do lucro: de [BAR.x, CUT] até o bloco-contrato (540, 420, 300 x 110)
  const lw = lerp(CUT - BAR.x, 300, morph), lh = BAR.h;
  const lcx = lerp((BAR.x + CUT) / 2 - apart, 540, morph);
  const lcy = 420 + rise;
  const cut = t >= T_CUT;
  const fx = (n: number) => -BAR.w / 2 + n;

  return (
    <G x={shake(t, T_SLAM, 7)}>
      {/* calendário do ano fiscal */}
      {t >= T_CAL && calOut < 1 && (
        <G x={540} y={185 + calOut * -40} s={1.55 * calIn * (1 - calOut)} r={Math.sin(t * 9) * 2}>
          <Calendar t={t} />
        </G>
      )}
      {/* chuva de moedas enchendo a barra enquanto o contador sobe */}
      {Array.from({ length: 22 }).map((_, i) => {
        const t0 = 39.0 + i * 0.075, dt = t - t0;
        const x = BAR.x + 30 + rnd(i + 40) * (BAR.w * 0.9 * Math.min(1, (i + 3) / 22) - 60);
        const y = 60 + 0.5 * 3200 * dt * dt;
        if (dt < 0 || y > BAR.y - 6) return null;
        return <G key={i} x={x} y={y} s={pop(t, t0, 0.12)}><Coin r={20} flip={t * 16 + i} /></G>;
      })}

      {/* barra de receita */}
      {!cut && (
        <G x={BAR.x + BAR.w / 2} y={BAR.y + BAR.h / 2}>
          <rect x={-BAR.w / 2} y={-BAR.h / 2} width={BAR.w} height={BAR.h} rx={10} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
          {fillW > 1 && <rect x={-BAR.w / 2} y={-BAR.h / 2} width={fillW} height={BAR.h} rx={10} fill={C.highlight} stroke={C.ink} strokeWidth={SW} />}
          {flash > 0 && <rect x={-BAR.w / 2} y={-BAR.h / 2} width={fillW} height={BAR.h} rx={10} fill={C.paper} opacity={flash * 0.8} />}
          {[41.0, 41.35].map((s0) => {
            const p = clamp((t - s0) / 0.4);
            return p > 0 && p < 1 ? <rect key={s0} x={fx(p * BAR.w - 40)} y={-BAR.h / 2 + 5} width={36} height={BAR.h - 10} fill={C.paper} opacity={0.7} transform="skewX(-20)" /> : null;
          })}
          {t >= T_SLAM && <Txt x={fx(30)} y={2} size={40} anchor="start" weight={900}>receita</Txt>}
          {t >= T_SC && <line x1={CUT - 540} x2={CUT - 540} y1={-BAR.h / 2 - 30} y2={BAR.h / 2 + 30} stroke={C.ink} strokeWidth={3} strokeDasharray="8 8" opacity={scP} />}
        </G>
      )}
      {/* moedas assentando em cima da barra durante a pausa do número */}
      {t >= 40.6 && t < T_CUT && [0.1, 0.27, 0.44, 0.62, 0.8].map((f, i) => {
        const land = 40.6 + i * 0.12;
        const dy = t < land + 0.4 ? -Math.abs(Math.sin((t - land) * 12)) * 30 * Math.max(0, 1 - (t - land) / 0.4) : 0;
        return <G key={i} x={BAR.x + BAR.w * f} y={BAR.y - 22 + dy} s={pop(t, land, 0.2)}><Coin r={20} flip={i} /></G>;
      })}

      {/* depois do corte: pedaço do lucro e o resto que cai */}
      {cut && (
        <g>
          {fallP < 1 && (
            <G x={(CUT + BAR.x + BAR.w) / 2 + apart} y={420 + (t > T_LUCRO ? 0.5 * 2600 * Math.pow(t - T_LUCRO, 2) : 0)} r={fallP * 18} o={1 - fallP}>
              <rect x={-(BAR.x + BAR.w - CUT) / 2} y={-BAR.h / 2} width={BAR.x + BAR.w - CUT} height={BAR.h} rx={10} fill={t >= T_LUCRO ? C.line : C.highlight} stroke={C.ink} strokeWidth={SW} />
              <Txt size={30} color={C.muted} weight={800}>custos e impostos</Txt>
            </G>
          )}
          <G x={lcx} y={lcy}>
            <rect x={-lw / 2} y={-lh / 2} width={lw} height={lh} rx={8} fill={green >= 1 ? C.positive : C.highlight} stroke={C.ink} strokeWidth={SW} />
            {green > 0 && green < 1 && <rect x={-lw / 2} y={-lh / 2} width={lw * green} height={lh} rx={8} fill={C.positive} stroke={C.ink} strokeWidth={SW} />}
            {t < T_LUCRO ? (
              <Txt x={-lw / 2 + 30} y={2} size={40} anchor="start" weight={900}>receita</Txt>
            ) : (
              <G s={pop(t, T_LUCRO, 0.25)}><Txt size={44} weight={900}>US$ 120 bi</Txt></G>
            )}
          </G>
          {t >= 42.55 && <G x={lcx} y={300} s={pop(t, 42.55, 0.25) * (1 - prog(t, 42.95, 0.2, ease.in))}><Txt size={42} weight={900} color={C.positiveDark}>lucro: 56%</Txt></G>}
        </g>
      )}

      {/* tesoura */}
      {t >= T_SC && scOut < 1 && (
        <G x={lerp(1250, CUT + 110, scP)} y={lerp(420, 200, scOut)} r={-90 * scOut} o={1 - scOut}>
          <G s={1.7}><Scissors open={t < T_CUT ? scOpen : 0} /></G>
        </G>
      )}

      {/* contador */}
      {t >= T_COUNT - 0.05 && numOut < 1 && (
        <G x={540} y={190 - numOut * 140 + (t > T_SLAM + 0.2 ? Math.sin(t * 3) * 3 : 0)} s={numIn * slam * (1 - numOut)}>
          <Txt size={120} weight={900} ls={-5}>{brl(v)}</Txt>
          <G y={88} o={prog(t, 39.5, 0.3)}><Txt size={30} weight={700} color={C.muted}>receita · ano fiscal 2026</Txt></G>
        </G>
      )}
      {t >= 41.05 && t < 41.85 && (
        <G x={860} y={60} r={-6} s={pop(t, 41.05) * (1 - prog(t, 41.68, 0.15, ease.in))}>
          <rect x={-105} y={-32} width={210} height={64} rx={32} fill={C.positive} stroke={C.ink} strokeWidth={4} />
          <Txt size={34} weight={900}>+65% no ano</Txt>
        </G>
      )}
      {t >= 39.6 && <G x={540} y={530} o={prog(t, 39.6, 0.3) * (1 - prog(t, 42.3, 0.3))}><Txt size={26} color={C.muted} weight={700}>fonte: NVIDIA 10-K FY2026</Txt></G>}
    </G>
  );
};

const cues: Cue[] = [
  [T_CAL, 'pop'], [38.2, 'ticker', 0.6], [38.95, 'whoosh', 0.5],
  [T_COUNT, 'ticker', 0.8], [39.85, 'ticker', 0.7],
  [39.3, 'coin', 0.4], [39.6, 'coin', 0.4], [39.9, 'coin', 0.4], [40.2, 'coin', 0.4], [T_SLAM, 'impact'],
  [40.6, 'coin', 0.5], [40.72, 'coin', 0.4], [40.84, 'coin', 0.4], [40.96, 'coin', 0.4], [41.08, 'pop'],
  [T_SC, 'whoosh', 0.6], [T_CUT, 'snip'], [T_LUCRO, 'ding'], [42.55, 'pop', 0.6], [T_MORPH, 'whoosh', 0.5],
];

export const S08: Scene = { id: 'S08', start: 38.0, end: 43.18, title: ["ÚLTIMO ANO", "FISCAL (FY26)"], Comp, cues, acts: [{ t: 40.8, act: 'point', d: 0.9 }, { t: 42.5, act: 'wiggle' }] };
