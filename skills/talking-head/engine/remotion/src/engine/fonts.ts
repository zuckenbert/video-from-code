import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
import { THEME } from './tokens';

export const fontsReady = Promise.all([
  ...THEME.font.files.map((f) => loadFont({ family: THEME.font.family, url: staticFile(f.url), weight: f.weight })),
  ...(THEME.mono?.files ?? []).map((f) => loadFont({ family: THEME.mono!.family, url: staticFile(f.url), weight: f.weight })),
]);
