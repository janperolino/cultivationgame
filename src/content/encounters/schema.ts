// The scene template (design § The world, Scene templates; P3.7's talk): a card extended, and data
// like any card. P3.7 meets templates on the map and settles them on the engine by your stance; P3.9
// runs the same data as a scene. A template never names a person: its roles are filled from the
// roster, the mortal kinds and the people the world keeps.
import { z } from 'zod';
import { FEATURE_TAGS, SITE_KINDS } from '../atlas/schema.ts';
import { MOTIVE_IDS } from '../personality.ts';
import { ACT_IDS, PLACE_STATES } from '../resolver.ts';
import { MEMORY_IDS, STANDING_IDS } from '../memories.ts';

/** The six kinds an encounter comes in (design § The world, Encounters). */
export const ENCOUNTER_KINDS = ['beast', 'cultivator', 'mortal', 'place', 'omen', 'plot'] as const;
export type EncounterKind = (typeof ENCOUNTER_KINDS)[number];

/** The trip goals a goal template serves, the bounty board's postings (P3.7) and P3.9's trips. */
export const TRIP_GOALS = [
  'bounty',
  'herb-run',
  'patrol',
  'core-hunt',
  'delivery',
  'escort',
] as const;
export type TripGoal = (typeof TRIP_GOALS)[number];

/** What a plot template needs from you before it can come. */
export const PLOT_NEEDS = ['grudge', 'home'] as const;

/**
 * How a stance reads an exit: a fight; slipping away (sneak, flee, hide); a deal that spends
 * (pay, buy, a bribe); talk; taking a find; passing it by.
 */
export const EXIT_ROADS = ['fight', 'slip', 'deal', 'talk', 'take', 'pass'] as const;
export type ExitRoad = (typeof EXIT_ROADS)[number];

const feature = z
  .object({
    name: z.string().min(1),
    tags: z.array(z.enum(FEATURE_TAGS)).min(1),
  })
  .strict();

/** Who fills a role: a roster template, a kind of mortal, or a person the world keeps. */
const fill = z.union([
  z.object({ roster: z.string().min(1) }).strict(),
  z.object({ mortal: z.string().min(1) }).strict(),
  z.object({ person: z.enum(PLOT_NEEDS) }).strict(),
]);

export const RoleSchema = z
  .object({
    id: z.string().min(1),
    /** How the card names them before you know more: "ridge wolves", "a deserter". */
    name: z.string().min(1),
    who: fill,
    /** Bands above (or below) the encounter's band; 0 when absent. */
    band: z.number().int().optional(),
    /** How many, fewest to most; a beast's pack is its species' when absent. */
    count: z.tuple([z.number().int().min(1), z.number().int().min(1)]).optional(),
    motives: z.array(z.enum(MOTIVE_IDS)).max(3).optional(),
    /** Lies hidden until a search finds them: the second man in the pines. */
    hidden: z.boolean().optional(),
    /** A person who makes the card always wait. */
    big: z.boolean().optional(),
  })
  .strict();
export type Role = z.infer<typeof RoleSchema>;

/**
 * A stake: one of the resolver's effects (design § The resolver, What lasts), with a role's id or
 * `you` in its slots, or one of the map's own gains: the roles' kits as loot, a find from the
 * catalogs at the band, qi from a tide, hours lost, a site learned.
 */
export const StakeSchema = z.discriminatedUnion('do', [
  z.object({ do: z.literal('wound'), share: z.number().min(0).max(1), days: z.number() }).strict(),
  z.object({ do: z.literal('stones'), n: z.number().int() }).strict(),
  /** A share of the stones you carry, taken. */
  z
    .object({ do: z.literal('robbed'), share: z.number().min(0).max(1), item: z.boolean() })
    .strict(),
  z.object({ do: z.literal('item'), id: z.string(), n: z.number().int() }).strict(),
  /** What the fallen roles carry (core/loot.ts `kitOf`). */
  z.object({ do: z.literal('loot'), role: z.string().optional() }).strict(),
  /** Things from the written catalogs, at the band's tier and finds. */
  z
    .object({
      do: z.literal('find'),
      things: z.array(z.string()).min(1),
      n: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
    })
    .strict(),
  z.object({ do: z.literal('fuel'), share: z.number() }).strict(),
  z.object({ do: z.literal('hours'), n: z.number() }).strict(),
  /** The nearest hidden site turns Seen: a lead followed. */
  z.object({ do: z.literal('site') }).strict(),
  z.object({ do: z.literal('memory'), role: z.string(), row: z.enum(MEMORY_IDS) }).strict(),
  z.object({ do: z.literal('standing'), power: z.string(), row: z.enum(STANDING_IDS) }).strict(),
  z.object({ do: z.literal('heat'), n: z.number().int() }).strict(),
  z.object({ do: z.literal('karma'), n: z.number().int() }).strict(),
  z.object({ do: z.literal('place'), state: z.enum(PLACE_STATES) }).strict(),
]);
export type Stake = z.infer<typeof StakeSchema>;

const outcome = z
  .object({
    /** What the card says, second person; the road's line once settled. */
    text: z.string().min(1),
    /** The chronicle's line, third person after the cultivator's name: "hunts the pack down". */
    line: z.string().min(1),
    stakes: z.array(StakeSchema).optional(),
  })
  .strict();
export type ExitOutcome = z.infer<typeof outcome>;

export const ExitSchema = z
  .object({
    /** The resolver's act it is (content/resolver.ts `ACTS`). */
    act: z.enum(ACT_IDS),
    road: z.enum(EXIT_ROADS),
    label: z.string().min(1),
    /** The role it faces; the first role when absent. */
    against: z.string().optional(),
    /** What it costs up front. */
    cost: z
      .object({ stones: z.number().int().min(0).optional(), item: z.string().optional() })
      .strict()
      .optional(),
    pass: outcome,
    /** A close pass; `pass` and the close wound when absent. */
    close: outcome.optional(),
    /** Short; the act's own when absent. */
    short: outcome.optional(),
    /** A choice that moves a bond or standing: never taken by a stance. */
    big: z.boolean().optional(),
  })
  .strict();
export type Exit = z.infer<typeof ExitSchema>;

export const TemplateSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    kind: z.enum(ENCOUNTER_KINDS),
    title: z.string().min(1),
    /** Where it comes. Every field given must hold. */
    where: z
      .object({
        terrain: z.array(z.string()).min(1).optional(),
        road: z.enum(['on', 'off']).optional(),
        hours: z.enum(['day', 'night']).optional(),
        season: z.array(z.enum(['spring', 'summer', 'autumn', 'winter'])).optional(),
        /** Met only at (near) a site of this kind. */
        site: z.array(z.enum(SITE_KINDS)).optional(),
        /** A plot's hook. */
        needs: z.enum(PLOT_NEEDS).optional(),
        /** The events calendar's key (M6 fills it). */
        calendar: z.string().optional(),
      })
      .strict(),
    /** The bands it is met at, lowest and highest (content/map/travel.ts `BANDS`). */
    bands: z.tuple([z.number().int().min(-1), z.number().int().min(-1)]),
    weight: z.number().positive().optional(),
    /** It lies in wait: it shows only if your Perception reaches its Stealth, else it springs. */
    lurks: z.boolean().optional(),
    /** It comes to harm or rob you: never within a day's walk of a town or city (pace.ts). */
    hostile: z.boolean().optional(),
    /** It moves on: waiting lets it pass. */
    moves: z.boolean().optional(),
    /** A goal template: the trip goal it is, met at the posting's spot. */
    goal: z.enum(TRIP_GOALS).optional(),
    /** The scene's place: its kind of law, traffic, the realm a check with no one faces, and features. */
    place: z
      .object({
        traffic: z.enum(['busy', 'road', 'wilds']),
        features: z.array(feature).min(1),
      })
      .strict(),
    roles: z.array(RoleSchema),
    exits: z.array(ExitSchema).min(1),
    /** The narrator's opening line, second person. */
    opening: z.string().min(1),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (t.roles.length === 0 && t.exits.some((e) => e.road === 'fight' || e.road === 'talk'))
      ctx.addIssue({ code: 'custom', message: `${t.id}: a fight or a talk needs a role` });
    const ids = new Set(t.roles.map((r) => r.id));
    for (const e of t.exits) {
      if (e.against && !ids.has(e.against))
        ctx.addIssue({
          code: 'custom',
          message: `${t.id}: exit ${e.label} faces no role ${e.against}`,
        });
      for (const o of [e.pass, e.close, e.short])
        for (const s of o?.stakes ?? [])
          if ((s.do === 'loot' || s.do === 'memory') && s.role && !ids.has(s.role))
            ctx.addIssue({ code: 'custom', message: `${t.id}: a stake names no role ${s.role}` });
    }
    if (t.bands[1] < t.bands[0])
      ctx.addIssue({ code: 'custom', message: `${t.id}: bands reversed` });
    if (t.kind === 'plot' && !t.where.needs)
      ctx.addIssue({ code: 'custom', message: `${t.id}: a plot needs a hook` });
  });
export type Template = z.infer<typeof TemplateSchema>;
