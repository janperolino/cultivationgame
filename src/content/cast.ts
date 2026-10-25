// The regional cast (design § Professions, people and powers, The regional cast; N2): about 200
// notables a region, seeded from its powers' populations, each living a season at a time by their
// wants. The counts, the clock past Foundation, the wants' weights and the acts' numbers are here;
// core/regionalCast.ts runs them. Settled in N2's talk with Jan (2026-10-25).
import type { PedigreeId } from './enemies.ts';
import type { MotiveId } from './personality.ts';
import type { RealmId } from './realms.ts';

/**
 * Who is seeded in a region: every Core Formation and Nascent Soul its powers count; about 100
 * Foundation elders and inner disciples, split by each power's share of the region's Foundation;
 * about 70 rising Qi Condensation, split by each power's share of its Qi Condensation with a
 * kingdom counted at a third, at least one a power and three a sect, gate or society; and the
 * unaffiliated, hermits and rogues, beside them. Ten of the rising are geniuses, a pedigree up.
 */
export const CAST_SEEDING = {
  foundation: 100,
  rising: 70,
  /** A kingdom's Qi Condensation counts at this share: its conscripts aren't its prospects. */
  kingdomShare: 1 / 3,
  /** The fewest rising a sect, gate or society takes (Jan's pick in N2's talk). */
  risingSect: 3,
  unaffiliated: { core: 8, nascent: 1, foundation: 6, rising: 6 },
  geniuses: 10,
} as const;

/** The organization types that take at least `risingSect` prospects. */
export const PROSPECT_TYPES: readonly string[] = ['sect', 'society'];

/**
 * A power's pedigree by its head's realm: a Nascent Soul's house is a great sect, any other a small
 * sect; the unaffiliated are rogues. A genius stands one step up.
 */
export const PEDIGREE_STEP: readonly PedigreeId[] = [
  'rogue',
  'small-sect',
  'great-sect',
  'sacred-land',
  'chosen',
];
export const GREAT_SECT_FROM: RealmId = 'nascent-soul';

/** A cast member's roster template by pedigree: their kit regenerates from it and their seed. */
export const CAST_TEMPLATE: Record<PedigreeId, string> = {
  rogue: 'cast-rogue',
  'small-sect': 'cast-small-sect',
  'great-sect': 'cast-great-sect',
  'sacred-land': 'cast-sacred-land',
  chosen: 'cast-chosen',
};

/**
 * Years a stage takes past Foundation, where the pace table has nothing (no tier 3 method yet):
 * by pedigree, Core Formation's and Nascent Soul's.
 */
export const STAGE_YEARS_PAST_FOUNDATION: Record<PedigreeId, Partial<Record<RealmId, number>>> = {
  rogue: { 'core-formation': 30, 'nascent-soul': 75 },
  'small-sect': { 'core-formation': 30, 'nascent-soul': 75 },
  'great-sect': { 'core-formation': 24, 'nascent-soul': 60 },
  'sacred-land': { 'core-formation': 20, 'nascent-soul': 50 },
  chosen: { 'core-formation': 18, 'nascent-soul': 45 },
};

/**
 * The Nascent Soul tribulation, read off pedigree with no dice: the years past reaching Core's peak
 * before they clear it, null for never (a small sect's or a rogue's Core dies at the edge).
 */
export const TRIBULATION_AFTER: Record<PedigreeId, number | null> = {
  rogue: null,
  'small-sect': null,
  'great-sect': 100,
  'sacred-land': 0,
  chosen: 0,
};

/** A lifespan's edge, keyed to the seed: between these shares of the realm's lifespan. */
export const LIFESPAN_EDGE = { from: 0.9, to: 1 } as const;

/** A season, in days; the cast in the region you stand in ticks one at a time. */
export const SEASON_DAYS = 90;

// ── Wants ────────────────────────────────────────────────────────────────────────────────────

export const WANT_IDS = ['ambition', 'greed', 'revenge', 'family', 'curiosity', 'home'] as const;
export type WantId = (typeof WANT_IDS)[number];

/** Which motives feed which want. */
export const WANT_MOTIVES: Record<WantId, readonly MotiveId[]> = {
  ambition: ['ambition', 'pride'],
  greed: ['greed'],
  revenge: ['revenge'],
  family: ['family'],
  curiosity: ['curiosity'],
  home: ['loyalty', 'duty', 'fear'],
};

/**
 * A want's points: 2 a matching motive, 3 for their first; the situation's bonus on top; home
 * always stands at its floor. The strongest want whose moment has come takes the season's act, and
 * equal points are broken by a roll seeded by the person and the season.
 */
export const WANT_POINTS = {
  motive: 2,
  first: 3,
  homeFloor: 1,
  /** Ambition at their realm's last stage. */
  lastStage: 1,
  /** Greed while the purse is short of their next pill. */
  short: 1,
  /** Revenge for each open enemy tie. */
  enemy: 1,
  /** Family past this age with no companion. */
  lonely: { age: 40, points: 1 },
} as const;

// ── The acts ─────────────────────────────────────────────────────────────────────────────────

/**
 * What a season's act pays and risks. A hunt at their own stage pays a season's take on the realm
 * curve; a reckless or arrogant hunter goes a stage up for twice it, settled on the combat verdict,
 * and a loss there is a death. A cautious one trades at the market instead for half, with no risk.
 */
export const ACTS = {
  /** A season's hunting at their own stage, in low at Qi Condensation, ×the realm curve. */
  huntTake: 90,
  upTake: 2,
  tradeTake: 0.5,
  /** Family: a companion from this age, within a realm; a child a decade while both live. */
  companionFrom: 25,
  childEvery: 10,
  /** A child of two cultivators tested at 12 is rooted one time in this many. */
  rootedOneIn: 2,
  childTested: 12,
} as const;

/** Each act's deed (content/resolver.ts `DEEDS`), so P3.10's Ways can count it. */
export const ACT_DEEDS = {
  join: 'join',
  hunt: 'hunt',
  trade: 'trade',
  duel: 'duel',
  wed: 'wed',
  birth: 'birth',
  journey: 'journey',
} as const;

// ── Keeping the cast to its size ─────────────────────────────────────────────────────────────

/**
 * At each year's turn a power whose rising Qi have dropped below its seeded count takes a new
 * prospect of 14 to 16, and a band past its count by more than a tenth lets its least notable fall
 * out of the cast into the world (never one tied to you, a Core or above, or a written person).
 */
export const CAST_UPKEEP = {
  prospectAge: [14, 16],
  over: 1.1,
  /** A made person (P3.9b's note): a mortal's lifespan, gone one decade in this many, promoted on
   * a memory of you worth this much either way. */
  mortalYears: 80,
  goneOneIn: 4,
  promoteAt: 20,
} as const;

/**
 * Deeds between cast members are kept whole this many years (a death three), then folded into each
 * actor's tally; a deed you are in, or know of, never folds (N2's talk).
 */
export const DEED_YEARS = { kept: 1, death: 3 } as const;
