// The Intent ladder's rules (design § The combat Daos, The Intent ladder): beside its tiers every
// combat Dao climbs Qi, Intent, Domain and Law. The Dao's tier 2 capstone makes you ready for
// Intent and its tier 4 capstone for Domain, a tier lower for a genius in that Dao; a moment,
// an epiphany card naming the Dao or a fight won from under a tenth of your HP with its actions,
// breaks through. NPCs carry intent on their weapon's Dao by pedigree and realm. What a stage
// does in a fight is core/combat/fight.ts's.
import { COMBAT_DAOS, isCombatDao, type CombatDaoId } from '../content/daos.ts';
import { PEDIGREES, type PedigreeId } from '../content/enemies.ts';
import {
  GENIUS_RARITY,
  GENIUS_TIERS_EARLY,
  INTENT_CAPSTONE_TIER,
  INTENT_HANZI,
  INTENT_STAGES,
  INTENT_TOP,
} from '../content/intent.ts';
import { rarityRank } from '../content/rarity.ts';
import { realmIndex, type RealmId } from '../content/realms.ts';
import { root } from '../content/roots.ts';
import { hasTalent, talent } from '../content/talents.ts';
import { DAOS, tierNodes } from '../content/trees/index.ts';
import { addEvent, withPlayer, type Cultivator, type GameState } from './state.ts';
import { talentAwake } from './stats.ts';

/** How a moment came: an epiphany card, or a fight won from the brink. */
export type MomentHow = 'epiphany' | 'brink';

/** The stage earned in a Dao: 0 at Qi or below, 1 Intent, 2 Domain. */
export function intentStage(c: Pick<Cultivator, 'intent'>, dao: string): number {
  return c.intent[dao] ?? 0;
}

/** The highest stage held in any Dao: what meets another's intent. */
export function topStage(intent: Readonly<Record<string, number>>): number {
  return Object.values(intent).reduce((m, x) => Math.max(m, x), 0);
}

/** "Sword Intent 剑意": a stage of a Dao, in English and in the Dao's own words. */
export function stageName(dao: CombatDaoId, stage: number): { name: string; hanzi: string } {
  return {
    name: `${COMBAT_DAOS[dao].name} ${INTENT_STAGES[stage]!.name}`,
    hanzi: INTENT_HANZI[dao][stage]!,
  };
}

/**
 * Whether the cultivator is a genius in this Dao: a talent, awake, or a root of gold or better
 * tied to it.
 */
export function geniusIn(c: Cultivator, dao: string): boolean {
  const gold = rarityRank(GENIUS_RARITY);
  const r = root(c.root);
  if (r.intent === dao && rarityRank(r.grade) >= gold) return true;
  return c.talents.some((id) => {
    if (!hasTalent(id)) return false;
    const t = talent(id);
    return t.intent === dao && rarityRank(t.rarity) >= gold && talentAwake(c, t);
  });
}

/** The Dao tier whose capstone readies a stage for this cultivator: a tier lower for a genius. */
export function readyingTier(c: Cultivator, dao: string, stage: number): number {
  return INTENT_CAPSTONE_TIER[stage]! - (geniusIn(c, dao) ? GENIUS_TIERS_EARLY : 0);
}

/** A Dao tree's capstone in a tier, or null when that tier isn't written yet. */
export function capstoneOf(dao: string, tier: number): string | null {
  const t = DAOS.find((x) => x.dao === dao);
  if (!t) return null;
  return tierNodes(t, tier).find((n) => n.kind === 'capstone')?.id ?? null;
}

/**
 * The stage a moment in this Dao would break through to, or null: the next stage, built in v1,
 * once its readying capstone is learned. The capstone makes you ready; the moment breaks through.
 */
export function readyFor(c: Cultivator, dao: string): number | null {
  if (!isCombatDao(dao)) return null;
  const next = intentStage(c, dao) + 1;
  if (next > INTENT_TOP) return null;
  const cap = capstoneOf(dao, readyingTier(c, dao, next));
  return cap && c.nodes.includes(cap) ? next : null;
}

/** The Daos a moment would break through in, in the trees' order. */
export function readyDaos(c: Cultivator): CombatDaoId[] {
  return DAOS.map((t) => t.dao!).filter((d) => readyFor(c, d) !== null);
}

/**
 * A moment in a Dao: if the player is ready, the next stage opens, with a chronicle line. A moment
 * that finds them unready passes with nothing.
 */
export function intentMoment(s: GameState, dao: string, how: MomentHow): GameState {
  const stage = readyFor(s.player, dao);
  if (stage === null) return s;
  const p = s.player;
  const next = withPlayer(s, { ...p, intent: { ...p.intent, [dao]: stage } });
  return addEvent(next, 'intent', { dao, stage, how });
}

/** The stages that opened between two states of a cultivator, for the toasts. */
export function intentRisen(
  was: Pick<Cultivator, 'intent'>,
  now: Pick<Cultivator, 'intent'>,
): { dao: CombatDaoId; stage: number }[] {
  return Object.entries(now.intent)
    .filter(([d, n]) => isCombatDao(d) && n > intentStage(was, d))
    .map(([d, n]) => ({ dao: d as CombatDaoId, stage: n }));
}

/** The stage an NPC of a pedigree carries on their weapon's Dao at a realm (the pedigree table). */
export function npcIntent(pedigree: PedigreeId, realmId: RealmId): number {
  const p = PEDIGREES.find((x) => x.id === pedigree)!;
  const at = realmIndex(realmId);
  const from = (r: RealmId | null) => r !== null && at >= realmIndex(r);
  if (from(p.domainFrom)) return 2;
  return from(p.intentFrom) ? 1 : 0;
}
