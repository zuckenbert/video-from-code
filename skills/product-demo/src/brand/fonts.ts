import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
// setup.sh downloads the fonts (Manrope and IBM Plex Mono, both SIL OFL 1.1, license files next to them) into assets/;
// timeline.mjs copies them to <project>/assets/. Manrope = display and body; IBM Plex Mono = metadata (url bar, timer).
export const fontsReady = Promise.all([
  loadFont({ family: 'Manrope', url: staticFile('assets/Manrope-Medium.ttf'), weight: '500' }),
  loadFont({ family: 'Manrope', url: staticFile('assets/Manrope-SemiBold.ttf'), weight: '600' }),
  loadFont({ family: 'IBM Plex Mono', url: staticFile('assets/IBMPlexMono-Medium.ttf'), weight: '500' }),
]);
