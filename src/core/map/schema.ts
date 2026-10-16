// What the save keeps of the travel map (save v24, v25 the place you are in, v26 encounters): the world's seeded regions, which every life in
// the slot shares, and the life's own map: where you are, what you know, the trail you walked,
// your pins, your course, your road wheel and the group you travel with.
import { z } from 'zod';
import { HOUR_KIND_IDS } from '../../content/hours.ts';
import { ROAD_HOUR_KINDS, type WayId } from '../../content/map/travel.ts';
import { FEATURE_TAGS, SITE_KINDS } from '../../content/atlas/schema.ts';

const pt = z.tuple([z.number(), z.number()]);

const feature = z.object({ name: z.string(), tags: z.array(z.enum(FEATURE_TAGS)) });

export const RegionGenSchema = z.object({
  version: z.literal(1),
  region: z.string(),
  tracts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      hanzi: z.string(),
      terrain: z.string(),
      seed: pt,
      cell: z.array(pt),
    }),
  ),
  roads: z.array(z.object({ id: z.string(), a: z.string(), b: z.string(), pts: z.array(pt) })),
  sites: z.array(
    z.object({
      id: z.string(),
      sub: z.enum(SITE_KINDS),
      name: z.string(),
      x: z.number(),
      y: z.number(),
      area: z.string().nullable(),
      terrain: z.string(),
      hidden: z.boolean(),
      rating: z.number(),
      features: z.array(feature),
      road: z.string().optional(),
      guards: z.string().optional(),
    }),
  ),
  hearts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      hanzi: z.string(),
      x: z.number(),
      y: z.number(),
      area: z.string(),
      rings: z.number().int(),
      fixedBand: z.number().int().nullable(),
    }),
  ),
});

export const KNOW_STATES = ['rumored', 'sketched', 'seen'] as const;
export type KnowState = (typeof KNOW_STATES)[number] | 'unknown';

export const ROAD_HOUR_IDS = [...ROAD_HOUR_KINDS, ...HOUR_KIND_IDS] as const;
const roadHour = z.enum(ROAD_HOUR_IDS);

const WAY_IDS = [
  'foot',
  'horse',
  'mount',
  'boat',
  'fly',
  'ride',
  'ship',
  'wagon',
] as const satisfies readonly WayId[];

export const CourseSchema = z.object({
  to: pt,
  /** The place it ends at, if it ends at one. */
  target: z.string().nullable(),
  /** The way, densified; `at` is the next point to reach. */
  pts: z.array(pt),
  at: z.number().int().min(0),
  roadLi: z.number(),
  crossLi: z.number(),
  /** Days it should take at the pace it was set at. */
  days: z.number(),
  startDay: z.number(),
  /** The checkpoints it passes. */
  tolls: z.array(z.string()),
  /** The highest band it crosses. */
  maxBand: z.number(),
  /** Go into the place on arriving (P3.6b's screen). */
  enter: z.boolean(),
});
export type Course = z.infer<typeof CourseSchema>;

export const GroupSchema = z.object({
  kind: z.enum(['caravan', 'ship']),
  name: z.string(),
  leader: z.string(),
  /** Where it is bound, and the stops on the way, by place id. */
  bound: z.string(),
  stops: z.array(z.string()),
  /** Wages: low-grade stones a day, owed until it arrives. */
  pay: z.number(),
  owed: z.number(),
  /** You may walk off (a caravan), or not (a ship two thousand li up, without flight of your own). */
  canLeave: z.boolean(),
  /** What leaving costs, in words for the asking. */
  leaveCost: z.string(),
  /** You lead it: its calls are yours. */
  leading: z.boolean(),
  /** The world day it sets off, when you joined before it left (P3.6b's caravans). */
  departs: z.number().optional(),
});
export type Group = z.infer<typeof GroupSchema>;

/** How the road's encounters settle without you (P3.7): go round, take the clear, take the close. */
export const STANCES = ['avoid', 'careful', 'bold'] as const;
export type Stance = (typeof STANCES)[number];

/**
 * An encounter on the map (P3.7): a template met at a band, its people regenerated from its seed.
 * Sensed ones stand ahead on your course until you reach them; a waiting one stops the course.
 */
export const EncounterSchema = z.object({
  id: z.string(),
  template: z.string(),
  seed: z.number().int(),
  band: z.number().int(),
  at: pt,
  /** The course point you meet it at, while it stands sensed ahead. */
  meetAt: z.number().int().nullable(),
  state: z.enum(['sensed', 'waiting']),
  /** Seen at the edge of your sight, sprung from hiding, or it found you first. */
  how: z.enum(['seen', 'sprung', 'found']),
  /** Exits tried and fallen short: no retries until something changes. */
  tried: z.array(z.number().int()),
  day: z.number(),
  /** Where it was met, in words. */
  where: z.string(),
  /** The bounty posting whose goal it is. */
  posting: z.string().optional(),
});
export type Encounter = z.infer<typeof EncounterSchema>;

/** A bounty posting you took (P3.7): its goal met at its spot, paid at the board it hangs on. */
export const PostingSchema = z.object({
  id: z.string(),
  board: z.string(),
  template: z.string(),
  title: z.string(),
  text: z.string(),
  spot: pt,
  /** The place the spot is at, if it is one (a delivery's town). */
  place: z.string().nullable(),
  band: z.number().int(),
  pay: z.number().int(),
  taken: z.number(),
  done: z.boolean(),
  /** The day its goal was last met, so one fallen short waits a month to be met again. */
  met: z.number().optional(),
});
export type Posting = z.infer<typeof PostingSchema>;

export const MapLifeSchema = z.object({
  region: z.string(),
  at: pt,
  /** What you know of each place, by id; a state only rises. Absent is unknown. */
  know: z.record(z.string(), z.enum(KNOW_STATES)),
  /** Who told you of a place you haven't seen, or which map sketched it. */
  told: z.record(z.string(), z.string()),
  /** A rumored place's ring: its centre, somewhere near the place. */
  rings: z.record(z.string(), pt),
  /** The places you have stood in, for the first-time line. */
  been: z.array(z.string()),
  /** The trail you walked, the one picture the fog keeps. */
  trail: z.array(pt),
  pins: z.array(pt),
  course: CourseSchema.nullable(),
  /** The road routine followed: a saved one's id or one of your own. */
  roadRoutine: z.string(),
  ownRoutines: z.array(
    z.object({ id: z.string(), name: z.string(), hours: z.array(roadHour).length(12) }),
  ),
  way: z.enum(WAY_IDS),
  group: GroupSchema.nullable(),
  /** The last double-hour (counted from day 0) that looked around, so an hour looks once. */
  lookedAt: z.number().int(),
  /** Flight hours spent today on your own sword, and the day they count for. */
  flown: z.object({ day: z.number().int(), hours: z.number() }),
  /** The place you have gone into (P3.6b): its screen stands in for the map until you set a course. */
  inside: z.string().nullable(),
  /** The day you last heard a place's rumor, by place: a teahouse tells one a day. */
  heard: z.record(z.string(), z.number()),
  /** The stance the road's encounters settle by (P3.7). */
  stance: z.enum(STANCES),
  /** Travelling veiled: the realm you show is your concealment's lowest. */
  veiled: z.boolean(),
  /** The road's notice: how full, and the threshold the next encounter comes at. */
  notice: z.object({ n: z.number(), next: z.number() }),
  encounters: z.array(EncounterSchema),
  /** Li of going round still to walk before the course moves on. */
  detour: z.number(),
  /** The day a burned hiding talisman's cover ends, and its tier. */
  hidden: z.object({ until: z.number(), tier: z.number().int() }).nullable(),
  postings: z.array(PostingSchema),
  /** Lines from the road since you last looked: what the stance settled. */
  road: z.array(
    z.object({
      day: z.number(),
      kind: z.string(),
      text: z.string(),
      template: z.string().optional(),
    }),
  ),
});
export type MapLife = z.infer<typeof MapLifeSchema>;
