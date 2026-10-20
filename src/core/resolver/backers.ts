// Backers and traces (design § NPC basics; P3.4b, Jan's note). A backer is the "my father is…"
// tie: someone a realm or more above their charge, who makes the charge feel as safe as a sect
// would, and whose projection arrives when the charge's life is at stake (P3.9 plays it, from the
// data here). A death talisman is a trace: a great sect's core disciple, or anyone with a backer,
// carries one as strong as their sect or backer, and killing them marks the killer's face for that
// power's people, a lasting state until a soul stronger than the trace erases it (the Soul tree's
// Severing the Trace, or anyone Foundation and up who knows the way) or a formation does (M4).
import { BACKER_COMPOSURE, ERASE_FROM, PROJECTION } from '../../content/resolver.ts';
import { realmIndex } from '../../content/realms.ts';
import { lineSize, plainActor, realmOfActor, sizeAt, type Actor } from './actor.ts';
import { startState, statesOf, type LastingState, type RealmStage, type World } from './world.ts';

/** Whose realm stands higher: the greater of two realms and stages. */
export function higher(
  a: RealmStage | undefined,
  b: RealmStage | undefined,
): RealmStage | undefined {
  if (!a) return b;
  if (!b) return a;
  const d = realmIndex(a.realm) - realmIndex(b.realm);
  return d > 0 || (d === 0 && a.stage >= b.stage) ? a : b;
}

/**
 * How safe a backer makes their charge feel: ×1.5 a realm above them, ×2 two or more. Their power
 * counts on the same rule by its head's realm (O3), and the taller of the two stands; they never
 * stack.
 */
export function backerComposure(a: Actor): number {
  const behind = higher(a.backer?.realm, a.backing?.realm ?? undefined);
  if (!behind) return 1;
  const gap = realmIndex(behind.realm) - realmIndex(realmOfActor(a).realm);
  return gap >= 2 ? BACKER_COMPOSURE.two : gap >= 1 ? BACKER_COMPOSURE.one : 1;
}

/** Whether a charge's life is at stake enough to call their backer's projection. */
export function projectionDue(a: Actor): boolean {
  if (!a.backer) return false;
  if (a.state === 'down') return true;
  const c = a.combatant;
  return !!c && c.hp < c.maxHp * PROJECTION.below;
}

/**
 * A backer's projection, for P3.9: the backer at a third of their lines (a wound of two thirds),
 * on their charge's side, for three turns, opening with a request for face.
 */
export function projection(a: Actor): Actor | null {
  if (!a.backer) return null;
  return plainActor({
    id: `projection:${a.backer.id}`,
    name: `${a.backer.name}'s projection`,
    side: a.side,
    realm: a.backer.realm,
    wound: 1 - PROJECTION.share,
  });
}

// ── Traces ───────────────────────────────────────────────────────────────────────────────────

/** The trace someone's death talisman leaves: their own, or one as strong as their backer. */
export function talismanOf(a: Actor): RealmStage | undefined {
  return higher(a.talisman, a.backer?.realm);
}

/** Killing someone who carries a talisman marks the killer's face for their power. */
export function leaveTrace(w: World, killer: string, victim: Actor, day: number): World {
  const strength = talismanOf(victim);
  if (!strength) return w;
  return startState(
    w,
    killer,
    { kind: 'trace', power: victim.power ?? null, strength, victim: victim.id },
    day,
  ).world;
}

export function tracesOf(w: World, who: string, day: number) {
  return statesOf(w, who, 'trace', day);
}

/**
 * A trace on someone that marks them for a power's people: a killing's before a leak's mark, so a
 * face that both stole a method and killed one of theirs is met with a blade, not a fine.
 */
export function traceFor(w: World, who: string, power: string, day: number) {
  const theirs = tracesOf(w, who, day).filter((t) => t.data.power === power);
  return theirs.find((t) => !t.data.method) ?? theirs[0];
}

/** The strongest trace on someone, the one an erasing faces. */
export function strongestTrace(
  w: World,
  who: string,
  day: number,
): (LastingState & { data: { kind: 'trace' } }) | undefined {
  return [...tracesOf(w, who, day)].sort(
    (x, y) => sizeAt(y.data.strength) - sizeAt(x.data.strength),
  )[0];
}

/**
 * Whether someone knows how to erase a trace: the Soul tree's Severing the Trace, or, for anyone
 * the world keeps, a soul at Foundation or above.
 */
export function knowsErasing(a: Actor, player: boolean): boolean {
  if ((a.stats.traceSevering ?? 0) > 0) return true;
  return !player && realmIndex(a.rungs.soul.realm) >= realmIndex(ERASE_FROM);
}

/** An erasing's numbers: the eraser's soul against the trace's strength. */
export function eraseNumbers(a: Actor, trace: { data: { strength: RealmStage } }) {
  return { yours: lineSize(a, 'soul'), theirs: sizeAt(trace.data.strength) };
}
