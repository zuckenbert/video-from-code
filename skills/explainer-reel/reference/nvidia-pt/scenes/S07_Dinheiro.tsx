import React from 'react';
import { arc, clamp, Cue, ease, lerp, pop, prog, shake, squash } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { Box3D, G, Rack, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';

// S07 "Agora, o dinheiro: um rack com setenta e dois chips custa uns três milhões de dólares, e big tech compra aos milhares."
// Começa no Rack do contrato (540,360) e termina na barra vazia da receita (contrato S07 -> S08).
const rnd = (i: number) => { const x = Math.sin(i * 78.233) * 43758.5453; return x - Math.floor(x); };
const RW = 240, RH = 400, RY = 360;
const REG = { x: 820, y: 450 };
const T_REG = 30.78, T_OPEN = 32.51, T_CHIPS = 32.96, T_CLOSE = 33.92, T_TAG = 34.18, T_CASH = 34.81;
const T_OUT = 35.6, LV = [36.35, 36.86, 37.12], T_STAMP = 37.29, T_COLLAPSE = 37.6;
const GRIDS = [{ n: 10, cols: 5, rows: 2 }, { n: 100, cols: 20, rows: 5 }, { n: 1000, cols: 50, rows: 20 }];
const AREA = { x: 70, y: 70, w: 940, h: 560 };
const BAR = { x: 110, y: 365, w: 860, h: 110 };
const slotY = (i: number) => -RH / 2 + RW * 0.1 + i * ((RH - RW * 0.2) / 5) + (RH - RW * 0.2) / 10;
const reais = (n: number) => 'US$ ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const MiniChip: React.FC = () => (
  <g>
    <rect x={-15} y={-15} width={30} height={30} rx={4} fill={C.ink} stroke={C.ink} strokeWidth={3} />
    <rect x={-8} y={-8} width={16} height={16} rx={2} fill={C.positive} />
  </g>
);

/** Caixa registradora: visor, teclas e gaveta que abre (open 0..1). */
const Register: React.FC<{ display: string; open: number }> = ({ display, open }) => (
  <g>
    <rect x={-120} y={70 - 6} width={240} height={46} rx={6} fill={C.paper} stroke={C.ink} strokeWidth={SW} transform={`translate(${open * 60} 0)`} />
    {open > 0.2 && [-70, -20, 30].map((x, i) => <rect key={i} x={x + open * 60} y={74} width={40} height={18} rx={3} fill={C.positive} stroke={C.ink} strokeWidth={2} />)}
    <Box3D w={260} h={150} fill={C.paper} />
    <rect x={-150} y={-190} width={300} height={70} rx={10} fill={C.ink} stroke={C.ink} strokeWidth={SW} />
    <line x1={0} x2={0} y1={-120} y2={-75} stroke={C.ink} strokeWidth={10} />
    <Txt y={-155} size={32} color={C.positive} weight={900}>{display}</Txt>
    {Array.from({ length: 12 }).map((_, i) => (
      <rect key={i} x={-100 + (i % 4) * 50} y={-55 + Math.floor(i / 4) * 38} width={38} height={26} rx={5} fill={i === 11 ? C.highlight : C.line} stroke={C.ink} strokeWidth={3} />
    ))}
  </g>
);

const Comp: React.FC<{ t: number }> = ({ t }) => {
  // rack: vai pra esquerda quando a registradora entra, volta ao centro e some na multiplicação
  const toLeft = prog(t, T_REG, 0.3, ease.inOut), back = prog(t, T_OUT, 0.35, ease.inOut);
  const rx = lerp(540, lerp(330, 540, back), toLeft);
  const rackS = lerp(1, 1.35, toLeft);
  const rackShrink = prog(t, LV[0], 0.18, ease.in);
  const tray = t < T_OPEN ? 0 : t < T_CLOSE ? prog(t, T_OPEN, 0.2, ease.back) : 1 - prog(t, T_CLOSE, 0.15, ease.in);
  const landed = Array.from({ length: 72 }).filter((_, i) => t >= T_CHIPS + (i / 72) * 0.85 + 0.3).length;
  const glow = t >= T_CLOSE && t < LV[0] ? 0.5 + 0.5 * Math.sin((t - T_CLOSE) * 9) : 0;
  const rsq = squash(t, T_CLOSE, 0.12);

  // registradora
  const regIn = pop(t, T_REG, 0.3);
  const regOut = prog(t, T_OUT, 0.3, ease.in);
  const regBounce = squash(t, T_CASH, 0.18);
  const drawer = t < T_REG ? 0 : t < 31.6 ? prog(t, T_REG + 0.05, 0.2, ease.back) : t < T_CASH ? 1 - prog(t, 31.9, 0.2) : prog(t, T_CASH, 0.15, ease.back);
  const money = 3000000 * prog(t, 34.44, T_CASH - 34.44, ease.out);
  const display = t < 31.45 ? 'US$ 0' : t < 34.44 ? (Math.floor(t * 6) % 2 ? '$ $ $' : 'US$ ???') : reais(money);

  // etiqueta de preço pendurada no rack
  const tagIn = pop(t, T_TAG, 0.3) * (1 - prog(t, 36.1, 0.2, ease.in));
  const swing = t >= T_TAG ? Math.sin((t - T_TAG) * 7) * 16 * Math.exp(-(t - T_TAG) * 1.4) + Math.sin(t * 2.5) * 2 : 0;

  // multiplicação: grade cada vez maior (zoom out) e colapso na barra
  const lvl = LV.filter((x) => t >= x).length;
  const collapse = prog(t, T_COLLAPSE, 0.32, ease.inOut);
  const barIn = prog(t, 37.7, 0.25, ease.out);

  return (
    <G x={shake(t, T_STAMP, 8)}>
      {/* rack único */}
      {rackShrink < 1 && (
        <G x={rx} y={RY} s={rackS * (1 - rackShrink)} sx={rsq[0]} sy={rsq[1]}>
          {/* gavetas que saem pra receber os chips */}
          {tray > 0 && [0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x={RW / 2 - 20} y={slotY(i) - 26} width={20 + tray * 120} height={52} rx={6} fill={C.paper} stroke={C.ink} strokeWidth={4} />
              {Array.from({ length: Math.min(4, Math.floor(landed / 5 / 3.6) + (i < landed % 5 ? 1 : 0)) }).map((_, k) => (
                <rect key={k} x={RW / 2 + 10 + k * 26} y={slotY(i) - 12} width={20} height={24} rx={3} fill={C.ink} />
              ))}
            </g>
          ))}
          <Rack w={RW} h={RH} lit={1} slots={5} pulse={t >= T_CHIPS && t < T_CLOSE ? Math.floor(t * 14) % 5 : -1} />
          {glow > 0 && <rect x={-RW / 2} y={-RH / 2} width={RW} height={RH} rx={6} fill={C.highlight} opacity={glow * 0.25} />}
          {t >= T_CHIPS && (
            <G y={RH / 2 + 50} s={pop(t, T_CHIPS, 0.25)}>
              <Txt size={40} weight={900}>{`${landed} ${landed === 1 ? 'chip' : 'chips'}`}</Txt>
            </G>
          )}
          {/* etiqueta */}
          {tagIn > 0 && (
            <g transform={`translate(0 ${-RH / 2 + 6}) rotate(${swing})`}>
              <line x1={0} y1={0} x2={0} y2={110} stroke={C.ink} strokeWidth={3} />
              <G x={0} y={150} s={tagIn * 0.78} r={-6}>
                <path d="M -150 -40 L 120 -40 Q 150 -40 150 -10 L 150 10 Q 150 40 120 40 L -150 40 L -175 0 Z" fill={C.highlight} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
                <circle cx={-148} cy={0} r={9} fill={C.paper} stroke={C.ink} strokeWidth={3} />
                <Txt x={-10} y={2} size={40} weight={900}>≈ US$ 3 mi</Txt>
              </G>
            </g>
          )}
        </G>
      )}

      {/* rajada de 72 chips voando para as gavetas */}
      {Array.from({ length: 72 }).map((_, i) => {
        const t0 = T_CHIPS + (i / 72) * 0.85, p = clamp((t - t0) / 0.3);
        if (t < t0 || p >= 1) return null;
        const sx0 = 120 + rnd(i) * 840, sy0 = 30 + rnd(i + 7) * 60;
        const [x, y] = arc(ease.in(p), sx0, sy0, rx + (RW / 2 + 60) * rackS, RY + slotY(i % 5) * rackS, 90);
        return <G key={i} x={x} y={y} r={p * 360} s={1 - p * 0.3}><MiniChip /></G>;
      })}

      {/* registradora */}
      {regIn > 0 && regOut < 1 && (
        <G x={REG.x + regOut * 400} y={REG.y} s={1.25 * regIn * (1 - regOut * 0.4)} sx={regBounce[0]} sy={regBounce[1]} o={1 - regOut}>
          <Register display={display} open={drawer} />
        </G>
      )}
      {/* notas saindo da gaveta em "o dinheiro" */}
      {Array.from({ length: 6 }).map((_, i) => {
        const t0 = 31.57 + i * 0.09, dt = t - t0;
        if (dt < 0 || dt > 0.9) return null;
        const x = REG.x + 60 + dt * (120 + rnd(i + 3) * 200) * (i % 2 ? 1 : -0.6), y = REG.y + 70 - dt * 420 + 0.5 * 700 * dt * dt;
        return (
          <G key={i} x={x} y={y} r={dt * (i % 2 ? 200 : -200)} o={1 - dt / 0.9}>
            <rect x={-34} y={-18} width={68} height={36} rx={4} fill={C.positive} stroke={C.ink} strokeWidth={3} />
            <Txt size={26} weight={900}>$</Txt>
          </G>
        );
      })}

      {/* grade de racks: 10, 100, 1.000 */}
      {lvl > 0 && collapse < 1 && (() => {
        const g = GRIDS[lvl - 1];
        const cw = AREA.w / g.cols, ch = AREA.h / g.rows;
        const t0 = LV[lvl - 1];
        const big = g.n <= 10;
        return (
          <g opacity={1 - prog(t, T_COLLAPSE + 0.2, 0.15)}>
            {Array.from({ length: g.n }).map((_, i) => {
              const c = i % g.cols, r = Math.floor(i / g.cols);
              const cx0 = AREA.x + cw * (c + 0.5), cy0 = AREA.y + ch * (r + 0.5);
              const dist = Math.hypot((c + 0.5) / g.cols - 0.5, (r + 0.5) / g.rows - 0.5);
              const s = pop(t, t0 + dist * 0.25, 0.18);
              if (s <= 0) return null;
              const w = cw * 0.68, h = ch * 0.82;
              const cx = lerp(cx0, BAR.x + BAR.w * ((c + 0.5) / g.cols), collapse);
              const cy = lerp(cy0, BAR.y + BAR.h / 2, collapse);
              const hh = lerp(h, BAR.h * 0.5, collapse);
              if (big) return <G key={i} x={cx} y={cy} s={s * (w / RW)}><Rack w={RW} h={RH} lit={1} slots={5} /></G>;
              return (
                <g key={i} transform={`translate(${cx} ${cy}) scale(${s})`}>
                  <rect x={-w / 2} y={-hh / 2} width={w} height={hh} fill={C.ink} />
                  <rect x={-w / 2 + w * 0.18} y={-hh / 2 + hh * 0.15} width={w * 0.64} height={hh * 0.12} fill={C.positive} />
                  {g.n <= 100 && <rect x={-w / 2 + w * 0.18} y={-hh / 2 + hh * 0.45} width={w * 0.64} height={hh * 0.12} fill={C.positive} />}
                </g>
              );
            })}
          </g>
        );
      })()}
      {/* contador da multiplicação */}
      {lvl > 0 && t < T_COLLAPSE + 0.15 && (
        <G x={540} y={690} s={pop(t, LV[lvl - 1], 0.2) * (t >= T_STAMP ? lerp(1.5, 1, ease.out(clamp((t - T_STAMP) / 0.15))) : 1) * (1 - prog(t, T_COLLAPSE, 0.15, ease.in))}
          r={t >= T_STAMP ? -5 : 0}>
          <rect x={-300} y={-42} width={600} height={84} rx={14} fill={t >= T_STAMP ? C.highlight : C.paper} stroke={C.ink} strokeWidth={SW} />
          <Txt size={46} weight={900}>{['x 10 racks', 'x 100 racks', 'x 1.000 ≈ US$ 3 bi'][lvl - 1]}</Txt>
        </G>
      )}

      {/* barra vazia da receita (contrato com S08) */}
      {barIn > 0 && (
        <G x={BAR.x + BAR.w / 2} y={BAR.y + BAR.h / 2} sx={lerp(0.3, 1, barIn)} o={clamp(barIn * 3)}>
          <rect x={-BAR.w / 2} y={-BAR.h / 2} width={BAR.w} height={BAR.h} rx={10} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
        </G>
      )}
    </G>
  );
};

const cues: Cue[] = [
  [T_REG, 'cash', 0.8], [T_REG + 0.02, 'pop'], [31.57, 'coin', 0.6], [31.75, 'coin', 0.5], [31.93, 'coin', 0.4],
  [T_OPEN, 'click'], [T_OPEN + 0.08, 'click', 0.7], [T_CHIPS, 'ticker'], [T_CHIPS + 0.5, 'ticker', 0.7], [T_CLOSE, 'click'],
  [T_TAG, 'pop'], [34.44, 'ticker', 0.6], [T_CASH, 'cash'], [35.24, 'ding'], [T_OUT, 'whoosh', 0.5],
  [LV[0], 'pop'], [LV[1], 'pop'], [LV[2], 'pop'], [T_STAMP, 'stamp'], [T_COLLAPSE, 'whoosh', 0.7],
];

export const S07: Scene = { id: 'S07', start: 30.65, end: 38.0, title: ["AGORA,", "O DINHEIRO"], Comp, cues, acts: [{ t: 34.4, act: 'point', d: 1.0 }, { t: 37.29, act: 'hop' }] };
