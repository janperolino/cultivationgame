// Where a member secludes by seat, and the qi density it gives.
import { stepsOf } from '../arrays.ts';
import {
  DWELLING,
  DWELLING_NAMES,
  VEIN_DENSITY,
  type SeatId,
} from '../../content/organizations.ts';
import { veinAt } from '../../content/map/index.ts';
import { type GameState } from '../state.ts';
import { dwellingHere, dwellingNoun, stepMult } from '../dwellings.ts';
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
  const here = dwellingHere(s);
  return Math.max(dwellingOf(s)?.density ?? 1, stepMult(here ? stepsOf(here) : 0));
}

/**
 * Where your seclusion's qi comes from today, in a few words for the day's qi figure (the crafts
 * play checkpoint: a dwelling of your own named, as a seat's is): null at ×1.
 */
export function seclusionWords(s: GameState): string | null {
  const x = densityHere(s);
  if (x <= 1) return null;
  const own = dwellingHere(s);
  const seat = dwellingOf(s);
  const where =
    own && stepMult(stepsOf(own)) >= (seat?.density ?? 1)
      ? `your ${dwellingNoun(s, own)}`
      : seat
        ? DWELLING_NAMES[seat.seat].toLowerCase()
        : 'here';
  return `qi ×${Math.round(x * 100) / 100} at ${where}`;
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
  const r = realmStageOf(s, s.player.id);
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
