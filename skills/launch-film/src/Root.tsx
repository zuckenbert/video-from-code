import React from 'react';
import { Composition } from 'remotion';
import { LaunchFilm, type Cut, type Film } from './LaunchFilm';
import film from './film.json';
import cutEn from './cuts/cut_en.json';
import cutPt from './cuts/cut_pt.json';

// Same composition, two languages: the archival audio is the same, only cards, pills and the typed text change.
const F = film as Film;
const common = { durationInFrames: Math.round(F.duration * F.fps), fps: F.fps, width: F.width, height: F.height };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="LaunchFilm-EN" component={LaunchFilm} defaultProps={{ lang: 'en', film: F, cut: cutEn as Cut }} {...common} />
    <Composition id="LaunchFilm-PT" component={LaunchFilm} defaultProps={{ lang: 'pt', film: F, cut: cutPt as Cut }} {...common} />
  </>
);
