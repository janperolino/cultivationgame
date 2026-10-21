// The engine's outcome, as the narrator gets it (design § How GLM fits in: "prose from the outcome
// only"). What each step did and how its check fell, what a reading of a realm saw, who arrived,
// and what you lost and gained, with what you still carry, since the narrator tends to invent extra
// losses (P0.3). Everyone is named as the viewer's context names them, so the outcome leaks no
// name the context doesn't. Its plain lines are also the fallback when the narrator can't be had.
import { hasItem, item } from '../content/items.ts';
import { ACTS, COSTS, SHORTS } from '../content/resolver.ts';
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
  if (stopped) plain.push(`It hands back to you: ${stopped}.`);
  const text = [
    '# What the engine decided (final; tell exactly this)',
    ...plain.map((l) => `- ${l}`),
  ].join('\n');
  return { text, plain };
}
