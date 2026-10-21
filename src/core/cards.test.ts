import { describe, expect, it } from 'vitest';
import { card, CARDS, type Card } from '../content/cards/index.ts';
import { EVENT_TEMPLATES } from '../content/chronicle.ts';
import {
  ORIGIN_CHOICES,
  ORIGIN_IDS,
  pathKey,
  type OriginChoice,
  type OriginId,
} from '../content/origins.ts';
import {
  cardEligible,
  drawCards,
  pickByWeight,
  playDay,
  resolveByDefault,
  resolveCard,
  triggerHolds,
  viewCard,
} from './cards.ts';
import { eventText } from './chronicle.ts';
import { createLife, type Creation } from './creation.ts';
import { finishAllGuides } from './guides.ts';
import { breakThrough, FOUNDATION_FAILED, playFirsts } from './life.ts';
import { advance, catchUp } from './loop.ts';
import { Rng } from './rng.ts';
import { addItem, daysLived, withPlayer, type GameState } from './state.ts';

/** The first hour's deck alone, so the seclusion deck's pace doesn't crowd these tests. */
const FIRST = { decks: ['first-hour'] } as const;

const life = (
  origin: OriginId = 'cave-orphan',
  choice: OriginChoice = 'along',
  seed = 'cards',
): GameState =>
  finishAllGuides(
    createLife({
      name: 'Han Li',
      pronouns: 'they/them',
      look: '',
      mode: 'ironman',
      seed,
      choice,
      roll: {
        root: 'true',
        elements: ['wood', 'fire'],
        body: 'farmhands-frame',
        soul: 'plain-mind',
        fate: 'ordinary-fate',
        origin,
      },
    } satisfies Creation),
  );

/** The state moved on to a day lived, without cultivating. */
const atLived = (s: GameState, lived: number): GameState => ({
  ...s,
  calendar: { day: s.calendar.day + lived - daysLived(s.player, s.calendar.day) },
});

const pend = (s: GameState, id: string, uid: number): GameState => ({
  ...s,
  cards: {
    ...s.cards,
    pending: [...s.cards.pending, { uid, card: id, day: s.calendar.day }],
    drawn: { ...s.cards.drawn, [id]: s.calendar.day },
    nextUid: Math.max(s.cards.nextUid, uid + 1),
  },
});

describe('triggers', () => {
  it('read days lived, the qi ladder, origin, choice, flags, items, methods and marks', () => {
    const s = life('conscript', 'refuse');
    expect(triggerHolds(s, { daysLived: [45] })).toBe(false);
    expect(triggerHolds(atLived(s, 45), { daysLived: [45] })).toBe(true);
    expect(triggerHolds(atLived(s, 45), { daysLived: [10, 40] })).toBe(false);
    expect(triggerHolds(s, { origin: ['conscript'], choice: 'refuse' })).toBe(true);
    expect(triggerHolds(s, { choice: 'along' })).toBe(false);
    expect(triggerHolds(s, { flags: ['bounty'] })).toBe(true);
    expect(triggerHolds(s, { notFlags: ['bounty'] })).toBe(false);
    expect(triggerHolds(s, { noMethod: 'qi' })).toBe(true);
    // A going-along life holds its method as a copy until read; read, it has one.
    const read = life();
    const withMethod = withPlayer(read, {
      ...read.player,
      activeMethods: { ...read.player.activeMethods, qi: 'garrison-standard' },
    });
    expect(triggerHolds(withMethod, { noMethod: 'qi' })).toBe(false);
    expect(triggerHolds(s, { qi: { minStage: 3 } })).toBe(false);
    const l9 = withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 9 } });
    expect(triggerHolds(l9, { qi: { realm: 'qi-condensation', minStage: 9 } })).toBe(true);
    expect(triggerHolds(l9, { noItem: 'foundation-pill' })).toBe(true);
    expect(
      triggerHolds(withPlayer(l9, addItem(l9.player, 'foundation-pill', 1)), {
        noItem: 'foundation-pill',
      }),
    ).toBe(false);
    const marked = {
      ...l9,
      cards: { ...l9.cards, marks: { [FOUNDATION_FAILED]: l9.calendar.day } },
    };
    const mark = { mark: { id: FOUNDATION_FAILED, days: 3600 } };
    expect(triggerHolds(marked, mark)).toBe(false);
    expect(triggerHolds({ ...marked, calendar: { day: marked.calendar.day + 3600 } }, mark)).toBe(
      true,
    );
  });
});

describe('drawing', () => {
  const plain: Card = {
    id: 'test-card',
    deck: 'test',
    title: 'Test',
    text: 'Nothing happens.',
    trigger: {},
    choices: [{ label: 'Fine', pass: { effects: [], text: '', chronicle: '' } }],
  };

  it('keeps once-only cards and cooldowns', () => {
    const s = life();
    const drawn = { ...s, cards: { ...s.cards, drawn: { 'test-card': s.calendar.day } } };
    expect(cardEligible(s, plain)).toBe(true);
    expect(cardEligible(drawn, { ...plain, once: true })).toBe(false);
    expect(cardEligible(drawn, { ...plain, cooldown: 30 })).toBe(false);
    expect(
      cardEligible(
        { ...drawn, calendar: { day: s.calendar.day + 30 } },
        { ...plain, cooldown: 30 },
      ),
    ).toBe(true);
    expect(cardEligible(pend(s, 'test-card', 9), plain)).toBe(false);
  });

  it('picks by weight', () => {
    const rng = new Rng(11);
    const heavy = { ...plain, id: 'heavy', weight: 3 };
    let n = 0;
    for (let i = 0; i < 4000; i++) if (pickByWeight([plain, heavy], rng)?.id === 'heavy') n++;
    expect(n / 4000).toBeCloseTo(0.75, 1);
  });

  it('draws on the world stream, the same way for the same seed, and leaves breakthroughs alone', () => {
    const s = atLived(life(), 200);
    const a = drawCards(s, FIRST);
    const b = drawCards(s, FIRST);
    expect(a.cards).toEqual(b.cards);
    expect(a.cards.pending.map((p) => p.card)).toEqual(['first-technique-cave-along']);
    expect(a.rng.world).toBeDefined();
    expect(a.rng.breakthrough).toBe(s.rng.breakthrough);
    // One card a day at most, and a waiting card is not drawn again.
    expect(drawCards(a, FIRST).cards.pending).toHaveLength(1);
  });

  it('come for certain by their sure day, and at their daily chance before it', () => {
    const k = card('first-technique-cave-along');
    const days: number[] = [];
    for (let i = 0; i < 40; i++) {
      let s = life('cave-orphan', 'along', `chance-${i}`);
      while (!s.cards.pending.length) {
        s = drawCards({ ...s, calendar: { day: s.calendar.day + 1 } }, FIRST);
      }
      days.push(daysLived(s.player, s.calendar.day));
    }
    expect(Math.min(...days)).toBeGreaterThanOrEqual(k.trigger.daysLived![0]);
    expect(Math.max(...days)).toBeLessThanOrEqual(k.sureAt!);
    expect(new Set(days).size).toBeGreaterThan(5);
  });
});

describe('choosing', () => {
  it('pays the cost, applies the effects and writes the chronicle line', () => {
    let s = pend(life(), 'first-technique-cave-along', 1);
    const view = viewCard(s, s.cards.pending[0]!);
    expect(view.choices.map((c) => c.check.ok)).toEqual([true, true]);
    const r = resolveCard(s, 1, 1);
    expect(r.ok).toBe(true);
    s = r.state;
    expect(s.cards.pending).toEqual([]);
    expect(s.player.stones).toBe(5);
    expect(s.player.techniques).toHaveProperty('rampart-palm');
    expect(s.player.contemplation['garrison-drill-manual']).toBe(15);
    // The card's line, then what its effects wrote: the technique, and practice hours opening.
    const types = s.chronicle.map((e) => e.type);
    expect(types.slice(-3)).toEqual(['card', 'technique', 'hours']);
    expect(eventText(s, s.chronicle.at(-3)!)).toBe(
      "Han Li drills the Rampart Palm and reads the garrison school's manual cover to cover.",
    );
    // A choice that can't be paid for is refused, and changes nothing.
    const poor = pend(
      withPlayer(life(), { ...life().player, stones: 0 }),
      'first-technique-cave-along',
      1,
    );
    expect(resolveCard(poor, 1, 1)).toMatchObject({ ok: false, state: poor });
  });

  it('pays a cost across the grades, and a trigger reads the whole purse (E1)', () => {
    const one = withPlayer(life(), {
      ...life().player,
      stones: 0,
      higherStones: { mid: 1, high: 0, top: 0 },
    });
    // The five stones break the mid for change: 1,100 low less five.
    const r = resolveCard(pend(one, 'first-technique-cave-along', 1), 1, 1);
    expect(r.ok).toBe(true);
    expect(r.state.player.stones).toBe(1095);
    expect(r.state.player.higherStones.mid).toBe(0);
    expect(triggerHolds(one, { minStones: 10 })).toBe(true);
    expect(
      triggerHolds(withPlayer(one, { ...one.player, higherStones: { mid: 0, high: 0, top: 0 } }), {
        minStones: 10,
      }),
    ).toBe(false);
  });

  it('makes its check as a comparison, the same answer every time, with the fail outcome when short', () => {
    const at = (agility: number) => {
      const s = life('cave-orphan', 'along', 'check');
      const p = { ...s.player, attributes: { ...s.player.attributes, agility } };
      return pend(withPlayer(s, p), 'errand-cave-along', 1);
    };
    // Agility 10 against 10 is close, 13 is clear, 9 is short.
    const verdicts = [10, 13, 9].map((a) => {
      const s = at(a);
      const r = resolveCard(s, 1, 0);
      // The tempering art comes as a copy, read before it opens body hours.
      expect(r.state.player.copies['method:stone-bearing']).toBe(1);
      if (r.pass === false) expect(r.state.player.qi.injuredUntil).toBeGreaterThan(s.calendar.day);
      else expect(r.state.player.stones).toBe(s.player.stones + 8);
      // No roll: the world stream is untouched, and a second try answers the same.
      expect(r.state.rng.world).toBe(s.rng.world);
      expect(resolveCard(s, 1, 0).check).toEqual(r.check);
      return r.check!.verdict;
    });
    expect(verdicts).toEqual(['close', 'clear', 'short']);
    const view = viewCard(at(9), at(9).cards.pending[0]!);
    expect(view.choices[0]!.comparison).toEqual({ yours: 9, against: 10, verdict: 'short' });
  });

  it('resolves an urgent card by its default once it has waited its days', () => {
    const s = pend(atLived(life('conscript', 'refuse'), 160), 'bounty-hunters', 1);
    const k = card('bounty-hunters');
    const later = drawCards({ ...s, calendar: { day: s.calendar.day + k.urgent!.days - 1 } });
    expect(later.cards.pending.map((p) => p.card)).toContain('bounty-hunters');
    const due = drawCards({ ...s, calendar: { day: s.calendar.day + k.urgent!.days } });
    expect(due.cards.pending.map((p) => p.card)).not.toContain('bounty-hunters');
    const e = due.chronicle.find((x) => x.type === 'card' && x.data.card === 'bounty-hunters')!;
    expect(e.data).toMatchObject({ choice: 1, byDefault: true });
  });
});

describe('offline', () => {
  it('lets at most three wait, and settles the rest by default for the coming-back card', () => {
    let s = atLived(life(), 200);
    for (const [i, id] of ['lamp-keeper', 'errand-cave-along', 'bounty-office-job'].entries()) {
      s = pend(s, id, i + 1);
    }
    const online = drawCards(s, FIRST);
    expect(online.cards.pending).toHaveLength(4);
    const offline = drawCards(s, { ...FIRST, offline: true });
    expect(offline.cards.pending).toHaveLength(3);
    const settled = offline.chronicle.filter((e) => e.type === 'card' && e.data.byDefault);
    expect(settled.map((e) => e.data.card)).toEqual(['first-technique-cave-along']);
    expect(offline.player.techniques).toHaveProperty('rampart-palm');
  });

  it('runs through catch-up with the day step', () => {
    const s = life();
    const away = catchUp(s, 0, 12 * 3_600_000, { step: playDay });
    const cards = away.state.chronicle.filter((e) => e.type === 'card');
    // Twelve hours: the technique, the errand and the lamp-keeper; three wait, none defaulted.
    expect(away.state.cards.pending.length + cards.length).toBeGreaterThanOrEqual(3);
    expect(away.state.cards.pending.length).toBeLessThanOrEqual(3);
  });
});

describe('the first hour', () => {
  /**
   * Plays a path for some real minutes, taking each card's default as it comes and each first time
   * at once, as a player would.
   */
  function play(origin: OriginId, choice: OriginChoice, minutes: number) {
    let s = playFirsts(life(origin, choice, `first-hour-${origin}-${choice}`));
    const at: Record<string, number> = {};
    for (let ms = 0; ms < minutes * 60_000;) {
      const r = advance(s, 15_000, { step: playDay });
      ms += r.usedMs;
      s = r.state;
      while (s.cards.pending.length) s = resolveByDefault(s, s.cards.pending[0]!.uid);
      s = playFirsts(s);
      const p = s.player;
      if (p.activeMethods.qi) at.method ??= ms / 60_000;
      if (Object.keys(p.techniques).length) at.technique ??= ms / 60_000;
      if (p.qi.stage >= 3) at.layer3 ??= ms / 60_000;
      if ('stone-bearing' in p.methods) at.errand ??= ms / 60_000;
    }
    return { s, at };
  }

  for (const origin of ORIGIN_IDS) {
    for (const choice of ORIGIN_CHOICES) {
      it(`${pathKey(origin, choice)}: a method, the technique, layer 3 near the hour away, the errand`, () => {
        // Away: the tutorial layers run slower since The opening, built (TUTORIAL_PACE), so layer 3
        // lands near the hour away and near minute 15 attended (the pacing sim).
        const { s, at } = play(origin, choice, 90);
        expect(at.layer3).toBeLessThan(80);
        // A start that goes along holds its method known; a refusal finds it on a card first.
        if (choice === 'along') expect(at.layer3).toBeLessThan(65);
        else if (origin !== 'cave-orphan') expect(at.layer3).toBeGreaterThan(at.method!);
        expect(at.technique).toBeGreaterThanOrEqual(20);
        expect(at.technique).toBeLessThanOrEqual(36);
        expect(at.errand).toBeDefined();
        // Every event reads from its template, with every slot filled.
        for (const e of s.chronicle) {
          expect(EVENT_TEMPLATES, e.type).toHaveProperty(e.type);
          expect(eventText(s, e)).not.toMatch(/\{\w+\}|undefined/);
        }
        // Every gift came through the card engine.
        const cards = s.chronicle.filter((e) => e.type === 'card').map((e) => String(e.data.card));
        expect(cards.some((c) => c.startsWith('first-technique-'))).toBe(true);
        expect(cards.some((c) => c.startsWith('errand-'))).toBe(true);
        if (!s.player.origin || choice === 'along' || origin === 'cave-orphan') return;
        expect(cards).toContain(
          origin === 'conscript' ? 'night-bridge-offer' : 'bounty-office-job',
        );
      });
    }
  }

  it('hands over the pill and chapter at layer 9, and another pill ten years after a failure', () => {
    let s = life('frontier-orphan', 'along');
    s = withPlayer(s, {
      ...s.player,
      qi: { ...s.player.qi, stage: 9, bar: 0 },
      insight: { current: 0, earned: 0 },
    });
    s = drawCards({ ...s, calendar: { day: s.calendar.day + 1 } }, FIRST);
    expect(s.cards.pending.map((p) => p.card)).toEqual(['foundation-frontier-along']);
    s = resolveCard(s, s.cards.pending[0]!.uid, 0).state;
    expect(s.player.items['foundation-pill']).toBe(1);
    // The chapter is a copy, read before it can be taken up.
    expect(s.player.copies['method:butcher-saber-foundation']).toBe(1);
    expect(s.player.methods).not.toHaveProperty('butcher-saber-foundation');
    // A failed attempt spends the pill and marks the day; find a roll that fails.
    s = withPlayer(s, {
      ...s.player,
      qi: { ...s.player.qi, bar: 1e9 },
      insight: { current: 0, earned: 1000 },
    });
    let failed: GameState | null = null;
    for (let i = 1; i < 500 && !failed; i++) {
      const r = breakThrough({ ...s, rng: { ...s.rng, breakthrough: i * 7919 } }, 'qi');
      if (r.attempted && !r.success) failed = r.state;
    }
    if (!failed) throw new Error('no failing roll found');
    expect(failed.player.items['foundation-pill'] ?? 0).toBe(0);
    expect(failed.cards.marks[FOUNDATION_FAILED]).toBe(failed.calendar.day);
    const soon = drawCards({ ...failed, calendar: { day: failed.calendar.day + 3599 } }, FIRST);
    expect(soon.cards.pending.map((p) => p.card)).not.toContain('foundation-again');
    const later = drawCards({ ...failed, calendar: { day: failed.calendar.day + 3600 } }, FIRST);
    const card10 = later.cards.pending.find((p) => p.card === 'foundation-again');
    expect(card10).toBeDefined();
    const again = resolveCard(later, card10!.uid, 0).state;
    expect(again.player.items['foundation-pill']).toBe(1);
    expect(again.cards.marks[FOUNDATION_FAILED]).toBeUndefined();
  });

  it('every card in the deck can be reached by some path', () => {
    for (const k of CARDS) {
      const paths = ORIGIN_IDS.flatMap((o) => ORIGIN_CHOICES.map((c) => [o, c] as const));
      const reachable = paths.some(
        ([o, c]) =>
          (!k.trigger.origin || k.trigger.origin.includes(o)) &&
          (!k.trigger.choice || k.trigger.choice === c),
      );
      expect(reachable, k.id).toBe(true);
    }
  });
});
