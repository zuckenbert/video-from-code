// Time is always absolute narration seconds (t). Every function is pure: (t, start, duration) -> value.
export const FPS = 30;
export const W = 1080;
export const H = 1920;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

const bounceOut = (p: number) => {
  const n = 7.5625, d = 2.75;
  if (p < 1 / d) return n * p * p;
  if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
  if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
  return n * (p -= 2.625 / d) * p + 0.984375;
};

export const ease = {
  linear: (p: number) => p,
  out: (p: number) => 1 - Math.pow(1 - p, 3),
  in: (p: number) => p * p * p,
  inOut: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  back: (p: number) => {
    const c1 = 2.2, c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  },
  bounce: bounceOut,
  elastic: (p: number) =>
    p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
};

/** 0..1 between a and a+d, eased. */
export const prog = (t: number, a: number, d: number, e: (p: number) => number = ease.out) => e(clamp((t - a) / d));

/** Entry scale with overshoot (0 before a). */
export const pop = (t: number, a: number, d = 0.32) => (t < a ? 0 : ease.back(clamp((t - a) / d)));

/** Fast exit scale (1 until a, 0 at a+d). */
export const out = (t: number, a: number, d = 0.2) => 1 - ease.in(clamp((t - a) / d));

/** Vertical offset of a drop with bounce: starts at -h, ends at 0. */
export const drop = (t: number, a: number, d = 0.5, h = 700) => (t < a ? -h * 3 : -(1 - bounceOut(clamp((t - a) / d))) * h);

/** Decaying shake after an impact at a. */
export const shake = (t: number, a: number, amp = 10, d = 0.3) =>
  t < a || t > a + d ? 0 : amp * Math.sin((t - a) * 70) * (1 - (t - a) / d);

/** Squash on landing: [sx, sy]. */
export const squash = (t: number, a: number, k = 0.22, d = 0.28): [number, number] => {
  if (t < a || t > a + d) return [1, 1];
  const p = (t - a) / d;
  const s = Math.sin(p * Math.PI) * (1 - p) * k * 2;
  return [1 + s, 1 - s];
};

/** Visible in the window [a, b). */
export const vis = (t: number, a: number, b = Infinity) => t >= a && t < b;

/** Position on a straight line between two points. */
export const along = (p: number, x0: number, y0: number, x1: number, y1: number) => [lerp(x0, x1, p), lerp(y0, y1, p)] as const;

/** Arc (thrown objects): y rises hgt in the middle. */
export const arc = (p: number, x0: number, y0: number, x1: number, y1: number, hgt = 200) =>
  [lerp(x0, x1, p), lerp(y0, y1, p) - Math.sin(p * Math.PI) * hgt] as const;

/** Visible item count in a stepped multiplication: steps = [[t, n], ...]. */
export const stepCount = (t: number, steps: [number, number][]) => {
  let n = 0;
  for (const [at, k] of steps) if (t >= at) n = k;
  return n;
};

export type Cue = [number, string, number?]; // [t, sfx name, volume]
