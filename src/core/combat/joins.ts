// Who joins a fight under way (P3.9c; design § The resolver, Scenes and time, A fight is a mode of
// the scene). A scene's fight carries its joins as it opens (core/goin.ts `sceneFightStart`): the
// law on its kind's turn, followers left nearby on the 3rd or within call on the 6th, someone in
// your frame whose motive takes a side on the 2nd, and a backer's projection the turn after its
// charge falls under a quarter of their HP (P3.4b's data, content/resolver.ts PROJECTION). Each is
// read from the fight as it stands, so a replay of the same actions joins the same people.
import { PROJECTION } from '../../content/resolver.ts';
import { stepOut, type RealmId } from '../../content/realms.ts';
import { combatant, graded, type Combatant } from './combatant.ts';
import { combatantIn, type Fight, type Join } from './fight.ts';

/** A combatant's marks for a projection: the turn it arrived on, and that it faded. */
const ARRIVED = 'arrived';
const FADED = 'faded';
/** A charge taken away when you gave face (P3.9c). */
export const FACE = 'face';

/**
 * A backer's projection as a fighter: the backer's realm at a third of every line (a grade below
 * its realm's step, as a weakened blood is), on their charge's side.
 */
export function projectionFighter(
  backer: { id: string; name: string; realm: { realm: RealmId; stage: number } },
  side: string,
): Combatant {
  const at = { realm: backer.realm.realm, stage: backer.realm.stage, grade: 0 };
  const r = graded(at, Math.log(PROJECTION.share) / Math.log(stepOut(at.realm)));
  return combatant({
    id: `projection:${backer.id}`,
    name: `${backer.name}'s projection`,
    side,
    rungs: { qi: r, body: r, soul: r },
  });
}

/** Whether a projection's charge is low enough to call it: under a quarter of their HP, or down. */
function chargeLow(f: Fight, charge: string): boolean {
  const c = combatantIn(f, charge);
  return !!c && (c.state === 'down' || c.hp < c.maxHp * PROJECTION.below);
}

export interface Arrived {
  fight: Fight;
  /** Who joined as this turn begins. */
  came: Join[];
  /** Projections whose turns ran out and faded. */
  faded: string[];
}

/**
 * The fight as the next turn begins: the joins due on it step in, a projection whose charge fell
 * low last turn arrives, and one past its three turns fades.
 */
export function arrive(f: Fight): Arrived {
  const next = f.turn + 1;
  const came: Join[] = [];
  const faded: string[] = [];
  let combatants = f.combatants;
  for (const j of f.joins ?? []) {
    if (combatants.some((c) => c.id === j.who.id)) continue;
    const due =
      j.turn !== null
        ? j.turn === next
        : !!j.charge && !combatantIn(f, j.charge)?.marks[FACE] && chargeLow(f, j.charge);
    if (!due) continue;
    const who: Combatant = {
      ...j.who,
      marks: { ...j.who.marks, ...(j.why === 'projection' ? { [ARRIVED]: next } : {}) },
    };
    combatants = [...combatants, who];
    came.push(j);
  }
  combatants = combatants.map((c) => {
    const at = c.marks[ARRIVED];
    if (at === undefined || c.state !== 'fighting' || next <= at + PROJECTION.turns) return c;
    faded.push(c.id);
    return { ...c, state: 'fled', marks: { ...c.marks, [FADED]: next } };
  });
  return came.length || faded.length
    ? { fight: { ...f, combatants }, came, faded }
    : { fight: f, came, faded };
}

/** A projection speaking on the turn it arrives: its line, and no blow. */
export function speaking(f: Fight, id: string): boolean {
  return combatantIn(f, id)?.marks[ARRIVED] === f.turn + 1;
}

/** The projection that just arrived and asked for face, while you can still give it. */
export function faceAsked(f: Fight): Combatant | undefined {
  return f.combatants.find((c) => c.marks[ARRIVED] === f.turn && c.state === 'fighting');
}

/** You give face: the projection takes its charge away, and both leave the fight. */
export function giveFace(f: Fight): Fight {
  const p = faceAsked(f);
  const j = p && f.joins?.find((x) => x.who.id === p.id);
  if (!p || !j?.charge) return f;
  const charge = j.charge;
  return {
    ...f,
    combatants: f.combatants.map((c) =>
      c.id === p.id
        ? { ...c, state: 'fled' }
        : c.id === charge
          ? { ...c, state: 'fled', marks: { ...c.marks, [FACE]: 1 } }
          : c,
    ),
  };
}

/** The charge you gave face for in this fight, if you did. */
export function faceGiven(f: Fight): string | undefined {
  return f.combatants.find((c) => c.marks[FACE])?.id;
}
