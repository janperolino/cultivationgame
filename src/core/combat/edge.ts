// A fight's edge with no dice (design § The world, The road's encounters, A fight's verdict; P3.7's
// talk): what the road and the cards read before a fight, and what decides one nobody plays. Both
// sheets' expected blows race: you fell them one by one, the quickest first, and each still standing
// strikes you every exchange. A sure win (Fights you play) is an edge of ×4 or more against foes you
// can read: it resolves on its own, and anything less is played on the Combat screen.
import { verdict, type Verdict } from '../resolver/check.ts';
import type { Combatant } from './combatant.ts';
import { preview, startFight, type Fight } from './fight.ts';

/** The edge a fight must reach to be won on its own: it costs at most a quarter of your strength. */
export const SURE_EDGE = 4;

const MINE = 'you';
const THEIRS = 'them';

/** The best a combatant lands on another in one exchange, by its strike or a technique, unrolled. */
function bestBlow(f: Fight, a: Combatant, target: Combatant): number {
  let best = 0;
  const strike = preview(f, a.id, { type: 'strike', target: target.id });
  if (strike) best = strike.chance * strike.damage;
  for (const id of Object.keys(a.techniques)) {
    const p = preview(f, a.id, { type: 'technique', id, target: target.id });
    if (p) best = Math.max(best, p.chance * p.damage);
  }
  return best;
}

function pool(c: Combatant): number {
  return c.hp + c.shield + (c.armor?.hp ?? 0);
}

export interface FightEdge {
  /** Exchanges you need to fell them all, quickest first. */
  yours: number;
  /** Exchanges they'd need to fell you, at the rate they hit you while you do. */
  theirs: number;
  /** Your strength over what you'd lose felling them: theirs over yours. */
  ratio: number;
  /** The share of your strength the fight would cost you. */
  costs: number;
  verdict: Verdict;
}

/**
 * A fight's edge from both sheets' expected blows. The ratio is your strength (HP, shield and
 * armor) over what the race takes from it: clear at ×1.25, close at ×1.
 */
export function fightEdge(you: Combatant, foes: readonly Combatant[]): FightEdge {
  if (!foes.length)
    return { yours: 0, theirs: Infinity, ratio: Infinity, costs: 0, verdict: 'clear' };
  const me = { ...you, side: MINE };
  const them = foes.map((c) => ({ ...c, side: THEIRS }));
  const f = startFight([me, ...them]);
  const order = them
    .map((t) => {
      const blow = bestBlow(f, me, t);
      return { need: blow > 0 ? pool(t) / blow : Infinity, hits: bestBlow(f, t, me) };
    })
    .sort((a, b) => a.need - b.need);
  let yours = 0;
  let taken = 0;
  let standing = order.reduce((n, o) => n + o.hits, 0);
  for (const o of order) {
    yours += o.need;
    taken += o.need * standing;
    standing -= o.hits;
  }
  const mine = pool(me);
  const ratio = taken > 0 ? mine / taken : Infinity;
  const theirs = Number.isFinite(ratio) ? yours * ratio : Infinity;
  return { yours, theirs, ratio, costs: Math.min(1, taken / mine), verdict: verdict(ratio, 1) };
}

/** A sure win: the edge reaches ×4 and you can read every foe (`reads`). */
export function isSure(edge: FightEdge, reads = true): boolean {
  return reads && edge.ratio >= SURE_EDGE;
}

const round = (n: number) => (Number.isFinite(n) ? Math.max(1, Math.round(n)) : '∞');

/** The edge in words, as the road's cards and the seclusion cards show it. */
export function edgeWords(edge: FightEdge): string {
  return edge.costs >= 1
    ? `you’d fall before they do: ${round(edge.yours)} exchanges to fell them, ${round(edge.theirs)} to fell you`
    : `you’d fell them in ${round(edge.yours)} exchanges, at about ${Math.round(edge.costs * 100)}% of your strength (×${edge.ratio >= 10 ? '10+' : edge.ratio.toFixed(2)})`;
}
