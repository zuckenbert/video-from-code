import React from 'react';
import { arc, clamp, Cue, drop, ease, lerp, pop, prog, shake, squash } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { DrawPath, G, Gpu, Stamp, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';
import { NvChip } from './S01_Hook';

// S02 "A NVIDIA só desenha o chip. Quem fabrica é a TSMC, em Taiwan."
const BP = { x: 540, y: 360, w: 560, h: 400 };
const SQ: [number, number][] = [[430, 250], [650, 250], [650, 470], [430, 470], [430, 250]];
const TRACES = [
  { d: 'M 430 300 L 330 300 L 330 210', end: [330, 210], at: 4.32 },
  { d: 'M 430 420 L 290 420', end: [290, 420], at: 4.37 },
  { d: 'M 650 300 L 760 300 L 760 210', end: [760, 210], at: 4.42 },
  { d: 'M 650 420 L 790 420', end: [790, 420], at: 4.47 },
  { d: 'M 500 470 L 500 535', end: [500, 535], at: 4.52 },
  { d: 'M 580 250 L 580 185', end: [580, 185], at: 4.57 },
];
const FAC = { x: 800, y: 400, w: 340, h: 230 };
const DOOR = { x: 800, y: 470 };
const EMERGE = [6.4, 6.62, 6.84];
const TARGET = [200, 340, 480];
const CHIP_Y = 555;
const T_PLANE = 5.14, T_FAC = 5.7, T_OUT = 7.3;

/** Ponto ao longo de uma polilinha (p de 0 a 1 pelo comprimento). */
const polyAt = (pts: [number, number][], p: number) => {
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  let d = clamp(p) * seg.reduce((a, b) => a + b, 0);
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) {
      const k = seg[i] ? d / seg[i] : 0;
      return [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)] as const;
    }
    d -= seg[i];
  }
  return pts[pts.length - 1];
};

const Pencil: React.FC = () => (
  <g transform="rotate(-38)">
    <path d="M 0 0 L 16 -12 L 16 12 Z" fill={C.paper} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
    <path d="M 0 0 L 6 -4.5 L 6 4.5 Z" fill={C.ink} />
    <rect x={16} y={-12} width={130} height={24} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
    <rect x={146} y={-12} width={22} height={24} rx={4} fill={C.warm} stroke={C.ink} strokeWidth={3} />
  </g>
);

const Blueprint: React.FC<{ t: number }> = ({ t }) => {
  const sqP = prog(t, 3.99, 0.36, ease.inOut);
  const dieP = prog(t, 4.25, 0.2);
  return (
    <g>
      <rect x={BP.x - BP.w / 2} y={BP.y - BP.h / 2} width={BP.w} height={BP.h} rx={10} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
      {Array.from({ length: 13 }).map((_, i) => (
        <line key={`v${i}`} x1={BP.x - BP.w / 2 + 40 * (i + 1)} x2={BP.x - BP.w / 2 + 40 * (i + 1)} y1={BP.y - BP.h / 2} y2={BP.y + BP.h / 2} stroke={C.paper} strokeWidth={1.5} opacity={0.18} />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={`h${i}`} x1={BP.x - BP.w / 2} x2={BP.x + BP.w / 2} y1={BP.y - BP.h / 2 + 40 * (i + 1)} y2={BP.y - BP.h / 2 + 40 * (i + 1)} stroke={C.paper} strokeWidth={1.5} opacity={0.18} />
      ))}
      <DrawPath d={`M ${SQ.map((p) => p.join(' ')).join(' L ')}`} p={sqP} len={900} stroke={C.paper} w={6} />
      {dieP > 0 && <rect x={490} y={310} width={100} height={100} rx={6} fill="none" stroke={C.highlight} strokeWidth={5} opacity={dieP} />}
      {TRACES.map((tr, i) => {
        const p = prog(t, tr.at, 0.14);
        return (
          <g key={i}>
            <DrawPath d={tr.d} p={p} len={300} stroke={C.paper} w={5} />
            {p >= 1 && <circle cx={tr.end[0]} cy={tr.end[1]} r={11 * pop(t, tr.at + 0.14, 0.2)} fill={C.highlight} stroke={C.ink} strokeWidth={3} />}
          </g>
        );
      })}
    </g>
  );
};

const PaperPlane: React.FC = () => (
  <g>
    <path d="M -70 -10 L 80 0 L -70 40 L -40 6 Z" fill={C.accent} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
    <path d="M -70 -10 L 80 0 L -40 6 Z" fill={C.paper} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
  </g>
);

const Fab: React.FC<{ t: number }> = ({ t }) => {
  const { w, h } = FAC;
  return (
    <g>
      {[-0.28, 0.06].map((k, i) => (
        <g key={i}>
          <rect x={w * k} y={-h / 2 - 110} width={40} height={110} fill={C.line} stroke={C.ink} strokeWidth={SW} />
          {[0, 1, 2].map((j) => {
            const p = (t * 0.8 + j / 3 + i * 0.17) % 1;
            return <circle key={j} cx={w * k + 20 + Math.sin(p * 7 + j) * 10} cy={-h / 2 - 118 - p * 100} r={13 + p * 16} fill={C.paper} stroke={C.ink} strokeWidth={3} opacity={1 - p} />;
          })}
        </g>
      ))}
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={6} fill={C.paper} stroke={C.ink} strokeWidth={SW} />
      <rect x={-w / 2} y={-h / 2} width={w} height={64} rx={6} fill={C.accent} stroke={C.ink} strokeWidth={SW} />
      <Txt y={-h / 2 + 33} size={50} weight={900} color={C.paper} ls={2}>TSMC</Txt>
      {[0, 1].map((i) => <rect key={i} x={w / 2 - 110 + i * 50} y={-h / 2 + 90} width={36} height={36} rx={4} fill={C.highlight} stroke={C.ink} strokeWidth={3} />)}
      <rect x={-w / 2 + 30} y={h / 2 - 90} width={86} height={90} fill={C.ink} />
      <rect x={-w / 2 - 6} y={h / 2 - 70} width={12} height={60} fill={C.ink} />
    </g>
  );
};

const Island: React.FC = () => (
  <path d="M -20 -40 C 20 -50 40 -20 36 10 C 32 40 0 52 -18 40 C -34 26 -44 -30 -20 -40 Z" fill={C.positive} stroke={C.ink} strokeWidth={4} />
);

const Pin: React.FC = () => (
  <g>
    <path d="M 0 0 L -16 -36 A 22 22 0 1 1 16 -36 Z" fill={C.negative} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
    <circle cy={-50} r={8} fill={C.paper} stroke={C.ink} strokeWidth={3} />
  </g>
);

const chipX = (t: number, i: number) => {
  const p = prog(t, EMERGE[i], 0.5, ease.out);
  return lerp(DOOR.x - 160, TARGET[i], p);
};

const Comp: React.FC<{ t: number }> = ({ t }) => {
  const fan = t * 720;
  // chip achata e vira planta
  const flat = prog(t, 3.38, 0.17, ease.in);
  const unfold = prog(t, 3.55, 0.25, ease.back);
  const fold = prog(t, T_PLANE, 0.18, ease.in);
  const bpOn = t >= 3.55 && fold < 1;
  // lápis
  const pencilOn = t >= 3.95 && t < 4.78;
  let tip: readonly [number, number] = polyAt(SQ, prog(t, 3.99, 0.36, ease.inOut));
  for (const tr of TRACES) if (t >= tr.at) tip = polyAt([tip as [number, number], tr.end as [number, number]], prog(t, tr.at, 0.14));
  const pencilIn = prog(t, 3.95, 0.12);
  const pencilOut = prog(t, 4.65, 0.13);
  // avião
  const flyP = prog(t, 5.3, 0.62, ease.inOut);
  const [px, py] = arc(flyP, 540, 360, DOOR.x, DOOR.y, 190);
  const [nx, ny] = arc(Math.min(1, flyP + 0.02), 540, 360, DOOR.x, DOOR.y, 190);
  const ang = (Math.atan2(ny - py, nx - px) * 180) / Math.PI;
  // saída da cena
  const out = prog(t, T_OUT - 0.05, 0.22, ease.in);
  const facS = pop(t, T_FAC, 0.32) * (1 - out);
  const [fsx, fsy] = squash(t, 5.92, 0.12);
  const belt = prog(t, 6.2, 0.22);
  const grow = prog(t, T_OUT, 0.3, ease.inOut);
  const shk = shake(t, 5.92, 9) + shake(t, 7.0 + 0.2, 6);

  return (
    <g transform={`translate(${shk} 0)`}>
      {/* chip da S01 achatando */}
      {t < 3.58 && (
        <G x={540} y={360} sx={1 + flat * 0.7} sy={1 - flat * 0.94}>
          <NvChip />
        </G>
      )}
      {/* planta (blueprint) */}
      {bpOn && (
        <g transform={`translate(${BP.x} ${BP.y}) rotate(${fold * 25}) scale(${(1 - fold * 0.8)} ${unfold * (1 - fold * 0.8)}) translate(${-BP.x} ${-BP.y})`} opacity={1 - fold * 0.6}>
          <Blueprint t={t} />
        </g>
      )}
      {pencilOn && (
        <G x={tip[0]} y={tip[1] - (1 - pencilIn) * 60 - pencilOut * 80} o={pencilIn * (1 - pencilOut)} r={Math.sin(t * 40) * 4}>
          <Pencil />
        </G>
      )}
      {t >= 4.63 && t < T_PLANE + 0.1 && (
        <G x={700} y={500} s={lerp(1.7, 1, ease.out(clamp((t - 4.63) / 0.12)))} o={clamp((t - 4.63) / 0.05) * (1 - fold)}>
          <Stamp text="PROJETO" w={230} color={C.highlight} size={38} />
        </G>
      )}
      {/* fábrica TSMC */}
      {t >= T_FAC && facS > 0 && (
        <G x={FAC.x} y={FAC.y + FAC.h / 2} s={facS}>
          <G y={-FAC.h / 2} sx={fsx} sy={fsy}><Fab t={t} /></G>
        </G>
      )}
      {/* avião de papel voa pra fábrica */}
      {t >= T_PLANE + 0.1 && flyP < 1 && (
        <G x={px} y={py} r={ang} s={pop(t, T_PLANE + 0.1, 0.2) * lerp(1.2, 0.35, flyP)}>
          <PaperPlane />
        </G>
      )}
      {/* esteira */}
      {belt > 0 && (
        <g opacity={1 - out}>
          <rect x={DOOR.x - 160 - (DOOR.x - 160 - 130) * belt} y={585} width={(DOOR.x - 160 - 130) * belt} height={30} rx={15} fill={C.line} stroke={C.ink} strokeWidth={SW} />
          {Array.from({ length: 8 }).map((_, i) => {
            const x = DOOR.x - 160 - 18 - i * 60;
            return belt * (DOOR.x - 160 - 130) > (DOOR.x - 160 - x) ? (
              <g key={i} transform={`translate(${x} 600) rotate(${-t * 400})`}>
                <circle r={10} fill={C.paper} stroke={C.ink} strokeWidth={3} />
                <line x1={-8} x2={8} y1={0} y2={0} stroke={C.ink} strokeWidth={2} />
              </g>
            ) : null;
          })}
        </g>
      )}
      {/* chips saindo da fábrica */}
      {EMERGE.map((e, i) => {
        if (t < e) return null;
        const x = chipX(t, i);
        if (i === 2) {
          const gx = lerp(x, 540, grow), gy = lerp(CHIP_Y, 330, grow), s = lerp(1 / 3, 1, grow);
          return <G key={i} x={gx} y={gy} s={s * pop(t, e, 0.2)}><Gpu w={360} fan={fan} /></G>;
        }
        return <G key={i} x={x} y={CHIP_Y} s={pop(t, e, 0.2) / 3 * (1 - out)} o={1 - out}><Gpu w={360} fan={fan} /></G>;
      })}
      {/* Taiwan */}
      {t >= 6.9 && (
        <G x={870} y={650} s={pop(t, 6.9, 0.25) * (1 - out)}>
          <G s={1.5}><Island /></G>
          {t >= 6.98 && <G y={-4 + drop(t, 6.98, 0.4, 200)}><Pin /></G>}
          <Txt y={60} size={34} weight={900}>Taiwan</Txt>
        </G>
      )}
    </g>
  );
};

const cues: Cue[] = [
  [3.38, 'whoosh'], [3.99, 'scribble'], [4.35, 'scribble', 0.6], [4.5, 'pop', 0.5], [4.63, 'stamp'],
  [T_PLANE, 'whoosh'], [5.89, 'impact'], [5.92, 'pop'],
  ...EMERGE.map((e) => [e, 'click', 0.9] as Cue),
  [6.98, 'pop'], [7.18, 'tick', 0.6], [T_OUT, 'whoosh'],
];

export const S02: Scene = { id: 'S02', start: 3.3, end: 7.65, title: ["ELA DESENHA.", "OUTRO FABRICA."], Comp, cues, acts: [{ t: 5.95, act: 'point', d: 0.9 }] };
