// The road home (P3.9, design § The world, A trip): no trip record is kept, only the day you left
// home, the li walked since and what you carried leaving (the map's `out`). Reaching home after
// three or more days out, or handing a goal in at its board, brings the coming-back card: the days
// and the li, each encounter and how it settled, what came home and what was lost, wounds still on
// you, who will remember you, and what waits at home; the chronicle takes one line.
import { encounterTemplate } from '../content/encounters/index.ts';
import { ROAD_HOME_DAYS } from '../content/goin.ts';
import { hasItem, item } from '../content/items.ts';
import { queueCard } from './dwellings.ts';
import { nameOf } from './people.ts';
import { stonesOf, worthOf } from './purse.ts';
import { woundShare } from './resolver/world.ts';
import type { GameState } from './state.ts';

type Out = NonNullable<NonNullable<GameState['map']>['out']>;

function outNow(s: GameState): Out {
  return {
    since: s.calendar.day,
    li: 0,
    stones: worthOf(stonesOf(s.player)),
    items: { ...s.player.items },
  };
}

/**
 * Notes an hour on the road (core/map/travel.ts): away from home the trip starts, or its li grow;
 * home again after ROAD_HOME_DAYS or more, the coming-back card comes and the trip is done.
 */
export function noteRoad(s: GameState, atHome: boolean, walked: number): GameState {
  const life = s.map;
  if (!life) return s;
  if (!atHome) {
    const out = life.out ?? outNow(s);
    if (life.out && walked <= 0) return s;
    return { ...s, map: { ...life, out: { ...out, li: out.li + Math.max(0, walked) } } };
  }
  if (!life.out) return s;
  const back: GameState = { ...s, map: { ...life, out: null } };
  return s.calendar.day - life.out.since >= ROAD_HOME_DAYS ? roadHomeCard(back, life.out) : back;
}

/** A goal handed in at its board brings the card for the trip so far, and the trip starts over. */
export function handedIn(s: GameState): GameState {
  const out = s.map?.out;
  if (!out) return s;
  const st = roadHomeCard(s, out);
  return { ...st, map: { ...st.map!, out: outNow(st) } };
}

const nameOfItem = (id: string) => (hasItem(id) ? item(id).name : id);

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n === 1 ? 'one' : n} ${n === 1 ? one : many}`;
}

/** The trip as the card tells it, from the day it began. */
export function tripWords(s: GameState, out: Out): { title: string; story: string; line: string } {
  const days = Math.max(1, Math.round(s.calendar.day - out.since));
  const li = Math.round(out.li / 10) * 10;
  const lines: string[] = [`${plural(days, 'day')} out, ${li.toLocaleString('en')} li walked.`];
  // Each encounter as the road told it, and whether your stance settled it or your hand did.
  const met = (s.map?.road ?? []).filter((l) => l.template && l.day >= out.since);
  const stance = new Set(
    s.chronicle
      .filter((e) => e.type === 'encounter' && e.data.kind === 'settled')
      .map((e) => e.day),
  );
  for (const l of met.slice(-6))
    lines.push(`${l.text} (${stance.has(l.day) ? 'By your stance.' : 'By your hand.'})`);
  if (met.length > 6) lines.push(`And ${plural(met.length - 6, 'more')} besides.`);
  const waiting = (s.map?.encounters ?? []).filter((e) => e.state === 'waiting');
  for (const e of waiting)
    lines.push(`Still waiting on the road: ${encounterTemplate(e.template).title.toLowerCase()}.`);
  const p = s.player;
  const gained: string[] = [];
  const lost: string[] = [];
  for (const id of new Set([...Object.keys(out.items), ...Object.keys(p.items)])) {
    const d = (p.items[id] ?? 0) - (out.items[id] ?? 0);
    if (d > 0) gained.push(`${nameOfItem(id)}${d > 1 ? ` ×${d}` : ''}`);
    if (d < 0) lost.push(`${nameOfItem(id)}${d < -1 ? ` ×${-d}` : ''}`);
  }
  const stones = Math.round(worthOf(stonesOf(p)) - out.stones);
  if (stones > 0) gained.push(`${stones} low-grade stones’ worth`);
  if (stones < 0) lost.push(`${-stones} low-grade stones’ worth`);
  if (gained.length) lines.push(`Home with you: ${gained.join(', ')}.`);
  if (lost.length) lines.push(`Gone: ${lost.join(', ')}.`);
  const hurt = woundShare(s.world, p.id, s.calendar.day);
  if (hurt > 0) lines.push(`Still hurt: ${Math.round(hurt * 100)}% off your lines.`);
  const holders = [
    ...new Set(
      s.world.memories
        .filter((m) => m.about === p.id && m.holder !== p.id && m.day >= out.since)
        .map((m) => m.holder),
    ),
  ];
  const named = holders.map((h) => nameOf(s, h)).filter((n) => !n.includes(':'));
  if (named.length) lines.push(`They will remember you: ${named.slice(0, 5).join(', ')}.`);
  else if (holders.length) lines.push(`${plural(holders.length, 'stranger')} will remember you.`);
  const cards = s.cards.pending.length;
  if (cards)
    lines.push(`At home, ${plural(cards, 'card')} ${cards === 1 ? 'waits' : 'wait'} for you.`);
  return {
    title: days >= ROAD_HOME_DAYS ? 'The road home' : 'Back from the road',
    story: lines.join(' '),
    line: `{name} comes back from ${plural(days, 'day')} on the road.`,
  };
}

function roadHomeCard(s: GameState, out: Out): GameState {
  const w = tripWords(s, out);
  return queueCard(s, 'road-home', {}, { ...w, after: 'You set your things down.' }).state;
}
