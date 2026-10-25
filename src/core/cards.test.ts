import { describe, expect, it } from 'vitest';
import { card, CARDS, type Card } from '../content/cards/index.ts';
import {
  ORIGIN_CHOICES,
  ORIGIN_IDS,
  type OriginChoice,
  type OriginId,
} from '../content/origins.ts';
import {
  cardEligible,
  drawCards,
  pickByWeight,
  playDay,
  pushCard,
  resolveCard,
  triggerHolds,
  viewCard,
} from './cards.ts';
import { withoutChain } from './chains.ts';
import { eventText } from './chronicle.ts';
import { createLife, type Creation } from './creation.ts';
import { finishAllGuides } from './guides.ts';
import { FOUNDATION_FAILED } from './life.ts';
import { catchUp } from './loop.ts';
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

/** At the peak of Qi Condensation, a day later. */
const atLayer9 = (s: GameState): GameState => ({
  ...withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 9, bar: 0 } }),
  calendar: { day: s.calendar.day + 1 },
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
    const s = atLayer9(life());
    const a = drawCards(s, FIRST);
    const b = drawCards(s, FIRST);
    expect(a.cards).toEqual(b.cards);
    expect(a.cards.pending.map((p) => p.card)).toEqual(['gate-of-foundation']);
    expect(a.rng.world).toBeDefined();
    expect(a.rng.breakthrough).toBe(s.rng.breakthrough);
    // One card a day at most, and a waiting card is not drawn again.
    expect(drawCards(a, FIRST).cards.pending).toHaveLength(1);
  });

  it('come at their daily chance once their trigger holds', () => {
    const k = card('bounty-hunters');
    const days: number[] = [];
    for (let i = 0; i < 30; i++) {
      let s = atLived(life('conscript', 'refuse', `chance-${i}`), 149);
      while (!s.cards.pending.length) {
        s = drawCards({ ...s, calendar: { day: s.calendar.day + 1 } }, FIRST);
      }
      days.push(daysLived(s.player, s.calendar.day));
    }
    expect(Math.min(...days)).toBeGreaterThanOrEqual(k.trigger.daysLived![0]);
    expect(new Set(days).size).toBeGreaterThan(5);
  });

  it('never draws a card a quest brings, and brings it when asked', () => {
    let s = atLived(life('frontier-orphan', 'refuse'), 400);
    for (let i = 0; i < 50; i++)
      s = drawCards({ ...s, calendar: { day: s.calendar.day + 1 } }, FIRST);
    expect(s.cards.pending.map((p) => p.card)).not.toContain('job-runaway-bounty');
    const brought = pushCard(s, 'job-runaway-bounty');
    expect(brought.cards.pending.map((p) => p.card)).toContain('job-runaway-bounty');
    expect(pushCard(brought, 'job-runaway-bounty')).toBe(brought);
  });
});

describe('choosing', () => {
  it('pays the cost, applies the effects and writes the chronicle line', () => {
    const rich = (n: number) => {
      const base = life('cave-orphan', 'refuse');
      return withPlayer(base, { ...base.player, stones: n });
    };
    let s = pend(rich(10), 'tester-asking', 1);
    const view = viewCard(s, s.cards.pending[0]!);
    expect(view.choices.map((c) => c.check.ok)).toEqual([true, true]);
    const r = resolveCard(s, 1, 1);
    expect(r.ok).toBe(true);
    s = r.state;
    expect(s.cards.pending).toEqual([]);
    expect(s.player.stones).toBe(6);
    expect(s.chronicle.at(-1)!.type).toBe('card');
    expect(eventText(s, s.chronicle.at(-1)!)).toBe(
      'Han Li pays the smugglers’ factor to send the tester’s men to Heaven’s Eye.',
    );
    // A choice that can't be paid for is refused, and changes nothing.
    const poor = pend(rich(0), 'tester-asking', 1);
    expect(resolveCard(poor, 1, 1)).toMatchObject({ ok: false, state: poor });
  });

  it('pays a cost across the grades, and a trigger reads the whole purse (E1)', () => {
    const base = life('cave-orphan', 'refuse');
    const one = withPlayer(base, {
      ...base.player,
      stones: 0,
      higherStones: { mid: 1, high: 0, top: 0 },
    });
    // The four stones break the mid for change: 1,100 low less four.
    const r = resolveCard(pend(one, 'tester-asking', 1), 1, 1);
    expect(r.ok).toBe(true);
    expect(r.state.player.stones).toBe(1096);
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
      const s = life('cave-orphan', 'refuse', 'check');
      const p = { ...s.player, attributes: { ...s.player.attributes, agility } };
      return pend(withPlayer(s, p), 'job-smuggling-run', 1);
    };
    // Agility 10 against 10 is close, 13 is clear, 9 is short.
    const verdicts = [10, 13, 9].map((a) => {
      const s = at(a);
      const r = resolveCard(s, 1, 0);
      if (r.pass === false)
        expect(r.state.player.body.injuredUntil).toBeGreaterThan(s.calendar.day);
      else {
        expect(r.state.player.stones).toBe(s.player.stones + 8);
        expect(r.state.player.flags).toContain('job-smuggling-run');
      }
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
    let s = atLayer9(life());
    for (const [i, id] of ['gate-taunt', 'tester-asking', 'bounty-hunters'].entries()) {
      s = pend(s, id, i + 1);
    }
    const online = drawCards(s, FIRST);
    expect(online.cards.pending).toHaveLength(4);
    const offline = drawCards(s, { ...FIRST, offline: true });
    expect(offline.cards.pending).toHaveLength(3);
    const settled = offline.chronicle.filter((e) => e.type === 'card' && e.data.byDefault);
    expect(settled.map((e) => e.data.card)).toEqual(['gate-of-foundation']);
  });

  it('runs through catch-up with the day step', () => {
    const s = withoutChain(life());
    const away = catchUp(s, 0, 12 * 3_600_000, { step: playDay });
    const cards = away.state.chronicle.filter((e) => e.type === 'card');
    expect(away.state.cards.pending.length + cards.length).toBeGreaterThanOrEqual(3);
    expect(away.state.cards.pending.length).toBeLessThanOrEqual(3);
    // Twelve hours away, the Border Wilds' cast living each season of it (N2).
  }, 90_000);

  it('holds the seclusion deck until the chain’s first lesson is handed in', () => {
    const s = life();
    const away = catchUp(s, 0, 3 * 3_600_000, { step: playDay });
    const drawn = Object.keys(away.state.cards.drawn).filter((id) => card(id).deck === 'seclusion');
    expect(drawn).toEqual([]);
    const free = catchUp(withoutChain(s), 0, 3 * 3_600_000, { step: playDay });
    expect(Object.keys(free.state.cards.drawn).some((id) => card(id).deck === 'seclusion')).toBe(
      true,
    );
  });
});

describe('the first hour', () => {
  it('says at the peak of Qi Condensation what Foundation takes, and hands nothing over', () => {
    let s = atLayer9(life('frontier-orphan', 'along'));
    s = drawCards(s, FIRST);
    expect(s.cards.pending.map((p) => p.card)).toEqual(['gate-of-foundation']);
    const before = s.player;
    s = resolveCard(s, s.cards.pending[0]!.uid, 0).state;
    expect(s.player.items).toEqual(before.items);
    expect(s.player.copies).toEqual(before.copies);
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
