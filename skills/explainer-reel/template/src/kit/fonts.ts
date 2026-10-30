import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// Fonts downloaded by scripts/setup.sh into public/fonts (SIL OFL 1.1, license files next to them).
// Manrope stops at 800: a fontWeight of 900 renders as 800.
const MANROPE: Array<[string, string]> = [['Medium', '500'], ['SemiBold', '600'], ['Bold', '700'], ['ExtraBold', '800']];
export const fontsReady = Promise.all([
  ...MANROPE.map(([w, n]) => loadFont({ family: 'Manrope', url: staticFile(`fonts/Manrope-${w}.ttf`), weight: n })),
  loadFont({ family: 'IBM Plex Mono', url: staticFile('fonts/IBMPlexMono-SemiBold.ttf'), weight: '600' }),
]);
