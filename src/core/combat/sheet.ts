// Sizes (design § Combat, Realms are sizes): every line of the sheet is a plain number, and a
// realm sets the number every line starts from. Qi Condensation layer 1 is 10, each realm steps
// up by its own step (×3.1 into Foundation, ×4.6 into Core Formation, widening after), and a
// realm's stages climb to four-fifths of the step out of it, so a peak sits just under the next
// realm's first stage. A breakthrough grade moves you −1 to +3 stages along the same climb. HP,
// the qi pool, Attack, Defense, Accuracy and Evasion all read a rung's size; a thing's tier reads
// the size of its realm. The fight compares two sheets by ratio and nothing else.
import { gradesStages } from '../grades.ts';
import {
  REALMS,
  realm,
  realmIndex,
  realmSize,
  realmSpread,
  SIZE_BASE,
  stageName,
  tierRealm,
  type RealmId,
} from '../../content/realms.ts';
import type { Ladder } from '../state.ts';

/** Where someone stands on one ladder: realm, stage, and the stages their grade adds. */
export interface Rung {
  realm: RealmId;
  stage: number;
  /** −1 for a flawed breakthrough up to +3 for a heavenly one; 0 before the first. */
  grade: number;
  /**
   * The floor (design § Cultivation, Three paths): the least size this rung counts at, half your
   * highest ladder's. A ladder trained past it counts as itself.
   */
  min?: number;
}

/** A cultivator's rung on a ladder, its latest major breakthrough's grade included. */
export function rungOf(l: Ladder): Rung {
  return { realm: l.realm, stage: l.stage, grade: gradesStages(l.grades) };
}

/** The rung at the start of a tier's realm: tier 1 is Qi Condensation layer 1. */
export function tierRung(tier: number): Rung {
  return { realm: tierRealm(tier).id, stage: 1, grade: 0 };
}

/** How far along a realm's climb a stage sits, 0 at the first stage and 1 at the peak. */
function climb(id: RealmId, stage: number): number {
  const stages = realm(id).stages;
  return stages > 1 ? (stage - 1) / (stages - 1) : 0;
}

/** The size of a rung: its realm's size, climbed by its stage and grade, never below its floor. */
export function rungSize(r: Rung): number {
  const own = realmSize(r.realm) * realmSpread(r.realm) ** climb(r.realm, r.stage + r.grade);
  return Math.max(own, r.min ?? 0);
}

/** Whether a rung counts at its floor rather than at itself. */
export function floored(r: Rung): boolean {
  return r.min !== undefined && rungSize({ ...r, min: undefined }) < r.min;
}

/** Rungs with the floor set: each counts at least `share` of the highest one's size. */
export function withFloor<K extends string>(
  rungs: Record<K, Rung>,
  share: number,
): Record<K, Rung> {
  const sizes = Object.values<Rung>(rungs).map((r) => rungSize({ ...r, min: undefined }));
  const min = share * Math.max(...sizes);
  const out = {} as Record<K, Rung>;
  for (const k of Object.keys(rungs) as K[]) out[k] = { ...rungs[k], min };
  return out;
}

/** The size of a realm's stage, grade aside: Foundation early is 31, its peak 105. */
export function stageSize(id: RealmId, stage: number): number {
  return rungSize({ realm: id, stage, grade: 0 });
}

/** What a thing of this tier scales by: its realm's first-stage size over the foot's, so tier 1 is 1. */
export function tierScale(tier: number): number {
  return realmSize(tierRealm(tier).id) / SIZE_BASE;
}

/** The chance a hit lands: Accuracy over Accuracy plus Evasion. */
export function hitChance(accuracy: number, evasion: number): number {
  return accuracy / (accuracy + evasion);
}

/** The band a size sits in, in stage words: "Foundation Establishment, early" or "Qi Condensation, third layer". */
export function bandOf(size: number): { realm: RealmId; stage: number; name: string } {
  let i = 0;
  while (i + 1 < REALMS.length && size >= realmSize(REALMS[i + 1]!.id)) i++;
  const r = REALMS[i]!;
  const span = Math.log(realmSpread(r.id));
  const at = span > 0 ? Math.log(Math.max(size, realmSize(r.id)) / realmSize(r.id)) / span : 0;
  const stage = Math.min(r.stages, Math.max(1, Math.round(at * (r.stages - 1)) + 1));
  return { realm: r.id, stage, name: `${r.name}, ${stageName(r.id, stage)}` };
}

/** Whether a size is sized at or past a realm's first stage. */
export function sizedAt(size: number, id: RealmId): boolean {
  return realmIndex(bandOf(size).realm) >= realmIndex(id);
}
