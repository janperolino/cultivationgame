// Where a member secludes by seat, and the qi density it gives.
import {
  DWELLING,
  DWELLING_NAMES,
  VEIN_DENSITY,
  type SeatId,
} from '../../content/organizations.ts';
import { veinAt } from '../../content/map/index.ts';
import { type GameState } from '../state.ts';
import { dwellingHere, stepMult } from '../dwellings.ts';
import { isOrganization, organization, theName } from './identity.ts';
import { seatOf } from './seats.ts';
import { membershipsOf } from './membership.ts';
import { realmStageOf } from './trial.ts';

/** Where the player dwells by seat while secluding: the power, the seat and its qi density. */
interface Dwelling {
  power: string;
  seat: SeatId;
  density: number;
}

/** The dwelling where you stand, in words for the place's head, or null outside one. */
export function dwellingWords(s: GameState): string | null {
  const d = dwellingOf(s);
  if (!d || d.density <= 1) return null;
  const name = theName(d.power);
  return (
    DWELLING_NAMES[d.seat] +
    ' on ' +
    name +
    '’s vein: qi ×' +
    d.density +
    ' while you seclude here.'
  );
}

/**
 * The qi density your seclusion has today: a dwelling's while no course is set, else the open air's.
 * A power's dwelling by seat (O2), or one you hold where you stand by its steps (K9), the better.
 */
export function densityHere(s: GameState): number {
  if (s.map?.course) return 1;
  return Math.max(dwellingOf(s)?.density ?? 1, stepMult(dwellingHere(s)?.steps ?? 0));
}

/** A power's dwelling's density at a place: its seat's, capped by the place's vein (O2's talk). */
export function dwellingDensity(seat: SeatId, place: string): number {
  const vein = Math.max(0, Math.min(VEIN_DENSITY.length - 1, veinAt(place)));
  return Math.min(DWELLING[seat], VEIN_DENSITY[vein]!);
}

/**
 * The dwelling the player secludes in (design: a dwelling by seat, qi density's first use in
 * seclusion): inside the seat of a power they belong to, or a branch hall of it, the density their
 * seat holds there. Only while they seclude there: on the road, or anywhere else, none. A guest
 * elder keeps no dwelling.
 */
export function dwellingOf(s: GameState): Dwelling | null {
  const place = s.map?.inside;
  if (!place) return null;
  const r = realmStageOf(s);
  let best: Dwelling | null = null;
  for (const m of membershipsOf(s.world, s.player.id)) {
    if (m.guest || !isOrganization(m.power)) continue;
    const branch = isOrganization(place) && organization(place).branchOf === m.power;
    if (place !== m.power && !branch) continue;
    const seat = seatOf(s.world, s.player.id, m.power, r)!;
    const density = dwellingDensity(seat, place);
    if (!best || density > best.density) best = { power: m.power, seat, density };
  }
  return best;
}
