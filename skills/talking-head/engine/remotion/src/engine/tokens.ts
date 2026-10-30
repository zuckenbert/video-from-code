import theme from '../data/theme.json';

// Video design tokens. Values come from src/data/theme.json (copied from examples/theme.json by setup.sh).
// One accent with one meaning ("what matters now"); `line` carries structure (rules, routes, series);
// loss red only for money lost or mismatch; ok green only for success (semantic, outside the palette on purpose).
type ThemeFile = {
  ink: string; paper: string; card: string; grey: string; greyMid: string; greyDark: string;
  line?: string; accent: string; accentOnLight: string; stage: string; loss: string; danger: string; ok: string;
  font: { family: string; files: Array<{ url: string; weight: string }> };
  mono?: { family: string; files: Array<{ url: string; weight: string }> };
  wordmark: string | null; wordmarkOnLight: string | null; url: string; locale: string;
};
export const THEME = theme as unknown as ThemeFile;

export const C = {
  ink: THEME.ink,             // dark stage
  paper: THEME.paper,         // light stage
  grey: THEME.grey,
  greyMid: THEME.greyMid,
  greyDark: THEME.greyDark,
  line: THEME.line ?? THEME.greyMid, // structure: rules, routes, chart series
  accent: THEME.accent,       // the only accent
  accentOnLight: THEME.accentOnLight,
  loss: THEME.loss,           // only for money lost / mismatch
  ok: THEME.ok,               // only for success / matched
  white: THEME.paper,         // text on the dark stage
} as const;

export const FONT = THEME.font.family;
// metadata only (kickers, chapter subs, labels)
export const MONO = `'${THEME.mono?.family ?? 'IBM Plex Mono'}', 'SF Mono', Menlo, monospace`;
export const T = {
  hero: { fontSize: 200, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 0.95 },
  statement: { fontSize: 104, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.0 },
  secondary: { fontSize: 48, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.15 },
  caption: { fontSize: 56, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.15 },
  small: { fontSize: 30, fontWeight: 500, letterSpacing: '0', lineHeight: 1.2 },
} as const;

export const SAFE = { x: 96, y: 64 };
export const W = 1920, H = 1080;
export const fmt = (n: number, decimals = 0) => n.toLocaleString(THEME.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
