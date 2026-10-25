// The friends' line review's fixes (docs/code-review-friends-line-2026-10-21.md, 1–12): each
// failure case the review traced, played out. Finding 8 is words on the Routine page, with
// nothing here to catch.
import { describe, expect, it } from 'vitest';
import { card } from '../content/cards/index.ts';
import { quest } from '../content/quests.ts';
import { shopsAt, shop } from '../content/shops.ts';
import { job } from '../content/jobs.ts';
import { doAct, firstWorkDone, withoutChain } from './chains.ts';
import { pushCard, resolveCard } from './cards.ts';
import { MET, noteCodex } from './codex.ts';
import { startFight } from './combat/fight.ts';
import { fightEdge, isSure } from './combat/edge.ts';
import { fromCultivator } from './combat/combatant.ts';
import { generateCultivator } from './combat/generate.ts';
import { template } from '../content/roster.ts';
import { createLife, createNextLife, type Creation } from './creation.ts';
import { finishAllGuides, guideDone, noteGuides, unguidedStart } from './guides.ts';
import { following, handInCheck, noteQuests, questState, stepsDone, takeQuest } from './journal.ts';
import { takeJob } from './jobs.ts';
import { advance } from './loop.ts';
import { placeById } from './map/region.ts';
import { ensureMap, homeOf, mapOf } from './map/travel.ts';
import { fightEnd, openFight } from './played.ts';
import { askSpar, currentFight, dropLostFight } from './playFight.ts';
import { cultivate, switchMethod } from './life.ts';
import { buy, shelf } from './shops.ts';
import { Rng } from './rng.ts';
import { freeWheel, setHours } from './wheel.ts';
import { withPlayer, type GameState, PLAYER_ID } from './state.ts';

const roll = (origin: Creation['roll']['origin']): Creation['roll'] => ({
  root: 'true',
  elements: ['wood', 'fire'],
  body: 'farmhands-frame',
  soul: 'plain-mind',
  fate: 'ordinary-fate',
  origin,
});

const creation = (
  origin: Creation['roll']['origin'],
  choice: Creation['choice'],
  seed: string,
): Creation => ({
  name: 'Han Li',
  pronouns: 'they/them',
  look: '',
  mode: 'ironman',
  seed,
  choice,
  roll: roll(origin),
});

/** A quiet road, guides done, the map made. */
const life = (
  origin: Creation['roll']['origin'],
  choice: Creation['choice'],
  seed = 'review',
): GameState => {
  const s = ensureMap(finishAllGuides(createLife(creation(origin, choice, seed))));
  return { ...s, map: { ...s.map!, notice: { n: 0, next: 1e9 } } };
};

const ok = (r: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

/** Real days at Qi Condensation's clock, the quests noted. */
const run = (s: GameState, days: number): GameState =>
  noteQuests(advance(s, days * 10_000, { step: cultivate }).state);

const atHome = (s: GameState): GameState => {
  const h = homeOf(s, mapOf(s)!);
  return { ...s, map: { ...s.map!, at: [h.x, h.y], course: null, inside: h.id } };
};

/** At a layer, the bar empty and auto off, so the days run don't break through. */
const atLayer = (s: GameState, stage: number): GameState =>
  withPlayer(s, {
    ...s.player,
    qi: { ...s.player.qi, stage, bar: 0 },
    plan: { ...s.player.plan, auto: 'off' },
  });

/** At home, standing outside so its shifts are kept at the post. */
const standingHome = (s: GameState): GameState => ({
  ...atHome(s),
  map: { ...atHome(s).map!, inside: null },
});

describe('1. the rogue’s day hire', () => {
  it('counts a hire already held', () => {
    const id = 'chain-deserter-place';
    let s = withoutChain(life('conscript', 'refuse', 'hire'));
    s = atLayer(s, 4);
    // Taken early for its pay, before the quest asks for it.
    s = ok(takeJob(atHome(s), PLAYER_ID, 'dock-carrying'));
    s = ok(takeQuest(s, id));
    const hut = placeById(mapOf(s)!, 'qm-op-stilt-hut')!;
    s = noteQuests({ ...s, map: { ...s.map!, inside: null, at: [hut.x, hut.y] } });
    expect(questState(s, id)!.step).toBe(2);
  });
});

describe('2. keeping three days', () => {
  const id = 'chain-cadet-school-place';
  it('at drill, counts only the shift hours set to Duty, as the step says', () => {
    expect(quest(id).steps[1]!.text).toMatch(/set Duty on its hours/);
    let s = standingHome(atLayer(withoutChain(life('cave-orphan', 'along', 'drill')), 3));
    s = ok(takeJob(s, s.player.id, 'school-watch'));
    s = noteQuests(ok(takeQuest(s, id)));
    s = run(s, 6);
    expect(questState(s, id)!.step).toBe(1);
    const shift = job(s.player.jobs[0]!.id).shift;
    s = withPlayer(s, setHours(s.player, shift, 'duty').cultivator);
    s = run(s, 6);
    expect(questState(s, id)!.step).toBeGreaterThan(1);
  });

  it('counts from the step’s opening, not days kept before it', () => {
    let s = standingHome(atLayer(withoutChain(life('cave-orphan', 'along', 'before')), 4));
    s = ok(takeJob(s, s.player.id, 'school-watch'));
    s = run(s, 6);
    expect(s.player.jobs[0]!.kept).toBeGreaterThanOrEqual(3);
    s = noteQuests(ok(takeQuest(s, id)));
    expect(questState(s, id)!.step).toBe(1);
    s = run(s, 6);
    expect(questState(s, id)!.step).toBeGreaterThan(1);
  });
});

describe('3. a save naming content a later build lost', () => {
  it('clears a fight whose start can’t be built, and refuses to open one', () => {
    let s = life('cave-orphan', 'along', 'lost-fight');
    const pending = { uid: 99, card: 'no-such-card', day: s.calendar.day };
    s = { ...s, cards: { ...s.cards, pending: [...s.cards.pending, pending] } };
    const from = { kind: 'card', uid: 99, choice: 0 } as const;
    expect(openFight(s, from, null)).toBeNull();
    const held = { ...s, fight: { from, start: 1, now: 1, actions: [] } };
    expect(currentFight(held)).toBeNull();
    expect(dropLostFight(held).fight).toBeNull();
    expect(typeof askSpar(s, 'person:nobody')).toBe('string');
  });

  it('drops a quest id it doesn’t know, and the one followed moves on', () => {
    let s = withoutChain(life('frontier-orphan', 'refuse', 'lost-quest'));
    s = ok(takeQuest(atHome(s), 'intro-join'));
    const gone = { ...questState(s, 'intro-join')!, id: 'quest-renamed-away' };
    s = { ...s, journal: { quests: [gone, ...s.journal.quests], followed: gone.id } };
    expect(following(s)).toBeNull();
    expect(stepsDone(gone)).toBe(false);
    expect(handInCheck(s, gone.id).ok).toBe(false);
    s = noteQuests(s);
    expect(s.journal.quests.map((q) => q.id)).toEqual(['intro-join']);
    expect(s.journal.followed).toBe('intro-join');
  });
});

describe('4. talked down', () => {
  const fight = (s: GameState) => {
    const t = template('march-conscript');
    if (t.kind !== 'cultivator') throw new Error('not a cultivator');
    const npc = generateCultivator(t, 'qi-condensation', 1, new Rng(1), {
      id: 'foe',
      side: 'them',
    });
    return startFight([fromCultivator(s.player, 'you'), npc.combatant]);
  };
  it('only when the foe yielded to your words; its own surrender is a win', () => {
    const s = life('cave-orphan', 'along', 'talk');
    const f = fight(s);
    const foe = f.combatants[1]!;
    const own = { ...f, combatants: [f.combatants[0]!, { ...foe, state: 'yielded' as const }] };
    expect(fightEnd(own, s.player.id)).toBe('won');
    const words = {
      ...f,
      combatants: [f.combatants[0]!, { ...foe, state: 'yielded' as const, yieldedTo: s.player.id }],
    };
    expect(fightEnd(words, s.player.id)).toBe('talked');
  });
});

describe('5. a rogue’s first work', () => {
  it('stays with its life', () => {
    let s = life('conscript', 'refuse', 'work');
    s = doAct(s, s.journal.followed!) as GameState;
    expect(firstWorkDone(s)).not.toBeNull();
    const next = createNextLife(s, creation('cave-orphan', 'along', 'work-next'));
    expect(firstWorkDone(next)).toBeNull();
  });
});

describe('6. a card fight’s cost', () => {
  it('is paid as the fight opens, and the hand-back doesn’t ask for it again', () => {
    // No card choice today has both a fight and a cost: this one is given a pill's, for the test.
    const at = card('bounty-hunters').choices.findIndex((c) => !!c.fight);
    const choice = card('bounty-hunters').choices[at]! as { cost?: unknown };
    choice.cost = { item: { id: 'spring-returning-pill', n: 1 } };
    try {
      let s = life('cave-orphan', 'along', 'cost');
      s = withPlayer(s, { ...s.player, items: { ...s.player.items, 'spring-returning-pill': 1 } });
      s = pushCard(s, 'bounty-hunters');
      const uid = s.cards.pending.at(-1)!.uid;
      const opened = resolveCard(s, uid, at, { play: true });
      expect(opened.ok && opened.fight).toBe(true);
      expect(opened.state.player.items['spring-returning-pill'] ?? 0).toBe(0);
      // Drunk in the fight or not, the card takes the fight's end back.
      const back = resolveCard({ ...opened.state, fight: null }, uid, at, { played: 'won' });
      expect(back.ok).toBe(true);
      expect(back.state.cards.pending.some((p) => p.uid === uid)).toBe(false);
    } finally {
      delete choice.cost;
    }
  });
});

describe('7. a foe nobody can hurt', () => {
  it('is never a sure win', () => {
    const s = life('cave-orphan', 'along', 'edge');
    const t = template('march-conscript');
    if (t.kind !== 'cultivator') throw new Error('not a cultivator');
    const npc = generateCultivator(t, 'qi-condensation', 1, new Rng(1), {
      id: 'foe',
      side: 'them',
    });
    const f = startFight([fromCultivator(s.player, 'you'), npc.combatant]);
    // Neither lands a blow: no techniques, and a strike with no power behind it.
    const harmless = (c: (typeof f.combatants)[number]) => ({
      ...c,
      techniques: {},
      physicalPower: 0,
      techniquePower: 0,
    });
    const edge = fightEdge(harmless(f.combatants[0]!), [harmless(f.combatants[1]!)]);
    expect(Number.isNaN(edge.ratio)).toBe(false);
    expect(isSure(edge)).toBe(false);
  });
});

describe('9. guides off', () => {
  it('meets the codex entries of the guides with nothing to end on, and lets auto go', () => {
    let s = ensureMap(createLife(creation('cave-orphan', 'along', 'off')));
    expect(s.player.plan.auto).toBe('off');
    s = unguidedStart({ ...s, hints: { ...s.hints, on: false } });
    expect(s.player.plan.auto).toBe('safe');
    s = noteCodex(noteGuides(noteQuests(switchMethod(s, 'qi', 'garrison-standard').state)));
    expect(guideDone(s, 'qi-bar')).toBe(true);
    expect(s.lineage.codex).toHaveProperty('seat');
  });
});

describe('10. sites', () => {
  it('are met standing in one', () => {
    const s = life('cave-orphan', 'along', 'site');
    const site = mapOf(s)!.places.find((p) => p.kind === 'site')!;
    expect(MET.site(s)).toBe(false);
    expect(MET.site({ ...s, map: { ...s.map!, inside: site.id } })).toBe(true);
  });
});

describe('11. buying at this counter', () => {
  it('is a buy at a shop of the giver’s kind where the quest was taken', () => {
    let s = withoutChain(life('frontier-orphan', 'refuse', 'counter'));
    s = atHome(s);
    s = withPlayer(s, { ...s.player, stones: 5000 });
    const home = homeOf(s, mapOf(s)!);
    const cheap = (id: string) => shelf(s, s.player.id, id).filter((l) => !l.thing.includes(':'));
    const other = shopsAt(home.id).find((id) => shop(id).kind !== 'refiner' && cheap(id).length);
    const refiner = shopsAt(home.id).find((id) => shop(id).kind === 'refiner');
    expect(other && refiner).toBeTruthy();
    s = ok(takeQuest(s, 'intro-gear'));
    s = noteQuests(ok(buy(s, s.player.id, other!, cheap(other!)[0]!.slot, 1)));
    expect(questState(s, 'intro-gear')!.step).toBe(0);
    s = noteQuests(ok(buy(s, s.player.id, refiner!, cheap(refiner!)[0]!.slot, 1)));
    expect(questState(s, 'intro-gear')!.step).toBe(1);
  });
});

describe('12. a stray Duty hour', () => {
  it('is qi on the wheel to give, as it is cultivated', () => {
    const s = life('conscript', 'refuse', 'stray');
    const c = {
      ...s.player,
      jobs: [],
      wheel: s.player.wheel.map((k, i) => (i === 3 ? 'duty' : k)),
    };
    expect(freeWheel(c)[3]).toBe('qi');
  });
});
