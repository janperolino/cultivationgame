// The card engine (design § Story cards and events): once a world day, each deck's cards whose
// trigger holds roll their daily chance on the `world` stream, and one of those that pass is drawn
// by weight into the pending feed. Cards wait for the player; an urgent one resolves by its default
// choice once it has waited its days. Offline, at most three wait and the rest resolve by default
// at once, for the coming-back card. Choosing pays the cost, rolls the check, applies the effects
// and writes the chronicle line. `playDay` is the game's day step: cultivation, then the cards.
import {
  CARDS,
  card,
  OFFLINE_QUEUE,
  type Card,
  type CardChoice,
  type CardEffect,
  type CardOutcome,
  type Trigger,
} from '../content/cards/index.ts';
import { fillSlots } from '../content/chronicle.ts';
import { pathKey } from '../content/origins.ts';
import { realmIndex } from '../content/realms.ts';
import { firstTechnique } from '../content/techniques.ts';
import { whoFor } from './chronicle.ts';
import { barSize, fromWorld } from './cultivation.ts';
import { contemplate, gainInsight, insightMultiplier } from './insight.ts';
import { cultivate, gainMethod, gainRoutine, gainTechnique } from './life.ts';
import type { DayStep } from './loop.ts';
import type { Rng } from './rng.ts';
import {
  addEvent,
  addFlag,
  addItem,
  daysLived,
  hasFlag,
  itemCount,
  setMark,
  withPlayer,
  withStream,
  type Cultivator,
  type GameState,
  type PendingCard,
} from './state.ts';
import { agility, aptitude, fortune, stats } from './stats.ts';

// ---------------------------------------------------------------- triggers

/** Whether a trigger holds for the player on a world day. */
export function triggerHolds(s: GameState, t: Trigger, day = s.calendar.day): boolean {
  const c = s.player;
  if (t.daysLived) {
    const lived = daysLived(c, day);
    const [min, max] = t.daysLived;
    if (lived < min || (max !== undefined && lived >= max)) return false;
  }
  if (t.qi) {
    const above = realmIndex(c.qi.realm) > 0;
    if (t.qi.realm && c.qi.realm !== t.qi.realm) return false;
    // Without a realm, stages count at Qi Condensation, and any realm above it is past them all.
    const same = !!t.qi.realm || !above;
    if (t.qi.minStage !== undefined && same && c.qi.stage < t.qi.minStage) return false;
    if (t.qi.maxStage !== undefined && (!same || c.qi.stage > t.qi.maxStage)) return false;
  }
  if (t.origin && (!c.origin || !t.origin.includes(c.origin.id))) return false;
  if (t.choice && c.origin?.choice !== t.choice) return false;
  if (t.flags && !t.flags.every((f) => hasFlag(c, f))) return false;
  if (t.notFlags?.some((f) => hasFlag(c, f))) return false;
  if (t.noItem && itemCount(c, t.noItem) > 0) return false;
  if (t.noMethod && c.activeMethods[t.noMethod] !== null) return false;
  if (t.mark) {
    const at = s.cards.marks[t.mark.id];
    if (at === undefined || day - at < t.mark.days) return false;
  }
  return true;
}

/** Whether a card can be drawn: its trigger holds, it isn't waiting, and once and cooldown allow. */
export function cardEligible(s: GameState, c: Card, day = s.calendar.day): boolean {
  if (s.cards.pending.some((p) => p.card === c.id)) return false;
  const last = s.cards.drawn[c.id];
  if (last !== undefined) {
    if (c.once) return false;
    if (c.cooldown !== undefined && day - last < c.cooldown) return false;
  }
  return triggerHolds(s, c.trigger, day);
}

// ---------------------------------------------------------------- choosing

export type ChoiceCheck = { ok: true } | { ok: false; reason: string };

/** Whether the player can pay a choice's cost. */
export function canChoose(c: Cultivator, choice: CardChoice): ChoiceCheck {
  const cost = choice.cost;
  if (cost?.stones && c.stones < cost.stones) {
    return { ok: false, reason: `It costs ${cost.stones} spirit stones.` };
  }
  if (cost?.item && itemCount(c, cost.item.id) < cost.item.n) {
    return { ok: false, reason: 'You lack what it costs.' };
  }
  return { ok: true };
}

/** The attribute a check reads, with what talents add. */
export function attributeValue(c: Cultivator, attr: 'agility' | 'fortune' | 'aptitude'): number {
  return attr === 'agility' ? agility(c) : attr === 'fortune' ? fortune(c) : aptitude(c);
}

/** The choice a card takes without you: its default, or the first one you can pay for. */
export function defaultChoice(c: Cultivator, k: Card): number {
  const preferred = k.defaultChoice ?? 0;
  if (canChoose(c, k.choices[preferred]!).ok) return preferred;
  const free = k.choices.findIndex((ch) => canChoose(c, ch).ok);
  return free < 0 ? preferred : free;
}

/** One effect of a card on the game. */
function applyEffect(s: GameState, e: CardEffect): GameState {
  const c = s.player;
  switch (e.do) {
    case 'stones':
      return withPlayer(s, { ...c, stones: Math.max(0, c.stones + e.n) });
    case 'item':
      return withPlayer(s, addItem(c, e.id, e.n));
    case 'fuel':
      return withPlayer(s, fromWorld(c, e.ladder, e.share * barSize(c[e.ladder])));
    case 'insight':
      return withPlayer(s, gainInsight(c, e.n * insightMultiplier(c)));
    case 'injury': {
      const days = e.days * Math.max(0, 1 + stats(c).setbackTime);
      const l = c[e.ladder];
      const injuredUntil = Math.max(l.injuredUntil, s.calendar.day + days);
      return withPlayer(s, { ...c, [e.ladder]: { ...l, injuredUntil } });
    }
    case 'flag':
      return withPlayer(s, addFlag(c, e.id));
    case 'method':
      return gainMethod(s, e.id, 'is handed');
    case 'technique':
      return gainTechnique(s, e.id, 'is taught');
    case 'first-technique': {
      const t = c.origin ? firstTechnique(pathKey(c.origin.id, c.origin.choice)) : undefined;
      return t ? gainTechnique(s, t.id, 'is taught') : s;
    }
    case 'routine':
      return gainRoutine(s, e.id, 'is taught');
    case 'contemplate':
      return withPlayer(s, contemplate(c, e.source, e.days ?? 1).cultivator);
    case 'mark':
      return setMark(s, e.id);
    case 'clear-mark': {
      const marks = { ...s.cards.marks };
      delete marks[e.id];
      return { ...s, cards: { ...s.cards, marks } };
    }
  }
}

export interface CardResult {
  state: GameState;
  /** False when the card isn't waiting or the choice can't be paid for; the state is unchanged. */
  ok: boolean;
  reason?: string;
  /** What the card says happened, slots filled. */
  text: string;
  /** The check's outcome, or null without one. */
  pass: boolean | null;
  /** The d20 and the total against the difficulty, when there was a check. */
  roll?: { d20: number; total: number; dc: number };
}

/** A d20 check: d20 + (attribute − 10) against the difficulty. */
function rollCheck(c: Cultivator, choice: CardChoice, rng: Rng) {
  const check = choice.check!;
  const d20 = 1 + Math.floor(rng.next() * 20);
  const total = d20 + attributeValue(c, check.attribute) - 10;
  return { d20, total, dc: check.dc, pass: total >= check.dc };
}

/**
 * Resolves a waiting card with a choice: pays its cost, rolls its check on the `world` stream,
 * writes its chronicle line and applies the outcome's effects.
 */
export function resolveCard(
  s: GameState,
  uid: number,
  index: number,
  opts: { byDefault?: boolean } = {},
): CardResult {
  const pending = s.cards.pending.find((p) => p.uid === uid);
  const none = { state: s, ok: false, text: '', pass: null };
  if (!pending) return { ...none, reason: 'That card is gone.' };
  const k = card(pending.card);
  const choice = k.choices[index];
  if (!choice) return { ...none, reason: 'No such choice.' };
  const can = canChoose(s.player, choice);
  if (!can.ok) return { ...none, reason: can.reason };

  let next: GameState = {
    ...s,
    cards: { ...s.cards, pending: s.cards.pending.filter((p) => p.uid !== uid) },
  };
  const cost = choice.cost;
  if (cost?.stones)
    next = withPlayer(next, { ...next.player, stones: next.player.stones - cost.stones });
  if (cost?.item) next = withPlayer(next, addItem(next.player, cost.item.id, -cost.item.n));

  let pass: boolean | null = null;
  let roll: CardResult['roll'];
  if (choice.check) {
    const r = withStream(next, 'world', (rng) => rollCheck(next.player, choice, rng));
    next = r.state;
    pass = r.value.pass;
    roll = { d20: r.value.d20, total: r.value.total, dc: r.value.dc };
  }
  const outcome: CardOutcome = pass === false && choice.fail ? choice.fail : choice.pass;
  next = addEvent(next, 'card', {
    card: k.id,
    choice: index,
    pass,
    byDefault: opts.byDefault ?? false,
  });
  for (const e of outcome.effects) next = applyEffect(next, e);
  const text = fillSlots(outcome.text, whoFor(s.player));
  return { state: next, ok: true, text, pass, ...(roll ? { roll } : {}) };
}

/** Resolves a waiting card by its default choice, as if the player had stayed away. */
export function resolveByDefault(s: GameState, uid: number): GameState {
  const pending = s.cards.pending.find((p) => p.uid === uid);
  if (!pending) return s;
  const index = defaultChoice(s.player, card(pending.card));
  return resolveCard(s, uid, index, { byDefault: true }).state;
}

// ---------------------------------------------------------------- drawing

/** The cards whose trigger holds today, each passing its daily chance or past its sure day. */
function rollCandidates(s: GameState, day: number, rng: Rng): Card[] {
  const lived = daysLived(s.player, day);
  return CARDS.filter((k) => cardEligible(s, k, day)).filter((k) => {
    if (k.sureAt !== undefined && lived >= k.sureAt) return true;
    const chance = k.chance ?? 1;
    return chance >= 1 || rng.next() < chance;
  });
}

/** Picks one card by weight. */
export function pickByWeight(cards: readonly Card[], rng: Rng): Card | undefined {
  if (cards.length <= 1) return cards[0];
  const total = cards.reduce((sum, k) => sum + (k.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const k of cards) {
    roll -= k.weight ?? 1;
    if (roll < 0) return k;
  }
  return cards.at(-1);
}

/** One world day of the decks: urgent cards default, then at most one card is drawn. */
function drawDay(s: GameState, day: number, offline: boolean): GameState {
  let next = s;
  for (const p of s.cards.pending) {
    const urgent = card(p.card).urgent;
    if (urgent && day - p.day >= urgent.days) next = resolveByDefault(next, p.uid);
  }
  const { value: drawn, state } = withStream(next, 'world', (rng) =>
    pickByWeight(rollCandidates(next, day, rng), rng),
  );
  next = state;
  if (!drawn) return next;
  const entry: PendingCard = { uid: next.cards.nextUid, card: drawn.id, day: next.calendar.day };
  next = {
    ...next,
    cards: {
      ...next.cards,
      pending: [...next.cards.pending, entry],
      drawn: { ...next.cards.drawn, [drawn.id]: next.calendar.day },
      nextUid: entry.uid + 1,
    },
  };
  // Offline, at most three wait for you; the rest resolve by default for the coming-back card.
  if (offline && next.cards.pending.length > OFFLINE_QUEUE)
    next = resolveByDefault(next, entry.uid);
  return next;
}

/** Runs the decks for every whole world day since they were last checked. */
export function drawCards(s: GameState, opts: { offline?: boolean } = {}): GameState {
  if (s.ended) return s;
  const today = Math.floor(s.calendar.day);
  let next = s;
  for (let day = s.cards.checked + 1; day <= today; day++) {
    next = drawDay(next, day, opts.offline ?? false);
    next = { ...next, cards: { ...next.cards, checked: day } };
  }
  return next;
}

/** The game's day step: the player cultivates, then the decks run. */
export const playDay: DayStep = (s, days, ctx) =>
  drawCards(cultivate(s, days, ctx), { offline: ctx.offline });

// ---------------------------------------------------------------- reading

export interface CardView {
  uid: number;
  card: Card;
  title: string;
  text: string;
  day: number;
  choices: { label: string; check: ChoiceCheck; choice: CardChoice }[];
}

/** A waiting card as the player reads it: slots filled, each choice with whether it can be paid. */
export function viewCard(s: GameState, p: PendingCard): CardView {
  const k = card(p.card);
  const who = whoFor(s.player);
  return {
    uid: p.uid,
    card: k,
    title: fillSlots(k.title, who),
    text: fillSlots(k.text, who),
    day: p.day,
    choices: k.choices.map((choice) => ({
      label: fillSlots(choice.label, who),
      check: canChoose(s.player, choice),
      choice,
    })),
  };
}

/** The cards resolved without the player since a day, for the coming-back card. */
export function defaultedSince(s: GameState, day: number) {
  return s.chronicle.filter((e) => e.type === 'card' && e.data.byDefault && e.day > day);
}
