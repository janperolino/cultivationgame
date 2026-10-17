// Encounters on the map (design § The world, Encounters on the map; § The resolver, Away and the
// idle half), as settled in P3.7's talk. Starting values; core/map/encounters.ts reads them.
import type { EncounterKind } from './schema.ts';

// ---------------------------------------------------------------- how often

/**
 * The road's notice: each double-hour on the move adds this much, and an encounter comes when it
 * fills. On a road one every four travel days of the by-day routine (six hours a day), off the
 * roads one every five.
 */
export const NOTICE_ROAD = 1 / 24;
export const NOTICE_OFF = 1 / 30;
/** Camping in the open: each hour at rest on a course (six a day travelling by day), one every eight nights. */
export const NOTICE_CAMP = 1 / 48;
/** Travel by night (戌 to 寅) counts this much more. */
export const NIGHT_HOURS: readonly number[] = [10, 11, 0, 1, 2];
export const NOTICE_NIGHT = 1.5;
/** Heat on you counts ×(1 + heat / this). */
export const NOTICE_HEAT = 6;
/** Flying is seen from afar; a group deters, and meets only what could rival its leader. */
export const NOTICE_FLYING = 1.5;
export const NOTICE_GROUP = 0.5;
/** Each fill's threshold, drawn on the `road` stream so encounters don't tick like a clock. */
export const NOTICE_THRESHOLD: readonly [number, number] = [0.6, 1.4];

// ---------------------------------------------------------------- what comes

/** The six kinds' shares, on a road and off it, and how the night moves them. */
export const KIND_SHARES: Readonly<Record<'road' | 'off', Record<EncounterKind, number>>> = {
  road: { beast: 15, cultivator: 30, mortal: 30, place: 10, omen: 10, plot: 5 },
  off: { beast: 40, cultivator: 15, mortal: 5, place: 25, omen: 10, plot: 5 },
};
export const NIGHT_SHIFT: Readonly<Partial<Record<EncounterKind, number>>> = {
  beast: 15,
  mortal: -10,
  place: -5,
};
/** On a road, people come at your band and up to this many bands either side. */
export const ROAD_PEOPLE_SPREAD = 1;
/** A template the road brought in its last this-many lines comes at this share of its weight. */
export const RECENT_LINES = 6;
export const RECENT_WEIGHT = 0.2;
/** A robbery template comes this much more when the realm you show is below your own. */
export const WEAK_LOOKING = 1.5;

// ---------------------------------------------------------------- sensing and hiding

/** Lurking in closed ground (forest, jungle, karst, marsh) counts as two things used. */
export const COVER_HELP = 2;
/** Going round costs this many li cross-country. */
export const GO_ROUND_LI = 60;
/** You reach a sensed encounter when you come within this many li of it. */
export const CONTACT_LI = 30;
/** A hiding talisman hides you for this many days once burned. */
export const HIDING_DAYS = 1;

// ---------------------------------------------------------------- results, no dice

/** A lost fight's wound, and what robbers take; a fight's edge reads the resolver's ratios. */
export const SHORT_WOUND = { share: 0.3, days: 10 } as const;
export const ROBBED_SHARE = 0.5;
/** At most this many encounters stand sensed ahead at once. */
export const MAX_AHEAD = 3;

// ---------------------------------------------------------------- the bounty board

/** Postings a town or city puts up a month. */
export const POSTINGS_PER_MONTH = 3;
/** A posting's spot lies this far from the board, in li. */
export const POSTING_LI: readonly [number, number] = [1500, 12000];
/** Its pay in low-grade stones at band 0, ×1.6 a band above it. */
export const POSTING_PAY = 25;
export const POSTING_PAY_STEP = 1.6;
