// The opening, built (chains, rogue, knobs): each of the six starts plays its origin's chain from
// testing day through the first breath, the first lesson's spar and the board's road to the
// board's hand-in; the spar always teaches (a loss is again tomorrow); a rogue's first work brings
// its method; and the chain's offers come one after another.
import { describe, expect, it } from 'vitest';
import {
  ORIGIN_CHOICES,
  ORIGIN_IDS,
  pathKey,
  type OriginChoice,
  type OriginId,
} from '../content/origins.ts';
import { CHAINS, quest, QUESTS } from '../content/quests.ts';
import { shopsAt } from '../content/shops.ts';
import { advance } from './loop.ts';
import {
  actNow,
  chainOffer,
  doAct,
  handInHere,
  startChain,
  takeChainOffer,
  withoutChain,
} from './chains.ts';
import { combatantIn } from './combat/fight.ts';
import { createLife } from './creation.ts';
import { finishAllGuides } from './guides.ts';
import { handIn, noteQuests, offersAt, questState, stepsDone, takeQuest } from './journal.ts';
import { takeJob } from './jobs.ts';
import { resolveCard } from './cards.ts';
import { changeMoney } from './map/place.ts';
import { CODEX } from '../content/codex/index.ts';
import { claimPosting, postingsAt, questPostingId, takePosting } from './map/board.ts';
import { chooseExit, setStance } from './map/encounters.ts';
import { placeById } from './map/region.ts';
import { ensureMap, goToPlace, homeOf, mapOf } from './map/travel.ts';
import { fightEnd, playTurn } from './played.ts';
import { currentFight, finishFight } from './playFight.ts';
import { buy, shelf } from './shops.ts';
import { sparWhy } from './spar.ts';
import { cultivate, switchMethod } from './life.ts';
import { setHours } from './wheel.ts';
import { withPlayer, type GameState } from './state.ts';

/** A quiet road: the road brings nothing but what the chain places (core/map/encounters.test.ts meets the rest). */
const quiet = (s: GameState): GameState => ({
  ...s,
  map: { ...s.map!, notice: { n: 0, next: 1e9 } },
});

const life = (origin: OriginId, choice: OriginChoice, seed = 'chain'): GameState =>
  quiet(
    ensureMap(
      finishAllGuides(
        createLife({
          name: 'Han Li',
          pronouns: 'they/them',
          look: '',
          mode: 'ironman',
          seed: `${seed}-${origin}-${choice}`,
          choice,
          roll: {
            root: 'true',
            elements: ['wood', 'fire'],
            body: 'farmhands-frame',
            soul: 'plain-mind',
            fate: 'ordinary-fate',
            origin,
          },
        }),
      ),
    ),
  );

const ok = (r: { ok: true; state: GameState } | { ok: false; reason: string }): GameState => {
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

/** Real days at Qi Condensation's clock, cultivating and travelling, the quests noted. */
const run = (s: GameState, days: number): GameState =>
  noteQuests(advance(s, days * 10_000, { step: cultivate }).state);

/** Runs until a test holds, a day at a time, at most so many days. */
function until(s: GameState, test: (s: GameState) => boolean, most = 2000): GameState {
  let st = s;
  for (let i = 0; i < most && !test(st); i++) st = run(st, 1);
  if (!test(st)) throw new Error('never came');
  return st;
}

/** Plays the open fight out with plain strikes, and hands it back. */
function fightOut(s: GameState): { state: GameState; end: string } {
  let st = s;
  let f = currentFight(st)!;
  for (let i = 0; i < 120 && fightEnd(f, st.player.id) === null; i++) {
    const me = combatantIn(f, st.player.id)!;
    const foe = f.combatants.find((c) => c.side !== me.side && c.state === 'fighting')!;
    const r = playTurn(st, f, { main: { type: 'strike', target: foe.id } })!;
    st = r.state;
    f = r.turn.fight;
  }
  const done = finishFight(st, f)!;
  return { state: noteQuests(done.state), end: done.end };
}

/** Hands the followed chain quest in where you stand, and takes the next one offered. */
function handAndTake(s: GameState): GameState {
  const id = s.journal.followed!;
  let st = ok(handInHere(s, id));
  if (chainOffer(st)) st = ok(takeChainOffer(st));
  return st;
}

/** Stands inside your home place, the course cleared. */
const atHome = (s: GameState): GameState => {
  const h = homeOf(s, mapOf(s)!);
  return { ...s, map: { ...s.map!, at: [h.x, h.y], course: null, inside: h.id } };
};

describe('the chains as data', () => {
  it('give every start four quests, each its origin’s, with a reason in the world', () => {
    for (const o of ORIGIN_IDS)
      for (const c of ORIGIN_CHOICES) {
        const ids = CHAINS[pathKey(o, c)]!;
        expect(ids, pathKey(o, c)).toHaveLength(4);
        for (const id of ids) {
          const q = quest(id);
          expect(q.origin, id).toBe(true);
          expect(q.reason.length, id).toBeGreaterThan(60);
          expect(q.reason, id).not.toMatch(/learn the map|tutorial/i);
        }
      }
    // Givers are roles, never names (NPC basics).
    for (const q of QUESTS.filter((x) => x.chain))
      expect(q.giver.name, q.id).not.toMatch(/Aunt Yan|Sergeant (Lei|Hou)|Zhao|Clerk Fan|Old Sha/);
  });

  it('every board quest’s posting stands at a written place a few days’ road from home', () => {
    for (const o of ORIGIN_IDS)
      for (const c of ORIGIN_CHOICES) {
        const s = life(o, c);
        const map = mapOf(s)!;
        const home = homeOf(s, map);
        const board = quest(CHAINS[pathKey(o, c)]![2]!);
        const spot = placeById(map, board.posting!.spot)!;
        expect(spot, pathKey(o, c)).toBeDefined();
        const li = Math.hypot(spot.x - home.x, spot.y - home.y);
        expect(li, pathKey(o, c)).toBeGreaterThan(900);
        expect(li, pathKey(o, c)).toBeLessThan(2000);
      }
  });
});

describe('the chain from testing day to the board', () => {
  it('takes the first quest on testing day and offers the next only once it is handed in', () => {
    const s = life('cave-orphan', 'along');
    const ids = CHAINS['cave-orphan/along']!;
    expect(questState(s, ids[0]!)).toBeDefined();
    expect(s.journal.followed).toBe(ids[0]);
    expect(chainOffer(s)).toBeNull();
    // A life made before the chains is offered nothing.
    expect(chainOffer(withoutChain(s))).toBeNull();
    expect(startChain(s)).toBe(s);
  });

  for (const origin of ORIGIN_IDS)
    for (const choice of ORIGIN_CHOICES) {
      const key = pathKey(origin, choice);
      it(`${key}: the first breath, the lesson's spar and the board's road to its hand-in`, () => {
        let s = life(origin, choice);
        const ids = CHAINS[key]!;
        // The first breath: a rogue with no method does its first work, which brings it.
        const a = actNow(s);
        if (a && 'work' in a.act) {
          expect(s.player.activeMethods.qi).toBeNull();
          s = doAct(s, a.quest.id) as GameState;
          expect(s.chronicle.some((e) => e.type === 'work')).toBe(true);
          // The street cultivator's torn manual is read first, on its whole day.
          s = until(s, (x) => Object.keys(x.player.methods).length > 0, 400);
        }
        const m = Object.keys(s.player.methods)[0]!;
        s = noteQuests(switchMethod(s, 'qi', m).state);
        s = until(s, (x) => x.player.qi.stage >= 2);
        expect(questState(s, ids[0]!)!.step).toBe(quest(ids[0]!).steps.length);
        s = handAndTake(s);
        expect(s.journal.followed).toBe(ids[1]);

        // The first lesson: a Study hour, a node, the spar won (again tomorrow if lost), layer 3.
        s = withPlayer(s, setHours(s.player, [2], 'study').cultivator);
        s = noteQuests(withPlayer(s, { ...s.player, nodes: ['qi-sensing-breath'] }));
        let tries = 0;
        for (; tries < 12; tries++) {
          const r = doAct(s, ids[1]!);
          expect(typeof r, `${key} spar ${tries}`).not.toBe('string');
          const f = fightOut(r as GameState);
          s = f.state;
          if (f.end === 'won') break;
          s = run(s, 1);
        }
        expect(tries, `${key}: tries to win the spar`).toBeLessThan(12);
        s = until(s, (x) => x.player.qi.stage >= 3);
        s = handAndTake(atHome(s));
        expect(Object.keys(s.player.techniques).length).toBeGreaterThan(0);
        expect(s.journal.followed).toBe(ids[2]);

        // The board: its own posting stands on the home board, taken, met at its spot, paid.
        const map = mapOf(s)!;
        const home = homeOf(s, map);
        s = atHome(s);
        const pid = questPostingId(ids[2]!);
        expect(postingsAt(s, map, home).map((p) => p.id)).toContain(pid);
        s = noteQuests(ok(takePosting(s, map, home, pid)));
        expect(postingsAt(s, map, home).map((p) => p.id)).not.toContain(pid);
        // Avoid goes round the road's beast, which stood on the road once.
        s = setStance(s, 'avoid');
        const spot = quest(ids[2]!).posting!.spot;
        s = ok(goToPlace(s, spot));
        // At the spot the posting's goal waits for you: cut what it asks.
        const goal = `goal-${pid}`;
        s = until(
          s,
          (x) => x.map!.encounters.some((e) => e.id === goal && e.state === 'waiting'),
          300,
        );
        s = noteQuests(chooseExit(s, goal, 0)!.state);
        expect(s.map!.postings.find((p) => p.id === pid)?.done).toBe(true);
        expect(s.player.flags).toContain(`road-met:${ids[2]}`);
        s = ok(goToPlace(s, home.id));
        s = atHome(until(s, (x) => !x.map!.course, 300));
        s = noteQuests(ok(claimPosting(s, map, pid)));
        expect(s.chronicle.some((e) => e.data.posting === pid)).toBe(true);
        // A first buy at a counter at home.
        const cheap = (id: string) =>
          shelf(s, s.player.id, id).filter(
            (l) =>
              l.price * (l.standing ? 1 : l.n) <= s.player.stones / 2 && !l.thing.includes(':'),
          );
        const shopId = shopsAt(home.id).find((id) => cheap(id).length > 0);
        expect(shopId, key).toBeDefined();
        const bought = buy(s, s.player.id, shopId!, cheap(shopId!)[0]!.slot, 1);
        expect(bought.ok ? 'ok' : bought.reason, key).toBe('ok');
        if (bought.ok) s = noteQuests(bought.state);
        expect(questState(s, ids[2]!)!.step).toBe(quest(ids[2]!).steps.length);
        s = handAndTake(s);
        expect(s.player.copies['method:stone-bearing']).toBe(1);
        expect(s.journal.followed).toBe(ids[3]);
      });
    }
});

describe('the spar that always teaches', () => {
  it('holds back a layer under you, and a lost spar is again tomorrow', () => {
    let s = life('frontier-orphan', 'along', 'spar');
    s = until(
      noteQuests(switchMethod(s, 'qi', 'butcher-saber').state),
      (x) => x.player.qi.stage >= 2,
    );
    s = handAndTake(s);
    const id = s.journal.followed!;
    s = withPlayer(s, setHours(s.player, [2], 'study').cultivator);
    s = noteQuests(withPlayer(s, { ...s.player, nodes: ['qi-sensing-breath'] }));
    const opened = doAct(s, id) as GameState;
    const f = currentFight(opened)!;
    const foe = f.combatants.find((c) => c.id !== opened.player.id)!;
    expect(foe.name.length).toBeGreaterThan(0);
    const done = fightOut(opened).state;
    // Each partner spars once a day, won or lost: a loss is again tomorrow.
    const who = 'chain:frontier-orphan/along';
    expect(sparWhy(done, who)).toBe('You sparred today; tomorrow.');
    expect(sparWhy(run(done, 1), who)).toBeNull();
    // A layer under you, holding back: their bars under yours.
    const me = f.combatants.find((c) => c.id === opened.player.id)!;
    expect(foe.maxHp).toBeLessThan(me.maxHp);
  });
});

describe('the rogue', () => {
  it('earns its method by its first work, before the first breath', () => {
    for (const o of ['conscript', 'frontier-orphan'] as const) {
      let s = life(o, 'refuse');
      expect(Object.keys(s.player.methods)).toEqual([]);
      const a = actNow(s)!;
      expect('work' in a.act).toBe(true);
      s = doAct(s, a.quest.id) as GameState;
      if (o === 'conscript') expect(s.player.methods).toHaveProperty('night-bridge');
      else expect(s.player.copies['method:bounty-scrap']).toBe(1);
      // Done once: the act is gone.
      expect(actNow(s)).toBeNull();
    }
    // The hidden cave child already holds the clans' method.
    expect(life('cave-orphan', 'refuse').player.methods).toHaveProperty('crude-cave');
  });

  it('works a day hire from the first layer, paid by the day', () => {
    for (const [o, hire] of [
      ['conscript', 'dock-carrying'],
      ['frontier-orphan', 'stall-minding'],
      ['cave-orphan', 'smugglers-porter'],
    ] as const) {
      const s = life(o, 'refuse');
      const home = homeOf(s, mapOf(s)!);
      expect(shopsAt(home.id).length + 1, o).toBeGreaterThan(0);
      expect(hire.length).toBeGreaterThan(0);
    }
  });
});

describe('your place and your own way', () => {
  it('walks a member through the post: taken at its door, shifts kept, the first currency, the nourishing art', () => {
    const id = 'chain-cadet-school-place';
    let s = withoutChain(life('cave-orphan', 'along', 'place'));
    // The oath seats the cadet in the March, but the watch waits at its Work door.
    expect(s.player.jobs).toEqual([]);
    s = withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 4 } });
    s = atHome(ok(takeQuest(s, id)));
    expect(questState(s, id)!.step).toBe(0);
    s = noteQuests(ok(takeJob(s, s.player.id, 'school-watch')));
    expect(questState(s, id)!.step).toBe(1);
    s = { ...s, map: { ...s.map!, inside: null } };
    s = until(s, (x) => stepsDone(questState(x, 'chain-cadet-school-place')!), 60);
    s = ok(handInHere(atHome(s), 'chain-cadet-school-place'));
    expect(s.player.copies['method:still-lantern']).toBe(1);
  });

  it('walks a rogue through its own way: a place, a day hire kept, the first big job', () => {
    const id = 'chain-deserter-place';
    let s = withoutChain(life('conscript', 'refuse', 'own'));
    s = withPlayer(s, { ...s.player, qi: { ...s.player.qi, stage: 4 } });
    s = ok(takeQuest(s, id));
    const map = mapOf(s)!;
    const hut = placeById(map, 'qm-op-stilt-hut')!;
    s = noteQuests({ ...s, map: { ...s.map!, at: [hut.x, hut.y] } });
    expect(questState(s, id)!.step).toBe(1);
    s = atHome(s);
    s = noteQuests(ok(takeJob(s, s.player.id, 'dock-carrying')));
    expect(questState(s, id)!.step).toBe(2);
    s = { ...s, map: { ...s.map!, inside: null } };
    s = until(s, (x) => questState(x, id)!.step >= 3, 60);
    // The first big job is a card brought to the feed; carried through the dark, it is done.
    s = doAct(s, id) as GameState;
    const p = s.cards.pending.find((x) => x.card === 'job-night-run')!;
    expect(p).toBeDefined();
    s = withPlayer(s, { ...s.player, attributes: { ...s.player.attributes, agility: 14 } });
    s = noteQuests(resolveCard(s, p.uid, 0).state);
    expect(stepsDone(questState(s, id)!)).toBe(true);
    s = ok(handInHere(atHome(s), id));
    expect(s.player.copies['method:still-lantern']).toBe(1);
  });
});

describe('the introduction quests', () => {
  it('are offered where their feature lives, at any giver of the kind, and handed in there', () => {
    let s = withoutChain(life('frontier-orphan', 'refuse', 'intro'));
    const city = homeOf(s, mapOf(s)!);
    s = atHome(s);
    const at = (kind: 'shop' | 'board' | 'hall', who?: string) =>
      offersAt(s, { kind, place: city.id, ...(who ? { who } : {}) }).map((q) => q.id);
    expect(at('shop', 'mouth-refiner')).toEqual(
      expect.arrayContaining(['intro-gear', 'intro-mend']),
    );
    expect(at('shop', 'mouth-bounty')).toContain('intro-changer');
    expect(at('shop', 'mouth-bounty')).not.toContain('intro-gear');
    // A power's way in is offered to one who belongs to none.
    expect(at('board')).toContain('intro-join');
    // Changing money is heard only while a step waits on it.
    const plain = ok(changeMoney(s, city.id, 'break-low'));
    expect(plain.chronicle.some((e) => e.type === 'did')).toBe(false);
    s = ok(takeQuest(s, 'intro-changer'));
    expect(questState(s, 'intro-changer')!.at).toBe(city.id);
    s = noteQuests(ok(changeMoney(s, city.id, 'break-low')));
    expect(stepsDone(questState(s, 'intro-changer')!)).toBe(true);
    const stones = s.player.stones;
    s = ok(handIn(s, 'intro-changer'));
    expect(s.player.stones).toBe(stones + 2);
  });

  it('name codex entries that exist, and only steps the engine can finish', () => {
    const ids = new Set(CODEX.map((e) => e.id));
    for (const q of QUESTS)
      for (const c of q.codex ?? []) expect(ids, `${q.id}: ${c}`).toContain(c);
    // Twelve of the feature list's introduction-quest rows are quests here (K12 added the
    // commission's, P3.9b going in's at the teahouse); the other four (sparring, the stance,
    // postings, posts and hires) are every chain's to teach.
    expect(QUESTS.filter((q) => q.id.startsWith('intro-'))).toHaveLength(12);
  });
});
