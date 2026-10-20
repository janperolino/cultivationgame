// Enemies act from code (design § Combat; § Enemies, profiles are five numbers): a profile says
// what a fighter opens with, how it picks after, when it defends or takes a pill, when it flees
// and how it talks, and the engine makes every choice from the fight as it stands. GLM only gives
// it a voice. `runFight` plays a fight out with every fighter on its profile, which is how the
// fight sim and, later, a fight the player walks away from resolve.
import { statusOf } from '../../content/combat.ts';
import { PICK_SLACK, PROFILES, type Profile, type ProfileId } from '../../content/enemies.ts';
import type { Rng } from '../rng.ts';
import { statusFlag, type Combatant } from './combatant.ts';
import { damagePhase, elementMultiplier } from './damage.ts';
import {
  combatantIn,
  fightOver,
  preview,
  resolveTurn,
  winner,
  type Action,
  type Fight,
  type MainAction,
  type Preview,
} from './fight.ts';

export function profile(id: ProfileId): Profile {
  const p = PROFILES.find((x) => x.id === id);
  if (!p) throw new RangeError(`Unknown profile ${id}`);
  return p;
}

interface Option {
  main: MainAction;
  p: Preview;
  /** Expected damage: chance × a plain hit. */
  value: number;
  /** Whether the hit carries a status the target doesn't have yet. */
  status: boolean;
  element: number;
}

/** Every attack the actor can pay for against a target, priced. */
function options(f: Fight, me: Combatant, target: Combatant, items: boolean): Option[] {
  const mains: MainAction[] = [
    ...Object.keys(me.techniques).map((id) => ({
      type: 'technique' as const,
      id,
      target: target.id,
    })),
    { type: 'strike', target: target.id },
  ];
  if (items) {
    for (const [id, held] of Object.entries(me.items)) {
      if (held.n > 0 && held.item.uses.fight) mains.push({ type: 'item', id, target: target.id });
    }
  }
  const out: Option[] = [];
  for (const main of mains) {
    const p = preview(f, me.id, main);
    if (!p) continue;
    const type =
      main.type === 'technique'
        ? me.techniques[main.id]!.technique.damage
        : main.type === 'item'
          ? me.items[main.id]!.item.uses.fight!.damage
          : 'physical';
    const st = statusOf(type);
    out.push({
      main,
      p,
      value: p.chance * p.damage,
      status: st !== null && !target.statuses.some((s) => s.id === st),
      element: elementMultiplier(damagePhase(type), target.element),
    });
  }
  return out;
}

const best = (xs: Option[], key: (o: Option) => number) =>
  xs.reduce<Option | undefined>((b, o) => (!b || key(o) > key(b) ? o : b), undefined);

/** The pick a profile makes among priced options. */
function choose(xs: Option[], pick: Profile['picks']): Option | undefined {
  const hardest = best(xs, (o) => o.value);
  if (!hardest) return undefined;
  const near = xs.filter((o) => o.value >= PICK_SLACK * hardest.value);
  switch (pick) {
    case 'hardest':
      return hardest;
    case 'element':
      return best(near, (o) => o.element * 1000 + o.value);
    case 'status':
      return best(near, (o) => (o.status ? 1e9 : 0) + o.value);
    case 'cheapest': {
      const paid = xs.filter((o) => o.p.qi > 0);
      return paid.length ? best(paid, (o) => -o.p.qi * 1e6 + o.value) : hardest;
    }
  }
}

/** The foe a fighter goes after: the one it can hurt most, as a share of their HP left. */
function targetOf(f: Fight, me: Combatant): { target: Combatant; xs: Option[] } | undefined {
  const foes = f.combatants.filter((c) => c.side !== me.side && c.state === 'fighting');
  let pick: { target: Combatant; xs: Option[] } | undefined;
  let score = -1;
  for (const c of foes) {
    const xs = options(f, me, c, false);
    const top = best(xs, (o) => o.value);
    const s = top ? top.value / Math.max(1, c.hp) : 0;
    if (s > score) {
      score = s;
      pick = { target: c, xs };
    }
  }
  // The chosen foe's options come back priced, so the turn never prices them twice.
  return pick;
}

/** What a fighter does this turn on its profile. */
export function chooseAction(f: Fight, id: string, p: Profile): Action {
  const me = combatantIn(f, id);
  if (!me || me.state !== 'fighting') return { actor: id };
  const chosen = targetOf(f, me);
  if (!chosen) return { actor: id };
  const target = chosen.target;
  const share = me.hp / me.maxHp;

  if (p.fleeAt !== null && share <= p.fleeAt) {
    if (!statusFlag(me, 'noFlee')) return { actor: id, main: { type: 'flee' } };
    if (p.id === 'cowardly') {
      return { actor: id, main: { type: 'talk', style: 'surrender', target: target.id } };
    }
  }
  if (p.guardAt !== null && share <= p.guardAt) {
    const pill = Object.entries(me.items).find(
      ([, h]) =>
        h.n > 0 &&
        h.item.uses.consume?.effects.some((e) => e.effect === 'restore' && e.what === 'hp'),
    );
    if (pill) return { actor: id, main: { type: 'item', id: pill[0] } };
    if (f.turn % 2 === 0) return { actor: id, main: { type: 'defend' } };
  }

  const opening = f.turn === 0;
  if (opening && p.opens === 'defend') return { actor: id, main: { type: 'defend' } };
  const xs = opening && p.opens === 'talisman' ? options(f, me, target, true) : chosen.xs;
  if (opening && p.opens === 'talisman') {
    const talisman = xs.find((o) => o.main.type === 'item');
    return { actor: id, main: talisman ? talisman.main : { type: 'defend' } };
  }
  // A cautious fighter probes after its opening defend: the cheapest art that costs qi.
  const pick =
    opening && p.opens === 'status'
      ? 'status'
      : f.turn === 1 && p.opens === 'defend'
        ? 'cheapest'
        : p.picks;
  const o = choose(xs, pick);
  return { actor: id, main: o ? o.main : { type: 'defend' } };
}

export interface FightResult {
  fight: Fight;
  /** The side still standing, or null for a draw at the turn limit. */
  winner: string | null;
  turns: number;
  /** Who fled or yielded, by id. */
  fled: string[];
  /** The techniques each fighter threw, by id: what those watching saw (O5). */
  used: Record<string, string[]>;
}

/** Plays a fight out, every fighter on its own profile (fanatical when it has none). */
export function runFight(start: Fight, rng: Rng, maxTurns = 60): FightResult {
  let f = start;
  const used: Record<string, string[]> = {};
  while (!fightOver(f) && f.turn < maxTurns) {
    const actions = f.combatants
      .filter((c) => c.state === 'fighting')
      .map((c) => chooseAction(f, c.id, profile(c.profile ?? 'fanatical')));
    const r = resolveTurn(f, actions, rng);
    for (const o of r.outcomes)
      if (o.action === 'technique' && o.id && !(used[o.actor] ?? []).includes(o.id))
        used[o.actor] = [...(used[o.actor] ?? []), o.id];
    f = r.fight;
  }
  return {
    fight: f,
    winner: fightOver(f) ? winner(f) : null,
    turns: f.turn,
    fled: f.combatants.filter((c) => c.state === 'fled' || c.state === 'yielded').map((c) => c.id),
    used,
  };
}
