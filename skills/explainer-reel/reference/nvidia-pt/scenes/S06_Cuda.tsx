import React from 'react';
import { clamp, Cue, drop, ease, lerp, pop, prog, shake, squash } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { DrawPath, G, Person, Rack, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';
import { EDGES, NODES } from './S05_PuloDoGato';

// S06 "Em dois mil e seis, soltou o CUDA, de graça. Milhões de programadores aprenderam IA nele... e ficaram presos."

const T_YEAR = 23.25, T_BOX = 24.61, T_CUDA = 25.36, T_FREE = 26.09, T_DEVS = [27.24, 27.74, 28.2], T_WIRE = 28.93;
const T_CAGE = 29.7, T_LAND = 29.95, T_MORPH = 30.2;
const YEAR = { x: 540, y: 100 };
const BOX = { x: 540, y: 440, w: 360, h: 260 };
const RACK = { x: 540, y: 360, w: 240, h: 400 };

const hash = (a: number) => {
  const x = Math.sin(a * 91.7 + 13.1) * 43758.5453;
  return x - Math.floor(x);
};

// 150 programadores: espalhados pela largura, fora da caixa e longe do personagem
const DEVS = (() => {
  const out: { x: number; y: number; k: number }[] = [];
  let k = 0;
  for (let i = 0; out.length < 150 && i < 2000; i++) {
    const x = 90 + hash(i) * 900;
    const y = 200 + hash(i + 500) * 520;
    if (Math.abs(x - BOX.x) < 230 && Math.abs(y - BOX.y) < 190) continue;
    if (x < 380 && Math.abs(y - (BOX.y + 10)) < 100) continue;
    if (y > 650 && x < 420) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 46)) continue;
    out.push({ x, y, k: k++ });
  }
  // ordena pela distância da caixa: os primeiros nascem perto
  return out.sort((a, b) => Math.hypot(a.x - BOX.x, a.y - BOX.y) - Math.hypot(b.x - BOX.x, b.y - BOX.y));
})();
const DEV_COLORS = [C.accent, C.positive, C.warm, C.highlight];

const Gift: React.FC<{ t: number }> = ({ t }) => {
  const bowOut = prog(t, T_CUDA, 0.25, ease.in);
  const lidP = prog(t, T_CUDA + 0.08, 0.45, ease.out);
  const { w, h } = BOX;
  return (
    <g>
      {/* caixa */}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
      <rect x={-22} y={-h / 2} width={44} height={h} fill={C.highlight} stroke={C.ink} strokeWidth={4} />
      {/* tampa */}
      <g transform={`translate(${lidP * 260} ${-lidP * 160}) rotate(${lidP * 50})`} opacity={1 - prog(t, T_CUDA + 0.4, 0.15)}>
        <rect x={-w / 2 - 16} y={-h / 2 - 50} width={w + 32} height={56} rx={10} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
        <rect x={-22} y={-h / 2 - 50} width={44} height={56} fill={C.highlight} stroke={C.ink} strokeWidth={4} />
        {bowOut < 1 && (
          <g transform={`translate(0 ${-h / 2 - 54}) scale(${1 - bowOut})`}>
            <ellipse cx={-38} cy={-18} rx={42} ry={24} fill={C.highlight} stroke={C.ink} strokeWidth={4} transform="rotate(-20 -38 -18)" />
            <ellipse cx={38} cy={-18} rx={42} ry={24} fill={C.highlight} stroke={C.ink} strokeWidth={4} transform="rotate(20 38 -18)" />
            <circle r={14} fill={C.warm} stroke={C.ink} strokeWidth={4} />
          </g>
        )}
      </g>
    </g>
  );
};

const CudaBadge: React.FC = () => (
  <g>
    <rect x={-150} y={-50} width={300} height={100} rx={22} fill={C.positive} stroke={C.ink} strokeWidth={SW} />
    <Txt size={64} weight={900} ls={2}>CUDA</Txt>
  </g>
);

const PriceTag: React.FC<{ swing: number }> = ({ swing }) => (
  <g transform={`rotate(${swing})`}>
    <line x1={0} y1={0} x2={0} y2={46} stroke={C.ink} strokeWidth={3} />
    <g transform="translate(0 46)">
      <path d="M -70 20 L -40 -8 L 70 -8 L 70 48 L -40 48 Z" fill={C.paper} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx={-38} cy={20} r={6} fill={C.ink} />
      <Txt x={14} y={20} size={40} weight={900} color={C.negative}>US$ 0</Txt>
    </g>
  </g>
);

const Lock: React.FC = () => (
  <g>
    <path d="M -26 -10 L -26 -36 Q -26 -64 0 -64 Q 26 -64 26 -36 L 26 -10" fill="none" stroke={C.ink} strokeWidth={10} />
    <rect x={-48} y={-14} width={96} height={78} rx={10} fill={C.highlight} stroke={C.ink} strokeWidth={SW} />
    <Txt y={25} size={22} weight={900}>NVIDIA</Txt>
  </g>
);

const Comp: React.FC<{ t: number }> = ({ t }) => {
  // rede encolhe para dentro do contador de ano
  const netP = prog(t, 23.3, 0.42, ease.in);
  const yearS = pop(t, T_YEAR - 0.05, 0.3);
  const roll = prog(t, T_YEAR, 0.7, ease.out);
  const year = Math.round(lerp(1993, 2006, roll));
  const yearLand = t >= T_YEAR + 0.7 && t < T_YEAR + 1.0 ? 1 + 0.18 * Math.sin(((t - T_YEAR - 0.7) / 0.3) * Math.PI) : 1;
  const morph = prog(t, T_MORPH, 0.35, ease.inOut);
  const yearOut = prog(t, 29.5, 0.2, ease.in);

  // presente
  const boxIn = t >= T_BOX;
  const bsq = squash(t, T_BOX + 0.35, 0.2);
  const boxShake = shake(t, T_BOX + 0.35, 8, 0.3);
  const badgeP = prog(t, T_CUDA + 0.1, 0.4, ease.back);
  const tagS = pop(t, T_FREE, 0.3);
  const swing = t >= T_FREE ? Math.sin((t - T_FREE) * 7) * 18 * Math.exp(-(t - T_FREE) * 1.2) : 0;

  // programadores
  const nDev = t < T_DEVS[0] ? 0 : t < T_DEVS[1] ? 6 : t < T_DEVS[2] ? 40 : 150;
  const devAt = (i: number) => (i < 6 ? T_DEVS[0] + i * 0.05 : i < 40 ? T_DEVS[1] + (i - 6) * 0.008 : T_DEVS[2] + (i - 40) * 0.003);
  const wireP = (i: number) => prog(t, T_WIRE + (i % 30) * 0.012, 0.3);

  // jaula
  const railS = pop(t, T_CAGE, 0.18);
  const barP = t < T_CAGE + 0.02 ? 0 : ease.bounce(clamp((t - T_CAGE - 0.02) / 0.25));
  const cageShake = shake(t, T_LAND, 12, 0.3);
  const BARS = 14;
  const cage = { x0: 100, x1: 980, y0: 150, y1: 700 };

  const sceneFade = 1 - morph;

  return (
    <g transform={`translate(${cageShake} 0)`}>
      {/* rede da S05 sendo sugada pro ano */}
      {netP < 1 && (
        <g transform={`translate(${lerp(0, YEAR.x - 540, netP)} ${lerp(0, YEAR.y - 330, netP)}) translate(540 330) scale(${1 - netP}) translate(-540 -330)`}>
          {EDGES.map(([a, b], e) => <line key={e} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke={C.ink} strokeWidth={3} />)}
          {NODES.map((n, i) => <circle key={i} cx={n.x} cy={n.y} r={22} fill={C.paper} stroke={C.ink} strokeWidth={SW} />)}
        </g>
      )}
      {/* contador de ano */}
      {yearS > 0 && yearOut < 1 && (
        <G x={YEAR.x} y={YEAR.y} s={yearS * yearLand * (1 - yearOut)}>
          <rect x={-170} y={-62} width={340} height={124} rx={20} fill={C.ink} stroke={C.ink} strokeWidth={SW} />
          <Txt size={92} weight={900} color={roll >= 1 ? C.highlight : C.paper} ls={4}>{String(year)}</Txt>
        </G>
      )}
      {/* programadores e fios */}
      {nDev > 0 && (
        <g opacity={sceneFade}>
          {t >= T_WIRE && DEVS.slice(0, nDev).map((d, i) => (
            <DrawPath key={`w${i}`} d={`M ${d.x} ${d.y} L ${BOX.x} ${BOX.y}`} p={wireP(i)} w={2} stroke={C.accent} len={800} />
          ))}
          {DEVS.slice(0, nDev).map((d, i) => {
            const s = pop(t, devAt(i), 0.22) * lerp(1, 0, morph);
            const bob = Math.sin(t * 6 + i) * 3;
            const mx = lerp(d.x, RACK.x, morph), my = lerp(d.y, RACK.y, morph);
            return (
              <G key={i} x={mx} y={my + bob} s={s * (i < 6 ? 1.4 : i < 40 ? 1.1 : 0.9)}>
                <Person fill={DEV_COLORS[i % 4]} />
                {i < 40 && Math.floor(t * 2 + i) % 3 === 0 && t < T_CAGE && (
                  <Txt y={-44 - ((t * 40 + i * 13) % 30)} size={26} weight={900} color={C.accent}>{'</>'}</Txt>
                )}
              </G>
            );
          })}
        </g>
      )}
      {/* presente, CUDA e etiqueta */}
      {boxIn && (
        <G x={BOX.x} y={BOX.y + drop(t, T_BOX, 0.4, 200)} sx={bsq[0] * sceneFade} sy={bsq[1] * sceneFade}>
          <g transform={`translate(${boxShake} 0)`}><Gift t={t} /></g>
        </G>
      )}
      {badgeP > 0 && (
        <G x={BOX.x} y={lerp(BOX.y, BOX.y - 200, badgeP)} s={lerp(0.3, 1.25, badgeP) * sceneFade} r={Math.sin(t * 3) * 3}>
          <CudaBadge />
        </G>
      )}
      {tagS > 0 && (
        <G x={BOX.x - 280} y={BOX.y - 70} s={tagS * 1.25 * sceneFade}><PriceTag swing={swing} /></G>
      )}
      {/* jaula: trilho brota, grades descem e batem; no fim viram o rack */}
      {t >= T_CAGE && morph < 1 && (
        <g>
          {Array.from({ length: BARS }).map((_, i) => {
            const x = lerp(cage.x0, cage.x1, i / (BARS - 1));
            const xm = lerp(x, lerp(RACK.x - RACK.w / 2 + 14, RACK.x + RACK.w / 2 - 14, i / (BARS - 1)), morph);
            const y0 = lerp(cage.y0, RACK.y - RACK.h / 2, morph);
            const y1 = lerp(cage.y0 + (cage.y1 - cage.y0) * barP, RACK.y + RACK.h / 2, morph);
            return <line key={i} x1={xm} y1={y0} x2={xm} y2={y1} stroke={C.ink} strokeWidth={14} strokeLinecap="round" />;
          })}
          <G x={lerp(540, RACK.x, morph)} y={lerp(cage.y0, RACK.y - RACK.h / 2, morph)} sx={railS * lerp(1, RACK.w / (cage.x1 - cage.x0 + 40), morph)}>
            <rect x={-(cage.x1 - cage.x0) / 2 - 20} y={-14} width={cage.x1 - cage.x0 + 40} height={28} rx={8} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
          </G>
          {barP > 0.9 && (
            <G x={540} y={cage.y1 - 120 + Math.sin((t - T_LAND) * 9) * 6} s={pop(t, 30.0, 0.25) * 1.7 * (1 - morph)} r={Math.sin((t - 30.0) * 8) * 8}>
              <Lock />
            </G>
          )}
        </g>
      )}
      {/* rack do contrato com a S07 */}
      {morph > 0 && (
        <G x={RACK.x} y={RACK.y} o={prog(t, T_MORPH + 0.18, 0.15)}>
          <Rack w={RACK.w} h={RACK.h} lit={1} slots={5} />
        </G>
      )}
    </g>
  );
};

const devPops: Cue[] = [...T_DEVS.map((a) => [a, 'pop'] as Cue), [27.4, 'pop', 0.6], [27.85, 'pop', 0.6], [27.95, 'pop', 0.5], [28.3, 'pop', 0.5], [28.36, 'pop', 0.4], [28.42, 'pop', 0.4]];

const cues: Cue[] = [
  [23.3, 'whoosh', 0.5], [T_YEAR, 'ticker'], [T_YEAR + 0.7, 'stamp', 0.7],
  [T_BOX, 'whoosh', 0.4], [T_BOX + 0.35, 'impact'], [T_CUDA, 'pop'], [T_CUDA + 0.1, 'whoosh', 0.5],
  [T_FREE, 'click', 0.6], [26.37, 'ding'], ...devPops, [T_WIRE, 'zip'], [29.2, 'zip', 0.4],
  [T_CAGE, 'whoosh', 0.6], [T_LAND, 'impact'], [T_LAND, 'crack', 0.7], [30.0, 'click'], [T_MORPH, 'whoosh', 0.6],
];

export const S06: Scene = { id: 'S06', start: 22.9, end: 30.65, title: ["CUDA: GRÁTIS", "E VICIANTE"], Comp, cues, acts: [{ t: 26.1, act: 'wiggle' }, { t: 29.95, act: 'flinch' }] };
