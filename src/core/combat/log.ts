// The log line that always follows the prose and shows the math (design § Combat, one turn):
//   Hit · 21 vs 18 · 33 fire · Elder Mo 117/150 · Qi 52/90 · grass burning (2 turns)
// It reads the outcome alone, with the fight only for names.
import { RESULT_NAMES } from '../../content/combat.ts';
import { combatantIn, type Fight, type Outcome } from './fight.ts';

const turns = (n: number) => `${n} turn${n === 1 ? '' : 's'}`;

export function logLine(f: Fight, o: Outcome): string {
  const name = (id: string) => combatantIn(f, id)?.name ?? id;
  const parts: string[] = [RESULT_NAMES[o.result]];
  if (o.total !== undefined && o.tn !== undefined) parts.push(`${o.total} vs ${o.tn}`);
  if (o.damage !== undefined) parts.push(`${o.damage} ${o.type ?? ''}`.trim());
  if (o.hp) parts.push(`${name(o.hp.id)} ${o.hp.hp}/${o.hp.max}`);
  if (o.status && o.target) parts.push(`${name(o.target)} ${o.status}`);
  if (o.pool && o.qi) parts.push(`Qi ${o.pool.qi}/${o.pool.max}`);
  for (const x of o.features ?? []) parts.push(`${x.name} burning (${turns(x.burning)})`);
  return parts.join(' · ');
}
