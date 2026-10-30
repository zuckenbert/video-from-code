import { Easing, interpolate } from 'remotion';

// Motion system: three named curves, no loose beziers inside scenes.
export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1),      // arrival: fast, then settles
  inOut: Easing.bezier(0.65, 0, 0.35, 1),   // camera travel
  in: Easing.bezier(0.7, 0, 0.84, 0),       // exit
};

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 -> 1 between from and from+dur (frames), arrival easing. */
export const arrive = (f: number, from: number, dur = 24) =>
  interpolate(f, [from, from + dur], [0, 1], { ...clamp, easing: E.out });

/** 1 -> 0 between from and from+dur. */
export const leave = (f: number, from: number, dur = 14) =>
  interpolate(f, [from, from + dur], [1, 0], { ...clamp, easing: E.in });

/** Presence window: enters at inF, leaves at outF. */
export const present = (f: number, inF: number, outF: number, dIn = 24, dOut = 14) =>
  Math.min(arrive(f, inF, dIn), leave(f, outF - dOut, dOut));

/** Default text entrance: rises and unblurs. */
export const riseStyle = (p: number, dy = 28) => ({
  opacity: p,
  translate: `0px ${(1 - p) * dy}px`,
  filter: p < 0.6 ? `blur(${(1 - p / 0.6) * 6}px)` : 'none',
});
