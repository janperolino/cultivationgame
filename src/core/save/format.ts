// The save envelope, its version number and the migrations that bring old saves up to date.
import { z } from 'zod';
import { LADDERS } from '../../content/cultivation.ts';
import { FRESH_WHEEL, SLEEP_HOURS, type HourKind } from '../../content/hours.ts';
import { METHOD_MASTERY } from '../../content/mastery.ts';
import { FIT_SPEED, hasMethod, method, methodFit } from '../../content/methods.ts';
import { REALM_IDS, type RealmId } from '../../content/realms.ts';
import { defaultElements, root, ROOT_IDS, type RootId } from '../../content/roots.ts';
import { TREES } from '../../content/trees/index.ts';
import { climbedStages, stageGrowth } from '../growth.ts';
import { practiceNeed } from '../mastery.ts';
import {
  DAYS_PER_YEAR,
  GameStateSchema,
  PLAYER_ID,
  START_AGE,
  freshCards,
  startingPeople,
  STARTING_UNLOCKS,
  type Cultivator,
  type GameState,
  type Ladder,
} from '../state.ts';
import { card, hasCard } from '../../content/cards/index.ts';
import { peopleIn } from '../people.ts';
import { flipHour } from '../wheel.ts';

/** Bump this and add a migration whenever the saved shape changes. */
export const SAVE_VERSION = 13;

/**
 * Node ids the placement pass renamed (P2.5, design § Cultivation, The placement pass), old to
 * new. The v12 migration carries a learned node across; the v5 one reads old ids through it, since
 * it checks owned nodes against today's trees.
 */
export const RENAMED_NODES: Readonly<Record<string, string>> = {
  'qi-sword-riding-breath': 'qi-treading-air',
  'body-iron-fists': 'body-ox-hands',
  'soul-furnace-hands': 'soul-unshaking-fingers',
  'fist-bone-hardening': 'fist-hard-knuckle-bones',
};

const renamedNode = (id: string) => RENAMED_NODES[id] ?? id;

/**
 * Before character creation (P1.7), every life was the cave orphan who went along: the garrison's
 * method, its first technique and its routine. The old migrations hand these to old lives.
 */
const PLACEHOLDER_TECHNIQUE = 'rampart-palm';
const PLACEHOLDER_ROUTINE = 'watch-rotation';

/** The first hour's cards an old life already has the gifts of, so they don't come again. */
const CARDS_HELD: Record<string, (p: Raw) => boolean> = {
  'first-technique-cave-along': (p) => PLACEHOLDER_TECHNIQUE in ((p.techniques ?? {}) as Raw),
  'errand-cave-along': (p) => 'stone-bearing' in ((p.methods ?? {}) as Raw),
  'lamp-keeper': (p) => 'still-lantern' in ((p.methods ?? {}) as Raw),
};

/** The mastery level old lives' methods are put at in v5, so they lose no speed: Mastery. */
const MIGRATED_MASTERY = 2;

/**
 * What each P1.3 tree node cost, for the v6 refund. Every P1.3 id lives on in the redrawn trees,
 * though most now sit deeper on a branch.
 */
const P13_NODE_COSTS: Record<string, number> = {
  'qi-sensing-breath': 10,
  'qi-smooth-meridians': 25,
  'qi-stone-swallowing': 30,
  'qi-deep-dantian': 40,
  'qi-veiled-aura': 40,
  'qi-pure-strand': 60,
  'qi-patient-gate': 50,
  'qi-steady-return': 45,
  'qi-thrifty-circulation': 35,
  'qi-ninefold-circulation': 120,
  'qi-foundation-circulation': 150,
  'qi-liquid-qi': 300,
  'qi-stone-furnace': 350,
  'qi-hidden-realm': 400,
  'qi-sword-riding-breath': 300,
  'qi-condensed-strand': 500,
  'qi-gate-patience': 600,
  'qi-tidal-return': 450,
  'qi-frugal-seals': 450,
  'qi-bedrock-foundation': 1000,
  'body-tempered-skin': 10,
  'body-iron-skin': 30,
  'body-ox-stamina': 45,
  'body-blood-circulation': 40,
  'body-bitter-herb-gut': 30,
  'body-bone-forging': 35,
  'body-marrow-cleansing': 60,
  'body-hardy-frame': 40,
  'body-sinew-spring': 50,
  'body-bronze-body': 120,
  'body-foundation-flesh': 150,
  'body-stone-hide': 350,
  'body-furnace-body': 450,
  'body-blood-refining': 450,
  'body-hundred-poisons': 400,
  'body-iron-bones': 350,
  'body-renewed-marrow': 600,
  'body-grounding-marrow': 500,
  'body-dragon-sinews': 500,
  'body-silver-body': 1000,
  'soul-inner-lamp': 10,
  'soul-clear-mind': 35,
  'soul-quick-study': 50,
  'soul-spreading-sense': 40,
  'soul-still-water': 40,
  'soul-night-reading': 45,
  'soul-keen-comprehension': 80,
  'soul-steady-hands': 35,
  'soul-dream-recollection': 55,
  'soul-sea-of-consciousness': 120,
  'soul-foundation-soul': 150,
  'soul-enlightened-reading': 350,
  'soul-lucid-practice': 450,
  'soul-sense-sweep': 350,
  'soul-soul-armor': 400,
  'soul-bright-sea': 450,
  'soul-heart-demon-ward': 500,
  'soul-furnace-hands': 400,
  'soul-split-attention': 600,
  'soul-nascent-spark': 1000,
};

/** The seclusion plan's default shares from P1.2 to P1.3, which the v4 wheel replaced. */
const OLD_SHARES = { qi: 60, body: 15, soul: 10, study: 10, practice: 5 };

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
  // placeholder true root on the garrison's standard method that P1.7 replaces.
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
        plan: { shares: { ...OLD_SHARES }, auto: 'safe', burnStones: true },
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
  // method get its first technique, which a card hands out from P1.7 on.
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
  // v3, P1.3: seclusion days split by shares among slots that flags opened. v4 runs the day on a
  // wheel of twelve hours, filled by the default rule: all qi with 子 and 丑 asleep, then one hour
  // flipped for study and one for practice where those slots had opened, and sleep freed from
  // Foundation up. Every ladder climbs with an active method: the life's method on qi, nothing on
  // body and soul, which keep their bars but gain no more from their hours until an art turns up.
  // The root gets its default elements. Placeholder lives on the garrison's method learn its Watch
  // Rotation, as new ones do until P1.7.
  3: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const flags = Array.isArray(p.flags) ? (p.flags as string[]) : [];
    const method = typeof p.method === 'string' ? p.method : null;
    const rootId: RootId = ROOT_IDS.includes(p.root as RootId) ? (p.root as RootId) : 'true';
    const elements = defaultElements(rootId);
    let wheel: HourKind[] = [...FRESH_WHEEL];
    const nextFlags = flags.filter((f) => !f.startsWith('seclusion-'));
    for (const kind of ['study', 'practice'] as const) {
      if (!flags.includes(`seclusion-${kind}`)) continue;
      wheel = flipHour(wheel, elements, kind).wheel;
      nextFlags.push(`hours-${kind}`);
    }
    const qi = (p.qi ?? {}) as Raw;
    if (qi.realm !== undefined && qi.realm !== 'qi-condensation') {
      wheel = wheel.map((k, i) => (SLEEP_HOURS.includes(i) ? 'qi' : k));
      nextFlags.push('sleep-freed');
    }
    const plan = (p.plan ?? {}) as Raw;
    const rest = { ...p };
    delete rest.method;
    return {
      ...old,
      version: 4,
      state: {
        ...s,
        player: {
          ...rest,
          root: rootId,
          rootElements: elements,
          methods: method ? [method] : [],
          activeMethods: { qi: method, body: null, soul: null },
          wheel,
          routines: method === 'garrison-standard' ? [PLACEHOLDER_ROUTINE] : [],
          savedRoutines: [],
          plan: { auto: plan.auto, burnStones: plan.burnStones },
          flags: nextFlags,
        },
      },
    };
  },
  // v4, P1.4: methods were a list of ids, all at one speed. v5 gives each a mastery, and the
  // life's methods are the white tier 1 chapters of their lines, put at Mastery so old lives lose
  // no speed; none drinks an upkeep. Each ladder's climbed stages record the growth of the method
  // active on it now, or none, which for a white method on a fitting root is nothing. No
  // contemplation source has been drawn on yet.
  4: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const ids = Array.isArray(p.methods)
      ? (p.methods as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];
    const methods = Object.fromEntries(
      ids.map((id) => {
        const tier = hasMethod(id) ? method(id).tier : 1;
        return [
          id,
          { practice: practiceNeed(METHOD_MASTERY, tier, MIGRATED_MASTERY), fedUntil: 0 },
        ];
      }),
    );
    const active = (p.activeMethods ?? {}) as Raw;
    const rootId: RootId = ROOT_IDS.includes(p.root as RootId) ? (p.root as RootId) : 'true';
    const ladders = Object.fromEntries(
      LADDERS.map((which) => {
        const l = (p[which] ?? {}) as Raw;
        const id = active[which];
        const m = typeof id === 'string' && hasMethod(id) ? method(id) : null;
        const fit = m && which === 'qi' ? FIT_SPEED[methodFit(m, root(rootId).kind)] : 1;
        const known = REALM_IDS.includes(l.realm as RealmId) && typeof l.stage === 'number';
        const growth = known
          ? climbedStages(l as unknown as Ladder).map((st) =>
              stageGrowth(m, fit, which, st.realm, st.stage),
            )
          : [];
        return [which, { ...l, growth }];
      }),
    );
    return {
      ...old,
      version: 5,
      state: { ...s, player: { ...p, ...ladders, methods, contemplation: {} } },
    };
  },
  // v5, P1.5: the P1.3 trees, ten nodes a tier on a grid. v6 redraws them at 25 to 30 a tier in
  // branches, opened through the capstone. A learned node stays where it survives and everything
  // it now grows from stays too; the rest go, refunding the insight they cost.
  5: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const owned = Array.isArray(p.nodes)
      ? (p.nodes as unknown[]).filter((id): id is string => typeof id === 'string')
      : [];
    const cost = (id: string) =>
      P13_NODE_COSTS[id] ??
      P13_NODE_COSTS[Object.keys(RENAMED_NODES).find((old) => RENAMED_NODES[old] === id) ?? ''] ??
      0;
    // Today's trees use the renamed ids, so old ones are read through the renames here.
    for (const [i, id] of owned.entries()) owned[i] = renamedNode(id);
    const kept = new Set<string>();
    // Trees list each node after the nodes it grows from, so one pass settles every chain.
    for (const n of TREES.flatMap((t) => t.nodes)) {
      if (owned.includes(n.id) && n.requires.every((r) => kept.has(r))) kept.add(n.id);
    }
    const refund = owned.filter((id) => !kept.has(id)).reduce((sum, id) => sum + cost(id), 0);
    const insight = (p.insight ?? {}) as Raw;
    const current = typeof insight.current === 'number' ? insight.current : 0;
    return {
      ...old,
      version: 6,
      state: {
        ...s,
        player: {
          ...p,
          nodes: owned.filter((id) => kept.has(id)),
          insight: { ...insight, current: current + refund },
        },
      },
    };
  },
  // v6, P1.6: a chronicle of text lines, no talents, origin or card feed. v7 types the chronicle:
  // old lines keep their text as `legacy` events. A life on the garrison's method was the
  // placeholder cave orphan who went along, and becomes one, with the cards for what it already
  // holds marked drawn; any other gets no origin, so no origin card comes. Talents start empty.
  6: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const day =
      typeof (s.calendar as Raw | undefined)?.day === 'number'
        ? ((s.calendar as Raw).day as number)
        : 0;
    const garrison = 'garrison-standard' in ((p.methods ?? {}) as Raw);
    const chronicle = (Array.isArray(s.chronicle) ? (s.chronicle as Raw[]) : []).map((e) => ({
      day: typeof e.day === 'number' ? e.day : day,
      type: 'legacy',
      actors: [typeof p.id === 'string' ? p.id : PLAYER_ID],
      place: null,
      data: { kind: String(e.kind ?? ''), text: String(e.text ?? '') },
    }));
    const cards = freshCards(day);
    if (garrison) {
      for (const [id, held] of Object.entries(CARDS_HELD)) if (held(p)) cards.drawn[id] = day;
    }
    const unlocks = Array.isArray(s.unlocks) ? (s.unlocks as string[]) : [];
    return {
      ...old,
      version: 7,
      state: {
        ...s,
        chronicle,
        cards,
        unlocks: [...unlocks, ...STARTING_UNLOCKS.filter((u) => !unlocks.includes(u))],
        player: {
          ...p,
          talents: [],
          origin: garrison ? { id: 'cave-orphan', choice: 'along' } : null,
          place: garrison ? 'qm-anbian-fu' : null,
        },
      },
    };
  },
  // v7, P1.7: no person records. v8 gives a life the people its origin path knew on testing day,
  // and names them as actors on its testing day and on the cards that spoke of them, so their
  // logs start full.
  7: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const originRaw = (p.origin ?? null) as Cultivator['origin'];
    const testingDay = (typeof p.bornDay === 'number' ? p.bornDay : 0) + START_AGE * DAYS_PER_YEAR;
    const place = typeof p.place === 'string' ? p.place : null;
    const people = startingPeople(originRaw, testingDay, place);
    const withPeople = { ...p, people } as unknown as Cultivator;
    const chronicle = (Array.isArray(s.chronicle) ? (s.chronicle as Raw[]) : []).map((e) => {
      const actors = Array.isArray(e.actors) ? (e.actors as string[]) : [];
      const data = (e.data ?? {}) as Raw;
      let named: string[] = [];
      if (e.type === 'testing') named = Object.keys(people);
      if (e.type === 'card' && typeof data.card === 'string' && hasCard(data.card)) {
        const k = card(data.card);
        const texts = [
          k.title,
          k.text,
          ...k.choices.flatMap((c) => [c.pass.text, c.fail?.text ?? '']),
        ];
        named = peopleIn(withPeople, texts);
      }
      return { ...e, actors: [...actors, ...named.filter((id) => !actors.includes(id))] };
    });
    const unlocks = Array.isArray(s.unlocks) ? (s.unlocks as string[]) : [];
    return {
      ...old,
      version: 8,
      state: {
        ...s,
        chronicle,
        unlocks: unlocks.includes('people') ? unlocks : [...unlocks, 'people'],
        player: { ...p, people },
      },
    };
  },

  // v8, P1.8: no clock choice, and no record of which news you've read. v9 follows the life's
  // own realm, and counts everything known so far as read, so no old life opens covered in dots.
  8: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const people = Object.fromEntries(
      Object.entries((p.people ?? {}) as Record<string, Raw>).map(([id, r]) => {
        const actorDays = (Array.isArray(s.chronicle) ? (s.chronicle as Raw[]) : [])
          .filter((e) => Array.isArray(e.actors) && (e.actors as string[]).includes(id))
          .map((e) => (typeof e.day === 'number' ? e.day : 0));
        const heard = typeof r.heard === 'number' ? r.heard : 0;
        return [id, { ...r, seen: Math.max(heard, ...actorDays) }];
      }),
    );
    return {
      ...old,
      version: 9,
      state: { ...s, clock: null, player: { ...p, people } },
    };
  },

  // v9, P1.9: no manuals. v10 holds loose manuals; an old life holds none, and its methods' own
  // manuals come with the methods it knows.
  9: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    return { ...old, version: 10, state: { ...s, player: { ...p, manuals: [] } } };
  },

  // v10, P1.12: no pill toxicity. v11 holds the meter; an old life has taken no pills yet.
  10: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    return { ...old, version: 11, state: { ...s, player: { ...p, toxicity: 0 } } };
  },

  // v11, P2.2: nothing worn. v12 holds the gear squares, treasure slots and artifact bonds; an old
  // life wears nothing and has bonded with nothing.
  11: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const gear = { weapon: null, armor: null, ring: null, pouch: null, treasures: [] };
    return { ...old, version: 12, state: { ...s, player: { ...p, gear, bonds: {} } } };
  },

  // v12, P2.4: the placement pass's old node names. v13 learns the renamed ids (`RENAMED_NODES`);
  // a node learned under its old name is the same node, so nothing is refunded.
  12: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const nodes = Array.isArray(p.nodes)
      ? (p.nodes as unknown[]).map((id) => (typeof id === 'string' ? renamedNode(id) : id))
      : p.nodes;
    return { ...old, version: 13, state: { ...s, player: { ...p, nodes } } };
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
