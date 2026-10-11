// The save envelope, its version number and the migrations that bring old saves up to date.
import { z } from 'zod';
import { DEFAULT_SHARES } from '../../content/cultivation.ts';
import { PLACEHOLDER_TECHNIQUE } from '../../content/techniques.ts';
import { DAYS_PER_YEAR, GameStateSchema, PLAYER_ID, START_AGE, type GameState } from '../state.ts';

/** Bump this and add a migration whenever the saved shape changes. */
export const SAVE_VERSION = 3;

export const SaveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  /** Real time of the save, in ms since the epoch; offline time counts from here. */
  savedAt: z.number(),
  state: GameStateSchema,
});
export type Save = z.infer<typeof SaveSchema>;

export function makeSave(state: GameState, savedAt: number): Save {
  return { version: SAVE_VERSION, savedAt, state };
}

type Raw = Record<string, unknown>;

/**
 * migrations[n] turns a version n save into version n + 1. Each works on raw objects, since the
 * old shape no longer has a schema; the result is checked once, at the end.
 */
const migrations: Record<number, (old: Raw) => Raw> = {
  // v0, the first sketch: no version field, one flat character with `age` in years and a single
  // `qi` ladder, `insight` as a plain number and `stones` under `money`.
  0: (old) => {
    const c = (old.character ?? {}) as Raw;
    const qi = (old.qi ?? { realm: 'qi-condensation', stage: 1, bar: 0 }) as Raw;
    const age = typeof c.age === 'number' ? c.age : START_AGE;
    const insight = typeof old.insight === 'number' ? old.insight : 0;
    const name = String(c.name ?? 'Nameless');
    const mode = c.mode === 'gentle' ? 'gentle' : 'ironman';
    const day = age * DAYS_PER_YEAR;
    const fresh = () => ({ realm: 'qi-condensation', stage: 1, bar: 0 });
    return {
      version: 1,
      savedAt: typeof old.savedAt === 'number' ? old.savedAt : 0,
      state: {
        lineage: { id: String(old.seed ?? name), life: 1 },
        character: {
          name,
          pronouns: String(c.pronouns ?? 'they/them'),
          look: '',
          mode,
          bornDay: 0,
          lifespanBonus: 0,
        },
        calendar: { day },
        qi,
        body: fresh(),
        soul: fresh(),
        insight: { current: insight, earned: insight },
        stones: typeof old.money === 'number' ? old.money : 0,
        chronicle: Array.isArray(old.log)
          ? (old.log as unknown[]).map((text) => ({ day, kind: 'note', text: String(text) }))
          : [],
        unlocks: ['abode'],
        rewindCharges: mode === 'gentle' ? 1 : 0,
        rng: typeof old.rng === 'number' ? old.rng | 0 : 0,
      },
    };
  },
  // v1, P1.1: no cultivation yet. v2 adds the root, method, attributes, ladder grades and
  // setbacks, items, the seclusion plan, the glass and the end of a life. Old lives get the
  // placeholder true root on the garrison's standard method that P1.4 replaces.
  1: (old) => {
    const s = (old.state ?? {}) as Raw;
    const c = (s.character ?? {}) as Raw;
    const ladder = (l: unknown) => ({
      grades: [],
      unsettledUntil: 0,
      injuredUntil: 0,
      ...(l as Raw),
    });
    const rng = typeof s.rng === 'number' ? s.rng | 0 : 0;
    const unlocks = Array.isArray(s.unlocks) ? (s.unlocks as string[]) : [];
    return {
      ...old,
      version: 2,
      state: {
        ...s,
        character: { ...c, root: 'true', method: 'garrison-standard' },
        attributes: { agility: 10, fortune: 10, aptitude: 10 },
        qi: ladder(s.qi),
        body: ladder(s.body),
        soul: ladder(s.soul),
        items: {},
        plan: { shares: { ...DEFAULT_SHARES }, auto: 'safe', burnStones: true },
        glass: { seed: rng, fractures: 0, flares: 0 },
        ended: null,
        unlocks: [...new Set([...unlocks, 'abode', 'cultivate', 'seclusion-qi'])],
      },
    };
  },
  // v2, P1.2: one flat state. v3 moves what belongs to a cultivator into `player`, so the rules
  // can take a Cultivator; its milestone flags (seclusion slots, gates reached) move with it,
  // leaving the screen unlocks behind. The mode moves to the top. The one random state becomes
  // named streams seeded from the life's seed (the glass seed, which was the first rng state);
  // breakthroughs carry on from where the old stream stood. Placeholder lives on the garrison's
  // method get its first technique, which P1.4 hands out at creation from then on.
  2: (old) => {
    const s = (old.state ?? {}) as Raw;
    const c = (s.character ?? {}) as Raw;
    const glass = (s.glass ?? {}) as Raw;
    const unlocks = Array.isArray(s.unlocks) ? (s.unlocks as string[]) : [];
    const isFlag = (u: string) => u.startsWith('seclusion-') || u.startsWith('ready-');
    const method = typeof c.method === 'string' ? c.method : null;
    const technique = method === 'garrison-standard' ? PLACEHOLDER_TECHNIQUE : null;
    const seed = typeof glass.seed === 'number' ? glass.seed | 0 : 0;
    return {
      ...old,
      version: 3,
      state: {
        lineage: s.lineage,
        mode: c.mode,
        calendar: s.calendar,
        player: {
          id: PLAYER_ID,
          name: c.name,
          pronouns: c.pronouns,
          look: c.look,
          bornDay: c.bornDay,
          lifespanBonus: c.lifespanBonus,
          root: c.root,
          method,
          attributes: s.attributes,
          qi: s.qi,
          body: s.body,
          soul: s.soul,
          insight: s.insight,
          stones: s.stones,
          items: s.items,
          plan: s.plan,
          flags: unlocks.filter(isFlag),
          nodes: [],
          techniques: technique ? { [technique]: { practice: 0 } } : {},
          practicing: technique,
        },
        glass: s.glass,
        ended: s.ended,
        chronicle: s.chronicle,
        unlocks: [...unlocks.filter((u) => !isFlag(u)), ...(technique ? ['techniques'] : [])],
        rewindCharges: s.rewindCharges,
        seed,
        rng: { breakthrough: typeof s.rng === 'number' ? s.rng | 0 : seed },
      },
    };
  },
};

export class SaveError extends Error {}

/** The version a raw save claims; a save without one is v0. */
export function saveVersion(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('The save is not an object.');
  const v = (raw as Raw).version;
  if (v === undefined) return 0;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
    throw new SaveError(`The save has a bad version number: ${String(v)}.`);
  }
  return v;
}

/** Migrates a raw save of any known version and checks it. Throws SaveError if it can't. */
export function loadSave(raw: unknown): Save {
  let version = saveVersion(raw);
  if (version > SAVE_VERSION) {
    throw new SaveError(`The save is version ${version}, newer than this game (${SAVE_VERSION}).`);
  }
  let data = raw as Raw;
  while (version < SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) throw new SaveError(`No migration from save version ${version}.`);
    data = migrate(data);
    version += 1;
  }
  const parsed = SaveSchema.safeParse(data);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` at ${issue.path.join('.')}` : '';
    throw new SaveError(`The save failed its check${where}: ${issue?.message ?? 'unknown'}.`);
  }
  return parsed.data;
}
