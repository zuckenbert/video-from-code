import { Easing, interpolate } from 'remotion';

// Three named curves, no loose beziers in the scenes.
export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // arrival: fast, then settles
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera travel
  in: Easing.bezier(0.7, 0, 0.84, 0), // exit
};

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 0 -> 1 between from and from+dur (frames), arrival easing. */
export const arrive = (f: number, from: number, dur = 24) => interpolate(f, [from, from + dur], [0, 1], { ...clamp, easing: E.out });

/** 1 -> 0 between from and from+dur (frames). */
export const leave = (f: number, from: number, dur = 14) => interpolate(f, [from, from + dur], [1, 0], { ...clamp, easing: E.in });
