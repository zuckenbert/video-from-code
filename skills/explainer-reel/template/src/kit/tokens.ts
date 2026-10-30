// Theme: every color in the video comes from here. Scenes never use a hex value directly.
// The keys are roles, not hues, so a new theme is just new values. Keep it around a dozen colors:
// flat fills, one ink for every outline, one structural color for the extruded "3D" side and stamps.
// Default = the repo palette: Field #F3EFE5 (canvas), Ink #12141A, Cobalt #1D4AA5 (structure),
// Slate #8195B0 (secondary, inactive), Beacon #EF681E (the one thing that matters in the scene),
// plus tints of those. Beacon is never a dominant fill and never two focuses at once.
export const THEME = {
  bg: '#F3EFE5', //         page background (Field)
  dot: '#DFD8C8', //        dot grid on the background (Field shade)
  ink: '#12141A', //        outlines, text, dark bodies (Ink)
  accent: '#1D4AA5', //     extruded side of Box3D, stamps, fan blades (Cobalt)
  accentSoft: '#DCE3F1', // light tint of the accent (blueprints, boards)
  positive: '#BCCBEA', //   caption highlight, profit, "on" states (Cobalt tint)
  positiveDark: '#1D4AA5', // darker positive (fills under labels, growth) (Cobalt)
  highlight: '#EF681E', //  the one focus: coins, pins, lit windows, sparks (Beacon)
  paper: '#FBF9F4', //      light fills (boxes, bubbles, labels)
  warm: '#8195B0', //       roofs, secondary objects (Slate)
  negative: '#EF681E', //   X marks, alerts, losses: the anomaly (Beacon)
  line: '#C5CDD9', //       neutral gray (ground, inactive, costs) (Slate tint)
  muted: '#6E7F98', //      small secondary text (Slate, darkened for legibility on Field)
  sand: '#E6DFCF', //       ground, dirt, earth (Field shade)
};

export const C = THEME;

// Manrope for display and body, IBM Plex Mono only for metadata (kicker, labels, numbers in tables).
// setup.sh downloads both (with their OFL licenses) into public/fonts; kit/fonts.ts loads them.
export const FONT = 'Manrope, "Helvetica Neue", Helvetica, Arial, sans-serif';
export const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

// Stage: SVG with viewBox 1080 x 1100. In the reel it is drawn from y=470 of the screen and scaled
// 0.88 (REEL in Layout.tsx). Prime area: y 0..720. Lower band (y 770..1130) belongs to the
// character on the left; keep it free when the character is enabled.
export const STAGE_TOP = 360;
export const STAGE_W = 1080;
export const STAGE_H = 1100;
