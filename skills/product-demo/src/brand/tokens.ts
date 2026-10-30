// Default theme (the repo palette). The storyboard overrides any key in `brand`.
// Roles: ink = dark canvas (stage, cards); paper = window fill; grey = secondary text and metadata;
// line = structure (card rule, chapter bar, timer); accent = the ONE next move per scene (click ripple,
// card sub line), never a large fill; white = text on the dark canvas.
// `wordmark` is optional: a path relative to the video project folder (e.g. "assets/logo.svg"); empty = no logo on cards.
export const DEFAULT_BRAND = {
  ink: '#12141A', paper: '#F3EFE5', grey: '#8195B0', line: '#1D4AA5', accent: '#EF681E', white: '#F3EFE5',
  wordmark: '' as string, url: 'app.example.com',
  font: 'Manrope', mono: 'IBM Plex Mono',
};
export type Brand = typeof DEFAULT_BRAND;
export const T = {
  hero: { fontSize: 180, fontWeight: 600, letterSpacing: '-0.04em', lineHeight: 0.95 },
  secondary: { fontSize: 52, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.15 },
  caption: { fontSize: 40, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.15 },
  small: { fontSize: 34, fontWeight: 500, letterSpacing: '0', lineHeight: 1.2 },
} as const;
