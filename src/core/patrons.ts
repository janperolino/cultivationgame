// Who sits in a place's teahouse today (A6.1; design § Who stays): today's teller, the people you
// know whose home it is, and a few passers seeded by the place and the day. Passers are transient:
// nothing is saved for them, so the same ones sit there all day and are gone tomorrow, until a
// thread keeps one (P3.9).
import { PASSERS, PATRON_KINDS, type PatronKind } from '../content/patrons.ts';
import { KEEPER_SURNAMES } from '../content/shops.ts';
import { realm, stageName } from '../content/realms.ts';
import { knownPeople } from './people.ts';
import { Rng } from './rng.ts';
import type { GameState } from './state.ts';

export interface Patron {
  id: string;
  name: string;
  kind: PatronKind | 'teller' | 'known';
  /** Why they're here, in a few words. */
  line: string;
}

/** The passers in a place's teahouse on a day: the same all day, seeded by the place and the day. */
export function passersAt(placeId: string, day: number): Patron[] {
  const d = Math.floor(day);
  const rng = Rng.fromString(`patrons/${placeId}/${d}`);
  const kinds = Object.entries(PATRON_KINDS) as [PatronKind, (typeof PATRON_KINDS)[PatronKind]][];
  const sum = kinds.reduce((t, [, k]) => t + k.weight, 0);
  const used = new Set<string>();
  const out: Patron[] = [];
  const n = rng.int(PASSERS.least, PASSERS.most);
  for (let i = 0; i < n; i++) {
    let roll = rng.next() * sum;
    const [kind, info] = kinds.find(([, k]) => (roll -= k.weight) < 0) ?? kinds[0]!;
    let surname = rng.pick(KEEPER_SURNAMES);
    for (let t = 0; used.has(surname) && t < KEEPER_SURNAMES.length; t++)
      surname = rng.pick(KEEPER_SURNAMES);
    used.add(surname);
    const why = rng.pick(info.why);
    // A cultivator at a frontier teahouse sits in Qi Condensation; the realm shows at the table.
    const layer = rng.int(1, realm('qi-condensation').stages);
    out.push({
      id: `passer:${placeId}:${d}:${i}`,
      name: `${rng.pick(info.titles)} ${surname}`,
      kind,
      line: info.cultivates ? `${stageName('qi-condensation', layer)}, ${why}` : why,
    });
  }
  return out;
}

/** The people you know whose home is a place: kept people the world says live there. */
export function knownHere(s: GameState, placeId: string): Patron[] {
  return knownPeople(s.player)
    .filter(({ id }) => s.world.kept[id]?.home === placeId)
    .map(({ id }) => ({
      id,
      name: s.world.kept[id]!.name,
      kind: 'known' as const,
      line: 'someone you know, at home here',
    }));
}
