import React from 'react';
import { arc, clamp, Cue, ease, lerp, pop, prog, shake, squash } from '../kit/anim';
import { Scene } from '../kit/Layout';
import { Building, DrawPath, G, Person, Stamp, SW, Txt } from '../kit/shapes';
import { C } from '../kit/tokens';
import { NvChip } from './S01_Hook';

// S09 "Minha leitura: o risco mora no cliente. Dois compradores pagaram mais de um terço da conta,
// e as big techs já desenham chip próprio."

/** Estado do contrato S09 -> S10: chip no topo e três prédios das big techs. */
export const CHIP_TOP = { x: 540, y: 170, s: 0.55 };
export const BLD = { y: 470, w: 170, h: 220 };
export const LABEL_Y = 610;
export const CUST = [
  { x: 230, label: 'Google', chip: 'TPU', at: 48.46, bp: 49.27 },
  { x: 540, label: 'Amazon', chip: 'Trainium', at: 48.61, bp: 49.5 },
  { x: 850, label: 'Microsoft', chip: 'Maia', at: 48.88, bp: 49.71 },
];

const BLOCK = { x: 540, y: 420, w: 300, h: 110 };
const PIE = { x: 540, y: 455, r: 185 };
// fatias da receita: cliente A 22%, cliente B 14% (10-K FY2026, não nomeados)
const A0 = -90, A1 = A0 + 0.22 * 360, B1 = A1 + 0.14 * 360;
const BUYERS = [
  { x: 180, side: -1, at: 45.83, name: 'cliente A', pct: '22%', a0: A0, a1: A1, fill: C.warm, throwAt: 46.68 },
  { x: 900, side: 1, at: 46.12, name: 'cliente B', pct: '14%', a0: A1, a1: B1, fill: C.positiveDark, throwAt: 46.84 },
];

const rad = (a: number) => (a * Math.PI) / 180;
const wedge = (r: number, a0: number, a1: number) => {
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M 0 0 L ${r * Math.cos(rad(a0))} ${r * Math.sin(rad(a0))} A ${r} ${r} 0 ${large} 1 ${r * Math.cos(rad(a1))} ${r * Math.sin(rad(a1))} Z`;
};
/** Centroide aproximado da fatia (para posicionar e voar). */
const mid = (r: number, a0: number, a1: number) => [Math.cos(rad((a0 + a1) / 2)) * r * 0.6, Math.sin(rad((a0 + a1) / 2)) * r * 0.6] as const;

/** Prancheta de projeto: quadrado do chip desenhado a lápis (p 0..1) e nome do chip. */
export const Blueprint: React.FC<{ p: number; label: string; labelP: number; fillP?: number }> = ({ p, label, labelP, fillP = 0 }) => {
  const side = 76;
  const sq = `M ${-side / 2} ${-side / 2 - 18} L ${side / 2} ${-side / 2 - 18} L ${side / 2} ${side / 2 - 18} L ${-side / 2} ${side / 2 - 18} Z`;
  const per = clamp(p) * 4;
  const seg = Math.min(3, Math.floor(per));
  const f = per - seg;
  const corners: [number, number][] = [[-side / 2, -side / 2 - 18], [side / 2, -side / 2 - 18], [side / 2, side / 2 - 18], [-side / 2, side / 2 - 18], [-side / 2, -side / 2 - 18]];
  const px = lerp(corners[seg][0], corners[seg + 1][0], f), py = lerp(corners[seg][1], corners[seg + 1][1], f);
  return (
    <g>
      <rect x={-100} y={-92} width={200} height={184} rx={8} fill={C.accentSoft} stroke={C.ink} strokeWidth={SW} />
      {[-60, -20, 20, 60].map((v) => <line key={`v${v}`} x1={v} x2={v} y1={-88} y2={88} stroke={C.accent} strokeWidth={1.5} opacity={0.35} />)}
      {[-50, -10, 30, 70].map((v) => <line key={`h${v}`} x1={-96} x2={96} y1={v} y2={v} stroke={C.accent} strokeWidth={1.5} opacity={0.35} />)}
      {fillP > 0 && <rect x={-side / 2} y={-side / 2 - 18} width={side} height={side} fill={C.highlight} opacity={fillP} />}
      <DrawPath d={sq} p={p} len={4 * side} stroke={C.accent} w={6} />
      {p >= 1 && [-24, 0, 24].map((v) => (
        <g key={v}>
          <line x1={v} x2={v} y1={-side / 2 - 18} y2={-side / 2 - 32} stroke={C.accent} strokeWidth={5} />
          <line x1={v} x2={v} y1={side / 2 - 18} y2={side / 2 - 4} stroke={C.accent} strokeWidth={5} />
        </g>
      ))}
      {labelP > 0 && <G y={60} s={labelP}><Txt size={label.length > 5 ? 36 : 42} color={C.accent} weight={900}>{label}</Txt></G>}
      {p > 0 && p < 1 && (
        <g transform={`translate(${px} ${py}) rotate(-40)`}>
          <path d="M 0 0 L 10 -16 L 10 -70 L -10 -70 L -10 -16 Z" fill={C.highlight} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M 0 0 L 5 -8 L -5 -8 Z" fill={C.ink} />
          <rect x={-10} y={-82} width={20} height={12} fill={C.warm} stroke={C.ink} strokeWidth={3.5} />
        </g>
      )}
    </g>
  );
};

/** Triângulo de alerta. */
export const Warn: React.FC = () => (
  <g>
    <path d="M 0 -70 L 72 58 L -72 58 Z" fill={C.highlight} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
    <rect x={-7} y={-28} width={14} height={50} rx={5} fill={C.ink} />
    <circle cy={38} r={8} fill={C.ink} />
  </g>
);

/** Lupa ("minha leitura"). */
const Lupa: React.FC = () => (
  <g>
    <line x1={48} y1={48} x2={110} y2={110} stroke={C.ink} strokeWidth={18} strokeLinecap="round" />
    <circle r={66} fill={C.paper} fillOpacity={0.35} stroke={C.ink} strokeWidth={10} />
    <path d="M -36 -22 Q -28 -40 -8 -46" fill="none" stroke={C.paper} strokeWidth={7} strokeLinecap="round" />
  </g>
);

/** Saco de dinheiro com a porcentagem. */
const Sack: React.FC<{ pct: string; fill: string }> = ({ pct, fill }) => (
  <g>
    <path d="M -46 -38 Q -70 40 -40 62 L 40 62 Q 70 40 46 -38 Z" fill={fill} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
    <path d="M -22 -40 L -30 -62 L 30 -62 L 22 -40 Z" fill={fill} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
    <line x1={-26} x2={26} y1={-40} y2={-40} stroke={C.ink} strokeWidth={6} />
    <Txt y={16} size={42} weight={900} color={C.ink}>{pct}</Txt>
  </g>
);

const Comp: React.FC<{ t: number }> = ({ t }) => {
  // 1) "Minha leitura": lupa varre o bloco de lucro, que vira o chip e sobe pro topo
  const lupaIn = pop(t, 43.28, 0.25) * (1 - prog(t, 43.95, 0.2, ease.in));
  const lupaX = lerp(BLOCK.x - 160, BLOCK.x + 150, prog(t, 43.3, 0.6, ease.inOut));
  const blockOut = prog(t, 43.75, 0.22, ease.in);
  const chipIn = pop(t, 43.8, 0.3);
  const chipUp = prog(t, 44.02, 0.32, ease.back);
  const chipX = CHIP_TOP.x, chipY = lerp(BLOCK.y, CHIP_TOP.y, chipUp);
  const chipS = chipIn * CHIP_TOP.s;
  const chipShake = shake(t, 44.35, 8, 0.35);

  // 2) "risco": alerta grande no centro, depois vira selo ao lado do chip
  const warnIn = pop(t, 44.35, 0.3);
  const warnMv = prog(t, 44.85, 0.35, ease.inOut);
  const warnOut = prog(t, 50.35, 0.35, ease.in);
  const wob = t < 44.85 ? Math.sin((t - 44.35) * 22) * 10 : Math.sin(t * 9) * 4;

  // 3) "mora no cliente": pizza da receita com um buraco de 36%; os dois compradores trazem as fatias
  const pieIn = pop(t, 45.01, 0.32);
  const pieOut = prog(t, 48.34, 0.35, ease.in);
  const pieGlow = t > 47.0 ? 0.5 + 0.5 * Math.sin((t - 47.0) * 9) : 0;
  const stampIn = t >= 47.52 ? lerp(1.7, 1, ease.out(clamp((t - 47.52) / 0.14))) : 0;

  return (
    <g>
      {/* bloco de lucro (contrato S08 -> S09) */}
      {blockOut < 1 && (
        <G x={BLOCK.x} y={BLOCK.y} sx={1 - blockOut} sy={1 + blockOut * 0.3} o={1 - blockOut}>
          <rect x={-BLOCK.w / 2} y={-BLOCK.h / 2} width={BLOCK.w} height={BLOCK.h} rx={8} fill={C.positive} stroke={C.ink} strokeWidth={SW} />
          <Txt size={44} weight={900}>US$ 120 bi</Txt>
        </G>
      )}
      {lupaIn > 0 && <G x={lupaX} y={BLOCK.y - 10} s={lupaIn} r={-8}><Lupa /></G>}

      {/* pizza da receita */}
      {pieIn > 0 && pieOut < 1 && (
        <G x={lerp(PIE.x, CHIP_TOP.x, pieOut)} y={lerp(PIE.y, CHIP_TOP.y, pieOut)} s={pieIn * (1 - pieOut)} r={(1 - pieIn) * -30}>
          <path d={wedge(PIE.r, B1, A0 + 360)} fill={C.paper} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
          {/* contorno tracejado do buraco */}
          <path d={wedge(PIE.r, A0, B1)} fill="none" stroke={C.ink} strokeWidth={4} strokeDasharray="14 12" opacity={0.6} />
          <G y={PIE.r * 0.38} x={-PIE.r * 0.3}><Txt size={40} weight={900}>receita</Txt></G>
          {/* fatias que já chegaram */}
          {BUYERS.map((b) => {
            const land = prog(t, b.throwAt, 0.42, ease.inOut);
            if (land < 1) return null;
            return (
              <g key={b.name}>
                <path d={wedge(PIE.r + 4 * pieGlow, b.a0, b.a1)} fill={b.fill} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
                <G x={mid(PIE.r, b.a0, b.a1)[0]} y={mid(PIE.r, b.a0, b.a1)[1]}><Txt size={40} weight={900}>{b.pct}</Txt></G>
              </g>
            );
          })}
        </G>
      )}

      {/* os dois compradores (não nomeados no 10-K) */}
      {BUYERS.map((b, i) => {
        if (t < b.at) return null;
        const grow = pop(t, b.at, 0.32);
        const [sx, sy] = squash(t, b.at + 0.3, 0.2);
        const leave = prog(t, 48.34, 0.3, ease.in);
        const bob = Math.sin(t * 6 + i) * 6;
        const throwP = prog(t, b.throwAt - 0.12, 0.2, ease.out);
        const lean = throwP * -14 * b.side * (1 - prog(t, b.throwAt + 0.3, 0.3));
        const land = clamp((t - b.throwAt) / 0.42);
        const [mx, my] = mid(PIE.r, b.a0, b.a1);
        // fatia na mão, depois voando pra pizza
        const handX = b.x - b.side * 112, handY = 430;
        const [fx, fy] = arc(ease.inOut(land), handX, handY, PIE.x + mx, PIE.y + my, 160);
        return (
          <g key={b.name} opacity={1 - leave}>
            <g transform={`translate(${b.x} ${560 + bob + leave * 120}) rotate(${lean}) scale(${grow * sx * (1 - leave * 0.4)} ${grow * sy * (1 - leave * 0.4)})`}>
              <G s={4.8}><Person fill={b.fill} /></G>
              <G x={b.side * 34} y={44} s={1.05}><Sack pct={b.pct} fill={C.highlight} /></G>
            </g>
            <G x={b.x} y={lerp(730, 705, grow)} s={pop(t, b.at + 0.12, 0.25)}>
              <Txt size={36} weight={900}>{b.name}</Txt>
            </G>
            {land < 1 && (
              <g transform={`translate(${fx} ${fy}) rotate(${land * 200 * b.side})`}>
                <G s={grow}>
                  <path transform={`translate(${-mx} ${-my})`} d={wedge(PIE.r, b.a0, b.a1)} fill={b.fill} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
                </G>
              </g>
            )}
          </g>
        );
      })}

      {/* carimbo: mais de um terço */}
      {stampIn > 0 && pieOut < 1 && (
        <G x={540} y={690} s={stampIn * (1 - pieOut)} o={clamp((t - 47.52) / 0.06)}>
          <Stamp text="36% DA RECEITA" w={420} color={C.negative} size={44} />
        </G>
      )}

      {/* big techs: prédios brotam um por nome */}
      {CUST.map((c, i) => {
        if (t < c.at) return null;
        const grow = ease.back(clamp((t - c.at) / 0.32));
        const [sx, sy] = squash(t, c.at + 0.32, 0.18);
        const bpIn = pop(t, c.bp - 0.08, 0.25) * (1 - prog(t, 50.35, 0.35, ease.in));
        return (
          <g key={c.label}>
            <g transform={`translate(${c.x} ${BLD.y + BLD.h / 2}) scale(${sx * lerp(0.6, 1, grow)} ${sy * grow}) translate(0 ${-BLD.h / 2})`}>
              <Building w={BLD.w} h={BLD.h} lit={1} cols={3} rows={4} />
            </g>
            <G x={c.x} y={LABEL_Y} s={pop(t, c.at + 0.1, 0.25)}>
              <Txt size={34} weight={900}>{c.label}</Txt>
            </G>
            {bpIn > 0 && (
              <G x={c.x} y={BLD.y - 20} s={bpIn * 0.95} r={(i - 1) * 4}>
                <Blueprint p={prog(t, c.bp, 0.38, ease.inOut)} label={c.chip} labelP={pop(t, c.bp + 0.38, 0.25)}
                  fillP={0.5 * prog(t, c.bp + 0.42, 0.3) * (0.6 + 0.4 * Math.sin(t * 8))} />
              </G>
            )}
          </g>
        );
      })}

      {/* chip da NVIDIA (sobe pro topo e fica) */}
      {chipIn > 0 && (
        <G x={chipX + chipShake} y={chipY} s={chipS * (1 + 0.04 * Math.sin(t * 4))} r={t > 49.3 ? Math.sin((t - 49.3) * 7) * 3 * (1 - prog(t, 50.3, 0.4)) : 0}>
          <NvChip glow={t > 48.34 && t < 48.8 ? 1 - prog(t, 48.34, 0.46) : 0} />
        </G>
      )}

      {/* alerta: grande no meio, depois selo piscando ao lado do chip */}
      {warnIn > 0 && warnOut < 1 && (
        <G x={lerp(540, 712, warnMv)} y={lerp(440, 120, warnMv)} s={warnIn * lerp(1.6, 0.48, warnMv) * (1 - warnOut)} r={wob}
          o={warnMv >= 1 ? 0.7 + 0.3 * Math.sin(t * 10) : 1}>
          <Warn />
        </G>
      )}
    </g>
  );
};

const cues: Cue[] = [
  [43.3, 'whoosh', 0.5], [43.8, 'pop'], [44.02, 'whoosh', 0.4],
  [44.35, 'alert'], [44.85, 'whoosh', 0.4], [45.01, 'pop', 0.8],
  [45.83, 'pop'], [46.12, 'pop'], [45.83 + 0.3, 'impact', 0.4], [46.12 + 0.3, 'impact', 0.4],
  [46.68, 'snip'], [46.68 + 0.42, 'click', 0.8], [46.84 + 0.42, 'click', 0.8],
  [47.52, 'stamp'], [47.93, 'ding', 0.5],
  [48.34, 'whoosh', 0.5], ...CUST.map((c) => [c.at, 'pop'] as Cue), ...CUST.map((c) => [c.at + 0.3, 'impact', 0.45] as Cue),
  ...CUST.map((c) => [c.bp, 'scribble', 0.8] as Cue), ...CUST.map((c) => [c.bp + 0.38, 'pop', 0.6] as Cue),
  [50.35, 'whoosh', 0.4],
];

export const S09: Scene = { id: 'S09', start: 43.18, end: 50.8, title: ["MINHA LEITURA:", "RISCO NO CLIENTE"], Comp, cues, acts: [{ t: 44.35, act: 'flinch' }, { t: 47.5, act: 'point', d: 0.9 }], hops: [43.26] };
