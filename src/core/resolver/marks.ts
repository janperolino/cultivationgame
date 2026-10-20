// A leak's mark and the parting oath (design § Professions, people and powers, Guarded methods;
// O5). A leak traced to someone marks their face for the power, as its death talisman would: a
// trace whose `method` is the copy that leaked, erased as any trace is. Restitution, a fine paid
// or joining lifts it, and a clean parting, a fine or restitution swears the heart-demon oath 心魔誓
// never to teach or sell the power's methods: they keep what they learned, and use it freely.
import { copyChapter } from '../../content/copies.ts';
import {
  endState,
  startState,
  statesOf,
  type LastingState,
  type RealmStage,
  type World,
} from './world.ts';

export type Mark = LastingState & {
  data: { kind: 'trace'; power: string | null; strength: RealmStage; method?: string };
};

/**
 * What a betrayal marks when its traitor knows none of the power's copies, or it guards none (a
 * gang): "its secrets", a chapter 1 leak priced as a white chapter 1 method's copy (the checkpoint).
 */
export function secretsOf(power: string): string {
  return 'secrets:' + power;
}
export function isSecrets(thing: string): boolean {
  return thing.startsWith('secrets:');
}

/** A leak's chapter: its copy's, or 1 for a power's secrets. */
export function leakChapter(thing: string): number {
  return isSecrets(thing) ? 1 : copyChapter(thing);
}

/** Someone's leak marks, one a power. */
export function marksOf(w: World, who: string, day: number): Mark[] {
  return statesOf(w, who, 'trace', day).filter((t) => !!t.data.method) as Mark[];
}

/** The mark a power holds on someone's face for its leaked method, if any. */
export function markFor(w: World, who: string, power: string, day: number): Mark | undefined {
  return marksOf(w, who, day).find((t) => t.data.power === power);
}

/**
 * Marks a face for a power's leaked method, as strong as its death talisman would be; a second
 * leak keeps the one mark and raises it to the higher chapter.
 */
export function startMark(
  w: World,
  who: string,
  power: string,
  method: string,
  strength: RealmStage,
  day: number,
): World {
  const had = markFor(w, who, power, day);
  if (!had) return startState(w, who, { kind: 'trace', power, strength, method }, day).world;
  if (leakChapter(method) <= leakChapter(had.data.method!)) return w;
  return {
    ...w,
    states: w.states.map((s) => (s.id === had.id ? { ...had, data: { ...had.data, method } } : s)),
  };
}

/** The power's grudge for the leak goes with its mark: "Stole one of our methods". */
function dropGrudge(w: World, who: string, power: string): World {
  return {
    ...w,
    standing: w.standing.filter(
      (s) => !(s.power === power && s.about === who && s.row === 'stole-our-method'),
    ),
  };
}

/** Lifts a power's mark and its grudge: a fine paid, restitution made, or joining it. */
export function liftMark(w: World, who: string, power: string, day: number): World {
  const m = markFor(w, who, power, day);
  return dropGrudge(m ? endState(w, m.id) : w, who, power);
}

const oathKey = (power: string) => `never-teach:${power}`;

/** The heart-demon oath sworn to a power: its methods kept, never taught or sold. */
export function oathFor(w: World, who: string, power: string, day: number) {
  return statesOf(w, who, 'vow', day).find((v) => v.data.vow === oathKey(power));
}

/** Swears the oath, once a power. */
export function swearOath(w: World, who: string, power: string, day: number): World {
  if (oathFor(w, who, power, day)) return w;
  return startState(w, who, { kind: 'vow', vow: oathKey(power), way: power }, day).world;
}

/** A betrayal breaks the oath: nothing it learned is its to use any more. */
export function breakOath(w: World, who: string, power: string, day: number): World {
  const v = oathFor(w, who, power, day);
  return v ? endState(w, v.id) : w;
}
