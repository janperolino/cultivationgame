// Organizations (design § Professions, people and powers, Organizations share one skeleton, Seats
// and the currency; § NPC basics, Membership; O1). Every atlas power is one, and so is every
// kingdom no power rules, read as a dynasty. A power's six seats sit at realms read top down from
// its population; rank is realm and a deed (the inner trial, an elder's master tie, an
// appointment), and the currency only buys. You serve one house at a time; leaving by the type's
// rule is a clean parting, and betrayal is a hunted rule, going over to a foe or carrying off its
// guarded methods. The same rules take any cultivator: actions name who acts.
import {
  HUMAN_BLOOD,
  ORG_OVERRIDES,
  ORG_PRESETS,
  ORG_ROWS,
  RULED_KINGDOMS,
  TYPE_BLOOD,
  type OrgPreset,
  type OrgRow,
  type OrgType,
  type SeatId,
  type SeatName,
  type Treatment,
} from '../../content/organizations.ts';
import { type RealmStage } from '../resolver/world.ts';
import { ladderOf } from './seats.ts';

/** An organization: its atlas row, its type's preset with the power's overrides laid over it. */
interface Organization {
  id: string;
  name: string;
  hanzi: string;
  type: OrgType;
  preset: OrgPreset;
  seats: Record<SeatId, SeatName>;
  gives: readonly string[];
  treatment: Treatment;
  blood: string;
  /** The power a branch hall answers to, where its members belong. */
  branchOf?: string;
  row: OrgRow;
}

const rows = new Map(ORG_ROWS.map((r) => [r.id, r]));
const cache = new Map<string, Organization>();

/** Whether an atlas id is an organization: a power, or a kingdom no power or council rules. */
export function isOrganization(id: string): boolean {
  const r = rows.get(id);
  return !!r && (r.type !== undefined || RULED_KINGDOMS[id] === undefined);
}

export function organization(id: string): Organization {
  const hit = cache.get(id);
  if (hit) return hit;
  const row = rows.get(id);
  if (!row || !isOrganization(id)) throw new RangeError(`Not an organization: ${id}`);
  const type: OrgType = row.type ?? 'dynasty';
  const preset = ORG_PRESETS[type];
  const o = ORG_OVERRIDES[id] ?? {};
  const org: Organization = {
    id,
    name: row.name,
    hanzi: row.hanzi,
    type,
    preset,
    seats: { ...preset.seats, ...o.seats },
    gives: [...preset.gives, ...(o.gives ?? [])],
    treatment: o.treatment ?? 'fair',
    blood: o.blood ?? TYPE_BLOOD[type] ?? HUMAN_BLOOD,
    ...(o.branchOf ? { branchOf: o.branchOf } : {}),
    row,
  };
  cache.set(id, org);
  return org;
}

/** Its name with "the" before it, unless it carries one: "the Beast-Butcher Gate", "The Hu Clan". */
export function theName(id: string): string {
  const n = organization(id).name;
  return n.startsWith('The ') ? n : `the ${n}`;
}

/** Where a membership is held: a branch hall's is its parent power's. */
export function houseOf(id: string): string {
  if (!isOrganization(id)) return id;
  return organization(id).branchOf ?? id;
}

/** What stands behind a member: their power's head, at the foot of its realm. */
export function headRealm(power: string): RealmStage {
  return { realm: ladderOf(power).head, stage: 1 };
}
