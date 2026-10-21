// Sparring, asked of people (design § The world, The Combat screen leaves the rail; Fights you
// play): a partner at your power's training ground, a door at its seat, or someone you know who
// stands where you are. A spar is a fight you play on the stage: nobody dies, nothing drops, and it
// ends at the first fall. What the fight spends comes home as any fight's does (core/played.ts), and
// a spar won from the brink is a moment on the Intent ladder. Each partner spars once a day.
import { person } from '../content/people.ts';
import { realm, type RealmId } from '../content/realms.ts';
import { template } from '../content/roster.ts';
import { fromCultivator } from './combat/combatant.ts';
import { brinkDaos, startFight, type Fight } from './combat/fight.ts';
import { generateCultivator } from './combat/generate.ts';
import { lawHallRoster } from './guarded.ts';
import { intentMoment } from './intent.ts';
import { seatPowerAt } from './joining.ts';
import { placeById } from './map/region.ts';
import { mapOf } from './map/travel.ts';
import { monthIndex } from './orgs/contribution.ts';
import { houseOf } from './orgs/identity.ts';
import { membership } from './orgs/membership.ts';
import { nameOf } from './people.ts';
import { fightEnd, type FightEnd } from './played.ts';
import { hashSeed, Rng } from './rng.ts';
import { addEvent, realmOf, stageOf, type GameState } from './state.ts';

/** The player's side in a spar. */
export const YOU = 'you';

/** Who you can ask at a training ground, a month at a time: stages from yours. */
export const GROUND_RANKS = [
  { id: 'senior', words: 'a senior', stages: 2 },
  { id: 'fellow', words: 'a fellow disciple', stages: 0 },
  { id: 'junior', words: 'a junior', stages: -2 },
] as const;

/** Whoever a spar is with when the roster gives nothing better: a plain cultivator of the March. */
const PLAIN = 'march-conscript';

export interface Partner {
  /** `ground:<power>:<month>:<rank>` or `person:<id>`. */
  who: string;
  name: string;
  /** "a senior", or the person's name again. */
  words: string;
  realm: RealmId;
  stage: number;
  /** The roster template they fight as, and its seed. */
  roster: string;
  seed: number;
}

function partnerAt(who: string, roster: string, r: RealmId, stage: number): Partner {
  const seed = hashSeed(`spar/${who}`);
  const t = template(roster);
  const name =
    t.kind === 'cultivator'
      ? generateCultivator(t, r, stage, new Rng(seed), { id: who, side: 'them' }).name
      : t.name;
  return { who, name, words: name, realm: r, stage, roster, seed };
}

/** Your power's training ground's partners this month: a senior, a fellow disciple, a junior. */
export function groundPartners(s: GameState, power: string): Partner[] {
  const house = houseOf(power);
  const r = realmOf(s.player);
  const month = monthIndex(s.calendar.day);
  const roster = lawHallRoster(house) ?? PLAIN;
  return GROUND_RANKS.map((k) => {
    const stage = Math.max(1, Math.min(realm(r).stages, stageOf(s.player) + k.stages));
    const p = partnerAt(`ground:${house}:${month}:${k.id}`, roster, r, stage);
    return { ...p, words: k.words };
  });
}

/** Where someone you know is, as you last heard: their record's place, or their home. */
export function whereIs(s: GameState, id: string): string | null {
  const rec = s.player.people[id];
  return rec?.where ?? (rec ? person(id).home : null) ?? null;
}

/** A person you know as a sparring partner, at their realm as you last knew it. */
export function personPartner(s: GameState, id: string): Partner | null {
  const rec = s.player.people[id];
  if (!rec?.realm || person(id).mortal) return null;
  const power = person(id).power;
  const roster = (power && lawHallRoster(houseOf(power))) || PLAIN;
  const p = partnerAt(`person:${id}`, roster, rec.realm.realm, rec.realm.stage);
  const name = nameOf(s, id);
  return { ...p, name, words: name };
}

/** The partner a spar's `who` names, or null when there is none. */
export function partnerOf(s: GameState, who: string): Partner | null {
  if (who.startsWith('person:')) return personPartner(s, who.slice('person:'.length));
  const [, power, , rank] = who.split(':');
  if (!power) return null;
  return groundPartners(s, power).find((p) => p.who.endsWith(`:${rank}`)) ?? null;
}

/** Whether you sparred with them today. */
function sparredToday(s: GameState, who: string): boolean {
  const today = Math.floor(s.calendar.day);
  return s.chronicle.some(
    (e) => e.type === 'spar' && e.data.who === who && Math.floor(e.day) === today,
  );
}

/** Why you can't spar with them now, or null when you can. */
export function sparWhy(s: GameState, who: string): string | null {
  if (s.ended) return 'The life is over.';
  if (s.fight) return 'You are in a fight.';
  const here = s.map?.inside ?? null;
  if (who.startsWith('person:')) {
    const id = who.slice('person:'.length);
    if (!s.player.people[id]) return 'You don’t know them.';
    if (person(id).mortal) return 'They aren’t a cultivator.';
    if (!personPartner(s, id)) return 'You don’t know their realm.';
    const where = whereIs(s, id);
    if (!here || where !== here) return 'They aren’t where you are.';
  } else {
    const [, power] = who.split(':');
    if (!power || !membership(s.world, s.player.id, power)) return 'You aren’t one of theirs.';
    const map = s.map ? mapOf(s) : null;
    const place = map && here ? placeById(map, here) : undefined;
    const seat = map && place ? seatPowerAt(map, place) : null;
    if (!seat || houseOf(seat) !== power) return 'Their training ground is at their seat.';
    if (!partnerOf(s, who)) return 'No one of that rank trains here.';
  }
  if (sparredToday(s, who)) return 'You sparred today; tomorrow.';
  return null;
}

/** The spar's start: you against your partner, their kit seeded by who they are. */
export function sparFight(s: GameState, who: string): Fight | null {
  const p = partnerOf(s, who);
  if (!p) return null;
  const t = template(p.roster);
  if (t.kind !== 'cultivator') return null;
  const npc = generateCultivator(t, p.realm, p.stage, new Rng(p.seed), {
    id: `spar-${p.who}`,
    side: 'them',
  });
  return startFight([fromCultivator(s.player, YOU), { ...npc.combatant, name: p.name }]);
}

/**
 * Closes a spar: the chronicle gets a line, and a spar won after acting with a Dao from the brink
 * is that Dao's moment (core/intent.ts). What the fight spent is `afterFight`'s.
 */
export function endSpar(
  s: GameState,
  fight: Fight,
  foe: string,
  ended?: FightEnd,
  who?: string,
): GameState {
  const end = ended ?? fightEnd(fight, s.player.id) ?? 'draw';
  const data: Record<string, string | number> = { foe, result: end, turns: fight.turn };
  if (who) data.who = who;
  let next = addEvent(s, 'spar', data);
  const me = fight.combatants.find((c) => c.id === s.player.id);
  if (me && end === 'won') for (const d of brinkDaos(me)) next = intentMoment(next, d, 'brink');
  return next;
}
