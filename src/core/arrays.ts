// Reading a laid array (K10, design § Sites and formations; content/formations.ts): its band and
// size on the realm curve, the steps it lifts, what its eye burns a day, and what a site's arrays
// add up to: the gathering steps under the vein's soft cap, concealment, a guard's band, an alarm,
// the growing steps on its fields, and the arrays that fight on its ground. Pure: laying, feeding
// and the day's burn are core/formations.ts's.
import { SHIELD_PER_SIZE } from '../content/combat.ts';
import { ARRAY_DEFAULTS, EYE, SLEEPS, STEPS, VEIN_HOLDS } from '../content/formations.ts';
import { item, type ArrayUse } from '../content/items.ts';
import { RARITY_IDS, rarityMultiplier, rarityRank, type RarityId } from '../content/rarity.ts';
import { realmScale, tierRealm, tierStep } from '../content/realms.ts';
import { rungSize, tierRung, tierScale } from './combat/sheet.ts';
import type { FightArray } from './combat/fight.ts';
import type { Dwelling, LaidArray } from './state.ts';

/** What a laid array's thing is and does. */
export function arrayUse(a: Pick<LaidArray, 'item'>): ArrayUse {
  return item(a.item).uses.array!;
}

export const arrayTier = (a: Pick<LaidArray, 'item'>): number => item(a.item).tier;

/**
 * Where a rarity sits inside its tier's realm, in bands (design § Rarity is a band): white the
 * realm's early third, green its middle, blue and purple its late one, gold the next realm's first,
 * red its middle, pristine its late.
 */
const RARITY_BAND: Readonly<Record<RarityId, number>> = {
  gray: 0,
  white: 0,
  green: 1,
  blue: 2,
  purple: 2,
  gold: 3,
  red: 4,
  pristine: 5,
};

/** An array's band, as the land's are counted (`BANDS`): its tier's realm and its rarity's third. */
export function arrayBand(a: Pick<LaidArray, 'item' | 'rarity'>): number {
  return (arrayTier(a) - 1) * 3 + RARITY_BAND[a.rarity];
}

/** Gold or better: it adds a step, and reaches past the vein. */
export const isGold = (r: RarityId): boolean => rarityRank(r) >= rarityRank('gold');

/**
 * An array's size, as a fight item's line is sized: its tier's first rung times its rarity's band,
 * and its strength the way toward the next rarity's.
 */
export function arraySize(a: Pick<LaidArray, 'item' | 'rarity' | 'strength'>): number {
  const tier = arrayTier(a);
  const step = tierStep(tier);
  const here = rarityMultiplier(a.rarity, step);
  const next = RARITY_IDS[rarityRank(a.rarity) + 1];
  const up = next ? rarityMultiplier(next, step) : here;
  return rungSize(tierRung(tier)) * (here + a.strength * (up - here));
}

/** The steps (or bands) a gathering, growing or concealing array lifts: its own, a tier, gold. */
export function arraySteps(a: Pick<LaidArray, 'item' | 'rarity'>): number {
  const u = arrayUse(a);
  if (u.does !== 'gathering' && u.does !== 'growing' && u.does !== 'concealing') return 0;
  return (
    (u.steps ?? ARRAY_DEFAULTS.steps) +
    (arrayTier(a) - 1) * STEPS.tier +
    (isGold(a.rarity) ? STEPS.gold : 0)
  );
}

/** What a tier's eye holds full: 30 low at tier 1, up the realm curve. */
export function eyeHolds(tier: number): number {
  return EYE.stones * realmScale(tierRealm(tier).id);
}

/** An eye's stones running: it works while it holds any. */
export const running = (a: Pick<LaidArray, 'stones'>): boolean => a.stones > 0;

/**
 * What an array burns a day: 0.5 low at tier 1 up the realm curve; a trap, a maze or a killing
 * array waiting a tenth of it; holding a beast five times; a gathering array past the vein double.
 */
export function burnOf(
  a: Pick<LaidArray, 'item'>,
  opts: { holding?: boolean; pastCap?: boolean; awake?: boolean } = {},
): number {
  const u = arrayUse(a);
  const day = EYE.burn * realmScale(tierRealm(arrayTier(a)).id);
  if (opts.holding) return day * EYE.holding;
  if (SLEEPS.includes(u.does) && !opts.awake) return day * EYE.asleep;
  return day * (opts.pastCap ? EYE.pastCap : 1);
}

// ---------------------------------------------------------------- a site's arrays

/** The vein under a claimed cave or spirit mountain, by tier; none elsewhere. */
export function veinOf(d: Dwelling): number {
  return d.held === 'claimed' && (d.kind === 'cave' || d.kind === 'mountain') ? d.steps : 0;
}

/** The array slots a site holds: its vein's tier, and one more for each One More Array held. */
export function arraySlots(d: Dwelling, held: number): number {
  const vein = veinOf(d);
  return vein > 0 ? vein + Math.max(0, held) : 0;
}

const live = (d: Dwelling, does: ArrayUse['does']) =>
  d.arrays.filter((a) => running(a) && arrayUse(a).does === does);

/**
 * The steps a site's gathering arrays lift its density by. The vein holds as many steps again as
 * its tier (Jan's call in K10's talk), and only a gold array or better reaches past it, at double
 * upkeep (`pastCap`).
 */
export function gatheringSteps(d: Dwelling): { steps: number; pastCap: boolean } {
  const arrays = live(d, 'gathering');
  const cap = veinOf(d) * VEIN_HOLDS;
  const plain = arrays.filter((a) => !isGold(a.rarity)).reduce((n, a) => n + arraySteps(a), 0);
  const gold = arrays.filter((a) => isGold(a.rarity)).reduce((n, a) => n + arraySteps(a), 0);
  const capped = Math.min(plain, cap);
  const steps = capped + gold;
  return { steps, pastCap: gold > 0 && steps > cap };
}

/** A site's steps on the ladder: its own (a vein, a chamber's array) and its gathering arrays'. */
export function stepsOf(d: Dwelling): number {
  return d.steps + gatheringSteps(d).steps;
}

/** The steps a site's growing arrays add to the plots in its slots, the cultivator feeling none. */
export function growingSteps(d: Dwelling): number {
  return live(d, 'growing').reduce((n, a) => n + arraySteps(a), 0);
}

/** The bands of concealment a site's concealing arrays add. */
export function concealingBands(d: Dwelling): number {
  return live(d, 'concealing').reduce((n, a) => n + arraySteps(a), 0);
}

/**
 * A site's guard: the band its strongest warding array stands at against men or against beasts
 * (beast-repelling flags a band more, and against beasts alone); −1 with none.
 */
export function guardBand(d: Dwelling, against: 'thieves' | 'beast'): number {
  let best = -1;
  for (const a of live(d, 'warding')) {
    const u = arrayUse(a);
    if (u.beastsOnly && against !== 'beast') continue;
    best = Math.max(best, arrayBand(a) + (against === 'beast' ? (u.beasts ?? 0) : 0));
  }
  return best;
}

/** An alarm stands at the site: its raid cards wait twice as long. */
export const alarmed = (d: Dwelling): boolean => live(d, 'alarm').length > 0;

/** What an array is called where it stands: its thing's name. */
export const arrayName = (a: Pick<LaidArray, 'item'>): string => item(a.item).name;

/**
 * The arrays that fight on this ground for a side (K10): every running warding, binding, killing
 * and maze array, each by its own numbers.
 */
export function fightArrays(arrays: readonly LaidArray[], side: string): FightArray[] {
  const out: FightArray[] = [];
  for (const a of arrays) {
    if (!running(a)) continue;
    const u = arrayUse(a);
    if (u.does !== 'warding' && u.does !== 'binding' && u.does !== 'killing' && u.does !== 'maze')
      continue;
    const size = arraySize(a);
    const tier = arrayTier(a);
    out.push({
      id: a.id,
      name: arrayName(a),
      side,
      does: u.does,
      band: arrayBand(a),
      ...(u.beasts ? { beasts: u.beasts } : {}),
      ...(u.beastsOnly ? { beastsOnly: true } : {}),
      ...(u.does === 'binding' ? { every: u.every ?? ARRAY_DEFAULTS.every } : {}),
      ...(u.does === 'maze' ? { dull: u.dull ?? ARRAY_DEFAULTS.dull } : {}),
      ...(u.does === 'killing'
        ? { base: (u.power ?? 0) * tierScale(tier), attack: size, type: u.damage ?? 'physical' }
        : {}),
      ...(u.does === 'warding'
        ? { ward: Math.round((u.share ?? ARRAY_DEFAULTS.share) * SHIELD_PER_SIZE * size) }
        : {}),
    });
  }
  return out;
}
