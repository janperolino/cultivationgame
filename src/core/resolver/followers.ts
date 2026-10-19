// Followers and their bonds (design § NPC basics, Bonds; § The resolver, Away and the idle half;
// P3.4b). A bond is why a follower follows, made by recruiting someone: pay, loyalty, fear or a
// shared goal, with the follower tie kept while it holds. Each breaks its own way: the paid when
// the wages stop, the loyal when their opinion of you falls under the floor their Fidelity sets,
// the afraid when you look weak or they are out of your reach, the goal-bound when the goal is
// done or dropped. A bond that breaks leaves, or turns: the treacherous betray you, and the afraid
// turn if they are reckless or vengeful. In a scene a turncoat changes sides and comes at you if
// you aren't beyond them; away, they tell what they know of you to the power that hates you most.
import {
  FEAR_APART_DAYS,
  LOYALTY_FLOOR,
  TREACHEROUS,
  WAGE_DAYS,
  WEAK_HP,
  WEAK_PRESENCE,
  monthWage,
  type BondId,
} from '../../content/bonds.ts';
import { hasPerson, person } from '../../content/people.ts';
import type { Nature } from '../../content/personality.ts';
import { pay, stonesOf, withStones } from '../purse.ts';
import { addEvent, withPlayer, type GameState } from '../state.ts';
import { realmOfActor, realmSizeOf, type Actor } from './actor.ts';
import { composure, isBeyond, presence, verdict } from './check.ts';
import {
  addTie,
  lean,
  natureOf,
  opinion,
  powersKnowing,
  readStanding,
  remember,
  removeTie,
  tieOf,
} from './opinion.ts';
import { step } from './plan.ts';
import type { Scene } from './scene.ts';
import {
  heatOf,
  projectById,
  projectDone,
  recordDeed,
  tell,
  type Bond,
  type World,
} from './world.ts';

/** How a bond ended: why, and whether they left or turned. */
export type BondEnd = 'unpaid' | 'loyalty' | 'fear' | 'goal';

export function bondOf(w: World, follower: string): Bond | undefined {
  return w.bonds.find((b) => b.follower === follower);
}

export function followersOf(w: World, leader: string): Bond[] {
  return w.bonds.filter((b) => b.leader === leader);
}

export interface NewBond {
  follower: string;
  leader: string;
  kind: BondId;
  wage?: number;
  goal?: string;
}

/**
 * A bond made: one a follower, replacing any they had, and the follower tie with it. A paid
 * follower's first month is paid as they are hired, so their wages run from today.
 */
export function makeBond(w: World, b: NewBond, day: number): World {
  if (b.follower === b.leader) return w;
  const bond: Bond = {
    follower: b.follower,
    leader: b.leader,
    kind: b.kind,
    since: day,
    seen: day,
    ...(b.kind === 'pay' ? { wage: b.wage ?? 0, paidTo: day + WAGE_DAYS } : {}),
    ...(b.kind === 'goal' && b.goal ? { goal: b.goal } : {}),
  };
  const bonds = [...w.bonds.filter((x) => x.follower !== b.follower), bond];
  return addTie({ ...w, bonds }, { a: b.follower, b: b.leader, kind: 'follower' });
}

/** A bond ended: the record goes, and the follower tie with it. */
export function endBond(w: World, follower: string): World {
  const b = bondOf(w, follower);
  if (!b) return w;
  const bonds = w.bonds.filter((x) => x.follower !== follower);
  const world = { ...w, bonds };
  return tieOf(world, b.leader, follower) === 'follower'
    ? removeTie(world, b.leader, follower)
    : world;
}

export function updateBond(w: World, b: Bond): World {
  return { ...w, bonds: w.bonds.map((x) => (x.follower === b.follower ? b : x)) };
}

/** A follower left under orders at a place, in reach while you're there. */
export function post(w: World, follower: string, place: string | undefined): World {
  const b = bondOf(w, follower);
  if (!b) return w;
  const rest = { ...b };
  delete rest.posted;
  return updateBond(w, place ? { ...rest, posted: place } : rest);
}

/** The wage a follower asks: a month of their realm's wage. */
export function wageFor(a: Pick<Actor, 'rungs'>): number {
  return monthWage(realmOfActor(a).realm);
}

/** The opinion of you a loyal follower must keep, by their Fidelity. */
export function loyaltyFloor(n: Nature): number {
  const f = Math.max(-2, Math.min(2, lean(n, 'fidelity'))) as -2 | -1 | 0 | 1 | 2;
  return LOYALTY_FLOOR[f];
}

/** Whether a loyalty bond still holds: their opinion of you at or above their floor. */
export function loyaltyHolds(w: World, b: Bond, day: number, n = natureOf(w, b.follower)): boolean {
  return opinion(w, b.follower, b.leader, day, { nature: n }).total >= loyaltyFloor(n);
}

/** The treacherous turn instead of leaving: Fidelity −2, or −1 with a cruel Heart or hatred of you. */
export function treacherous(w: World, b: Bond, day: number, n = natureOf(w, b.follower)): boolean {
  const f = lean(n, 'fidelity');
  if (f <= TREACHEROUS.fickle) return true;
  if (f > TREACHEROUS.fickleWith) return false;
  return (
    lean(n, 'heart') <= TREACHEROUS.cruel ||
    opinion(w, b.follower, b.leader, day, { nature: n }).word === 'hostile'
  );
}

/** How a bond breaks: the afraid turn if reckless or vengeful, the rest if treacherous. */
export function howBreaks(
  w: World,
  b: Bond,
  day: number,
  n = natureOf(w, b.follower),
): 'leave' | 'turn' {
  if (b.kind === 'fear') {
    return lean(n, 'nerve') >= 1 || n.motives.includes('revenge') ? 'turn' : 'leave';
  }
  if (b.kind === 'goal') return 'leave';
  return treacherous(w, b, day, n) ? 'turn' : 'leave';
}

/** Whether the leader looks weak: down, wounded past half, or under half HP in a fight. */
export function looksWeak(a: Actor): boolean {
  if (a.state === 'down' || a.state === 'dead') return true;
  if (a.wound >= WEAK_HP) return true;
  const c = a.combatant;
  return !!c && c.hp < c.maxHp * WEAK_HP;
}

/**
 * Whether a fear bond holds in a scene: the threat run again, your presence against their
 * composure, counted at half while you look weak. Short, and it breaks; down, you scare nobody.
 */
export function fearHolds(scene: Scene, leader: Actor, follower: Actor): boolean {
  if (leader.state === 'down' || leader.state === 'dead') return false;
  const others = scene.actors.filter(
    (x) => x.follows === leader.id && x.id !== follower.id && x.state === 'present',
  ).length;
  const p = presence(leader, follower, { followers: others });
  if (p.pinned && !looksWeak(leader)) return true;
  const yours = p.value * (looksWeak(leader) ? WEAK_PRESENCE : 1);
  return verdict(yours, composure(follower)) !== 'short';
}

/** Someone's name for a line: a named person's, a kept person's, or their id. */
export function whoName(w: World, id: string): string {
  if (hasPerson(id)) return person(id).name;
  return w.kept[id]?.name ?? id;
}

/**
 * A turncoat away from you: the betrayal is done, you learn it (a card says so), and they tell what
 * they know of your deeds to the power that hates you most, or their own.
 */
export function betray(w: World, b: Bond, day: number, place: string): World {
  let world = recordDeed(
    w,
    {
      kind: 'betrayal',
      actor: b.follower,
      victim: b.leader,
      place,
      witnesses: [{ id: b.leader }],
    },
    day,
  ).world;
  const powers = powersKnowing(world, b.leader);
  const worst = powers
    .map((p) => ({ p, s: readStanding(world, p, b.leader, day, heatOf(world, p, day)).total }))
    .sort((x, y) => x.s - y.s)[0]?.p;
  const power = worst ?? (hasPerson(b.follower) ? (person(b.follower).power ?? null) : null);
  if (power) world = tell(world, b.follower, { id: `told:${power}`, power }, day);
  return world;
}

// ── In a scene ───────────────────────────────────────────────────────────────────────────────

export interface BondBreak {
  follower: string;
  why: BondEnd;
  how: 'leave' | 'turn';
}

/**
 * The bonds of everyone following someone in the scene, checked once a round: loyalty by opinion,
 * fear by the threat run again, a goal by its project. Those whose bond breaks leave the scene, or
 * turn: they take a side of their own and come at the leader unless the leader is beyond them.
 * Followers present with their leader are in reach today.
 */
export function checkBonds(
  s: GameState,
  scene: Scene,
): { state: GameState; scene: Scene; broke: BondBreak[] } {
  const day = s.calendar.day;
  let w = s.world;
  let sc = scene;
  const broke: BondBreak[] = [];
  for (const f of scene.actors) {
    if (f.follows === undefined || f.state !== 'present') continue;
    const b = bondOf(w, f.id);
    const leader = scene.actors.find((x) => x.id === f.follows);
    if (!b || !leader) continue;
    const n = f.nature ?? natureOf(w, f.id);
    let why: BondEnd | null = null;
    if (b.kind === 'loyalty' && !loyaltyHolds(w, b, day, n)) why = 'loyalty';
    else if (b.kind === 'fear' && !fearHolds(sc, leader, f)) why = 'fear';
    else if (b.kind === 'goal' && goalOver(w, b)) why = 'goal';
    if (!why) {
      if (b.seen !== day) w = updateBond(w, { ...b, seen: day });
      continue;
    }
    const how = howBreaks(w, b, day, n);
    w = endBond(w, f.id);
    if (why === 'goal') w = foughtBeside(w, b, day);
    broke.push({ follower: f.id, why, how });
    if (how === 'turn') {
      w = recordDeed(
        w,
        {
          kind: 'betrayal',
          actor: f.id,
          victim: leader.id,
          place: sc.place,
          witnesses: sc.actors
            .filter((x) => x.state === 'present' && x.id !== f.id)
            .map((x) => ({ id: x.id, power: x.power ?? null })),
        },
        day,
      ).world;
      const past = isBeyond(realmSizeOf(f), realmSizeOf(leader));
      const plan = past ? [step('flee')] : [step('attack', { target: leader.id })];
      sc = {
        ...sc,
        actors: sc.actors.map((x) =>
          x.id === f.id ? { ...x, side: f.id, follows: undefined, plan } : x,
        ),
        log: [...sc.log, `${f.name} turns on ${leader.name}.`],
      };
    } else {
      sc = {
        ...sc,
        actors: sc.actors.map((x) =>
          x.id === f.id ? { ...x, follows: undefined, state: 'gone' as const } : x,
        ),
        log: [...sc.log, `${f.name} leaves ${leader.name}.`],
      };
    }
  }
  return { state: w === s.world ? s : { ...s, world: w }, scene: sc, broke };
}

/** A goal-bound follower parts with "fought beside me". */
function foughtBeside(w: World, b: Bond, day: number): World {
  return remember(
    w,
    { holder: b.follower, about: b.leader, row: 'fought-beside', known: [b.leader] },
    day,
  );
}

/** A goal is over when its project is done or no longer there. */
function goalOver(w: World, b: Bond): boolean {
  if (!b.goal) return false;
  const p = projectById(w, b.goal);
  return !p || projectDone(p);
}

// ── Away: the world's day ────────────────────────────────────────────────────────────────────

/**
 * The bonds of your followers through the world's days: wages paid from your stones as each month
 * falls due, and the paid leave when you run dry; the loyal leave when their opinion falls under
 * their floor; the goal-bound leave with "fought beside me" when the goal is done or dropped; the
 * afraid slip away, or turn, a week out of your reach. Each leaving is a line in the chronicle,
 * where P3.12's card will stand.
 */
export function followersDay(s: GameState): GameState {
  if (s.world.bonds.length === 0) return s;
  const day = s.calendar.day;
  const you = s.player.id;
  let state = s;
  for (const b of followersOf(s.world, you)) {
    const w = state.world;
    let why: BondEnd | null = null;
    let paid = b;
    if (b.kind === 'pay' && b.paidTo !== undefined && day >= b.paidTo) {
      // Each wage is paid as any price is, across the grades (core/purse.ts).
      let purse = stonesOf(state.player);
      let paidTo = b.paidTo;
      const wage = b.wage ?? 0;
      while (day >= paidTo) {
        const after = pay(purse, wage);
        if (!after) break;
        purse = after;
        paidTo += WAGE_DAYS;
      }
      if (paidTo !== b.paidTo) state = withPlayer(state, withStones(state.player, purse));
      paid = { ...b, paidTo };
      if (day >= paidTo) why = 'unpaid';
    } else if (b.kind === 'loyalty' && !loyaltyHolds(w, b, day)) why = 'loyalty';
    else if (b.kind === 'goal' && goalOver(w, b)) why = 'goal';
    // A fear bond breaks only apart: a follower not posted anywhere travels with you, in reach
    // every day, and one posted is in reach while you stand at that place.
    else if (
      b.kind === 'fear' &&
      !!b.posted &&
      b.posted !== state.player.place &&
      day - b.seen > FEAR_APART_DAYS
    ) {
      why = 'fear';
    }
    if (!why) {
      if (paid !== b) state = { ...state, world: updateBond(state.world, paid) };
      continue;
    }
    const how = howBreaks(state.world, b, day);
    let world = endBond(state.world, b.follower);
    if (why === 'goal') world = foughtBeside(world, b, day);
    if (how === 'turn') world = betray(world, b, day, state.player.place ?? 'unknown');
    state = addEvent(
      { ...state, world },
      'follower',
      { name: whoName(world, b.follower), why: how === 'turn' ? 'turned' : why },
      [you, b.follower],
    );
  }
  return state;
}
