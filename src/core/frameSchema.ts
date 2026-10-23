// The frames' records as the save keeps them (P3.9b; core/frames.ts holds the rules): a frame, the
// resident a made house is seeded into, the store a household table fills and a body left behind.
// Kept apart so the world's schema can read them without the rules' imports.
import { z } from 'zod';
import { CROWD_TAGS } from '../content/crowd.ts';
import { DOOR_KIND_IDS } from '../content/doorKinds.ts';
import { OWNER_KINDS } from '../content/households.ts';
import { REALM_IDS } from '../content/realms.ts';

const Realm = z.object({ realm: z.enum(REALM_IDS), stage: z.number().int().min(1) });

/** A body left in a frame (Jan's call in P3.9b's talk): found by how it was got rid of. */
export const BodySchema = z.object({
  /** Who it was, by actor id, and their name. */
  id: z.string(),
  name: z.string(),
  how: z.enum(['left', 'hidden', 'destroyed']),
  /** The day it is found, or null for never. */
  found: z.number().nullable(),
  /** The killing's deed, so the finding lands it. */
  deed: z.number().int().nullable(),
  /** Something traces it to its killer: a witness, a thing of theirs, an art they're known for. */
  trace: z.boolean(),
});
export type Body = z.infer<typeof BodySchema>;

/** What is inside a resident's or a power's store: the household table, filled once. */
export const StoreSchema = z.object({
  items: z.record(z.string(), z.number().int().min(0)),
  taels: z.number().min(0),
  stones: z.number().min(0),
});
export type Store = z.infer<typeof StoreSchema>;

export const ResidentSchema = z.object({
  seed: z.number().int(),
  owner: z.enum(OWNER_KINDS),
  tag: z.enum(CROWD_TAGS),
  /** The owner's realm: a mortal's is Qi Condensation 1, at mortal numbers. */
  realm: Realm,
  name: z.string(),
  /** The year they were born, for the cast's aging (N3). */
  born: z.number().int(),
  /** Their actor id once made: someone you met, or the owner woken. */
  made: z.string().optional(),
});
export type Resident = z.infer<typeof ResidentSchema>;

export const FrameSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.union([z.enum(DOOR_KIND_IDS), z.literal('street'), z.literal('alley')]),
  /** The district it stands in: a city's group of doors, or a town's one set of streets. */
  district: z.string(),
  /** The frame it opens off: a room off its door, a made frame off where you stood. */
  off: z.string().nullable(),
  ground: z.enum(['public', 'power', 'resident', 'yours']),
  /** Who keeps it, as the scene names them: "the innkeeper". */
  keeper: z.string().nullable(),
  /** How you get in without sneaking or forcing it. */
  way: z.enum(['open', 'invited', 'paid', 'rank']),
  taels: z.number().optional(),
  /** Warded by arrays at this realm, or a lock (a mortal's door) at none. */
  warded: Realm.nullable(),
  eyes: z.enum(['none', 'few', 'crowd']),
  /** Made on the spot this scene. */
  made: z.boolean(),
  /** The door's piece on the place's sheet, for a written door (its art and its counter). */
  door: z.string().optional(),
  resident: ResidentSchema.optional(),
  store: StoreSchema.optional(),
  /** A store stands in it, filled from its table the first time you get in (`storeOf`). */
  stocked: z.boolean().optional(),
  /** Opened this scene: sneaked, forced or let in. */
  open: z.boolean().optional(),
  bodies: z.array(BodySchema).optional(),
  /** Robbed on a day, found the morning after. */
  robbed: z.object({ day: z.number(), found: z.number() }).optional(),
  /** What happened here, so it keeps on its door: a body, a stash, a promise. */
  kept: z.array(z.string()).optional(),
});
export type Frame = z.infer<typeof FrameSchema>;
