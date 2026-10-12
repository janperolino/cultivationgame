// The one ladder (design § Combat): every gap between two cultivators, on checks and on damage,
// counts stages and major breakthroughs on a single scale. A stage is −2 to checks and ×1.2 to
// damage, a Qi Condensation layer half that, and each major breakthrough between you another −2
// and its own damage step from the realms data (×1.75 into Foundation, ×3.2 into Core Formation,
// ×5.8 from Nascent Soul up). A breakthrough grade moves you −1 to +3 stages. Crossing a realm
// counts only the breakthrough, so one realm apart at the same stage is three stages and a break:
// −8, and ×3, ×5.5 or ×10 to damage. HP, the qi pool and a technique's tier climb the same steps.
import {
  CHECK_PER_BREAK,
  CHECK_PER_STAGE,
  DAMAGE_PER_STAGE,
  QC_LAYER_STAGE,
} from '../../content/combat.ts';
import { GRADES, type GradeId } from '../../content/cultivation.ts';
import { REALMS, realmIndex, type RealmId } from '../../content/realms.ts';
import type { Ladder } from '../state.ts';

/** Where someone stands on one ladder: realm, stage, and the stages their grade adds. */
export interface Rung {
  realm: RealmId;
  stage: number;
  /** −1 for a flawed breakthrough up to +3 for a heavenly one; 0 before the first. */
  grade: number;
}

/** What one realm's stage is worth on the ladder: half a stage at Qi Condensation. */
function stageUnit(i: number): number {
  return REALMS[i]!.id === 'qi-condensation' ? QC_LAYER_STAGE : 1;
}

/** Stages from the foot of the ladder, Qi Condensation layer 1, grade included. */
export function rungStages(r: Rung): number {
  const top = realmIndex(r.realm);
  let stages = 0;
  for (let i = 0; i < top; i++) stages += (REALMS[i]!.stages - 1) * stageUnit(i);
  return stages + (r.stage - 1) * stageUnit(top) + r.grade;
}

/** The stages a breakthrough grade is worth. */
export function gradeStages(grade: GradeId | undefined): number {
  return GRADES.find((g) => g.id === grade)?.stages ?? 0;
}

/** A cultivator's rung on a ladder, its latest major breakthrough's grade included. */
export function rungOf(l: Ladder): Rung {
  return { realm: l.realm, stage: l.stage, grade: gradeStages(l.grades.at(-1)) };
}

/** The rung at the start of a tier's realm: tier 1 is Qi Condensation layer 1. */
export function tierRung(tier: number): Rung {
  const i = Math.min(Math.max(tier, 1), REALMS.length) - 1;
  return { realm: REALMS[i]!.id, stage: 1, grade: 0 };
}

export interface Gap {
  /** Stages between, attacker minus defender. */
  stages: number;
  /** Major breakthroughs between, attacker minus defender. */
  breaks: number;
  /** What the gap adds to the attacker's checks: negative when below. */
  check: number;
  /** What it multiplies the attacker's damage by: the break steps times 1.2 per stage. */
  damage: number;
}

/** The gap from a defender's rung up to an attacker's, on one ladder. */
export function ladderGap(attacker: Rung, defender: Rung): Gap {
  const a = realmIndex(attacker.realm);
  const d = realmIndex(defender.realm);
  const stages = rungStages(attacker) - rungStages(defender);
  const breaks = a - d;
  let steps = 1;
  for (let i = Math.min(a, d) + 1; i <= Math.max(a, d); i++) steps *= REALMS[i]!.breakStep;
  return {
    stages,
    breaks,
    check: CHECK_PER_STAGE * stages + CHECK_PER_BREAK * breaks,
    damage: (breaks >= 0 ? steps : 1 / steps) * DAMAGE_PER_STAGE ** stages,
  };
}

const FOOT: Rung = { realm: 'qi-condensation', stage: 1, grade: 0 };

/** How far up the ladder a rung stands, as a multiplier: HP and the qi pool scale by it. */
export function rungPower(r: Rung): number {
  return ladderGap(r, FOOT).damage;
}

/** What a thing of this tier scales by: a technique's power and cost, a talisman's power. */
export function tierScale(tier: number): number {
  return rungPower(tierRung(tier));
}
