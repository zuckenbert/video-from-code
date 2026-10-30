import React from 'react';
import { Img, staticFile } from 'remotion';
import { THEME } from './tokens';

/** Optional wordmark from theme.json (a file in public/). Renders nothing when not configured. */
export const hasWordmark = !!THEME.wordmark;
export const Wordmark: React.FC<{ height?: number; onLight?: boolean; style?: React.CSSProperties }> = ({ height = 48, onLight, style }) => {
  const src = onLight ? THEME.wordmarkOnLight ?? THEME.wordmark : THEME.wordmark;
  if (!src) return null;
  return <Img src={staticFile(src)} style={{ height, width: 'auto', ...style }} />;
};
