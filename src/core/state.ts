// The whole game state of one life, as plain data that saves, migrates and checks with Zod.
// What belongs to a cultivator (ladders, insight, attributes, root, talents, origin, methods, the
// day wheel, items, nodes and techniques) lives in a `Cultivator`, so NPCs and co-op guests later
// run on the same rules. The chronicle is a typed event log (content/chronicle.ts writes the text).
import { DAYS_PER_YEAR } from '../content/calendar.ts';
import { z } from 'zod';
import type { EventData } from '../content/chronicle.ts';
import { AUTO_IDS, GRADE_IDS } from '../content/cultivation.ts';
import { FAMILY_IDS } from '../content/crafts.ts';
import { HELD } from '../content/farming.ts';
import { DWELLING_HELD, DWELLING_KINDS, RENT_PERIODS } from '../content/dwellings.ts';
import { ELEMENTS, type Element } from '../content/elements.ts';
import { EXPERIMENT_CRAFTS } from '../content/found.ts';
import { ALL_FIRSTS, FIRST_IDS, type FirstId } from '../content/firsts.ts';
import { GUIDE_IDS, type GuideId } from '../content/guides.ts';
import { FRESH_WHEEL, HOUR_KIND_IDS, HOURS_PER_DAY } from '../content/hours.ts';
import {
  ORIGIN_CHOICES,
  ORIGIN_IDS,
  type OriginChoice,
  type OriginId,
} from '../content/origins.ts';
import { pathPeople, person } from '../content/people.ts';
import { RARITY_IDS } from '../content/rarity.ts';
import { REALM_IDS, realm, realmIndex, type RealmId } from '../content/realms.ts';
import { defaultElements, ROOT_IDS, type RootId } from '../content/roots.ts';
import { hashSeed, Rng, streamSeed, type StreamName } from './rng.ts';
import { stats } from './stats.ts';
import { flipHour } from './wheel.ts';
import { startingWorld } from './resolver/opinion.ts';
import { emptyWorld, WorldSchema } from './resolver/world.ts';
import { MapLifeSchema, RegionGenSchema } from './map/schema.ts';
import { PlanSchema, StepSchema } from './resolver/plan.ts';
import type { Scene } from './resolver/scene.ts';
import type { Actor } from './resolver/actor.ts';
import { FrameSchema } from './frameSchema.ts';

/** The in-game calendar's year (content/calendar.ts), here for core's many readers. */
export { DAYS_PER_YEAR };
/** Play opens at age 12 on root-testing day (design § Character creation). */
export const START_AGE = 12;
/** The player's cultivator id; NPCs get their own. */
export const PLAYER_ID = 'player';

/**
 * What one climbed stage recorded (design § Cultivation, growth): the method active at the
 * breakthrough that reached it, or none, and the growth it left, set for good.
 */
const StageGrowth = z.object({
  realm: z.enum(REALM_IDS),
  stage: z.number().int().min(1),
  /** The method active at the attempt, or null when the world alone climbed it. */
  method: z.string().nullable(),
  rarity: z.enum(RARITY_IDS),
  /** What the stage added to each growth stat (content/methods.ts, GROWTH_STATS): 0.05 is +5%. */
  growth: z.record(z.string(), z.number()),
});
export type StageGrowth = z.infer<typeof StageGrowth>;

const Ladder = z.object({
  realm: z.enum(REALM_IDS),
  /** Layer 1–9 at Qi Condensation, stage 1–4 above it. */
  stage: z.number().int().min(1),
  /** Fuel toward the next step: qi, tempering or nourishment, in qi units (realms.stepSize). */
  bar: z.number().min(0),
  /** The grade of each major breakthrough on this ladder, oldest first. */
  grades: z.array(z.enum(GRADE_IDS)),
  /** World day until which a failed breakthrough leaves this ladder unsettled: no gains. */
  unsettledUntil: z.number(),
  /** World day until which an injury slows this ladder. */
  injuredUntil: z.number(),
  /** Every stage climbed, oldest first, with the growth its method left. */
  growth: z.array(StageGrowth),
});
export type Ladder = z.infer<typeof Ladder>;

/** Twelve hours, from 子 round to 亥, each given to one kind of work (content/hours.ts). */
const Wheel = z.array(z.enum(HOUR_KIND_IDS)).length(HOURS_PER_DAY);

const activeMethod = z.string().nullable();

/**
 * What a cultivator knows of someone they've met (design § Professions, people and powers): what
 * they are to you, how they feel (−3 to +3, shown only in words), their realm as last seen or
 * heard and where they were, which is only what you've seen or heard. Their log is the chronicle
 * filtered by their id.
 */
const PersonRecord = z.object({
  /** World day you met, and where. */
  met: z.number(),
  place: z.string().nullable(),
  realm: z.object({ realm: z.enum(REALM_IDS), stage: z.number().int().min(1) }).nullable(),
  /** Where they were when you last heard: an atlas entry id, or null when unknown. */
  where: z.string().nullable(),
  /** World day you last heard of them. */
  heard: z.number(),
  /** The `heard` day you last read on their page; newer news shows a gold dot. */
  seen: z.number(),
});
export type PersonRecord = z.infer<typeof PersonRecord>;

/**
 * The crafts (core/crafts.ts, K1): the bench's queue, worked from the front on Craft hours; the
 * front batch, its inputs already in the tool; the tray where finished pieces wait when the Bag is
 * full; the batches counted toward each family's mastery; and the bench's last few batches. A bench
 * entry with `mend` mends that piece at the forge (K4): its `recipe` is the piece's own id. One
 * with `experiment` throws things in (K7): its `recipe` is `experiment` and its batches the sets.
 */
const Inputs = z.array(z.object({ thing: z.string(), count: z.number().int().min(1) }));
/** A throw at the bench (K7): the craft and what goes in, the talisman sheet with it. */
const Experiment = z.object({ craft: z.enum(EXPERIMENT_CRAFTS), inputs: Inputs });
/**
 * A plot (K8, design § Spirit farming): nine beds however it is held, locked to its place, with the
 * land and qi density it lies on, its soil's tiers above plain earth, the last day you stood there
 * (tended), a season's boosters by the day they end, and the pests and thief it has had since.
 * A bed is one crop sown from one packet: its floor, the days of growth it has put on (its age, in
 * days), the tending sittings since its sowing and their summed hand, and second heads taken.
 */
export const BedSchema = z.object({
  crop: z.string(),
  floor: z.string(),
  sown: z.number(),
  grown: z.number().min(0),
  hand: z.number().min(0),
  sat: z.number().int().min(0),
  again: z.number().int().min(0),
});
export type Bed = z.infer<typeof BedSchema>;
export const PlotSchema = z.object({
  id: z.string(),
  place: z.string(),
  held: z.enum(HELD),
  /** The day a rented plot's lease runs out; null when bought. */
  until: z.number().nullable(),
  land: z.string(),
  density: z.number().int().min(1).max(9),
  soil: z.number().int().min(0),
  beds: z.array(BedSchema.nullable()),
  there: z.number(),
  rain: z.number().optional(),
  wood: z.number().optional(),
  ward: z.number().optional(),
  /** Beds the pests have taken since you were last there. */
  pests: z.number().int().min(0),
  /** The month a thief last came. */
  thief: z.number().int().optional(),
});
export type Plot = z.infer<typeof PlotSchema>;

/**
 * A dwelling (K9, design § Dwellings are sites): one record for every place you live, at most one
 * a place. Its kind, the place it stands in (a town, a city, a seat, or a site), how it is held
 * and the day its rent runs to (null when bought, claimed or a seat's), the rent's period, the
 * qi density steps it stands above the land, its plot slots and store squares, what lies in the
 * store, the works you have built and the one under way, a seat's power, and a raid waiting.
 */
/**
 * An array laid (K10, design § Sites and formations): its flags' or disc's thing, the rarity it was
 * laid at and its strength inside that band (the placing hand's lift past the whole bands), the
 * stones left in its eye and the day it went in.
 */
export const LaidArraySchema = z.object({
  id: z.string(),
  item: z.string(),
  rarity: z.enum(RARITY_IDS),
  /** The rarity its flags or disc were, which taking it up gives back. */
  from: z.enum(RARITY_IDS),
  strength: z.number().min(0).max(1),
  stones: z.number().min(0),
  laid: z.number(),
});
export type LaidArray = z.infer<typeof LaidArraySchema>;

/**
 * Prepared ground (K10): an array laid off your sites, at a spot of a region. A trap holds what
 * walked in (a beast of the land's, its roster and band, since a day) until you come; `asked` is
 * the last day the world sent something across it.
 */
export const GroundSchema = LaidArraySchema.extend({
  region: z.string(),
  at: z.tuple([z.number(), z.number()]),
  held: z.object({ roster: z.string(), band: z.number().int(), since: z.number() }).nullable(),
  asked: z.number(),
});
export type Ground = z.infer<typeof GroundSchema>;

export const DwellingSchema = z.object({
  id: z.string(),
  kind: z.enum(DWELLING_KINDS),
  place: z.string(),
  held: z.enum(DWELLING_HELD),
  until: z.number().nullable(),
  period: z.enum(Object.keys(RENT_PERIODS) as [keyof typeof RENT_PERIODS]).nullable(),
  steps: z.number().int().min(0),
  slots: z.number().int().min(0),
  store: z.number().int().min(0),
  items: z.record(z.string(), z.number().int().min(0)),
  built: z.array(z.string()),
  work: z.object({ id: z.string(), left: z.number() }).nullable(),
  since: z.number(),
  /** A seat's quarters: the power. A claim inside a power's sphere: the power it squats on. */
  power: z.string().nullable(),
  /** A raid's card waiting (its uid) and what came: thieves or a beast, at a band. */
  raid: z
    .object({ uid: z.number().int(), kind: z.enum(['thieves', 'beast']), band: z.number() })
    .nullable(),
  /** The month the world last sent a raid. */
  raided: z.number().int().nullable(),
  /** The arrays laid in its slots (K10). */
  arrays: z.array(LaidArraySchema),
});
export type Dwelling = z.infer<typeof DwellingSchema>;

/**
 * A commission taken (K12): the shop and month, the thing at its tier and floor, how many, the
 * grade it asks, the stones each, fixed when taken, and who asked when it came by name or by a
 * card. Handed in, it stays marked done for the month so the shop doesn't post it again.
 */
export const CommissionSchema = z.object({
  shop: z.string(),
  month: z.number().int(),
  kind: z.enum(['posted', 'named', 'card']),
  thing: z.string(),
  n: z.number().int().min(1),
  floor: z.enum(RARITY_IDS),
  grade: z.number().int().min(1).max(9).optional(),
  each: z.number().min(0),
  asker: z.string().optional(),
  done: z.boolean().optional(),
});
export type Commission = z.infer<typeof CommissionSchema>;

/** A piece made to order at a shop (K12): what came out, how many, the day it is ready, the price. */
export const OrderSchema = z.object({
  shop: z.string(),
  made: z.string(),
  n: z.number().int().min(1),
  ready: z.number(),
  paid: z.number().min(0),
});
export type Order = z.infer<typeof OrderSchema>;

const CraftsSchema = z.object({
  bench: z.array(
    z.object({
      recipe: z.string(),
      batches: z.number().int().min(1),
      /** The piece mended at the forge, by its id, when the entry is a mend (K4). */
      mend: z.string().optional(),
      /** What is thrown in, when the entry is an experiment (K7). */
      experiment: Experiment.optional(),
    }),
  ),
  front: z
    .object({
      recipe: z.string(),
      /** Every input stood a rarity above the recipe's floor: +0.5 lift. */
      above: z.boolean(),
      /** Craft hours put in so far. */
      hours: z.number().min(0),
      /** Batches brewing at once, each from its own inputs: one, or two at Twin Furnace (K2). */
      batches: z.number().int().min(1).optional(),
      /** The steady hand put in so far, as hand × craft hours: the batch reads its mean (K3). */
      hand: z.number().min(0).optional(),
      /** The piece being mended, when the front is a mend (K4). */
      mend: z.string().optional(),
      /** What the mend took, given back if the piece is gone by its end (review 2026-10-21). */
      took: z.string().optional(),
      /** What is thrown in, when the front is an experiment (K7). */
      experiment: Experiment.optional(),
    })
    .nullable(),
  tray: z.record(z.string(), z.number().int().min(0)),
  mastery: z.record(z.string(), z.number().min(0)),
  recent: z.array(
    z.object({
      day: z.number(),
      recipe: z.string(),
      /** What came out, by id, or null when the batch failed. */
      made: z.string().nullable(),
      count: z.number().int().min(0),
      /** A failed batch that cracked the tool. */
      blew: z.boolean(),
      /** The steady hand it was played at, when it was played (K3). */
      hand: z.number().min(0).max(1).optional(),
      /** A piece mended rather than a batch made (K4). */
      mend: z.boolean().optional(),
      /** An experiment (K7): what went in, the recipe found if it took, a miss that came close. */
      experiment: z
        .object({ inputs: Inputs, found: z.string().optional(), near: z.boolean().optional() })
        .optional(),
    }),
  ),
  /** The grades certified at a guild's hall, by craft (K6): the grade, the day and the guild. */
  grades: z.record(
    z.string(),
    z.object({ grade: z.number().int().min(1).max(9), day: z.number(), at: z.string() }),
  ),
  /**
   * Recipes found by experiment (K7), written or generated, by id, in the order found. Written ones
   * are known as if learned; a craft Dao's own seal is learned in its place besides.
   */
  found: z.array(z.string()),
  /** The generated recipes found (K7): their thing's id carries the rest (content/found.ts). */
  recipes: z.array(
    z.object({
      output: z.string(),
      craft: z.enum(EXPERIMENT_CRAFTS),
      family: z.enum(FAMILY_IDS),
      inputs: Inputs,
      day: z.number(),
    }),
  ),
  /** Misses on each set of things thrown in (K7), by the set's key: experimentation's pity. */
  pity: z.record(z.string(), z.number().min(0)),
  /** The plots you hold, rented or bought (K8). */
  plots: z.array(PlotSchema),
  /** How many of each thing held are of your own making, your maker's mark 记 (K6). */
  marked: z.record(z.string(), z.number().int().min(0)),
  /**
   * Craft renown by region, then craft (K6): the points at the last gain and its day, and this
   * month's marked sales there with the points they gave.
   */
  renown: z.record(
    z.string(),
    z.record(
      z.string(),
      z.object({
        n: z.number().min(0),
        day: z.number(),
        month: z.number().int(),
        sold: z.number().min(0),
        given: z.number().int().min(0),
        /** Points this month's gold pieces gave, held to the sales' monthly most (the checkpoint). */
        rare: z.number().int().min(0).optional(),
      }),
    ),
  ),
  /** The commissions you took (K12): this month's, open or handed in, by shop. */
  commissions: z.array(CommissionSchema).optional(),
  /** What you ordered made at a shop (K12): what came out and the day it is ready there. */
  orders: z.array(OrderSchema).optional(),
});
export type CraftsState = z.infer<typeof CraftsSchema>;

/** An empty bench, no mastery, no grade or name, nothing found, no plot: every new life's (v43–v48). */
export function emptyCrafts(): CraftsState {
  return {
    bench: [],
    front: null,
    tray: {},
    mastery: {},
    recent: [],
    grades: {},
    marked: {},
    renown: {},
    found: [],
    recipes: [],
    pity: {},
    plots: [],
  };
}

export const CultivatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  pronouns: z.string(),
  look: z.string(),
  /** World day of birth. */
  bornDay: z.number(),
  /** Years added to the qi realm's lifespan by pills and the like; talents and nodes add theirs as stats. */
  lifespanBonus: z.number(),
  root: z.enum(ROOT_IDS),
  /** The elements the root holds; the element hours read them. */
  rootElements: z.array(z.enum(ELEMENTS)),
  /** The body, soul and fate talents rolled at birth, by id (content/talents.ts). */
  talents: z.array(z.string()),
  /** Where the cultivator comes from and what they chose on testing day; null for a placeholder. */
  origin: z.object({ id: z.enum(ORIGIN_IDS), choice: z.enum(ORIGIN_CHOICES) }).nullable(),
  /** Where the cultivator lives: an atlas entry id, or null when unknown. */
  place: z.string().nullable(),
  /**
   * Methods known, by id (content/methods.ts): qi methods, tempering and nourishing arts, each
   * with the practice days cultivated with it, which set its mastery, and the world day its
   * upkeep is paid through; `starved` while its last day went unpaid, so a stage climbed then
   * leaves its written growth, not the fed band's (K11).
   */
  /**
   * The day a burning pill's backlash ends (K11): until then every line of the sheet is weakened.
   * Cleared as that day comes.
   */
  weakUntil: z.number().optional(),
  methods: z.record(
    z.string(),
    z.object({
      practice: z.number().min(0),
      fedUntil: z.number(),
      starved: z.boolean().optional(),
    }),
  ),
  /** The method each ladder climbs with; a ladder gains nothing from its hours without one. */
  activeMethods: z.object({ qi: activeMethod, body: activeMethod, soul: activeMethod }),
  /** The three attributes that come from birth (design § Combat), at their base; talents add as stats. */
  attributes: z.object({
    agility: z.number(),
    fortune: z.number(),
    aptitude: z.number(),
  }),
  qi: Ladder,
  body: Ladder,
  soul: Ladder,
  insight: z.object({
    /** Spendable on tree nodes. */
    current: z.number().min(0),
    /** Insight ever earned; breakthrough thresholds count this, so spending never delays them. */
    earned: z.number().min(0),
  }),
  /**
   * Low-grade spirit stones, the grade Qi Condensation and Foundation burn and pay with. Each grade
   * is held as its own count (design § Economy, Stones, silver and shops in play): the higher
   * grades are in `higherStones`, and core/purse.ts changes and pays across them.
   */
  stones: z.number().min(0),
  /** Mid-, high- and top-grade stones, each its own count; a stone part drunk is a fraction. */
  higherStones: z.object({
    mid: z.number().min(0),
    high: z.number().min(0),
    top: z.number().min(0),
  }),
  /** Silver taels, the mortal purse: inns, ferries, food and mortal shops deal in it. */
  silver: z.number().min(0),
  /** Item counts by id, carried in the Bag; what is worn sits in `gear` instead. */
  items: z.record(z.string(), z.number().int().min(0)),
  /**
   * Stacks split off an item's pile in the Bag, by id, each its own square (Sean's playtest,
   * 2026-10-20); the rest of the count fills whole stacks as before (core/gear.ts, bagStacks).
   */
  splits: z.record(z.string(), z.array(z.number().int().min(1))).optional(),
  /**
   * What is worn (design § Items and gear): the four gear squares and the treasure slots the Qi
   * and Soul trees open, each an item id taken out of `items`.
   */
  gear: z.object({
    weapon: z.string().nullable(),
    armor: z.string().nullable(),
    ring: z.string().nullable(),
    pouch: z.string().nullable(),
    treasures: z.array(z.string()),
  }),
  /**
   * Wear on armor, by item id, as the share of its bar fights took and nobody has repaired (design
   * § Items and gear, armor): it carries from fight to fight until a refiner mends it.
   */
  wear: z.record(z.string(), z.number().min(0).max(1)),
  /** Bond practice with each artifact from blue up, by item id, on the mastery scale. */
  bonds: z.record(z.string(), z.number().min(0)),
  /** Pill toxicity, 0 to 100 (design § Items and gear): every pill's effect scales by 1 − this/100. */
  toxicity: z.number().min(0).max(100),
  /** What each of the day's twelve hours goes to. */
  wheel: Wheel,
  /** Routines learned from teachers, manuals and sects (content/routines.ts), by id. */
  routines: z.array(z.string()),
  /** Wheels the cultivator saved under a name; they earn no discipline bonus. */
  savedRoutines: z.array(z.object({ name: z.string(), hours: Wheel })),
  /**
   * Jobs held (content/jobs.ts, O4): each puts its shift on the wheel as Duty hours. This month's
   * duty days kept and missed, the pay owed short of a whole stone or point, and last month's tally, which
   * the quota and the standing read as the month turns.
   */
  jobs: z.array(
    z.object({
      id: z.string(),
      since: z.number(),
      month: z.number().int(),
      kept: z.number().min(0),
      missed: z.number().min(0),
      owed: z.object({ stones: z.number().min(0), points: z.number().min(0) }),
      last: z.object({ month: z.number().int(), kept: z.number(), missed: z.number() }).optional(),
    }),
  ),
  /** When minor breakthroughs happen on their own, and whether qi hours burn stones. */
  plan: z.object({
    auto: z.enum(AUTO_IDS),
    /** Burn spirit stones as fuel on qi days. */
    burnStones: z.boolean(),
  }),
  /** Milestones and story: kinds of hour opened, sleep freed, gates reached, talents woken, a bounty. */
  flags: z.array(z.string()),
  /** Nodes learned, from trees and manuals alike, in the order they were learned. */
  nodes: z.array(z.string()),
  /**
   * Loose manuals held (content/manuals.ts), by id, in the order gained. A known method's own
   * manual is held with the method and isn't listed here.
   */
  manuals: z.array(z.string()),
  /**
   * Copies owned (content/copies.ts), counted by what they teach ("manual:tide-counting"). Knowing
   * a thing and owning copies of it are separate: a teacher's lesson leaves none.
   */
  copies: z.record(z.string(), z.number().int().min(0)),
  /**
   * The reading queue (core/reading.ts): copy ids in order, the first readable one read on the
   * study hours, and the study days put into each copy begun, which stay with it if it leaves
   * the head.
   */
  reading: z.object({
    queue: z.array(z.string()),
    days: z.record(z.string(), z.number().min(0)),
  }),
  /** Techniques known, with the practice days put into each. */
  techniques: z.record(z.string(), z.object({ practice: z.number().min(0) })),
  /** The techniques in the practice slots, in slot order (core/techniques.ts, practiceSlots). */
  practicing: z.array(z.string()),
  /** Insight drawn from each contemplation source (content/contemplation.ts), before Aptitude. */
  contemplation: z.record(z.string(), z.number().min(0)),
  /** Everyone this cultivator has met, by person id (content/people.ts). */
  people: z.record(z.string(), PersonRecord),
  /**
   * The Intent ladder's stage earned in each combat Dao, by Dao id (content/intent.ts): 1 Intent,
   * 2 Domain. A Dao absent stands at Qi, or below it.
   */
  intent: z.record(z.string(), z.number().int().min(1)),
  crafts: CraftsSchema,
  /** The dwellings you hold (K9), and the one that is your abode. */
  dwellings: z.array(DwellingSchema),
  abode: z.string().nullable(),
  /** Arrays laid on open ground (K10). */
  grounds: z.array(GroundSchema),
});
export type Cultivator = z.infer<typeof CultivatorSchema>;

const EventValue = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/**
 * One event in the chronicle: when, what type, who (cultivator ids, the subject first), where (an
 * atlas id) and the details. The text comes from its type's template (content/chronicle.ts).
 */
const ChronicleEvent = z.object({
  /** World day it happened on. */
  day: z.number(),
  type: z.string(),
  actors: z.array(z.string()),
  place: z.string().nullable(),
  data: z.record(z.string(), EventValue),
});
export type ChronicleEvent = z.infer<typeof ChronicleEvent>;

/** A card waiting in the feed (core/cards.ts). */
const PendingCard = z.object({
  /** Unique within the life, so the same card drawn twice is two entries. */
  uid: z.number().int(),
  card: z.string(),
  /** World day it was drawn. */
  day: z.number(),
  /** A multi-step card's current step, absent at its opening. */
  step: z.string().optional(),
  /** The card's own variables, set by earlier steps. */
  vars: z.record(z.string(), z.number()).optional(),
  /** The choices taken so far, one per step. */
  path: z.array(z.number().int()).optional(),
  /** Words a system that queued it fills its slots with: a site's name (K9). */
  words: z.record(z.string(), z.string()).optional(),
  /** The world day you first opened it, for an urgent card that counts from then. */
  seen: z.number().optional(),
});
export type PendingCard = z.infer<typeof PendingCard>;

const Cards = z.object({
  /** Cards waiting for a choice, oldest first. */
  pending: z.array(PendingCard),
  /** The world day each card was last drawn, for once-only cards and cooldowns. */
  drawn: z.record(z.string(), z.number()),
  /** Days the story marked, for later cards' triggers: a failed Foundation attempt. */
  marks: z.record(z.string(), z.number()),
  /** The last whole world day the decks were checked on. */
  checked: z.number(),
  nextUid: z.number().int(),
});
export type CardsState = z.infer<typeof Cards>;

/**
 * Where a fight you play came from, so its end goes back there (Fights you play): a spar with a
 * person or a training ground's partner, a road encounter's exit, or a seclusion card's choice.
 */
export const FightFrom = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('spar'), who: z.string() }),
  /** What a trap on open ground holds (K10), by the ground's id. */
  z.object({ kind: z.literal('trap'), ground: z.string() }),
  z.object({ kind: z.literal('road'), enc: z.string(), exit: z.number().int() }),
  z.object({ kind: z.literal('card'), uid: z.number().int(), choice: z.number().int() }),
  /** A fight in a scene you went into (P3.9): who started it and the step, rebuilt from the scene. */
  z.object({ kind: z.literal('scene'), actor: z.string(), step: StepSchema }),
]);
export type FightFrom = z.infer<typeof FightFrom>;

/**
 * A fight under way (core/played.ts): where it came from, the combat stream where its rolls
 * started and stand now, and the actions you took, so a reload replays it to the same turn.
 */
export const PlayedFightSchema = z.object({
  from: FightFrom,
  start: z.number().int(),
  now: z.number().int(),
  actions: z.array(z.record(z.string(), z.unknown())),
});
export type PlayedFight = z.infer<typeof PlayedFightSchema>;

/** Where a scene you went into opened (P3.9): an encounter's card on the map, or Go in here. */
export const GoInFrom = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('card'), enc: z.string() }),
  z.object({ kind: z.literal('here'), at: z.tuple([z.number(), z.number()]) }),
  /** A place's streets or one of its doors (P3.9b), or a person where you both stand. */
  z.object({
    kind: z.literal('place'),
    place: z.string(),
    door: z.string().nullable(),
    person: z.string().optional(),
  }),
]);
export type GoInFrom = z.infer<typeof GoInFrom>;

/** One turn of a scene as the screen keeps it: your words, the telling and its quiet line. */
export const GoInTurnSchema = z.object({
  /** Your words or the click; null for going in. */
  said: z.string().nullable(),
  told: z.string(),
  /** "asked · clear · she likes you · ½ hour". */
  line: z.string(),
  /** The numbers behind the line, for its "?". */
  why: z.string().optional(),
  /** The narrator couldn't be had: `told` is the engine's plain lines, and `outcome` waits for Tell it. */
  outcome: z.string().optional(),
  /** The length it was told at (content/goin.ts). */
  length: z.string().optional(),
  /** What the interpreter read your words as: the reading's label. */
  read: z.string().optional(),
  /** A fight's exchange inside the scene, its number (P3.9c). */
  exchange: z.number().int().optional(),
  /** The topics the interpreter read in your words, for the world book's next turns (P3.9w). */
  about: z.array(z.string()).optional(),
});
export type GoInTurn = z.infer<typeof GoInTurnSchema>;

/**
 * A scene you went into (P3.9, core/goin.ts): where it opened, the scene as its last step left it
 * (a snapshot, since each step lands on the world at once and a replay would land it twice), the
 * last turns, what the narrator and the chronicler keep, a plan waiting on Do it, the offline time
 * banked while it is open, and what you carried going in, for the leaving card.
 */
export const GoInSchema = z.object({
  from: GoInFrom,
  title: z.string(),
  scene: z.custom<Scene>(
    (v) => typeof v === 'object' && v !== null && Array.isArray((v as { actors?: unknown }).actors),
    'not a scene',
  ),
  turns: z.array(GoInTurnSchema),
  /** The narrator's suggestions after the last turn. */
  choices: z.array(z.string()),
  /** The chronicler's summary so far, its notes by id, and the turns since it last ran. */
  summary: z.string(),
  notes: z.record(z.string(), z.array(z.string())),
  since: z.number().int().min(0),
  pending: z.object({ words: z.string(), label: z.string(), plan: PlanSchema }).nullable(),
  /** Offline time banked while the scene is open, landing when you leave it (ms, capped). */
  banked: z.number().min(0),
  /** What the scene has cost on the meter so far, in dollars. */
  cost: z.number().min(0),
  /** Who the template's roles made each actor, by id, and what moves them (the fall reads it). */
  roles: z.record(
    z.string(),
    z.object({
      motives: z.array(z.string()),
      beast: z.boolean(),
      /** Drifted in from the road, not the card's own: they stand against nothing of it. */
      drift: z.boolean().optional(),
    }),
  ),
  /** What you carried going in, and the world's counts then, for the leaving card. */
  went: z.object({
    day: z.number(),
    stones: z.number(),
    items: z.record(z.string(), z.number()),
    memories: z.number().int(),
    deeds: z.number().int(),
  }),
  /** Nothing in it stands against you any more: Leave is no flight, and the card is settled. */
  resolved: z.boolean(),
  /** You are down: one last act, then whoever stands over you decides. */
  down: z.boolean(),
  /** The scene ends once its last turn is told: left, fled, down, or dead. */
  ending: z.enum(['left', 'fled', 'down', 'dead']).nullable(),
  /** Who killed you, for the chronicle's line. */
  killer: z.string().optional(),
  /**
   * Inside a place (P3.9b): its frames, the one you stand in, the faces made people by their key,
   * and who stays in each frame you left, so walking back finds them where they were.
   */
  place: z
    .object({
      id: z.string(),
      name: z.string(),
      city: z.boolean(),
      frames: z.array(FrameSchema),
      at: z.string(),
      faces: z.record(z.string(), z.string()),
      left: z.record(
        z.string(),
        z.array(z.custom<Actor>((v) => typeof v === 'object' && v !== null, 'not an actor')),
      ),
      /** What brought you in: an Around you line, the narrator's seed. */
      opening: z.string().optional(),
    })
    .optional(),
});
export type GoIn = z.infer<typeof GoInSchema>;

/** A quest you've taken (core/journal.ts): the step it is at and the day that step opened. */
export const QuestStateSchema = z.object({
  id: z.string(),
  taken: z.number(),
  /** The step under way; past the last, every step is done and it waits to be handed in. */
  step: z.number().int().min(0),
  opened: z.number(),
  /** The day it was handed in, or null while it runs. */
  handed: z.number().nullable(),
  /** Where an `@any` giver's quest was taken, and so is handed in. */
  at: z.string().optional(),
  /**
   * The held jobs' month tallies as a step waiting on kept days opened, by job id: what it counts
   * from. Absent on a step that waits on something else.
   */
  keptAt: z
    .record(z.string(), z.object({ month: z.number().int(), kept: z.number().min(0) }))
    .optional(),
});
export type QuestState = z.infer<typeof QuestStateSchema>;

export const GameStateSchema = z.object({
  lineage: z.object({
    id: z.string(),
    /** 1 for the first life; rebirth (M8) counts up. */
    life: z.number().int().min(1),
    /** The first times done (core/firsts.ts), so a reborn cultivator isn't walked through them. */
    firsts: z.array(z.enum(FIRST_IDS)),
    /** The guides done or skipped (core/guides.ts), once a lineage. */
    guides: z.array(z.enum(GUIDE_IDS)),
    /** The codex entries met (core/codex.ts), new until opened; the lineage keeps what it knows. */
    codex: z.record(z.string(), z.enum(['new', 'seen'])),
  }),
  /** The journal's quests (core/journal.ts): those taken, and the one you follow. */
  journal: z.object({ quests: z.array(QuestStateSchema), followed: z.string().nullable() }),
  mode: z.enum(['ironman', 'gentle']),
  calendar: z.object({
    /** World days since the lineage began, fractional while time runs. */
    day: z.number().min(0),
  }),
  player: CultivatorSchema,
  /** The background glass: its seed, the fractures breakthroughs opened, and a flare count. */
  glass: z.object({
    seed: z.number().int(),
    /** Qi breakthroughs so far; each opened a new fracture. */
    fractures: z.number().int().min(0),
    /** Every breakthrough so far, on any ladder; the UI flares when it rises. */
    flares: z.number().int().min(0),
  }),
  /**
   * The calendar speed the life runs at: a qi realm it has reached, or null to follow its own
   * realm (design § How the two halves connect, running the clock slower).
   */
  clock: z.enum(REALM_IDS).nullable(),
  /** Set when the life is over; the slot keeps the chronicle and offers a new life. */
  ended: z.object({ day: z.number(), cause: z.string() }).nullable(),
  chronicle: z.array(ChronicleEvent),
  /** The card feed and the decks' memory. */
  cards: Cards,
  /**
   * Hints toward first times (ui/hints.ts), the life's own: whether they show, and the ones acted
   * on or dismissed, each shown once a life.
   */
  hints: z.object({ on: z.boolean(), shown: z.array(z.string()) }),
  /** Unlock flags for the screens, so they appear as they're reached. */
  unlocks: z.array(z.string()),
  /**
   * What the player has looked at (core/seen.ts), by kind (technique, method, manual, item, tree,
   * screen) and id: noticed once its screen was opened, seen once selected. Anything held and not
   * seen is new.
   */
  seen: z.record(z.string(), z.record(z.string(), z.enum(['noticed', 'seen']))),
  /** Gentle mode's rewind charge: 1 when a rewind is available. Always 0 in ironman. */
  rewindCharges: z.number().int().min(0).max(1),
  /** The life's seed; every random stream starts from it and its own name. */
  seed: z.number().int(),
  /**
   * What lasts from going in (core/resolver/world.ts): heat, deeds and who knows of them, lasting
   * states, projects, what you have learned, and the states of places and kept people.
   */
  world: WorldSchema,
  /**
   * The travel map (core/map): the regions the world has seeded, by id, kept so every life in the
   * slot finds the same places, and the life's own map, made on first need (null until then).
   */
  mapgen: z.record(z.string(), RegionGenSchema),
  map: MapLifeSchema.nullable(),
  /** Where each named random stream stands, so a reload continues the same sequences. */
  rng: z.record(z.string(), z.number().int()),
  /** The fight you are in (Fights you play): it holds the clock until it ends. */
  fight: PlayedFightSchema.nullable(),
  /** The scene you went into (P3.9): it holds the clock until you leave it. */
  goin: GoInSchema.nullable(),
});
export type GameState = z.infer<typeof GameStateSchema>;

export interface NewLifeOptions {
  name: string;
  pronouns?: string;
  look?: string;
  mode?: 'ironman' | 'gentle';
  /** Seeds the generators; defaults to the name. */
  seed?: string;
  /** A true root unless creation rolled another. */
  root?: RootId;
  /** The root's elements; the root's defaults unless creation rolled them. */
  elements?: Element[];
  /** Body, soul and fate talents, by id. */
  talents?: string[];
  origin?: { id: OriginId; choice: OriginChoice } | null;
  place?: string | null;
  /** The qi method; null for the refusals that start without one. */
  method?: string | null;
  /** Routines known from the start: the origin path's. */
  routines?: string[];
  stones?: number;
  /** Story flags from the start: the origin path's. */
  flags?: string[];
  aptitude?: number;
  /** Techniques known from the start; tests and sims only, since the first one comes as a card. */
  techniques?: string[];
  /**
   * The first times the lineage has done (core/firsts.ts); every one unless given, so tests and
   * NPCs run on the defaults. Creation starts a lineage with none.
   */
  firsts?: readonly FirstId[];
  /** The guides the lineage has done (core/guides.ts); every one unless given, like the firsts. */
  guides?: readonly GuideId[];
  /** Burn stones in qi hours from the start: a reborn life whose lineage has done it before. */
  burnStones?: boolean;
}

/** An empty ladder at Qi Condensation layer 1. */
export function freshLadder(): Ladder {
  return {
    realm: 'qi-condensation',
    stage: 1,
    bar: 0,
    grades: [],
    unsettledUntil: 0,
    injuredUntil: 0,
    growth: [],
  };
}

/** Nothing worn. */
export function emptyGear(): Cultivator['gear'] {
  return { weapon: null, armor: null, ring: null, pouch: null, treasures: [] };
}

/** The screens a life starts with. */
export const STARTING_UNLOCKS = [
  'cultivate',
  'routine',
  'world',
  'character',
  'people',
  'chronicle',
];

/** A cultivator at age 12, every ladder at Qi Condensation layer 1 with an empty bar. */
export function newCultivator(
  id: string,
  opts: Omit<NewLifeOptions, 'mode' | 'seed'> & { bornDay: number },
): Cultivator {
  const method = opts.method === undefined ? 'garrison-standard' : opts.method;
  const techniques = opts.techniques ?? [];
  const elements = opts.elements ?? defaultElements(opts.root ?? 'true');
  // A fresh wheel is all qi until the lineage has set a study hour itself; after, one is set for it.
  const studied = (opts.firsts ?? ALL_FIRSTS).includes('study-hour');
  return {
    id,
    name: opts.name,
    pronouns: opts.pronouns ?? 'they/them',
    look: opts.look ?? '',
    bornDay: opts.bornDay,
    lifespanBonus: 0,
    root: opts.root ?? 'true',
    rootElements: elements,
    talents: opts.talents ?? [],
    origin: opts.origin ?? null,
    place: opts.place ?? null,
    methods: method ? { [method]: { practice: 0, fedUntil: 0 } } : {},
    activeMethods: { qi: method, body: null, soul: null },
    attributes: { agility: 10, fortune: 10, aptitude: opts.aptitude ?? 10 },
    qi: freshLadder(),
    body: freshLadder(),
    soul: freshLadder(),
    insight: { current: 0, earned: 0 },
    stones: opts.stones ?? 0,
    higherStones: { mid: 0, high: 0, top: 0 },
    silver: 0,
    items: {},
    gear: emptyGear(),
    wear: {},
    bonds: {},
    toxicity: 0,
    // Study is open from the start: one qi hour turns to it by the default rule.
    wheel: studied ? flipHour(FRESH_WHEEL, elements, 'study').wheel : [...FRESH_WHEEL],
    routines: opts.routines ?? [],
    savedRoutines: [],
    jobs: [],
    plan: { auto: 'safe', burnStones: opts.burnStones ?? false },
    flags: opts.flags ?? [],
    nodes: [],
    manuals: [],
    copies: {},
    reading: { queue: [], days: {} },
    techniques: Object.fromEntries(techniques.map((t) => [t, { practice: 0 }])),
    practicing: techniques.slice(0, 1),
    contemplation: {},
    people: startingPeople(
      opts.origin ?? null,
      opts.bornDay + START_AGE * DAYS_PER_YEAR,
      opts.place ?? null,
    ),
    intent: {},
    crafts: emptyCrafts(),
    dwellings: [],
    abode: null,
    grounds: [],
  };
}

/** The people an origin path knows on testing day, met that day where the life begins. */
export function startingPeople(
  origin: Cultivator['origin'],
  day: number,
  place: string | null,
): Record<string, PersonRecord> {
  return Object.fromEntries(
    pathPeople(origin).knows.map((a) => [
      a.id,
      {
        met: day,
        place,
        realm: a.realm,
        where: person(a.id).home ?? place,
        heard: day,
        seen: day,
      },
    ]),
  );
}

/** An empty card feed, checked up to the given day. */
export function freshCards(day: number): CardsState {
  return { pending: [], drawn: {}, marks: {}, checked: Math.floor(day), nextUid: 1 };
}

/** A new event for the chronicle; the subject is the first actor. */
export function chronicleEvent(
  day: number,
  type: string,
  data: EventData,
  actors: string[],
  place: string | null,
): ChronicleEvent {
  return { day, type, actors, place, data: { ...data } };
}

/** The events a life opens with: coming of age, and testing day when there is an origin. */
function openingEvents(c: Cultivator, day: number, next: boolean): ChronicleEvent[] {
  // The name and pronouns stay on the line, so an earlier life reads under its own name.
  const who = { name: c.name, pronouns: c.pronouns };
  const out = [chronicleEvent(day, 'birth', next ? { next: true, ...who } : who, [c.id], c.place)];
  if (c.origin) {
    out.push(
      chronicleEvent(
        day,
        'testing',
        { origin: c.origin.id, choice: c.origin.choice },
        [c.id, ...Object.keys(c.people)],
        c.place,
      ),
    );
  }
  return out;
}

/** A fresh life at age 12, every ladder at Qi Condensation layer 1 with an empty bar. */
export function newLife(opts: NewLifeOptions): GameState {
  const mode = opts.mode ?? 'ironman';
  const seed = hashSeed(opts.seed ?? opts.name) | 0;
  const startDay = START_AGE * DAYS_PER_YEAR;
  const player = newCultivator(PLAYER_ID, { ...opts, bornDay: 0 });
  return {
    lineage: {
      id: opts.seed ?? opts.name,
      life: 1,
      firsts: [...(opts.firsts ?? ALL_FIRSTS)],
      guides: [...(opts.guides ?? GUIDE_IDS)],
      codex: {},
    },
    journal: { quests: [], followed: null },
    hints: { on: true, shown: [] },
    mode,
    calendar: { day: startDay },
    player,
    glass: { seed, fractures: 0, flares: 0 },
    clock: null,
    ended: null,
    chronicle: openingEvents(player, startDay, false),
    cards: freshCards(startDay),
    unlocks: Object.keys(player.techniques).length
      ? [...STARTING_UNLOCKS, 'techniques']
      : [...STARTING_UNLOCKS],
    seen: {},
    rewindCharges: mode === 'gentle' ? 1 : 0,
    seed,
    rng: {},
    world: startingWorld(emptyWorld(), player.origin, player.id, startDay),
    mapgen: {},
    map: null,
    fight: null,
    goin: null,
  };
}

/**
 * The next life in the same slot after a death: the world's calendar runs on and the chronicle
 * stays, and so does the lineage's record of first times; nothing else carries over until rebirth
 * arrives in M8, hints included.
 */
export function nextLife(prev: GameState, opts: NewLifeOptions): GameState {
  const firsts = prev.lineage.firsts;
  const fresh = newLife({
    ...opts,
    mode: opts.mode ?? prev.mode,
    firsts,
    burnStones: firsts.includes('stones'),
  });
  const day = prev.calendar.day;
  const bornDay = day - START_AGE * DAYS_PER_YEAR;
  const player = {
    ...fresh.player,
    bornDay,
    people: startingPeople(fresh.player.origin, day, fresh.player.place),
  };
  return {
    ...fresh,
    lineage: { ...prev.lineage, life: prev.lineage.life + 1 },
    player,
    calendar: { day },
    world: startingWorld(emptyWorld(), player.origin, player.id, day),
    // The world's places stay; what this life knows of them starts from its own origin.
    mapgen: prev.mapgen,
    map: null,
    chronicle: [...prev.chronicle, ...openingEvents(player, day, true)],
    cards: freshCards(day),
  };
}

// ---------------------------------------------------------------- a cultivator's years

/** Age in years on a world day, fractional. */
export function ageYears(c: Cultivator, day: number): number {
  return (day - c.bornDay) / DAYS_PER_YEAR;
}

/** Days lived since root-testing day at 12, when play begins. */
export function daysLived(c: Cultivator, day: number): number {
  return day - c.bornDay - START_AGE * DAYS_PER_YEAR;
}

const PATHS = ['qi', 'body', 'soul'] as const;
type Path = (typeof PATHS)[number];

/**
 * Your highest ladder (design § Cultivation, Three paths): the highest realm, then the highest
 * stage, qi before body before soul on a tie. Your realm is its realm.
 */
export function topLadder(c: Record<Path, { realm: RealmId; stage: number }>): Path {
  let best: Path = 'qi';
  for (const which of PATHS) {
    const l = c[which];
    const top = c[best];
    const ri = realmIndex(l.realm);
    const ti = realmIndex(top.realm);
    if (ri > ti || (ri === ti && l.stage > top.stage)) best = which;
  }
  return best;
}

/**
 * Your realm: your highest ladder's. Lifespan, tribulations, what the scale table says you can
 * do, the Daos' tiers and the realm others read on you all come from it; each sheet line still
 * reads its own ladder.
 */
export function realmOf(c: Record<Path, { realm: RealmId; stage: number }>): RealmId {
  return c[topLadder(c)].realm;
}

/** Your stage in your realm: your highest ladder's. */
export function stageOf(c: Record<Path, { realm: RealmId; stage: number }>): number {
  return c[topLadder(c)].stage;
}

/** Lifespan in years: your realm's, plus bonuses, talents and tree nodes. */
export function lifespanYears(c: Cultivator): number {
  return realm(realmOf(c)).lifespan + c.lifespanBonus + stats(c).lifespan;
}

/** The world day the cultivator reaches their lifespan edge. */
export function lifespanEdgeDay(c: Cultivator): number {
  return c.bornDay + lifespanYears(c) * DAYS_PER_YEAR;
}

export function atLifespanEdge(s: GameState): boolean {
  return s.calendar.day >= lifespanEdgeDay(s.player);
}

// ---------------------------------------------------------------- items and flags

export function itemCount(c: Cultivator, id: string): number {
  return c.items[id] ?? 0;
}

/** A copy holding `n` more of the item (negative to use some up), never below zero. */
/** Adds or takes items; a count that reaches nothing leaves the Bag (saves keep no zero lines). */
export function addItem(c: Cultivator, id: string, n: number): Cultivator {
  const count = Math.max(0, itemCount(c, id) + n);
  const items = { ...c.items, [id]: count };
  if (count > 0) return { ...c, items };
  delete items[id];
  // Its split stacks go with the last of it, so none comes back on the next gain.
  if (!c.splits?.[id]) return { ...c, items };
  const splits = { ...c.splits };
  delete splits[id];
  return { ...c, items, splits };
}

export function hasFlag(c: Cultivator, flag: string): boolean {
  return c.flags.includes(flag);
}

/** A copy with the flag set. */
export function addFlag(c: Cultivator, flag: string): Cultivator {
  return hasFlag(c, flag) ? c : { ...c, flags: [...c.flags, flag] };
}

// ---------------------------------------------------------------- the game around the player

export function withPlayer(s: GameState, player: Cultivator): GameState {
  return { ...s, player };
}

export function hasUnlock(s: GameState, flag: string): boolean {
  return s.unlocks.includes(flag);
}

/** A copy with the screen flag set and, the first time, a chronicle event if `announce`. */
export function unlock(s: GameState, flag: string, announce = false): GameState {
  if (hasUnlock(s, flag)) return s;
  const next = { ...s, unlocks: [...s.unlocks, flag] };
  return announce ? addEvent(next, 'screen', { screen: flag }) : next;
}

/** Adds an event to the chronicle, dated today, with the player as its subject unless named. */
export function addEvent(
  s: GameState,
  type: string,
  data: EventData = {},
  actors: string[] = [s.player.id],
): GameState {
  const e = chronicleEvent(s.calendar.day, type, data, actors, s.player.place);
  return { ...s, chronicle: [...s.chronicle, e] };
}

/** Marks today under a name, for a later card's trigger. */
export function setMark(s: GameState, id: string): GameState {
  return { ...s, cards: { ...s.cards, marks: { ...s.cards.marks, [id]: s.calendar.day } } };
}

/**
 * Runs `use` on a named random stream and stores where it stopped. Each system draws from its
 * own stream, so one system's rolls never shift another's.
 */
export function withStream<T>(
  s: GameState,
  name: StreamName,
  use: (rng: Rng) => T,
): { value: T; state: GameState } {
  const rng = new Rng(s.rng[name] ?? streamSeed(s.seed, name));
  const value = use(rng);
  return { value, state: { ...s, rng: { ...s.rng, [name]: rng.state } } };
}

/**
 * Bookkeeping for any breakthrough: a major one refills gentle mode's rewind charge.
 * The breakthrough rules call this, and the session saves a rewind point after it.
 */
export function noteBreakthrough(s: GameState, major: boolean): GameState {
  if (major && s.mode === 'gentle' && s.rewindCharges < 1) {
    return { ...s, rewindCharges: 1 };
  }
  return s;
}

/**
 * A new pattern for the glass behind the life (Settings): the next seed in a fixed chain, so it
 * never touches a random stream. The season's weather follows the glass, so it changes too.
 */
export function rerollGlass(s: GameState): GameState {
  return { ...s, glass: { ...s.glass, seed: hashSeed(`glass:${s.glass.seed}`) | 0 } };
}
