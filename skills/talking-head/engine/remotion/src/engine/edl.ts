// Generic EDL: kept ranges in SOURCE seconds. Cuts always fall in the silence between words.
export type Segs = Array<[number, number]>;
export const edlDur = (segs: Segs) => segs.reduce((a, [i, o]) => a + (o - i), 0);
/** source time -> output time (null if that moment was cut). */
export const srcToOut = (segs: Segs, t: number): number | null => {
  let acc = 0;
  for (const [i, o] of segs) {
    if (t >= i && t <= o) return acc + (t - i);
    acc += o - i;
  }
  return null;
};
/** output time -> source time. */
export const outToSrc = (segs: Segs, t: number): number => {
  let acc = 0;
  for (const [i, o] of segs) {
    if (t <= acc + (o - i)) return i + (t - acc);
    acc += o - i;
  }
  return segs.length ? segs[segs.length - 1][1] : 0;
};
