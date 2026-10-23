// The save envelope, its version number and the migrations that bring old saves up to date.
import { z } from 'zod';
import { DAYS_PER_MONTH } from '../../content/calendar.ts';
import { MEMORIES, type MemoryId } from '../../content/memories.ts';
import { LADDERS } from '../../content/cultivation.ts';
import type { Element } from '../../content/elements.ts';
import type { FirstId } from '../../content/firsts.ts';
import { GUIDE_IDS } from '../../content/guides.ts';
import { FRESH_WHEEL, SLEEP_HOURS, type HourKind } from '../../content/hours.ts';
import { METHOD_MASTERY, TECHNIQUE_MASTERY } from '../../content/mastery.ts';
import { hasTechnique, technique as techniqueOf } from '../../content/techniques.ts';
import { FIT_SPEED, hasMethod, method, methodFit } from '../../content/methods.ts';
import { REALM_IDS, type RealmId } from '../../content/realms.ts';
import { defaultElements, root, ROOT_IDS, type RootId } from '../../content/roots.ts';
import { TREES } from '../../content/trees/index.ts';
import { climbedStages, stageGrowth } from '../growth.ts';
import { MAX_MASTERY, practiceNeed } from '../mastery.ts';
import {
  DAYS_PER_YEAR,
  GameStateSchema,
  PLAYER_ID,
  START_AGE,
  freshCards,
  startingPeople,
  emptyCrafts,
  type Cultivator,
  type GameState,
  type Ladder,
} from '../state.ts';
import { card, hasCard } from '../../content/cards/index.ts';
import { peopleIn } from '../people.ts';
import { seeAll } from '../seen.ts';
import { flipHour } from '../wheel.ts';
import { emptyWorld } from '../resolver/world.ts';
import { generateRegion } from '../map/region.ts';
import { meetingShows, natureKey } from '../resolver/nature.ts';
import { hasPerson, person, REGARD_VALUES, TIE_IDS } from '../../content/people.ts';
import { hasShop, keeperName, shop } from '../../content/shops.ts';

/** Bump this and add a migration whenever the saved shape changes. */
export const SAVE_VERSION = 56;

/**
 * Node ids the placement pass renamed (P2.5, design § Cultivation, Every tree has the same
 * shape), the Sword tree's Sword Intent, now Sword Bearing (P2.6), and the Soul tree's Steady
 * Flame and the Wood Dao's Green Thumb, now Still Flame and Rooting Hand so the names are the
 * Alchemy and Spirit Farming capstones' (K2), old to new. The v12, v16 and v43
 * migrations carry a learned node across; the v5 one reads old ids through it, since it checks
 * owned nodes against today's trees.
 */
export const RENAMED_NODES: Readonly<Record<string, string>> = {
  'qi-sword-riding-breath': 'qi-treading-air',
  'body-iron-fists': 'body-ox-hands',
  'soul-furnace-hands': 'soul-unshaking-fingers',
  'fist-bone-hardening': 'fist-hard-knuckle-bones',
  'sword-sword-intent': 'sword-sword-bearing',
  'soul-steady-flame': 'soul-still-flame',
  'wood-green-thumb': 'wood-rooting-hand',
};

const renamedNode = (id: string) => RENAMED_NODES[id] ?? id;

/**
 * Before character creation (P1.7), every life was the cave orphan who went along: the garrison's
 * method, its first technique and its routine. The old migrations hand these to old lives.
 */
/** The starting unlocks as v7 knew them, under the screen ids of their day (v27 renames them). */
const V7_UNLOCKS = ['abode', 'cultivate', 'map', 'character', 'people', 'chronicle'];
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
        unlocks: [...unlocks, ...V7_UNLOCKS.filter((u) => !unlocks.includes(u))],
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

  // v13, P2.5: no record of what the player has looked at. v14 keeps one (core/seen.ts) and counts
  // everything an old life holds as seen, so nothing lights up on load. The v13 state is today's
  // shape but for `seen` (and v15's copies, of which it owns none), so the held lists are read
  // from it as it stands.
  13: (old) => {
    const s = (old.state ?? {}) as Raw;
    const player = { ...((s.player ?? {}) as Raw), copies: {} };
    const state = seeAll({ ...s, player, seen: {} } as unknown as GameState);
    return { ...old, version: 14, state: { ...s, seen: state.seen } };
  },

  // v14, P2.5d: what is known is all there is. v15 counts copies apart from knowing (core/reading.ts)
  // and keeps what the study hours read; an old life owns no copies and reads nothing, and since a
  // spine stands for anything known its bookcase looks as it did. `seen` gains its `copy` kind.
  14: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const seen = { ...((s.seen ?? {}) as Raw), copy: {} };
    const player = { ...p, copies: {}, reading: { copy: null, days: {} } };
    return { ...old, version: 15, state: { ...s, player, seen } };
  },

  // v15, P2.5e: one technique practiced and one copy read. v16 practices a list, as many as the
  // practice slots (core/techniques.ts), and reads from a queue (core/reading.ts): an old life keeps
  // its technique in the first slot (unless it is already at Origin, which no slot holds) and its
  // copy at the head of the queue, and no first copy has put its wheel aside.
  15: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const reading = (p.reading ?? {}) as Raw;
    const copy = typeof reading.copy === 'string' ? reading.copy : null;
    const known = (p.techniques ?? {}) as Record<string, { practice?: number }>;
    const id = typeof p.practicing === 'string' ? p.practicing : null;
    const atOrigin =
      id !== null &&
      hasTechnique(id) &&
      (known[id]?.practice ?? 0) >=
        practiceNeed(TECHNIQUE_MASTERY, techniqueOf(id).tier, MAX_MASTERY);
    const player = {
      ...p,
      practicing: id && !atOrigin ? [id] : [],
      reading: { queue: copy ? [copy] : [], days: reading.days ?? {}, wheel: null },
    };
    return { ...old, version: 16, state: { ...s, player } };
  },

  // v16, P2.5f: no Intent ladder, and the Sword tree's side path named Sword Intent. v17 keeps the
  // stage earned in each combat Dao (core/intent.ts), of which an old life has none, and learns
  // the side path's last node as Sword Bearing (`RENAMED_NODES`), refunding nothing. Mastery's
  // fourth level is Perfection now, but levels are stored as numbers, so nothing else moves.
  16: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const nodes = Array.isArray(p.nodes)
      ? (p.nodes as unknown[]).map((id) => (typeof id === 'string' ? renamedNode(id) : id))
      : p.nodes;
    return { ...old, version: 17, state: { ...s, player: { ...p, nodes, intent: {} } } };
  },

  // v17, P2.6: no record of first times, and before a qi method was known a copy took every waking
  // hour, the wheel as it was put aside (`reading.wheel`). v18 keeps the lineage's first times
  // (core/firsts.ts), counting every one an old life has passed as done (a study hour on its wheel,
  // a method taken up, a technique in a slot, a node learned, burning on), and the hints acted on,
  // with those it has outgrown (the orbs drawn, a breakthrough made, a card played) counted. The
  // whole-wheel reading goes: a wheel put aside comes back now with a study hour, as it would
  // have once the copy was read.
  17: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const reading = (p.reading ?? {}) as Raw;
    const aside = Array.isArray(reading.wheel) ? (reading.wheel as HourKind[]) : null;
    const elements = (Array.isArray(p.rootElements) ? p.rootElements : []) as Element[];
    const wheel = aside
      ? aside.includes('study')
        ? [...aside]
        : flipHour(aside, elements, 'study').wheel
      : ((Array.isArray(p.wheel) ? p.wheel : []) as HourKind[]);
    const hours = (k: HourKind) => wheel.includes(k);
    const active = (p.activeMethods ?? {}) as Record<string, unknown>;
    const queue = Array.isArray(reading.queue) ? (reading.queue as string[]) : [];
    const days = (reading.days ?? {}) as Raw;
    const methods = (p.methods ?? {}) as Raw;
    const techniques = (p.techniques ?? {}) as Record<string, { practice?: number }>;
    const manuals = (Array.isArray(p.manuals) ? p.manuals : []) as string[];
    const copyRead = Object.entries((p.copies ?? {}) as Record<string, number>).some(([id, n]) => {
      const [kind, of] = [id.slice(0, id.indexOf(':')), id.slice(id.indexOf(':') + 1)];
      if (!(n > 0)) return false;
      if (kind === 'method') return of in methods;
      if (kind === 'technique') return of in techniques;
      return manuals.includes(of);
    });
    const practicing = Array.isArray(p.practicing) ? p.practicing : [];
    const passed: Record<FirstId, boolean> = {
      copy: queue.length > 0 || Object.keys(days).length > 0 || copyRead,
      'study-hour': hours('study'),
      method: !!active.qi,
      technique:
        practicing.length > 0 ||
        hours('practice') ||
        Object.values(techniques).some((t) => (t.practice ?? 0) > 0),
      art: !!active.body || !!active.soul || hours('body') || hours('soul'),
      stones: ((p.plan ?? {}) as Raw).burnStones === true,
      node: Array.isArray(p.nodes) && p.nodes.length > 0,
      'go-in': false,
    };
    const firsts = (Object.keys(passed) as FirstId[]).filter((id) => passed[id]);
    const flags = (Array.isArray(p.flags) ? p.flags : []) as string[];
    const climbed = (['qi', 'body', 'soul'] as const).some((k) => {
      const l = (p[k] ?? {}) as Raw;
      return l.realm !== 'qi-condensation' || (typeof l.stage === 'number' && l.stage > 1);
    });
    const chronicle = (Array.isArray(s.chronicle) ? s.chronicle : []) as Raw[];
    const hints = [
      ...(flags.includes('drew-orb') ? ['orbs'] : []),
      ...(climbed ? ['breakthrough'] : []),
      ...(chronicle.some((e) => e.type === 'card') ? ['cards'] : []),
    ];
    const player = { ...p, wheel, reading: { queue, days } };
    const lineage = { ...((s.lineage ?? {}) as Raw), firsts, hints };
    return { ...old, version: 18, state: { ...s, lineage, player } };
  },

  // v18, P2.8: hints shown once a lineage, turned on or off in the browser's settings. v19 keeps
  // them with the life (Jan's call after P2.8): on, with the ones the lineage was shown.
  18: (old) => {
    const s = (old.state ?? {}) as Raw;
    const { hints, ...lineage } = (s.lineage ?? {}) as Raw;
    const shown = Array.isArray(hints) ? hints : [];
    return { ...old, version: 19, state: { ...s, lineage, hints: { on: true, shown } } };
  },

  // v19, P3.3: nothing lasted from going in. v20 adds the world: no heat, no deeds, no lasting
  // states or projects, nothing learned.
  19: (old) => {
    const s = (old.state ?? {}) as Raw;
    return { ...old, version: 20, state: { ...s, world: emptyWorld() } };
  },

  // v20, P3.4: a record held how someone felt as a regard of −3 to +3 and what they were to you as
  // a bond. v21 keeps feeling as memories and ties in the world: each regard becomes a memory "from
  // before" that never fades (−50, −25, −12, 0, +12, +25, +50), each bond but an acquaintance a
  // tie, and you know the outer leans of everyone you'd met.
  20: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const you = typeof p.id === 'string' ? p.id : 'player';
    const w = (s.world ?? {}) as Raw;
    let next = typeof w.next === 'number' ? w.next : 1;
    // Copies: the raw save may be read again (a slot's backup check), so it is never changed.
    const memories = [...(Array.isArray(w.memories) ? w.memories : [])] as Raw[];
    const ties = [...(Array.isArray(w.ties) ? w.ties : [])] as Raw[];
    const known = [...(Array.isArray(w.known) ? w.known : [])] as string[];
    const people: Raw = {};
    for (const [id, rec] of Object.entries((p.people ?? {}) as Record<string, Raw>)) {
      const { bond, regard, ...rest } = rec;
      people[id] = rest;
      if (
        typeof bond === 'string' &&
        bond !== 'acquaintance' &&
        (TIE_IDS as readonly string[]).includes(bond)
      ) {
        ties.push({ a: id, b: you, kind: bond, known: [] });
      }
      const value = typeof regard === 'number' ? (REGARD_VALUES[Math.round(regard)] ?? 0) : 0;
      if (value !== 0) {
        memories.push({
          id: next++,
          holder: id,
          about: you,
          row: 'from-before',
          value,
          day: typeof rec.met === 'number' ? rec.met : 0,
          known: [you],
        });
      }
      if (hasPerson(id)) {
        for (const k of meetingShows(person(id).nature)) {
          const key = natureKey(id, k);
          if (!known.includes(key)) known.push(key);
        }
      }
    }
    const world = {
      ...w,
      memories,
      standing: Array.isArray(w.standing) ? w.standing : [],
      ties,
      kept: w.kept ?? {},
      known,
      next,
    };
    return { ...old, version: 21, state: { ...s, player: { ...p, people }, world } };
  },

  // v21, P3.4: followers were a tie with no reason behind it, and karma, renown and infamy waited.
  // v22 keeps bonds, karma, renown and infamy, what you've heard and memberships in the world: no
  // karma, no name anywhere, nothing heard, no membership, and anyone who followed you does so out
  // of loyalty.
  21: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const you = typeof p.id === 'string' ? p.id : 'player';
    const w = (s.world ?? {}) as Raw;
    const day =
      typeof (s.calendar as Raw | undefined)?.day === 'number' ? (s.calendar as Raw).day : 0;
    const ties = (Array.isArray(w.ties) ? w.ties : []) as Raw[];
    const bonds = ties
      .filter((t) => t.kind === 'follower' && t.b === you && typeof t.a === 'string')
      .map((t) => ({ follower: t.a, leader: you, kind: 'loyalty', since: day, seen: day }));
    const world = { ...w, bonds, karma: {}, fame: {}, heard: [], members: [] };
    return { ...old, version: 22, state: { ...s, world } };
  },

  // v22, P3.4b: stones were one count of low-grade, and armor came whole to every fight. v23 holds
  // the higher grades as their own counts and silver as the mortal purse (both empty, every old
  // stone counted low), keeps wear on armor (none yet), each shop's month, what was taken from whom
  // and the storage rings that won't open yet (nothing yet), and renames the Mending Pill the Spring-Returning Pill its hanzi says.
  22: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const rename = (r: unknown) => {
      const items = { ...((r ?? {}) as Record<string, number>) };
      if ('mending-pill' in items) {
        items['spring-returning-pill'] =
          (items['spring-returning-pill'] ?? 0) + items['mending-pill']!;
        delete items['mending-pill'];
      }
      return items;
    };
    const player = {
      ...p,
      higherStones: { mid: 0, high: 0, top: 0 },
      silver: 0,
      wear: {},
      items: rename(p.items),
    };
    const world = { ...((s.world ?? {}) as Raw), shops: {}, taken: {}, sealed: [] };
    return { ...old, version: 23, state: { ...s, player, world } };
  },
  // v23, P3.5: no travel map. v24 keeps the world's seeded regions and the life's map, made on
  // first need from where the life began, and opens the Map screen.
  23: (old) => {
    const s = (old.state ?? {}) as Raw;
    const unlocks = (s.unlocks ?? []) as string[];
    return {
      ...old,
      version: 24,
      state: {
        ...s,
        mapgen: {},
        map: null,
        unlocks: unlocks.includes('map') ? unlocks : [...unlocks, 'map'],
      },
    };
  },
  // v24, P3.6: a place was only stood at. v25 keeps the place you have gone into and the day you
  // last heard each place's rumor.
  24: (old) => {
    const s = (old.state ?? {}) as Raw;
    const map = s.map ? { ...(s.map as Raw), inside: null, heard: {} } : null;
    return { ...old, version: 25, state: { ...s, map } };
  },
  // v25, P3.6b: the road met nothing. v26 keeps the stance, the veil, the road's notice, the
  // encounters sensed and waiting, a talisman's cover, the postings taken and the road's lines.
  25: (old) => {
    const s = (old.state ?? {}) as Raw;
    const map = s.map
      ? {
          ...(s.map as Raw),
          stance: 'careful',
          veiled: false,
          notice: { n: 0, next: 1 },
          encounters: [],
          detour: 0,
          hidden: null,
          postings: [],
          road: [],
        }
      : null;
    return { ...old, version: 26, state: { ...s, map } };
  },
  // v26, P3.7: the seated figure's screen was the Abode and the day wheel's was Cultivate. v27 calls
  // them Cultivate and Routine, in the unlocks and the seen record's screens; the old Cultivate
  // moves first, so the Abode can take its id.
  26: (old) => {
    const s = (old.state ?? {}) as Raw;
    const id = (u: string) => (u === 'cultivate' ? 'routine' : u === 'abode' ? 'cultivate' : u);
    const unlocks = [...new Set(((s.unlocks ?? []) as string[]).map(id))];
    const seen = (s.seen ?? {}) as Record<string, Record<string, unknown>>;
    const screens = Object.fromEntries(
      Object.entries(seen.screen ?? {}).map(([k, v]) => [id(k), v]),
    );
    return {
      ...old,
      version: 27,
      state: { ...s, unlocks, seen: seen.screen ? { ...seen, screen: screens } : seen },
    };
  },
  // v27, A4: cultivators walked on foot. v28 calls the way Light step and the first road routine
  // Travel by day (Jan's note after A4), since a cultivator outruns a horse.
  27: (old) => {
    const s = (old.state ?? {}) as Raw;
    const m = s.map as Raw | null | undefined;
    const map = m
      ? {
          ...m,
          roadRoutine: m.roadRoutine === 'walk' ? 'by-day' : m.roadRoutine,
          way: m.way === 'foot' ? 'light-step' : m.way,
        }
      : null;
    return { ...old, version: 28, state: { ...s, map } };
  },
  // v28, A5: each world seeded its own wilds. v29 keeps the land the same in every world (Jan's
  // call, so the map's painting fits each), so a saved region is seeded again; its places keep their
  // ids. A course laid over the old land goes, and with it what was sensed ahead on it.
  28: (old) => {
    const s = (old.state ?? {}) as Raw;
    const world = ((s.lineage ?? {}) as Raw).id as string;
    const mapgen = Object.fromEntries(
      Object.keys((s.mapgen ?? {}) as Raw).map((id) => [id, generateRegion(id, world)]),
    );
    const m = s.map as Raw | null | undefined;
    const map = m
      ? {
          ...m,
          course: null,
          encounters: ((m.encounters ?? []) as Raw[]).filter((e) => e.state === 'waiting'),
        }
      : null;
    return { ...old, version: 29, state: { ...s, mapgen, map } };
  },
  // v29, after A5.1: the City of the Guarded Mouth moved from the Ghost-Lamp Fens to the coast
  // (Jan's call, the atlas put it 16,000 li inland), so a saved region is seeded again for its
  // roads, a course over the old roads goes with what was sensed on it, and a life standing at the
  // old City stands at the new one.
  29: (old) => {
    const s = (old.state ?? {}) as Raw;
    const world = ((s.lineage ?? {}) as Raw).id as string;
    const mapgen = Object.fromEntries(
      Object.keys((s.mapgen ?? {}) as Raw).map((id) => [id, generateRegion(id, world)]),
    );
    const m = s.map as Raw | null | undefined;
    const at = (m?.at ?? null) as [number, number] | null;
    const atOldCity = !!at && Math.hypot(at[0] - OLD_CITY[0], at[1] - OLD_CITY[1]) < 300;
    const map = m
      ? {
          ...m,
          at: atOldCity ? [...NEW_CITY] : m.at,
          course: null,
          encounters: ((m.encounters ?? []) as Raw[]).filter((e) => e.state === 'waiting'),
        }
      : null;
    return { ...old, version: 30, state: { ...s, mapgen, map } };
  },
  // v30, A5.2: the Border Wilds gained their missing seats, sects and wild places (Jan's call, the
  // region held a tenth of the cultivators its people make), with roads to the new seats, so a
  // saved region is seeded again for its roads and anything sensed on an old course goes with it.
  30: (old) => {
    const s = (old.state ?? {}) as Raw;
    const world = ((s.lineage ?? {}) as Raw).id as string;
    const mapgen = Object.fromEntries(
      Object.keys((s.mapgen ?? {}) as Raw).map((id) => [id, generateRegion(id, world)]),
    );
    const m = s.map as Raw | null | undefined;
    const map = m
      ? {
          ...m,
          course: null,
          encounters: ((m.encounters ?? []) as Raw[]).filter((e) => e.state === 'waiting'),
        }
      : null;
    return { ...old, version: 31, state: { ...s, mapgen, map } };
  },

  // v31, the code review: a count that fell to nothing stayed in the Bag's record forever. v32
  // keeps only what is held.
  31: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const items = Object.fromEntries(
      Object.entries((p.items ?? {}) as Record<string, unknown>).filter(
        ([, n]) => typeof n === 'number' && n > 0,
      ),
    );
    return { ...old, version: 32, state: { ...s, player: { ...p, items } } };
  },

  // v32, E1: burning drinks a higher stone by the hour, so the mid, high and top counts may hold a
  // stone part drunk as a fraction. The whole counts saved before read the same, so only the
  // version moves.
  32: (old) => ({ ...old, version: 33 }),

  // v33, E2: markets keep what was done to them. v34 adds the world's prosperity offsets and each
  // market's supplies, none moved yet.
  33: (old) => {
    const s = (old.state ?? {}) as Raw;
    const world = { ...((s.world ?? {}) as Raw), prosperity: {}, supply: {} };
    return { ...old, version: 34, state: { ...s, world } };
  },

  // v34, E3: a market keeps the copies it bought and copied, none yet.
  34: (old) => {
    const s = (old.state ?? {}) as Raw;
    const world = { ...((s.world ?? {}) as Raw), copied: {} };
    return { ...old, version: 35, state: { ...s, world } };
  },

  // v35, E4: a market's supplies rest where its monthly sum says and ease back to that; the kept
  // supplies read the same against it. v36 adds the population offsets, none yet.
  35: (old) => {
    const s = (old.state ?? {}) as Raw;
    const world = { ...((s.world ?? {}) as Raw), population: {} };
    return { ...old, version: 36, state: { ...s, world } };
  },

  // v36, E5: markets as districts. A shop's month keeps the pieces of each standing line bought;
  // the shops a market's people opened are opened again by district, so a month kept at a shop
  // that no longer stands goes, and so does its keeper; a keeper still standing takes its shop's
  // name (Old Liu).
  36: (old) => {
    const s = (old.state ?? {}) as Raw;
    const w = (s.world ?? {}) as Raw;
    const shops: Raw = {};
    for (const [id, sm] of Object.entries((w.shops ?? {}) as Record<string, Raw>))
      if (hasShop(id)) shops[id] = { ...sm, took: {} };
    const kept: Raw = {};
    for (const [id, k] of Object.entries((w.kept ?? {}) as Record<string, Raw>)) {
      if (!id.startsWith('keeper:')) kept[id] = k;
      else if (hasShop(id.slice(7))) kept[id] = { ...k, name: keeperName(shop(id.slice(7))) };
    }
    return { ...old, version: 37, state: { ...s, world: { ...w, shops, kept } } };
  },
  // O1: a membership holds a seat and a balance of its power's currency (design § Seats and the
  // currency). A membership kept before then starts at the outer seat with nothing banked.
  37: (old) => {
    const s = (old.state ?? {}) as Raw;
    const w = (s.world ?? {}) as Raw;
    const members = ((w.members ?? []) as Raw[]).map((m) => ({ ...m, seat: 'outer', balance: 0 }));
    return { ...old, version: 38, state: { ...s, world: { ...w, members } } };
  },
  // O2: a membership keeps the month its allowance last came (design § What membership gives and
  // asks), so one kept before then counts as paid for its month and the next month's turn pays.
  38: (old) => {
    const s = (old.state ?? {}) as Raw;
    const w = (s.world ?? {}) as Raw;
    const day =
      typeof (s.calendar as Raw | undefined)?.day === 'number' ? (s.calendar as Raw).day : 0;
    const paid = Math.floor((day as number) / DAYS_PER_MONTH);
    const members = ((w.members ?? []) as Raw[]).map((m) => ({ ...m, paid }));
    return { ...old, version: 39, state: { ...s, world: { ...w, members } } };
  },
  // O3: a membership settles its quota as each month turns (design § What membership gives and
  // asks), so one kept before then counts its quota settled for the month its allowance last came.
  39: (old) => {
    const s = (old.state ?? {}) as Raw;
    const w = (s.world ?? {}) as Raw;
    const members = ((w.members ?? []) as Raw[]).map((m) =>
      typeof m.paid === 'number' ? { ...m, quota: m.paid } : m,
    );
    return { ...old, version: 40, state: { ...s, world: { ...w, members } } };
  },
  // O4: a cultivator holds jobs (design § Cultivation, Duty hours), none before then, and the road
  // carries the share of a find a gather hour has dug toward.
  40: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const map = s.map ? { ...(s.map as Raw), gathered: 0 } : s.map;
    return { ...old, version: 41, state: { ...s, player: { ...p, jobs: [] }, map } };
  },
  // O5: a clean parting swears the heart-demon oath never to teach or sell the power's methods
  // (design § Guarded methods), so one made before then swears it as of its parting's day.
  41: (old) => {
    const s = (old.state ?? {}) as Raw;
    const w = (s.world ?? {}) as Raw;
    let next = typeof w.next === 'number' ? w.next : 1;
    const states = [...((w.states ?? []) as Raw[])];
    for (const r of (w.standing ?? []) as Raw[]) {
      if (r.row !== 'parted') continue;
      const vow = `never-teach:${r.power as string}`;
      if (states.some((x) => x.holder === r.about && (x.data as Raw)?.vow === vow)) continue;
      states.push({
        id: next++,
        holder: r.about,
        since: r.day,
        data: { kind: 'vow', vow, way: r.power },
      });
    }
    return { ...old, version: 42, state: { ...s, world: { ...w, states, next } } };
  },
  // K1: the crafts' bench, its tray and the families' mastery; an old life has none yet.
  42: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    return { ...old, version: 43, state: { ...s, player: { ...p, crafts: emptyCrafts() } } };
  },
  // K2: the Soul tree's Steady Flame is Still Flame and the Wood Dao's Green Thumb Rooting Hand
  // (`RENAMED_NODES`), their names now the Alchemy and Spirit Farming capstones'.
  43: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const nodes = Array.isArray(p.nodes)
      ? (p.nodes as unknown[]).map((id) => (typeof id === 'string' ? renamedNode(id) : id))
      : p.nodes;
    return { ...old, version: 44, state: { ...s, player: { ...p, nodes } } };
  },
  // K6: the crafts' certified grades, the maker's mark and craft renown; an old life has none yet.
  44: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const crafts = { grades: {}, marked: {}, renown: {}, ...((p.crafts ?? {}) as Raw) };
    return { ...old, version: 45, state: { ...s, player: { ...p, crafts } } };
  },
  // K7: experimentation's finds, generated recipes and pity; an old life has found nothing yet.
  45: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const crafts = { found: [], recipes: [], pity: {}, ...((p.crafts ?? {}) as Raw) };
    return { ...old, version: 46, state: { ...s, player: { ...p, crafts } } };
  },
  // Fights you play: a fight under way is saved, and the Combat screen left the rail, so its
  // unlock and its seen mark go.
  46: (old) => {
    const s = (old.state ?? {}) as Raw;
    const unlocks = ((s.unlocks ?? []) as string[]).filter((u) => u !== 'combat');
    const seen = { ...((s.seen ?? {}) as Record<string, Record<string, unknown>>) };
    if (seen.screen)
      seen.screen = Object.fromEntries(Object.entries(seen.screen).filter(([k]) => k !== 'combat'));
    return { ...old, version: 47, state: { ...s, unlocks, seen, fight: null } };
  },
  // K8: spirit farming's plots; an old life holds none.
  47: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const crafts = { plots: [], ...((p.crafts ?? {}) as Raw) };
    return { ...old, version: 48, state: { ...s, player: { ...p, crafts } } };
  },
  // The opening, built: the guides (every one done for a life already past its first seclusion),
  // the codex (filled from what the life has met as it next runs) and the journal.
  48: (old) => {
    const s = (old.state ?? {}) as Raw;
    const lineage = { ...((s.lineage ?? {}) as Raw), guides: [...GUIDE_IDS], codex: {} };
    const journal = { quests: [], followed: null };
    return { ...old, version: 49, state: { ...s, lineage, journal } };
  },
  // K9: dwellings and your abode; an old life holds none until the day step houses a member.
  49: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    return {
      ...old,
      version: 50,
      state: { ...s, player: { dwellings: [], abode: null, ...p } },
    };
  },
  // K10: arrays laid in a dwelling's slots and on open ground; an old life has laid none.
  50: (old) => {
    const s = (old.state ?? {}) as Raw;
    const p = (s.player ?? {}) as Raw;
    const dwellings = ((p.dwellings ?? []) as Raw[]).map((d) => ({ arrays: [], ...d }));
    return { ...old, version: 51, state: { ...s, player: { grounds: [], ...p, dwellings } } };
  },
  // The opening, built (chains, rogue, knobs): its three new guides (a rogue's first work, the
  // sheet after the spar, sense on the road) count as done for a lineage past its first
  // seclusion, which met those things before they were taught; an old life has no chain, so its
  // seclusion deck isn't held.
  51: (old) => {
    const s = (old.state ?? {}) as Raw;
    const lineage = (s.lineage ?? {}) as Raw;
    const guides = Array.isArray(lineage.guides) ? (lineage.guides as string[]) : [];
    if (!guides.includes('focus')) return { ...old, version: 52 };
    const added = ['first-work', 'sheet', 'sense'].filter((g) => !guides.includes(g));
    return {
      ...old,
      version: 52,
      state: { ...s, lineage: { ...lineage, guides: [...guides, ...added] } },
    };
  },
  // The friends' line review: a quest step waiting on kept days records the held jobs' tallies it
  // counts from (`keptAt`). A step under way in an older save has none, and counts this month's
  // and last month's days whole, as it did.
  52: (old) => ({ ...old, version: 53 }),
  // Jan's playtest after S1: the Map screen is the World 天下, its unlock and its seen record
  // renamed with it. A post start's last chain quest opens with taking the post at its Work door,
  // so a quest of theirs already taken moves one step on (the post it held is the step done).
  53: (old) => {
    const s = (old.state ?? {}) as Raw;
    const unlocks = Array.isArray(s.unlocks)
      ? (s.unlocks as string[]).map((u) => (u === 'map' ? 'world' : u))
      : s.unlocks;
    const seen = (s.seen ?? {}) as Raw;
    const screens = (seen.screen ?? {}) as Raw;
    const { map: mapSeen, ...rest } = screens;
    const screen = mapSeen === undefined ? screens : { ...rest, world: mapSeen };
    const journal = (s.journal ?? {}) as Raw;
    const quests = Array.isArray(journal.quests)
      ? (journal.quests as Raw[]).map((q) =>
          POST_QUESTS.includes(String(q.id)) ? { ...q, step: Number(q.step) + 1 } : q,
        )
      : journal.quests;
    return {
      ...old,
      version: 54,
      state: {
        ...s,
        unlocks,
        ...(s.seen ? { seen: { ...seen, ...(seen.screen ? { screen } : {}) } } : {}),
        ...(s.journal ? { journal: { ...journal, quests } } : {}),
      },
    };
  },
  // P3.9 Going in, the road: the scene you went into (`goin`), none in an older save; the map's
  // `out` is optional and starts the next time you leave home.
  54: (old) => ({ ...old, version: 55, state: { ...((old.state ?? {}) as Raw), goin: null } }),
  // P3.9b Going in, places and people: every memory keeps its story (`what` from its row's reason
  // and note), what a person keeps of you (`voices`, from an open scene's notes), and the frames a
  // place keeps (`frames`, none yet). An open scene keeps its road frame.
  55: (old) => {
    const s = (old.state ?? {}) as Raw;
    const world = (s.world ?? {}) as Raw;
    const memories = Array.isArray(world.memories)
      ? (world.memories as Raw[]).map((m) =>
          m.what !== undefined
            ? m
            : { ...m, what: String(m.note ?? MEMORIES[m.row as MemoryId]?.reason ?? '') },
        )
      : world.memories;
    const goin = (s.goin ?? null) as Raw | null;
    const voices: Record<string, unknown> = {};
    for (const [id, notes] of Object.entries((goin?.notes ?? {}) as Record<string, unknown>)) {
      if (Array.isArray(notes))
        voices[id] = { summary: '', lines: [], notes: (notes as string[]).slice(-6) };
    }
    return {
      ...old,
      version: 56,
      state: {
        ...s,
        ...(s.world ? { world: { ...world, memories, voices, frames: {} } } : {}),
      },
    };
  },
};

/** The post starts' last chain quests, which gained a first step in v54. */
const POST_QUESTS: readonly string[] = [
  'chain-cadet-school-place',
  'chain-cadet-wall-place',
  'chain-gate-disciple-place',
];

/** The City of the Guarded Mouth before and after it moved to the coast (v30). */
const OLD_CITY = [166000, 210000] as const;
const NEW_CITY = [151047, 212587] as const;

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
