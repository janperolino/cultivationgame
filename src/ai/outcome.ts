// The engine's outcome, as the narrator gets it (design § How GLM fits in: "prose from the outcome
// only"). What each step did and how its check fell, what a reading of a realm saw, who arrived,
// and what you lost and gained, with what you still carry, since the narrator tends to invent extra
// losses (P0.3). Everyone is named as the viewer's context names them, so the outcome leaks no
// name the context doesn't. Its plain lines are also the fallback when the narrator can't be had.
import { hasItem, item } from '../content/items.ts';
import { ACTS, COSTS, PROJECTION, SHORTS } from '../content/resolver.ts';
import type { Combatant } from '../core/combat/combatant.ts';
import type { FightEnd } from '../core/played.ts';
import {
  combatantIn,
  type Fight,
  type Join,
  type Outcome as FightOutcome,
} from '../core/combat/fight.ts';
import type { Actor } from '../core/resolver/actor.ts';
import type { Scene, StepResult } from '../core/resolver/scene.ts';
import { labelOf, realmWords, type View } from './context.ts';

export interface Outcome {
  /** The outcome as the narrator's task. */
  text: string;
  /** The same, line by line, for telling it without the narrator. */
  plain: string[];
}

const itemName = (id: string) => (hasItem(id) ? item(id).name : id);

/** You and anyone the view names; "someone" for anyone hidden from you. */
function who(view: View, id: string): string {
  return id === view.viewer ? 'You' : labelOf(view, id);
}

function stepLine(view: View, r: StepResult): string {
  const act = ACTS[r.step.act];
  const parts = [`${who(view, r.actor)}: ${act.name}`];
  if (r.step.target) {
    const t = view.people[r.step.target] ? who(view, r.step.target) : r.step.target;
    parts[0] += ` (${t === 'You' ? 'you' : t})`;
  }
  if (r.refused) parts.push(`could not be tried: ${r.refused}`);
  else if (r.check) {
    parts.push(r.check.verdict);
    if (r.check.verdict === 'close' && r.cost) parts.push(`cost: ${COSTS[r.cost]}`);
    if (r.check.verdict === 'short' && r.short) parts.push(SHORTS[r.short]);
    if (r.check.pinned) parts.push('pinned by realm pressure');
    if (r.check.read) parts.push('the lie was read');
  } else parts.push('done');
  if (r.read) {
    parts.push(
      r.read.kind === 'beyond'
        ? "you can't see through their cultivation"
        : `their realm reads ${realmWords(r.read.realm)}`,
    );
  }
  if (r.fight) {
    const won =
      r.fight.winner === null
        ? 'nobody stands'
        : `${r.fight.winner === 'you' ? 'your side' : 'their side'} stands`;
    parts.push(`the fight: ${won}, after ${r.fight.turns} turns`);
  }
  if (r.surprise) parts.push(`surprise: ${r.surprise}`);
  return parts.join(' · ');
}

function counted(n: number, id: string) {
  return `${itemName(id)}${n > 1 ? ` ×${n}` : ''}`;
}

/** What you lost and gained between two pictures of yourself, and what you still carry. */
function youLines(before: Actor | undefined, after: Actor | undefined): string[] {
  if (!before || !after) return [];
  const out: string[] = [];
  const lost: string[] = [];
  const gained: string[] = [];
  for (const id of new Set([...Object.keys(before.items), ...Object.keys(after.items)])) {
    const d = (after.items[id] ?? 0) - (before.items[id] ?? 0);
    if (d < 0) lost.push(counted(-d, id));
    if (d > 0) gained.push(counted(d, id));
  }
  const taels = (after.taels ?? 0) - (before.taels ?? 0);
  if (taels < 0) lost.push(`${-taels} taels of silver`);
  if (taels > 0) gained.push(`${taels} taels of silver`);
  const stones = after.stones - before.stones;
  if (stones < 0) lost.push(`${-stones} low-grade stones' worth`);
  if (stones > 0) gained.push(`${stones} low-grade stones' worth`);
  if (lost.length) out.push(`You lose: ${lost.join(', ')}.`);
  if (gained.length) out.push(`You gain: ${gained.join(', ')}.`);
  if (after.wound > before.wound)
    out.push(`You are wounded: ${Math.round(after.wound * 100)}% off every line.`);
  if (after.state !== before.state) out.push(`You are now ${after.state}.`);
  const kept = Object.entries(after.items)
    .filter(([, n]) => n > 0)
    .slice(0, 8)
    .map(([id, n]) => counted(n, id));
  if (lost.length)
    out.push(
      `You keep: ${kept.length ? kept.join(', ') : 'nothing'}, and ${after.stones} low-grade stones' worth.`,
    );
  return out;
}

/** A scene's log lines the place layer wrote to be told (core/goinPlace.ts `told`). */
const TOLD = '» ';

/**
 * The outcome of a round or a plan's run, for the viewer: each step in order, who arrived, what
 * you lost and gained, and why the plan handed back to you.
 */
export function outcomeOf(
  view: View,
  before: Scene,
  after: Scene,
  results: readonly StepResult[],
  stopped: string | null = null,
): Outcome {
  const plain: string[] = results.map((r) => stepLine(view, r));
  for (const a of after.actors) {
    if (!before.actors.some((b) => b.id === a.id) && view.people[a.id])
      plain.push(`${who(view, a.id)} arrives.`);
  }
  for (const a of after.actors) {
    const b = before.actors.find((x) => x.id === a.id);
    if (a.id === view.viewer || !b || b.state === a.state || !view.people[a.id]) continue;
    plain.push(`${who(view, a.id)} is now ${a.state}.`);
  }
  plain.push(
    ...youLines(
      before.actors.find((a) => a.id === view.viewer),
      after.actors.find((a) => a.id === view.viewer),
    ),
  );
  // What the place answered (P3.9b): a move, a witness, a noise heard across it, a word told.
  for (const l of after.log.slice(before.log.length))
    if (l.startsWith(TOLD)) plain.push(l.slice(2));
  if (stopped) plain.push(`It hands back to you: ${stopped}.`);
  const text = [
    '# What the engine decided (final; tell exactly this)',
    ...plain.map((l) => `- ${l}`),
  ].join('\n');
  return { text, plain };
}

/** One exchange of a fight inside the scene, as the engine played it (P3.9c). */
export interface ExchangePlayed {
  fight: Fight;
  outcomes: readonly FightOutcome[];
  came: readonly Join[];
  faded: readonly string[];
  /** Why a typed turn played as the nearest legal action. */
  why: string | null;
  /** You gave face to a projection this exchange. */
  face?: boolean;
}

/** The fight's end, told once after its exchanges were (P3.9c): how it ends, not the fight again. */
export const FIGHT_TOLD =
  'The fight was told exchange by exchange: tell how it ends and what follows, not the fight again.';

const RESULT_WORDS: Record<string, string> = {
  hit: 'hits',
  critical: 'hits hard',
  miss: 'misses',
  backfire: 'backfires',
  held: 'holds',
  escaped: 'gets away',
  failed: 'fails',
  swayed: 'sways them',
};

/**
 * An exchange of a fight inside the scene for the narrator (P3.9c): who stands on each side with
 * their HP, then each blow as it fell, who joined and who faded, everyone named as the viewer's
 * context names them (the law and a projection by what they are). The GLM run found a beat told
 * without the fight's sides invents thefts and leaks its working, so the sides come first.
 */
export function exchangeOutcome(view: View, x: ExchangePlayed): Outcome {
  const f = x.fight;
  // The law and a projection go by what they are; anyone your context no longer holds (fled,
  // taken away) is "someone", never a name you weren't given.
  const name = (id: string) =>
    id === view.viewer
      ? 'you'
      : view.people[id]
        ? labelOf(view, id)
        : id.startsWith('law:') || id.startsWith('projection:')
          ? (combatantIn(f, id)?.name ?? 'someone')
          : 'someone';
  const me = combatantIn(f, view.viewer);
  const hp = (c: Combatant) =>
    `${name(c.id)} (${c.state === 'fighting' ? `HP ${c.hp}/${c.maxHp}` : c.state})`;
  const mine = f.combatants.filter((c) => c.side === me?.side);
  const theirs = f.combatants.filter((c) => c.side !== me?.side);
  const what = (o: FightOutcome) => {
    const by = combatantIn(f, o.actor);
    if (o.action === 'technique' && o.id) return by?.techniques[o.id]?.technique.name ?? 'an art';
    if (o.action === 'item' && o.id) return by?.items[o.id]?.item.name ?? 'an item';
    return o.action;
  };
  const plain: string[] = [];
  if (x.why)
    plain.push(`Your words asked for what you can't do (${x.why}): you do the nearest thing.`);
  for (const j of x.came)
    plain.push(
      j.why === 'projection'
        ? `${name(j.who.id)} arrives at ${name(j.charge ?? '')}'s side and says: "${PROJECTION.line}" It strikes no blow this exchange.`
        : `${name(j.who.id)} arrives and joins the fight ${j.who.side === me?.side ? 'at your side' : 'against you'}.`,
    );
  for (const o of x.outcomes) {
    const at = o.target && o.target !== o.actor ? ` at ${name(o.target)}` : '';
    const dmg = o.damage ? `, ${o.damage}${o.type ? ` ${o.type}` : ''}` : '';
    const left = o.hp ? ` (${name(o.hp.id)} ${o.hp.hp}/${o.hp.max})` : '';
    plain.push(
      `${name(o.actor)}: ${what(o)}${at}, ${RESULT_WORDS[o.result] ?? o.result}${dmg}${left}`,
    );
  }
  for (const id of x.faded) plain.push(`${name(id)} fades.`);
  if (x.face) {
    const p = f.combatants.find((c) => c.id.startsWith('projection:') && c.state === 'fled');
    const charge = f.combatants.find((c) => c.marks.face);
    plain.push(
      `You give face. ${p ? name(p.id) : 'The projection'} takes ${charge ? name(charge.id) : 'its charge'} away; both are gone from the fight.`,
    );
  }
  const text = [
    `# A fight under way, exchange ${f.turn} (final; tell only this exchange)`,
    `On your side: ${mine.map(hp).join(', ')}. Against you: ${theirs.map(hp).join(', ')}.`,
    ...plain.map((l) => `- ${l}`),
    'Nothing is taken, nobody leaves, arrives or speaks unless a line here says so.',
  ].join('\n');
  return { text, plain };
}

const END_WORDS: Record<FightEnd, string> = {
  won: 'your side stands',
  lost: 'you are down',
  fled: 'you break away',
  yielded: 'you yield',
  talked: 'they yield to your words',
  draw: 'both sides draw off',
};

/**
 * A fight inside the scene ends (P3.9c): how it ended and who stands where, its last exchange,
 * then what the scene made of it (the law arriving, a witness, a noise), told once and not the
 * fight again. The GLM run found the round's own step line, its foe gone from your context as
 * "someone", left the narrator guessing at who fought.
 */
export function fightEndOutcome(
  view: View,
  f: Fight,
  how: FightEnd,
  before: Scene,
  after: Scene,
  results: readonly StepResult[],
  last: readonly string[],
): Outcome {
  const scene = outcomeOf(
    view,
    before,
    after,
    results.filter((r) => !r.fight),
  );
  const ex = exchangeOutcome(view, { fight: f, outcomes: [], came: [], faded: [], why: null });
  const plain = [...last, ...scene.plain];
  const text = [
    `# The fight ends after ${f.turn} exchanges: ${END_WORDS[how]} (final; tell only its end)`,
    ex.text.split('\n')[1]!,
    ...plain.map((l) => `- ${l}`),
    FIGHT_TOLD,
  ].join('\n');
  return { text, plain };
}
