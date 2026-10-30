import React from 'react';
import { C, FONT } from './tokens';

// SVG primitives in the house style (5 px ink outline, extruded accent side, flat fills).
// All draw centered on the local origin; position them with <G x y s r>.

export const SW = 5;

export const G: React.FC<{
  x?: number; y?: number; s?: number; sx?: number; sy?: number; r?: number; o?: number; children?: React.ReactNode;
}> = ({ x = 0, y = 0, s = 1, sx, sy, r = 0, o = 1, children }) => {
  if (o <= 0.001 || s === 0) return null;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${(sx ?? 1) * s} ${(sy ?? 1) * s})`} opacity={o}>
      {children}
    </g>
  );
};

/** Box with an extruded accent side (the "3D" of the style). */
export const Box3D: React.FC<{ w: number; h: number; fill?: string; side?: string; depth?: number; rx?: number }> = ({
  w, h, fill = C.paper, side = C.accent, depth = 18, rx = 6,
}) => (
  <g>
    <path
      d={`M ${w / 2 - 2} ${-h / 2 + depth * 0.2} L ${w / 2 + depth} ${-h / 2 - depth * 0.6} L ${w / 2 + depth} ${h / 2 - depth * 0.6} L ${w / 2 - 2} ${h / 2}`}
      fill={side} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round"
    />
    <path
      d={`M ${-w / 2 + rx} ${-h / 2} L ${-w / 2 + depth * 0.8} ${-h / 2 - depth * 0.6} L ${w / 2 + depth} ${-h / 2 - depth * 0.6} L ${w / 2 - 2} ${-h / 2 + 2} Z`}
      fill={C.ink} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round"
    />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} fill={fill} stroke={C.ink} strokeWidth={SW} />
  </g>
);

export const Txt: React.FC<{
  x?: number; y?: number; size?: number; color?: string; weight?: number; anchor?: 'start' | 'middle' | 'end'; children: React.ReactNode; ls?: number;
}> = ({ x = 0, y = 0, size = 28, color = C.ink, weight = 700, anchor = 'middle', children, ls = -0.5 }) => (
  <text x={x} y={y} fontSize={size} fill={color} fontWeight={weight} fontFamily={FONT} textAnchor={anchor} dominantBaseline="central" letterSpacing={ls}>
    {children}
  </text>
);

/** Graphics card: ink body, 2 spinning fans, gold connector. fan = angle in degrees. */
export const Gpu: React.FC<{ w?: number; fan?: number; glow?: number; label?: string }> = ({ w = 260, fan = 0, glow = 0, label = 'GPU' }) => {
  const h = w * 0.46;
  const fr = h * 0.33;
  const blades = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <Box3D w={w} h={h} fill={C.ink} depth={14} />
      {glow > 0 && <rect x={-w / 2 + 6} y={-h / 2 + 6} width={w - 12} height={h - 12} rx={6} fill={C.positive} opacity={glow * 0.55} />}
      {[-w * 0.22, w * 0.22].map((cx) => (
        <g key={cx} transform={`translate(${cx} ${-h * 0.04})`}>
          <circle r={fr} fill={C.paper} stroke={C.ink} strokeWidth={SW - 1} />
          <g transform={`rotate(${fan})`}>
            {blades.map((b) => (
              <path key={b} transform={`rotate(${b})`} d={`M 0 0 Q ${fr * 0.55} ${-fr * 0.25} ${fr * 0.85} ${-fr * 0.05} L 0 0`} fill={C.accent} stroke={C.ink} strokeWidth={2} />
            ))}
          </g>
          <circle r={fr * 0.22} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
        </g>
      ))}
      <rect x={-w * 0.36} y={h / 2 - 2} width={w * 0.62} height={h * 0.13} fill={C.highlight} stroke={C.ink} strokeWidth={4} />
      {Array.from({ length: 9 }).map((_, i) => (
        <line key={i} x1={-w * 0.33 + i * w * 0.07} x2={-w * 0.33 + i * w * 0.07} y1={h / 2 + 2} y2={h / 2 + h * 0.1} stroke={C.ink} strokeWidth={2} />
      ))}
      <Txt x={0} y={-h * 0.04} size={h * 0.16} color={C.paper}>{label}</Txt>
    </g>
  );
};

/** Server rack. lit = 0..1 (how many drawers are lit). */
export const Rack: React.FC<{ w?: number; h?: number; lit?: number; slots?: number; pulse?: number }> = ({ w = 120, h = 220, lit = 1, slots = 5, pulse = -1 }) => {
  const pad = w * 0.1;
  const sh = (h - pad * 2) / slots;
  return (
    <g>
      <Box3D w={w} h={h} fill={C.ink} depth={w * 0.14} />
      <rect x={-w / 2 + pad * 0.6} y={-h / 2 + pad * 0.6} width={w - pad * 1.2} height={h - pad * 1.2} rx={4} fill={C.paper} />
      {Array.from({ length: slots }).map((_, i) => {
        const on = i < Math.round(lit * slots);
        const hot = Math.round(pulse) === i;
        return (
          <g key={i}>
            <rect x={-w / 2 + pad} y={-h / 2 + pad + i * sh + 2} width={w - pad * 2} height={sh - 6} rx={4}
              fill={hot ? C.highlight : on ? C.positive : C.line} stroke={C.ink} strokeWidth={3} />
            <circle cx={-w / 2 + pad * 1.9} cy={-h / 2 + pad + i * sh + sh / 2 - 1} r={sh * 0.12} fill={on ? C.highlight : C.paper} stroke={C.ink} strokeWidth={2} />
            <line x1={-w / 2 + pad * 3} x2={w / 2 - pad * 1.6} y1={-h / 2 + pad + i * sh + sh / 2 - 1} y2={-h / 2 + pad + i * sh + sh / 2 - 1} stroke={C.ink} strokeWidth={3} />
          </g>
        );
      })}
    </g>
  );
};

export const Coin: React.FC<{ r?: number; flip?: number }> = ({ r = 22, flip = 0 }) => (
  <g transform={`scale(${Math.max(0.15, Math.abs(Math.cos(flip)))} 1)`}>
    <circle r={r} fill={C.highlight} stroke={C.ink} strokeWidth={4} />
    <circle r={r * 0.68} fill="none" stroke={C.ink} strokeWidth={2} opacity={0.5} />
    <Txt size={r * 1.05} weight={800}>$</Txt>
  </g>
);

/** Speech bubble with a tail pointing down-left (or right). */
export const Bubble: React.FC<{ w?: number; h?: number; text?: string; fill?: string; size?: number; tail?: 'left' | 'right' | 'none' }> = ({
  w = 110, h = 80, text = '?', fill = C.paper, size, tail = 'left',
}) => (
  <g>
    {tail !== 'none' && (
      <path d={tail === 'left' ? `M ${-w * 0.25} ${h / 2 - 4} L ${-w * 0.38} ${h / 2 + 22} L ${-w * 0.05} ${h / 2 - 4}` : `M ${w * 0.25} ${h / 2 - 4} L ${w * 0.38} ${h / 2 + 22} L ${w * 0.05} ${h / 2 - 4}`}
        fill={fill} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
    )}
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h * 0.32} fill={fill} stroke={C.ink} strokeWidth={SW} />
    {tail !== 'none' && <rect x={tail === 'left' ? -w * 0.34 : w * 0.02} y={h / 2 - 10} width={w * 0.32} height={9} fill={fill} />}
    <Txt size={size ?? h * 0.55} weight={800}>{text}</Txt>
  </g>
);

/** Building with windows that light up (lit 0..1) and an accent side. */
export const Building: React.FC<{ w?: number; h?: number; lit?: number; label?: string; cols?: number; rows?: number; fill?: string }> = ({
  w = 160, h = 240, lit = 0, label, cols = 3, rows = 5, fill = C.paper,
}) => {
  const gx = (w - 30) / cols, gy = (h - 50) / rows;
  const total = cols * rows;
  return (
    <g>
      <Box3D w={w} h={h} fill={fill} depth={20} rx={4} />
      {Array.from({ length: total }).map((_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const on = ((i * 7) % total) / total < lit;
        return <rect key={i} x={-w / 2 + 15 + c * gx + 4} y={-h / 2 + 15 + r * gy + 4} width={gx - 8} height={gy - 10} rx={3}
          fill={on ? C.highlight : C.line} stroke={C.ink} strokeWidth={2.5} />;
      })}
      {label && <Txt y={h / 2 + 30} size={26}>{label}</Txt>}
    </g>
  );
};

/** Little person (head + body) for "millions of developers", miners and so on. */
export const Person: React.FC<{ s?: number; fill?: string; hat?: boolean }> = ({ s = 1, fill = C.accent, hat = false }) => (
  <g transform={`scale(${s})`}>
    <path d="M -16 22 Q -16 2 0 2 Q 16 2 16 22 Z" fill={fill} stroke={C.ink} strokeWidth={3.5} />
    <circle cy={-10} r={10} fill={C.paper} stroke={C.ink} strokeWidth={3.5} />
    {hat && <path d="M -15 -14 L 15 -14 L 9 -24 L -9 -24 Z" fill={C.highlight} stroke={C.ink} strokeWidth={3} />}
  </g>
);

/** Line that draws itself (p 0..1) via dasharray. */
export const DrawPath: React.FC<{ d: string; p: number; len?: number; stroke?: string; w?: number; dash?: string }> = ({
  d, p, len = 2000, stroke = C.ink, w = SW, dash,
}) => (
  <path d={d} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={dash ?? `${len} ${len}`} strokeDashoffset={dash ? 0 : len * (1 - p)} opacity={p > 0 ? 1 : 0} />
);

/** Pulse running along a segment: a small highlight dot. */
export const Pulse: React.FC<{ x0: number; y0: number; x1: number; y1: number; p: number; r?: number; color?: string }> = ({ x0, y0, x1, y1, p, r = 9, color = C.highlight }) =>
  p <= 0 || p >= 1 ? null : <circle cx={x0 + (x1 - x0) * p} cy={y0 + (y1 - y0) * p} r={r} fill={color} stroke={C.ink} strokeWidth={3} />;

/** Tilted seal / stamp. */
export const Stamp: React.FC<{ text: string; w?: number; color?: string; size?: number }> = ({ text, w = 220, color = C.accent, size = 34 }) => (
  <g transform="rotate(-8)">
    <rect x={-w / 2} y={-32} width={w} height={64} rx={10} fill={C.paper} stroke={color} strokeWidth={6} />
    <Txt size={size} color={color} weight={900} ls={1}>{text}</Txt>
  </g>
);

/** Small supporting label ("machine", "customer"). */
export const Tag: React.FC<{ text: string; size?: number; color?: string }> = ({ text, size = 26, color = C.ink }) => (
  <Txt size={size} color={color} weight={700}>{text}</Txt>
);

/** Elliptical floor shadow. */
export const Floor: React.FC<{ w?: number; o?: number }> = ({ w = 300, o = 1 }) => <ellipse rx={w / 2} ry={w * 0.06} fill={C.ink} opacity={0.08 * o} />;

/** Game controller. */
export const Controller: React.FC<{ w?: number }> = ({ w = 240 }) => {
  const h = w * 0.5;
  return (
    <g>
      <path d={`M ${-w / 2 + h * 0.3} ${-h / 2} L ${w / 2 - h * 0.3} ${-h / 2} Q ${w / 2} ${-h / 2} ${w / 2} ${0} L ${w / 2 - h * 0.05} ${h * 0.55} Q ${w / 2 - h * 0.25} ${h * 0.8} ${w * 0.22} ${h * 0.35} L ${-w * 0.22} ${h * 0.35} Q ${-w / 2 + h * 0.25} ${h * 0.8} ${-w / 2 + h * 0.05} ${h * 0.55} L ${-w / 2} 0 Q ${-w / 2} ${-h / 2} ${-w / 2 + h * 0.3} ${-h / 2} Z`}
        fill={C.positive} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
      <g transform={`translate(${-w * 0.25} ${-h * 0.05})`}>
        <rect x={-w * 0.07} y={-w * 0.022} width={w * 0.14} height={w * 0.044} fill={C.ink} rx={2} />
        <rect x={-w * 0.022} y={-w * 0.07} width={w * 0.044} height={w * 0.14} fill={C.ink} rx={2} />
      </g>
      <circle cx={w * 0.2} cy={-h * 0.15} r={w * 0.035} fill={C.highlight} stroke={C.ink} strokeWidth={3} />
      <circle cx={w * 0.29} cy={-h * 0.0} r={w * 0.035} fill={C.accent} stroke={C.ink} strokeWidth={3} />
      <circle cx={w * 0.11} cy={-h * 0.0} r={w * 0.035} fill={C.warm} stroke={C.ink} strokeWidth={3} />
      <circle cx={w * 0.2} cy={h * 0.15} r={w * 0.035} fill={C.paper} stroke={C.ink} strokeWidth={3} />
    </g>
  );
};

/** Camera: brings world point (fx, fy) to stage point (tx, ty) with zoom z. */
export const Cam: React.FC<{ z: number; fx: number; fy: number; tx: number; ty: number; children: React.ReactNode }> = ({ z, fx, fy, tx, ty, children }) => (
  <g transform={`translate(${tx} ${ty}) scale(${z}) translate(${-fx} ${-fy})`}>{children}</g>
);
