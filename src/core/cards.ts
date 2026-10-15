// The card engine (design § Story cards and events): once a world day, each deck's cards whose
// trigger holds roll their daily chance on the `world` stream, and one of those that pass is drawn
// by weight into the pending feed. A paced deck, the seclusion deck, rolls its pace once a day
// instead, so it comes about once every few real minutes whatever the realm's clock, and the first
// hour's story cards come first on a day both pass. Cards wait for the player; an urgent one
// resolves by its default choice once it has waited its days. Offline, at most three wait and the
// rest resolve by default at once, for the coming-back story. Choosing pays the cost, makes the
// check (your attribute against the card's number, the resolver's comparison, no roll) and
// applies the effects; a choice can lead to a further step, which carries the card's
// variables on, and the card writes one chronicle line for its path when it ends, naming everyone
// it spoke of. `playDay` is the game's day step: cultivation, then the cards.
import {
  CARDS,
  card,
  DECK_PACE,
  OFFLINE_QUEUE,
  type Card,
  type CardChoice,
  type CardEffect,
  type CardOutcome,
  type CardStep,
  type Trigger,
  type VarCheck,
} from '../content/cards/index.ts';
import { fillSlots, type Who } from '../content/chronicle.ts';
import { copyId } from '../content/copies.ts';
import { COMBAT_DAOS } from '../content/daos.ts';
import { pathKey } from '../content/origins.ts';
import { realmIndex } from '../content/realms.ts';
import { firstTechnique } from '../content/techniques.ts';
import { seasonOf, whoFor } from './chronicle.ts';
import { barFill, barSize, fromWorld } from './cultivation.ts';
import { contemplate, gainInsight, insightMultiplier } from './insight.ts';
import { intentMoment, readyDaos, readyFor, stageName } from './intent.ts';
import { cultivate, gainCopy, gainManual, gainMethod, gainRoutine, gainTechnique } from './life.ts';
import { holdsManual } from './manuals.ts';
import { copyCount } from './reading.ts';
import { daysPerRealMs, type DayStep } from './loop.ts';
import { applyPersonEffect, knowsSlot, peopleIn, resolveWho } from './people.ts';
import type { Rng } from './rng.ts';
import {
  addEvent,
  addFlag,
  addItem,
  DAYS_PER_YEAR,
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
import { verdict, type Verdict } from './resolver/check.ts';
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
    if (t.qi.minFill !== undefined && barFill(c.qi) < t.qi.minFill) return false;
  }
  if (t.origin && (!c.origin || !t.origin.includes(c.origin.id))) return false;
  if (t.choice && c.origin?.choice !== t.choice) return false;
  if (t.flags && !t.flags.every((f) => hasFlag(c, f))) return false;
  if (t.notFlags?.some((f) => hasFlag(c, f))) return false;
  if (t.noItem && itemCount(c, t.noItem) > 0) return false;
  if (t.noMethod && c.activeMethods[t.noMethod] !== null) return false;
  if (t.hasMethod && c.activeMethods[t.hasMethod] === null) return false;
  if (
    t.noManual &&
    (holdsManual(c, t.noManual) || copyCount(c, copyId('manual', t.noManual)) > 0)
  ) {
    return false;
  }
  if (t.mark) {
    const at = s.cards.marks[t.mark.id];
    if (at === undefined || day - at < t.mark.days) return false;
  }
  if (t.season && !t.season.includes(seasonOf(day))) return false;
  if (t.yearDay) {
    const d = Math.floor(((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR);
    if (d < t.yearDay[0] || d >= t.yearDay[1]) return false;
  }
  if (t.people && !t.people.every((slot) => knowsSlot(c, slot))) return false;
  if (t.minStones !== undefined && c.stones < t.minStones) return false;
  if (t.intentReady && readyDaos(c).length === 0) return false;
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

/** The step a waiting card stands at: its opening, or a later step. */
export function stepOf(k: Card, step: string | undefined): CardStep {
  if (step === undefined) return k;
  const st = k.steps?.[step];
  if (!st) throw new RangeError(`Card ${k.id} has no step ${step}`);
  return st;
}

function varHolds(vars: Readonly<Record<string, number>>, w: VarCheck | undefined): boolean {
  if (!w) return true;
  const v = vars[w.id] ?? 0;
  return (w.min === undefined || v >= w.min) && (w.max === undefined || v <= w.max);
}

/** Whether a choice is offered at all: a `when` on the card's variables. */
export function choiceOffered(choice: CardChoice, vars: Readonly<Record<string, number>> = {}) {
  return varHolds(vars, choice.when);
}

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

/**
 * The choice a card's step takes without you: its default, or the first one offered that you can
 * pay for. The opening step when no step is named.
 */
export function defaultChoice(
  c: Cultivator,
  k: Card,
  step?: string,
  vars: Readonly<Record<string, number>> = {},
): number {
  const st = stepOf(k, step);
  const usable = (ch: CardChoice) => choiceOffered(ch, vars) && canChoose(c, ch).ok;
  const preferred = st.defaultChoice ?? 0;
  if (usable(st.choices[preferred]!)) return preferred;
  const free = st.choices.findIndex(usable);
  return free < 0 ? preferred : free;
}

/** One effect of a card on the game; `var` effects are the caller's. */
function applyEffect(s: GameState, e: CardEffect): GameState {
  const c = s.player;
  switch (e.do) {
    case 'stones':
      return withPlayer(s, { ...c, stones: Math.max(0, c.stones + e.n) });
    case 'item':
      return withPlayer(s, addItem(c, e.id, e.n));
    case 'fuel': {
      const amount = e.share * barSize(c[e.ladder]);
      if (amount >= 0) return withPlayer(s, fromWorld(c, e.ladder, amount));
      const l = c[e.ladder];
      return withPlayer(s, { ...c, [e.ladder]: { ...l, bar: Math.max(0, l.bar + amount) } });
    }
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
    case 'manual':
      return gainManual(s, e.id, 'comes by');
    case 'copy':
      return gainCopy(s, e.id, 'comes by');
    case 'contemplate':
      return withPlayer(s, contemplate(c, e.source, e.days ?? 1).cultivator);
    case 'moment': {
      const dao = readyDaos(c)[0];
      return dao ? intentMoment(s, dao, 'epiphany') : s;
    }
    case 'mark':
      return setMark(s, e.id);
    case 'clear-mark': {
      const marks = { ...s.cards.marks };
      delete marks[e.id];
      return { ...s, cards: { ...s.cards, marks } };
    }
    case 'person':
      return applyPersonEffect(s, e);
    case 'var':
      return s;
  }
}

export interface CardResult {
  state: GameState;
  /** False when the card isn't waiting or the choice can't be taken; the state is unchanged. */
  ok: boolean;
  reason?: string;
  /** What the card says happened, slots filled. */
  text: string;
  /** The check's outcome, or null without one: true on a clear or close pass. */
  pass: boolean | null;
  /** The comparison, when there was a check: your attribute, the card's number and the verdict. */
  check?: CardCheck;
  /** False when the card goes on to a further step and still waits. */
  done: boolean;
}

/** A card's check: your attribute against its number, clear, close or short, never a roll. */
export interface CardCheck {
  yours: number;
  against: number;
  verdict: Verdict;
}

/** The check a choice makes for this cultivator, or null without one; the same until you change. */
export function cardCheck(c: Cultivator, choice: CardChoice): CardCheck | null {
  if (!choice.check) return null;
  const yours = attributeValue(c, choice.check.attribute);
  const against = choice.check.against;
  return { yours, against, verdict: verdict(yours, against) };
}

/**
 * The slots a card's text fills with: the player's, the card's variables as {var.id}, and the
 * Dao the player is readiest in as {dao} with its next stage as {intent} ("Sword Intent 剑意").
 */
export function cardWho(c: Cultivator, vars: Readonly<Record<string, number>> = {}): Who {
  const who = whoFor(c);
  const v = Object.fromEntries(Object.entries(vars).map(([k, n]) => [`var.${k}`, String(n)]));
  const dao = readyDaos(c)[0];
  const ready: Record<string, string> = {};
  if (dao) {
    const name = stageName(dao, readyFor(c, dao)!);
    ready.dao = COMBAT_DAOS[dao].name;
    ready.intent = `${name.name} ${name.hanzi}`;
  }
  return { ...who, slots: { ...who.slots, ...ready, ...v } };
}

/**
 * Resolves the step a waiting card stands at with a choice: pays its cost, makes its check and
 * applies the outcome's effects: a close pass takes the choice's close outcome when it has one. An outcome that leads on moves the card to its
 * next step, still waiting; one that ends it writes the chronicle line for the path, with every
 * person the card named as an actor.
 */
export function resolveCard(
  s: GameState,
  uid: number,
  index: number,
  opts: { byDefault?: boolean } = {},
): CardResult {
  const pending = s.cards.pending.find((p) => p.uid === uid);
  const none = { state: s, ok: false, text: '', pass: null, done: false };
  if (!pending) return { ...none, reason: 'That card is gone.' };
  const k = card(pending.card);
  const step = stepOf(k, pending.step);
  const vars = { ...(pending.vars ?? {}) };
  const choice = step.choices[index];
  if (!choice || !choiceOffered(choice, vars)) return { ...none, reason: 'No such choice.' };
  const can = canChoose(s.player, choice);
  if (!can.ok) return { ...none, reason: can.reason };

  let next: GameState = s;
  const cost = choice.cost;
  if (cost?.stones)
    next = withPlayer(next, { ...next.player, stones: next.player.stones - cost.stones });
  if (cost?.item) next = withPlayer(next, addItem(next.player, cost.item.id, -cost.item.n));

  const check = cardCheck(next.player, choice) ?? undefined;
  const pass = check ? check.verdict !== 'short' : null;
  const outcome: CardOutcome =
    pass === false && choice.fail
      ? choice.fail
      : check?.verdict === 'close' && choice.close
        ? choice.close
        : choice.pass;
  for (const e of outcome.effects) if (e.do === 'var') vars[e.id] = (vars[e.id] ?? 0) + e.n;
  const text = fillSlots(outcome.text, cardWho(s.player, vars));
  const path = [...(pending.path ?? []), index];
  const rest = next.cards.pending.filter((p) => p.uid !== uid);

  if (outcome.next) {
    // The card goes on: it keeps its place in the feed at the next step.
    const moved: PendingCard = { ...pending, step: outcome.next, vars, path };
    next = {
      ...next,
      cards: {
        ...next.cards,
        pending: next.cards.pending.map((p) => (p.uid === uid ? moved : p)),
      },
    };
    for (const e of outcome.effects) next = applyEffect(next, e);
    return { state: next, ok: true, text, pass, done: false, ...(check ? { check } : {}) };
  }

  next = { ...next, cards: { ...next.cards, pending: rest } };
  const named = peopleIn(s.player, cardTexts(k, path));
  for (const e of outcome.effects) {
    if (e.do !== 'person') continue;
    const id = resolveWho(s.player, e.who);
    if (id && !named.includes(id)) named.push(id);
  }
  const data: Record<string, string | number | boolean | null> = {
    card: k.id,
    choice: index,
    pass,
    byDefault: opts.byDefault ?? false,
  };
  if (pending.step !== undefined) {
    data.step = pending.step;
    data.path = path.join('.');
  }
  for (const [key, v] of Object.entries(vars)) data[`var.${key}`] = v;
  next = addEvent(next, 'card', data, [next.player.id, ...named]);
  for (const e of outcome.effects) next = applyEffect(next, e);
  return { state: next, ok: true, text, pass, done: true, ...(check ? { check } : {}) };
}

/** Every text a card showed along a path of choices, for the people it named. */
function cardTexts(k: Card, path: readonly number[]): string[] {
  const out = [k.title, k.text];
  let step: CardStep = k;
  for (const i of path) {
    const ch = step.choices[i];
    if (!ch) break;
    out.push(ch.label, ch.pass.text, ch.pass.chronicle ?? '');
    if (ch.fail) out.push(ch.fail.text, ch.fail.chronicle ?? '');
    const nextId = ch.pass.next ?? ch.fail?.next;
    if (!nextId || !k.steps?.[nextId]) break;
    step = k.steps[nextId];
    out.push(step.text);
  }
  return out;
}

/** Resolves a waiting card by its defaults, step by step, as if the player had stayed away. */
export function resolveByDefault(s: GameState, uid: number): GameState {
  let next = s;
  // A card has few steps; the bound only guards against a loop in the content.
  for (let guard = 0; guard < 20; guard++) {
    const pending = next.cards.pending.find((p) => p.uid === uid);
    if (!pending) return next;
    const k = card(pending.card);
    const index = defaultChoice(next.player, k, pending.step, pending.vars);
    const r = resolveCard(next, uid, index, { byDefault: true });
    if (!r.ok) return next;
    next = r.state;
    if (r.done) return next;
  }
  return next;
}

// ---------------------------------------------------------------- drawing

/** A paced deck's chance on one world day, from its real minutes per card and the realm's clock. */
export function paceChance(s: GameState, minutes: number): number {
  const msPerDay = 1 / daysPerRealMs(s);
  return 1 - Math.exp(-msPerDay / (minutes * 60_000));
}

/**
 * The cards whose trigger holds today and that pass: a card's own daily chance or its sure day,
 * or for a paced deck the deck's pace, rolled once for the day. Paced cards are kept apart, so
 * the story's cards come first.
 */
function rollCandidates(
  s: GameState,
  day: number,
  rng: Rng,
  decks?: readonly string[],
): { story: Card[]; paced: Card[] } {
  const lived = daysLived(s.player, day);
  const paceRolls = new Map<string, boolean>();
  const story: Card[] = [];
  const paced: Card[] = [];
  for (const k of CARDS) {
    if (decks && !decks.includes(k.deck)) continue;
    if (!cardEligible(s, k, day)) continue;
    const pace = DECK_PACE[k.deck];
    if (pace && !k.fixed) {
      let passed = paceRolls.get(k.deck);
      if (passed === undefined) {
        passed = rng.next() < paceChance(s, pace.minutes);
        paceRolls.set(k.deck, passed);
      }
      if (passed) paced.push(k);
      continue;
    }
    if (k.sureAt !== undefined && lived >= k.sureAt) story.push(k);
    else if ((k.chance ?? 1) >= 1 || rng.next() < (k.chance ?? 1)) story.push(k);
  }
  return { story, paced };
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
function drawDay(s: GameState, day: number, opts: DrawOptions): GameState {
  let next = s;
  for (const p of s.cards.pending) {
    const urgent = card(p.card).urgent;
    if (urgent && day - p.day >= urgent.days) next = resolveByDefault(next, p.uid);
  }
  const { value: drawn, state } = withStream(next, 'world', (rng) => {
    const { story, paced } = rollCandidates(next, day, rng, opts.decks);
    return pickByWeight(story.length ? story : paced, rng);
  });
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
  // Offline, at most three wait for you; the rest resolve by default for the coming-back story.
  if (opts.offline && next.cards.pending.length > OFFLINE_QUEUE)
    next = resolveByDefault(next, entry.uid);
  return next;
}

export interface DrawOptions {
  /** Offline: at most three wait, the rest resolve by default. */
  offline?: boolean;
  /** Only these decks draw; every deck when absent. A trip will leave seclusion's out. */
  decks?: readonly string[];
}

/** Runs the decks for every whole world day since they were last checked. */
export function drawCards(s: GameState, opts: DrawOptions = {}): GameState {
  if (s.ended) return s;
  const today = Math.floor(s.calendar.day);
  let next = s;
  for (let day = s.cards.checked + 1; day <= today; day++) {
    next = drawDay(next, day, opts);
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
  /** The text of the step it stands at. */
  text: string;
  day: number;
  /** Which step of how many it has taken so far: 1 at its opening. */
  stepNumber: number;
  /**
   * The choices offered at this step, each with its index in the step, whether it can be paid and
   * the verdict its check would give, shown before you choose.
   */
  choices: {
    index: number;
    label: string;
    check: ChoiceCheck;
    comparison: CardCheck | null;
    choice: CardChoice;
  }[];
}

/** A waiting card as the player reads it: slots filled, each offered choice with whether it can be paid. */
export function viewCard(s: GameState, p: PendingCard): CardView {
  const k = card(p.card);
  const step = stepOf(k, p.step);
  const vars = p.vars ?? {};
  const who = cardWho(s.player, vars);
  return {
    uid: p.uid,
    card: k,
    title: fillSlots(k.title, who),
    text: fillSlots(step.text, who),
    day: p.day,
    stepNumber: (p.path?.length ?? 0) + 1,
    choices: step.choices
      .map((choice, index) => ({ choice, index }))
      .filter(({ choice }) => choiceOffered(choice, vars))
      .map(({ choice, index }) => ({
        index,
        label: fillSlots(choice.label, who),
        check: canChoose(s.player, choice),
        comparison: cardCheck(s.player, choice),
        choice,
      })),
  };
}

/** The cards resolved without the player since a day, for the coming-back story. */
export function defaultedSince(s: GameState, day: number) {
  return s.chronicle.filter((e) => e.type === 'card' && e.data.byDefault && e.day > day);
}
