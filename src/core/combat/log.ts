// The log line that always follows the prose and shows the math (design § Combat, one turn):
//   Hit 57% · 25 fire · Elder Mo 151/176 · Qi 52/94 · grass burning (2 turns)
// It reads the outcome alone, with the fight only for names.
import { RESULT_NAMES } from '../../content/combat.ts';
import { combatantIn, type Fight, type Outcome } from './fight.ts';

const turns = (n: number) => `${n} turn${n === 1 ? '' : 's'}`;

export function logLine(f: Fight, o: Outcome): string {
  const name = (id: string) => combatantIn(f, id)?.name ?? id;
  const head = RESULT_NAMES[o.result];
  const parts: string[] = [
    o.chance !== undefined ? `${head} ${Math.round(o.chance * 100)}%` : head,
  ];
  if (o.damage !== undefined) parts.push(`${o.damage} ${o.type ?? ''}`.trim());
  if (o.hp) parts.push(`${name(o.hp.id)} ${o.hp.hp}/${o.hp.max}`);
  if (o.status && o.target) parts.push(`${name(o.target)} ${o.status}`);
  if (o.pool && o.qi) parts.push(`Qi ${o.pool.qi}/${o.pool.max}`);
  for (const x of o.features ?? []) parts.push(`${x.name} burning (${turns(x.burning)})`);
  return parts.join(' · ');
}
