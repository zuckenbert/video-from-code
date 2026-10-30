import React from 'react';
import { arc, clamp, Cue, ease, lerp, pop, prog, shake, squash } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { Box3D, DrawPath, G, Gpu, Pulse, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';

// S05 "O pulo do gato: essa placa faz milhares de contas ao mesmo tempo, igualzinho ao que uma IA precisa."

const T_CAT = 17.03, CAT_D = 0.75, T_WHIR = 18.16, T_DOWN = 18.7, T_FLASH = 20.11, T_FLY = 20.91;
const T_EDGES = 21.45, T_PULSE = [21.75, 22.05];
const LEVELS: [number, number][] = [[19.05, 2], [19.25, 4], [19.52, 8], [19.75, 16]];
const CPU_AT = 19.3;
const GLYPHS = ['+', '×', '+', '−'];

// grade de contas (mesma geometria da versão anterior)
const GRID = { x0: 316, y0: 40, size: 448 };
const cellXY = (r: number, c: number, n: number) => {
  const p = GRID.size / n;
  return [GRID.x0 + c * p + p / 2, GRID.y0 + r * p + p / 2] as const;
};
const Cell: React.FC<{ fill: string; n: number }> = ({ fill, n }) => {
  const p = GRID.size / n;
  const gap = Math.max(4, p * 0.08);
  const sw = n <= 4 ? 5 : n === 8 ? 3.5 : 2.5;
  return <rect x={-(p - gap) / 2} y={-(p - gap) / 2} width={p - gap} height={p - gap} rx={Math.min(10, p * 0.12)} fill={fill} stroke={C.ink} strokeWidth={sw} />;
};
const hash = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// rede neural do contrato com a S06
const LX = [380, 540, 700];
const LN = [3, 4, 3];
export const NODES = LX.flatMap((x, l) => Array.from({ length: LN[l] }).map((_, j) => ({ x, y: 330 + (j - (LN[l] - 1) / 2) * 90, l })));
export const EDGES: [number, number][] = [];
NODES.forEach((a, i) => NODES.forEach((b, k) => { if (b.l === a.l + 1) EDGES.push([i, k]); }));

/** Gato pulando: silhueta tinta, orelhas e listras roxas, olho amarelo. Olha pra direita. */
const Cat: React.FC<{ stretch: number }> = ({ stretch }) => (
  <g transform={`scale(${1 + stretch * 0.18} ${1 - stretch * 0.1})`}>
    {/* rabo */}
    <path d="M -95 -5 Q -150 -40 -175 -95" fill="none" stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
    {/* pernas de trás esticadas */}
    <path d="M -70 10 L -140 55" stroke={C.ink} strokeWidth={22} strokeLinecap="round" />
    {/* corpo */}
    <ellipse cx={-5} cy={0} rx={105} ry={42} fill={C.ink} />
    {[-55, -25, 5].map((x) => <path key={x} d={`M ${x} -38 Q ${x + 8} -18 ${x} 0`} fill="none" stroke={C.accent} strokeWidth={9} strokeLinecap="round" />)}
    {/* pernas da frente esticadas */}
    <path d="M 70 8 L 150 38" stroke={C.ink} strokeWidth={22} strokeLinecap="round" />
    {/* cabeça */}
    <circle cx={110} cy={-30} r={42} fill={C.ink} />
    <path d="M 82 -58 L 88 -100 L 112 -68 Z" fill={C.ink} />
    <path d="M 118 -66 L 140 -100 L 146 -58 Z" fill={C.ink} />
    <path d="M 90 -66 L 93 -88 L 106 -70 Z" fill={C.accent} />
    <path d="M 124 -66 L 138 -88 L 140 -64 Z" fill={C.accent} />
    <ellipse cx={128} cy={-34} rx={9} ry={11} fill={C.highlight} />
    <ellipse cx={130} cy={-33} rx={3} ry={8} fill={C.ink} />
    <circle cx={150} cy={-18} r={5} fill={C.warm} />
    {[-6, 4].map((dy) => <line key={dy} x1={150} y1={-14 + dy} x2={182} y2={-20 + dy * 2} stroke={C.ink} strokeWidth={3} />)}
  </g>
);

const fanAngle = (t: number) => {
  const a = T_WHIR, ramp = 0.6, v0 = 900, vmax = 2400;
  if (t < a) return t * v0;
  const tr = Math.min(t - a, ramp);
  return a * v0 + v0 * tr + ((vmax - v0) / ramp) * tr * tr * 0.5 + Math.max(0, t - a - ramp) * vmax;
};

const Cpu: React.FC<{ t: number }> = ({ t }) => {
  const k = Math.floor(Math.max(0, t - CPU_AT) / 0.2) % 4;
  return (
    <g>
      {[-60, -20, 20, 60].map((v) => (
        <g key={v}>
          <rect x={v - 6} y={-112} width={12} height={20} fill={C.ink} />
          <rect x={v - 6} y={92} width={12} height={20} fill={C.ink} />
          <rect x={-112} y={v - 6} width={20} height={12} fill={C.ink} />
          <rect x={92} y={v - 6} width={20} height={12} fill={C.ink} />
        </g>
      ))}
      <Box3D w={184} h={184} fill={C.ink} depth={14} />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${(i % 2 ? 1 : -1) * 42} ${(i > 1 ? 1 : -1) * 42})`}>
          <rect x={-34} y={-34} width={68} height={68} rx={8} fill={i === k ? C.highlight : C.paper} stroke={C.ink} strokeWidth={4} />
          {i === k && <Txt size={40} weight={900}>+</Txt>}
        </g>
      ))}
    </g>
  );
};

const Comp: React.FC<{ t: number }> = ({ t }) => {
  // gato salta em arco por cima da placa
  const cp = clamp((t - T_CAT) / CAT_D);
  const [catX, catY] = arc(ease.inOut(cp), 70, 480, 1010, 480, 300);
  const catR = lerp(-24, 24, cp);
  const catVis = t >= T_CAT && cp < 1;
  const dip = t >= 17.2 && t < 17.75 ? Math.sin(((t - 17.2) / 0.55) * Math.PI) : 0; // placa se abaixa

  // placa: vibra, desce para baixo da grade, sai
  const vib = t > T_WHIR && t < 20.6 ? Math.sin(t * 90) * 2.4 : 0;
  const down = prog(t, T_DOWN, 0.28, ease.inOut);
  const cardOut = prog(t, 20.65, 0.3, ease.in);
  const gw = lerp(420, 380, down);
  const gx = 540 + vib, gy = lerp(300, 610, down);
  const land = squash(t, T_DOWN + 0.28, 0.12);

  // grade
  let li = -1;
  for (let i = 0; i < LEVELS.length; i++) if (t >= LEVELS[i][0]) li = i;
  const flashed = t >= T_FLASH;
  const cells: React.ReactNode[] = [];
  const flying: React.ReactNode[] = [];
  if (li >= 0) {
    const [at, n] = LEVELS[li];
    const p = GRID.size / n;
    let nodeK = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const idx = r * n + c;
        const [x, y] = cellXY(r, c, n);
        const spark = !flashed && hash(idx, Math.floor(t * 10)) < 0.12;
        const fill = flashed ? C.positive : spark ? C.highlight : C.paper;
        // na hora do "igualzinho": 10 células viram nós, o resto some
        const isNode = n === 16 && (r * 16 + c) % 25 === 3 && nodeK < NODES.length;
        if (t >= T_FLY && n === 16) {
          if (isNode) {
            const k = nodeK++;
            const fa = T_FLY + k * 0.03;
            const fp = clamp((t - fa) / 0.4);
            if (fp >= 1) continue;
            const [fx, fy] = arc(ease.inOut(fp), x, y, NODES[k].x, NODES[k].y, 80);
            flying.push(<g key={idx} transform={`translate(${fx} ${fy}) scale(${lerp(1, 1.4, fp)}) rotate(${fp * 180})`}><Cell fill={C.positive} n={16} /></g>);
            continue;
          }
          const gone = prog(t, T_FLY + ((r * 7 + c) % 12) * 0.015, 0.2, ease.in);
          if (gone >= 1) continue;
          cells.push(<g key={idx} transform={`translate(${x} ${y}) scale(${1 - gone})`}><Cell fill={fill} n={n} /></g>);
          continue;
        }
        if (isNode) nodeK++;
        const s = 0.45 + 0.55 * pop(t, at + ((r + c) / (2 * n)) * 0.12, 0.2);
        cells.push(
          <g key={idx} transform={`translate(${x} ${y}) scale(${s})`}>
            <Cell fill={fill} n={n} />
            {n <= 8 && !flashed && <Txt size={p * 0.5} weight={900}>{GLYPHS[(r * 3 + c) % 4]}</Txt>}
          </g>,
        );
      }
    }
  }
  const gcx = GRID.x0 + GRID.size / 2, gcy = GRID.y0 + GRID.size / 2;
  const bump = flashed && t < T_FLY ? 1 + 0.045 * Math.sin(clamp((t - T_FLASH) / 0.3) * Math.PI) : 1;

  // contador e CPU
  let count = '';
  for (const [at, n] of LEVELS) if (t >= at) count = String(n * n);
  const lastLv = [...LEVELS].reverse().find(([at]) => t >= at);
  const cntS = lastLv ? 1 + 0.25 * (1 - ease.out(clamp((t - lastLv[0]) / 0.2))) : 0;
  const sideOut = 1 - prog(t, 20.6, 0.25, ease.in);

  // rede
  const nodeS = (i: number) => pop(t, T_FLY + 0.36 + i * 0.03, 0.22);
  const pulseP = (l: number, e: number) => clamp((t - T_PULSE[l] - (e % 4) * 0.02) / 0.26);
  const lit = (l: number) => (l === 0 && t >= 21.94 - 0.05 && t < 22.1) || (l === 1 && t >= T_PULSE[0] + 0.24 && t < T_PULSE[0] + 0.42) || (l === 2 && t >= T_PULSE[1] + 0.24 && t < T_PULSE[1] + 0.42);
  const netShake = shake(t, 21.94, 6, 0.25);

  return (
    <g>
      <g transform={`translate(${gcx} ${gcy}) scale(${bump}) translate(${-gcx} ${-gcy})`}>{cells}</g>
      {flashed && t < T_FLASH + 0.3 && (
        <rect x={GRID.x0 - 10} y={GRID.y0 - 10} width={GRID.size + 20} height={GRID.size + 20} rx={14} fill={C.paper} opacity={0.75 * (1 - (t - T_FLASH) / 0.3)} />
      )}
      {/* rede neural */}
      {t >= T_FLY && (
        <g transform={`translate(${netShake} 0)`}>
          {EDGES.map(([a, b], e) => (
            <DrawPath key={e} d={`M ${NODES[a].x} ${NODES[a].y} L ${NODES[b].x} ${NODES[b].y}`} p={prog(t, T_EDGES + e * 0.012, 0.28)} w={3} len={200} />
          ))}
          {EDGES.map(([a, b], e) => (
            <Pulse key={`p${e}`} x0={NODES[a].x} y0={NODES[a].y} x1={NODES[b].x} y1={NODES[b].y} p={pulseP(NODES[a].l, e)} r={8} />
          ))}
          {NODES.map((n, i) => (
            <G key={i} x={n.x} y={n.y} s={nodeS(i)}>
              <circle r={22} fill={lit(n.l) ? C.highlight : C.paper} stroke={C.ink} strokeWidth={SW} />
            </G>
          ))}
          {t >= 21.9 && t < 22.75 && (
            <G x={540} y={600} s={pop(t, 21.9, 0.28) * (1 - prog(t, 22.5, 0.2, ease.in))}>
              <rect x={-150} y={-36} width={300} height={72} rx={36} fill={C.ink} />
              <Txt size={40} color={C.paper} weight={900}>IA aprende</Txt>
            </G>
          )}
        </g>
      )}
      {flying}
      {/* placa de vídeo */}
      {cardOut < 1 && (
        <G x={gx} y={gy + dip * 55} sx={land[0] * (1 + dip * 0.06)} sy={land[1] * (1 - dip * 0.12)}>
          <Gpu w={gw * (1 - cardOut)} fan={fanAngle(t)} label="" glow={flashed ? 1 - prog(t, T_FLASH, 0.5) : 0} />
        </G>
      )}
      {/* contador à direita */}
      {count && sideOut > 0 && (
        <G x={915} y={230} o={sideOut}>
          <Txt y={-80} size={30} weight={800} color={C.accent}>GPU</Txt>
          <g transform={`scale(${cntS})`}>
            {!flashed ? <Txt size={84} weight={900} ls={-3}>{count}</Txt> : <Txt size={46} weight={900}>TODAS</Txt>}
          </g>
          <Txt y={70} size={28} weight={700}>{!flashed ? 'contas' : 'juntas'}</Txt>
        </G>
      )}
      {/* CPU: uma conta por vez */}
      {t >= CPU_AT && sideOut > 0 && (
        <G x={165} y={250} s={pop(t, CPU_AT) * 0.82 * sideOut}>
          <Txt y={-160} size={36} weight={800} color={C.accent}>CPU</Txt>
          <Cpu t={t} />
          <Txt y={165} size={32} weight={800}>1 por vez</Txt>
        </G>
      )}
      {/* o gato */}
      {catVis && (
        <G x={catX} y={catY} r={catR}>
          <G s={1.3}><Cat stretch={Math.sin(cp * Math.PI)} /></G>
        </G>
      )}
      {t >= T_CAT && t < T_CAT + 0.25 && (
        <G x={60} y={520} s={1 + (t - T_CAT) * 3} o={1 - (t - T_CAT) / 0.25}>
          <ellipse rx={70} ry={14} fill="none" stroke={C.ink} strokeWidth={4} />
        </G>
      )}
    </g>
  );
};

const cpuTicks: Cue[] = Array.from({ length: 4 }).map((_, i) => [CPU_AT + i * 0.2, 'tick', 0.6] as Cue);

const cues: Cue[] = [
  [T_CAT, 'boing'], [T_CAT + 0.2, 'whoosh'], [17.4, 'pop', 0.4], [T_WHIR, 'whir'], [T_DOWN, 'whoosh', 0.4],
  ...LEVELS.map(([a]) => [a, 'pop'] as Cue), [19.62, 'pop', 0.6], [19.82, 'pop', 0.5], [19.9, 'pop', 0.4],
  ...cpuTicks, [T_FLASH, 'chord'], [20.6, 'whoosh', 0.5], [T_FLY, 'whoosh'], [T_EDGES, 'zip'],
  [T_PULSE[0], 'zip', 0.4], [T_PULSE[1], 'zip', 0.4], [21.9, 'pop'],
];

export const S05: Scene = { id: 'S05', start: 16.8, end: 22.9, title: ["O PULO", "DO GATO"], Comp, cues, acts: [{ t: 17.0, act: 'up', d: 0.9 }, { t: 20.11, act: 'nod' }] };
