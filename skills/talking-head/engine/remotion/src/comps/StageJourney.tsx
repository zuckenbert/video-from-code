import React from 'react';
import {
  BuildingsIcon, BooksIcon, SealCheckIcon, PaperPlaneTiltIcon, ScalesIcon, HandCoinsIcon, WarningIcon, QuestionIcon, ArrowDownIcon,
} from '@phosphor-icons/react';
import { useT } from '../engine/Stage';
import { Beat, Card, Badge, Cable, Signature, Num, Roll, Y, sp, spc, fade, decay, SNAP } from '../engine/Story';
import { Person } from '../engine/people';

/*
 * Example journey for style 5 (stage 960x720, no text in the animation except a kinetic number).
 * Story: one hub, many pieces, a problem nobody owns -> everything becomes one -> a number.
 * Each happening is tied to a word in story.beats of src/data/speaker.json. Replace the icons and the
 * scenes with your own story; keep the vocabulary (Card, Badge, Cable, Signature, Num, Roll, springs).
 * Words that repeat in the speech need [word, after] in the beats (at() is case-insensitive).
 */
const IC = 72;
const ICONS = [
  <BooksIcon size={IC} weight="duotone" />, <SealCheckIcon size={IC} weight="duotone" />, <PaperPlaneTiltIcon size={IC} weight="duotone" />, <ScalesIcon size={IC} weight="duotone" />, <HandCoinsIcon size={IC} weight="duotone" />,
];
const XS = [110, 295, 480, 665, 850];

type K = { ask: number; many: number; items: number[]; sign: number; problem: number; nobody: number; one: number; link: number; stamp: number; cta?: number; focus?: number; unfocus?: number; pulse?: number; num?: number; cells?: number; end: number };

/** Resolve the beats once per frame from the transcript (throws with the missing word if a beat is wrong). */
export const keys = (p: Person): K => {
  const st = p.cfg.story!;
  const B = st.beats, b = p.tr.beat, opt = (k: string) => (B[k] && p.tr.has(B[k]) ? b(B[k]) : undefined);
  const many = b(B.many);
  const items = st.items && st.items.length === 5 ? st.items.map(b) : XS.map((_, i) => many + 0.3 + i * 0.25);
  return {
    ask: b(B.ask), many, items, sign: opt('sign') ?? items[4] + 0.4, problem: b(B.problem), nobody: b(B.nobody),
    one: b(B.one), link: b(B.link), stamp: b(B.stamp), cta: opt('cta'), focus: opt('focus'), unfocus: opt('unfocus'), pulse: opt('pulse'),
    num: st.number ? b(st.number.at) : undefined, cells: st.number?.cells ? b(st.number.cells) : undefined, end: p.dur,
  };
};

/** A hub, a question, five cards that fill in, signatures, a problem, and nobody owns it. */
const Count: React.FC<{ k: K }> = ({ k }) => {
  const { t } = useT();
  const hub: [number, number] = [480, 170];
  const q = sp(t, k.ask + 0.3) * (1 - fade(t, k.many - 0.2, 0.3));
  const bad = sp(t, k.problem - 0.05, SNAP);
  const gone = fade(t, k.nobody - 0.05, 0.6);
  const shake = decay(t, k.problem, 9, 0.7) * 4;
  return (
    <Beat inS={k.ask - 0.2} outS={k.one - 0.25}>
      {XS.map((x, i) => <Cable key={i} a={hub} b={[x, 540 - 85]} draw={spc(t, k.many + i * 0.08)} wobble={3} bend={0.4} color={gone > 0.5 ? Y.soft : Y.ink} dashed={gone > 0.5} />)}
      <Card x={hub[0]} y={hub[1]} w={150} h={150} p={sp(t, k.ask)} ink dim={gone * 0.5}><BuildingsIcon size={80} weight="duotone" /></Card>
      <Badge x={580} y={100} p={q} size={80} rot={12}><QuestionIcon size={52} weight="bold" /></Badge>
      {XS.map((x, i) => {
        const slot = sp(t, k.many + i * 0.09);
        const ic = sp(t, k.items[i] - 0.05, SNAP);
        return (
          <Card key={i} x={x} y={540} p={slot} shake={shake * (i % 2 ? 1 : -1)} dim={gone * 0.75} rot={(i - 2) * 2}>
            <div style={{ scale: `${Math.min(1.1, ic)}`, opacity: Math.min(1, ic) }}>{ICONS[i]}</div>
            <Signature draw={spc(t, k.sign + 0.1 + i * 0.08, { damping: 30, stiffness: 60 })} />
          </Card>
        );
      })}
      <Badge x={480} y={360} p={bad} red size={92}><WarningIcon size={56} weight="fill" /></Badge>
      <Badge x={580} y={100} p={sp(t, k.nobody + 0.2)} size={80} rot={-10}><QuestionIcon size={52} weight="bold" /></Badge>
    </Beat>
  );
};

/** One platform: dark card grows, the five drop into slots, accent cables link them, stamp, optional focus and arrow. */
const One: React.FC<{ k: K }> = ({ k }) => {
  const { t } = useT();
  const inS = k.one - 0.25, outS = k.num !== undefined ? k.num - 0.2 : k.end + 5;
  const grow = sp(t, k.one - 0.1, { damping: 14, stiffness: 120, mass: 1 });
  const xs = [160, 320, 480, 640, 800], cy = 400;
  const pulse = k.pulse !== undefined ? 1 + 0.04 * sp(t, k.pulse, SNAP) * (1 - fade(t, k.pulse + 0.5, 0.4)) : 1;
  const focus = k.focus !== undefined ? spc(t, k.focus, SNAP) * (k.unfocus !== undefined ? 1 - spc(t, k.unfocus, SNAP) : 1) : 0;
  const stamp = sp(t, k.stamp, SNAP);
  return (
    <Beat inS={inS} outS={outS}>
      <Roll x={110} y={110} from="5" to="1" size={150} k={spc(t, k.one + 0.3, { damping: 15, stiffness: 150, mass: 0.9 })} p={sp(t, k.one - 0.2)} />
      <Card x={480} y={cy} w={880} h={330} p={grow * pulse} ink />
      {xs.slice(1).map((x, i) => <Cable key={i} a={[xs[i] + 68, cy]} b={[x - 68, cy]} draw={spc(t, k.link + i * 0.07, SNAP)} color={Y.accent} width={6} bend={0.5} />)}
      {xs.map((x, i) => {
        const d = sp(t, k.one + 0.1 + i * 0.1);
        const isFocus = i === 2;
        return <Card key={i} x={x} y={cy - (1 - Math.min(1, d)) * 260 - (isFocus ? focus * 26 : 0)} w={132} h={150} p={Math.min(1.08, d)} dim={isFocus ? 0 : focus * 0.6} rot={(1 - Math.min(1, d)) * (i % 2 ? 14 : -14)}>{ICONS[i]}</Card>;
      })}
      <Badge x={880} y={cy - 150} p={stamp} size={118} rot={-14 + 10 * Math.min(1, stamp)}><SealCheckIcon size={76} weight="fill" /></Badge>
      {k.cta !== undefined && <div style={{ position: 'absolute', left: 480, top: 660, translate: '-50% -50%', scale: `${sp(t, k.cta)}`, color: Y.ink }}>
        <div style={{ translate: `0 ${Math.abs(Math.sin((t - k.cta) * 4)) * -14}px` }}><ArrowDownIcon size={96} weight="bold" /></div></div>}
    </Beat>
  );
};

/** Kinetic number with overshoot and ten cells (only a number the speaker said). */
const Pct: React.FC<{ k: K; value: number; suffix?: string }> = ({ k, value, suffix }) => {
  const { t } = useT();
  const at = k.num!;
  const g = sp(t, at - 0.05, { damping: 13, stiffness: 60, mass: 1.2 });
  const n = Math.round(Math.min(value * 1.05, Math.max(0, value * g)));
  const cells = k.cells ?? at + 0.4;
  return (
    <Beat inS={at - 0.15} outS={k.end + 5}>
      <Num x={480} y={300} value={String(n)} sub={suffix} p={sp(t, at - 0.15)} size={300} />
      {[...Array(10)].map((_, i) => <div key={i} style={{ position: 'absolute', left: 480 + (i - 4.5) * 72, top: 560, translate: '-50% -50%', width: 48, height: 48, borderRadius: 12, border: `4px solid ${Y.ink}`, background: i < Math.round(value / 10) ? Y.ink : 'transparent', scale: `${sp(t, cells - 0.2 + i * 0.06)}` }} />)}
    </Beat>
  );
};

export const StageJourney: React.FC<{ person: Person }> = ({ person }) => {
  const k = keys(person);
  const num = person.cfg.story!.number;
  return (
    <>
      <Count k={k} />
      <One k={k} />
      {num && <Pct k={k} value={num.value} suffix={num.suffix} />}
    </>
  );
};
