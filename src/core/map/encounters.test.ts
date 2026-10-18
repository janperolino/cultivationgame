// Encounters on the map (P3.7): the template schema and its data, the road's notice, sensing and
// springing, the stances' resolutions, what waits and stops the course, a crossing that meets cards
// at the edge of sight, the bounty board, and the v26 migration.
import { describe, expect, it } from 'vitest';
import { ENCOUNTERS, encounterTemplate } from '../../content/encounters/index.ts';
import { MORTALS } from '../../content/encounters/mortals.ts';
import { NOTICE_OFF, NOTICE_ROAD, TOWN_PEACE_LI } from '../../content/encounters/pace.ts';
import { ENCOUNTER_KINDS, TemplateSchema, TRIP_GOALS } from '../../content/encounters/schema.ts';
import { hasItem } from '../../content/items.ts';
import { BORDER_WILDS } from '../../content/roster.ts';
import { hasCopy } from '../../content/copies.ts';
import { advance } from '../loop.ts';
import { cultivate } from '../life.ts';
import { loadSave, makeSave } from '../save/format.ts';
import { addItem, newLife, withPlayer, type GameState } from '../state.ts';
import { claimPosting, postingsAt, reachPostings, takePosting } from './board.ts';
import { generateCultivator } from '../combat/generate.ts';
import { Rng } from '../rng.ts';
import {
  arrive,
  canGoRound,
  chooseExit,
  contact,
  draw,
  exitViews,
  fightEdge,
  goRound,
  inPeace,
  meet,
  noticeRate,
  onRoadAt,
  roadHour,
  senseHow,
  senseReach,
  setStance,
  stancePick,
  waiting,
  type ExitView,
} from './encounters.ts';
import { enterAt } from './gate.ts';
import { placeById, type MapPlace } from './region.ts';
import type { Encounter } from './schema.ts';
import { ensureMap, goToPlace, mapOf, senseOf, travelDays, yourBand } from './travel.ts';
import { template as rosterTemplate } from '../../content/roster.ts';

const CITY = 'qm-shoukou-cheng';

const life = (seed = 'enc', origin: 'conscript' | 'cave-orphan' = 'conscript'): GameState =>
  ensureMap(newLife({ name: 'Han Li', seed, origin: { id: origin, choice: 'along' } }));

/** A life at a qi layer, body and soul half of it. */
const atLayer = (s: GameState, stage: number): GameState => {
  const p = s.player;
  const half = Math.max(1, Math.ceil(stage / 2));
  return withPlayer(s, {
    ...p,
    qi: { ...p.qi, stage },
    body: { ...p.body, stage: half },
    soul: { ...p.soul, stage: half },
  });
};

const run = (s: GameState, days: number): GameState =>
  advance(s, days * 10_000, { step: cultivate }).state;

const enc = (template: string, band: number, extra: Partial<Encounter> = {}): Encounter => ({
  id: 'e-test',
  template,
  seed: 7,
  band,
  at: [0, 0],
  meetAt: null,
  state: 'waiting',
  how: 'seen',
  tried: [],
  day: 0,
  where: 'the Howling Downs',
  ...extra,
});

/** A life with one encounter on its map, standing where it is met. */
const withEnc = (s: GameState, e: Encounter): GameState => ({
  ...s,
  map: {
    ...s.map!,
    encounters: [...s.map!.encounters, { ...e, at: [s.map!.at[0], s.map!.at[1]] }],
  },
});

const view = (exit: ExitView['exit'], judged: ExitView['judged'], i = 0): ExitView => ({
  i,
  exit,
  verdict: judged === '?' ? 'short' : judged,
  judged,
  why: '',
  refused: null,
  tried: false,
});

describe('the templates', () => {
  it('parses every one, ids unique, 30 the road brings and one for each trip goal', () => {
    for (const t of ENCOUNTERS) expect(() => TemplateSchema.parse(t), t.id).not.toThrow();
    expect(new Set(ENCOUNTERS.map((t) => t.id)).size).toBe(ENCOUNTERS.length);
    const road = ENCOUNTERS.filter((t) => !t.goal);
    expect(road.length).toBe(30);
    for (const k of ENCOUNTER_KINDS)
      expect(
        road.some((t) => t.kind === k),
        k,
      ).toBe(true);
    for (const g of TRIP_GOALS) expect(ENCOUNTERS.filter((t) => t.goal === g).length, g).toBe(1);
  });

  it('names only real roster templates, mortals, items and acts', () => {
    const roster = new Set(BORDER_WILDS.map((t) => t.id));
    for (const t of ENCOUNTERS) {
      for (const r of t.roles) {
        if ('roster' in r.who)
          expect(roster.has(r.who.roster), `${t.id} ${r.who.roster}`).toBe(true);
        if ('mortal' in r.who)
          expect(MORTALS[r.who.mortal], `${t.id} ${r.who.mortal}`).toBeDefined();
      }
      for (const e of t.exits) {
        if (e.cost?.item) expect(hasItem(e.cost.item), e.cost.item).toBe(true);
        for (const o of [e.pass, e.close, e.short])
          for (const k of o?.stakes ?? []) {
            if (k.do === 'item') expect(hasItem(k.id) || hasCopy(k.id), k.id).toBe(true);
            if (k.do === 'find')
              for (const id of k.things) expect(hasItem(id), `${t.id} ${id}`).toBe(true);
          }
      }
    }
  });

  it('meets every template at its bands: people regenerated the same from a seed', () => {
    const s = atLayer(life(), 5);
    for (const t of ENCOUNTERS) {
      if (t.where.needs) continue;
      const a = meet(s, enc(t.id, t.bands[0]));
      const b = meet(s, enc(t.id, t.bands[0]));
      expect(a.actors.map((x) => x.id)).toEqual(b.actors.map((x) => x.id));
      expect(exitViews(s, a).length).toBe(t.exits.length);
    }
  });
});

describe('the road’s notice', () => {
  it('fills faster on a road, by night and with heat, and a group deters', () => {
    const s = life();
    const map = mapOf(s)!;
    const go = goToPlace(s, CITY);
    if (!go.ok) throw new Error(go.reason);
    const t = go.state;
    expect(onRoadAt(map, t.map!.at)).toBe(true);
    expect(noticeRate(t, map, 6, true, false)).toBeCloseTo(NOTICE_ROAD);
    expect(noticeRate(t, map, 0, true, false)).toBeCloseTo(NOTICE_ROAD * 1.5);
    const off = {
      ...t,
      map: { ...t.map!, at: [t.map!.at[0], t.map!.at[1] + 20000] as [number, number] },
    };
    if (!onRoadAt(map, off.map.at))
      expect(noticeRate(off, map, 6, true, false)).toBeCloseTo(NOTICE_OFF);
    const hot = {
      ...t,
      world: { ...t.world, heat: { [t.player.id]: { n: 6, day: t.calendar.day } } },
    };
    expect(noticeRate(hot, map, 6, true, false)).toBeCloseTo(NOTICE_ROAD * 2);
    expect(noticeRate(t, map, 6, true, true)).toBeCloseTo(NOTICE_ROAD * 1.5);
  });

  it('brings an encounter when it fills, the same one for the same seed', () => {
    const go = goToPlace(life(), CITY);
    if (!go.ok) throw new Error(go.reason);
    const full = { ...go.state, map: { ...go.state.map!, notice: { n: 0.99, next: 1 } } };
    const map = mapOf(full)!;
    const a = roadHour(full, map, 6, 1, true, false, yourBand(full.player), senseOf(full.player));
    const b = roadHour(full, map, 6, 1, true, false, yourBand(full.player), senseOf(full.player));
    expect(a.map!.encounters.length + a.map!.road.length).toBe(1);
    expect(JSON.stringify(a.map)).toBe(JSON.stringify(b.map));
    expect(a.map!.notice.n).toBe(0);
    expect(a.map!.notice.next).toBeGreaterThanOrEqual(0.6);
    expect(a.map!.notice.next).toBeLessThanOrEqual(1.4);
  });
});

describe('the watch keeps the road', () => {
  it('brings nothing hostile within a day’s walk of a town or city, and can further out', () => {
    const go = goToPlace(life(), CITY);
    if (!go.ok) throw new Error(go.reason);
    const s = go.state;
    const map = mapOf(s)!;
    const city = placeById(map, CITY) as MapPlace;
    const at = (x: number, y: number): GameState => ({ ...s, map: { ...s.map!, at: [x, y] } });
    const near: [number, number] = [city.x + TOWN_PEACE_LI / 2, city.y];
    expect(inPeace(map, near)).toBe(true);
    for (let i = 0; i < 200; i++) {
      const d = draw(at(...near), map, near, 6, 3, new Rng(i));
      if (d) expect(d.template.hostile ?? false).toBe(false);
    }
    // Out in the wilds, where no town is near, the hostile ones still come.
    const wild = s.map!.course!.pts.find((q) => !inPeace(map, q) && !inPeace(map, s.map!.at));
    const far: [number, number] = wild ? [wild[0], wild[1]] : [city.x + 20000, city.y + 20000];
    let hostile = 0;
    for (let i = 0; i < 400; i++) {
      const d = draw(at(...far), map, far, 6, 3, new Rng(i));
      if (d?.template.hostile) hostile++;
    }
    expect(hostile).toBeGreaterThan(0);
  });
});

describe('sensing and springing', () => {
  it('shows what it brings ahead on the course at the edge of your sight', () => {
    const go = goToPlace(atLayer(life(), 5), CITY);
    if (!go.ok) throw new Error(go.reason);
    const s = setStance(go.state, 'careful');
    const map = mapOf(s)!;
    const reach = senseReach(map, s.map!.at, senseOf(s.player));
    let seen: Encounter | undefined;
    for (let seed = 1; seed < 60 && !seen; seed++) {
      const r = arrive(s, map, 6, yourBand(s.player), senseOf(s.player), new Rng(seed));
      seen = r.map!.encounters.find((e) => e.state === 'sensed' && e.how === 'seen');
    }
    expect(seen).toBeDefined();
    const d = Math.hypot(seen!.at[0] - s.map!.at[0], seen!.at[1] - s.map!.at[1]);
    expect(d).toBeGreaterThan(reach * 0.8);
    expect(d).toBeLessThanOrEqual(reach + 1);
    expect(canGoRound(seen!)).toBe(true);
  });

  it('springs a lurker when your Perception falls short of its Stealth, in cover', () => {
    const s = atLayer(life(), 3);
    const m = meet(s, enc('pine-deserters', 0));
    expect(senseHow(s, m, true).how).toBe('sprung');
    const keen = withPlayer(s, { ...s.player, soul: { ...s.player.soul, stage: 9 } });
    expect(senseHow(keen, meet(keen, enc('pine-deserters', 0)), true).how).toBe('seen');
  });

  it('is found first by what is a realm beyond your Stealth, unless a talisman hides you', () => {
    const s = atLayer(life(), 2);
    const m = meet(s, enc('stone-ape-troop', 4));
    expect(senseHow(s, m, false).how).toBe('found');
    const low = withPlayer(s, addItem(s.player, 'hiding-talisman', 1));
    expect(senseHow(low, meet(low, enc('stone-ape-troop', 4)), false).how).toBe('found');
    const hid = withPlayer(s, addItem(s.player, 'shade-hiding-talisman', 1));
    const r = senseHow(hid, meet(hid, enc('stone-ape-troop', 4)), false);
    expect(r.how).not.toBe('found');
    expect(r.burned).toBe('shade-hiding-talisman');
  });
});

describe('the fight’s edge', () => {
  it('reads who falls first from the sheets, with no roll', () => {
    const t = rosterTemplate('march-conscript');
    if (t.kind !== 'cultivator') throw new Error('roster');
    const strong = generateCultivator(t, 'qi-condensation', 9, new Rng(1), { id: 'a', side: 'a' });
    const weak = generateCultivator(t, 'qi-condensation', 1, new Rng(1), { id: 'b', side: 'b' });
    const e = fightEdge(strong.combatant, [weak.combatant]);
    expect(e.verdict).toBe('clear');
    expect(fightEdge(weak.combatant, [strong.combatant]).verdict).toBe('short');
    expect(fightEdge(strong.combatant, [weak.combatant])).toEqual(e);
  });
});

describe('the stances', () => {
  const t = encounterTemplate('ridge-wolves');
  const [hunt, sneak, back] = t.exits as [ExitView['exit'], ExitView['exit'], ExitView['exit']];

  it('Avoid never fights; Careful hunts a clear kill; Bold takes the close', () => {
    const clearFight = [view(hunt, 'clear', 0), view(sneak, 'clear', 1), view(back, 'clear', 2)];
    expect(stancePick(t, clearFight, 'avoid')).toBe(1);
    expect(stancePick(t, clearFight, 'careful')).toBe(0);
    const close = [view(hunt, 'close', 0), view(sneak, 'close', 1), view(back, 'short', 2)];
    expect(stancePick(t, close, 'careful')).toBeNull();
    expect(stancePick(t, close, 'bold')).toBe(0);
    const unread = [view(hunt, '?', 0), view(sneak, '?', 1), view(back, '?', 2)];
    expect(stancePick(t, unread, 'bold')).toBeNull();
  });

  it('never talks or spends, and the big things always wait', () => {
    const d = encounterTemplate('pine-deserters');
    const views = d.exits.map((e, i) =>
      view(e, e.road === 'fight' || e.road === 'slip' ? 'short' : 'clear', i),
    );
    expect(stancePick(d, views, 'bold')).toBeNull();
    const plot = encounterTemplate('grudge-waits-at-the-ford');
    expect(
      stancePick(
        plot,
        plot.exits.map((e, i) => view(e, 'clear', i)),
        'bold',
      ),
    ).toBeNull();
    // A choice that moves someone's opinion is never the stance's: it walks past the wounded rogue.
    const rogue = encounterTemplate('wounded-rogue');
    const pick = stancePick(
      rogue,
      rogue.exits.map((e, i) => view(e, 'clear', i)),
      'careful',
    );
    expect(rogue.exits[pick!]!.road).toBe('pass');
  });
});

describe('settling', () => {
  it('a clear hunt brings the pack’s parts home, by your hand or your stance', () => {
    // A Foundation cultivator against layers 1 to 3: a sure kill.
    const base = atLayer(life(), 9);
    const s = withPlayer(base, {
      ...base.player,
      qi: { ...base.player.qi, realm: 'foundation-establishment', stage: 1 },
      body: { ...base.player.body, stage: 9 },
    });
    const w = withEnc(s, enc('ridge-wolves', 0));
    const views = exitViews(w, meet(w, w.map!.encounters[0]!));
    expect(views[0]!.verdict).toBe('clear');
    const r = chooseExit(w, 'e-test', 0)!;
    expect(r.stays).toBe(false);
    expect(r.state.map!.encounters).toHaveLength(0);
    expect(Object.keys(r.state.player.items).some((id) => id.startsWith('beast-hide'))).toBe(true);
    expect(r.state.chronicle.at(-1)!.type).toBe('encounter');
    const byStance = contact(w, 'e-test');
    expect(byStance.map!.encounters).toHaveLength(0);
    expect(byStance.map!.road.at(-1)!.template).toBe('ridge-wolves');
  });

  it('a lost fight leaves a wound and what robbers take, never a death', () => {
    const s = withPlayer(atLayer(life(), 1), { ...atLayer(life(), 1).player, stones: 40 });
    const w = withEnc(s, enc('pine-deserters', 1));
    const r = chooseExit(w, 'e-test', 0)!;
    expect(r.verdict).toBe('short');
    expect(r.state.player.stones).toBe(20);
    expect(r.state.world.states.some((x) => x.data.kind === 'wound')).toBe(true);
    expect(r.state.ended).toBeFalsy();
  });

  it('a talk that falls short stays on the card, spent until something changes', () => {
    const s = atLayer(life(), 1);
    const w = withEnc(s, enc('pine-deserters', 2));
    const i = encounterTemplate('pine-deserters').exits.findIndex((e) => e.road === 'talk');
    const r = chooseExit(w, 'e-test', i)!;
    if (r.verdict === 'short') {
      expect(r.stays).toBe(true);
      expect(r.state.map!.encounters[0]!.tried).toContain(i);
      expect(
        exitViews(r.state, meet(r.state, r.state.map!.encounters[0]!))[i]!.refused,
      ).not.toBeNull();
    }
  });

  it('goes round what it sees, 60 li more, but not what found it', () => {
    const s = life();
    const w = withEnc(s, enc('ridge-wolves', 0, { state: 'sensed', meetAt: 3 }));
    const r = goRound(w, 'e-test');
    expect(r.map!.encounters).toHaveLength(0);
    expect(r.map!.detour).toBe(60);
    const found = withEnc(s, enc('stone-ape-troop', 4, { state: 'sensed', how: 'found' }));
    expect(goRound(found, 'e-test')).toBe(found);
  });
});

describe('what waits', () => {
  it('stops the course until you answer it, and moves on after', () => {
    const go = goToPlace(atLayer(life(), 1), CITY);
    if (!go.ok) throw new Error(go.reason);
    const s = withEnc(
      { ...go.state, map: { ...go.state.map!, notice: { n: 0, next: 1e9 } } },
      enc('pine-deserters', 1),
    );
    const at = s.map!.at;
    const later = travelDays(s, s.calendar.day, s.calendar.day + 3);
    expect(later.map!.at).toEqual(at);
    expect(waiting(later.map)).toHaveLength(1);
    const pay = encounterTemplate('pine-deserters').exits.findIndex((e) => e.road === 'deal');
    const rich = withPlayer(later, { ...later.player, stones: 50 });
    const r = chooseExit(rich, 'e-test', pay)!;
    expect(r.state.player.stones).toBe(38);
    const on = travelDays(r.state, r.state.calendar.day, r.state.calendar.day + 3);
    expect(on.map!.at).not.toEqual(at);
  });
});

describe('a crossing of the Border Wilds', () => {
  it('meets cards on the way, sensed at the edge of sight, and the stance settles some', () => {
    let s = setStance(atLayer(life('crossing'), 6), 'careful');
    const go = goToPlace(s, CITY);
    if (!go.ok) throw new Error(go.reason);
    s = go.state;
    const map = mapOf(s)!;
    let sensedAtEdge = 0;
    let waited = 0;
    for (let day = 0; day < 220 && s.map!.course; day++) {
      const before = new Set(s.map!.encounters.map((e) => e.id));
      s = run(s, 1);
      for (const e of s.map!.encounters) {
        if (before.has(e.id) || e.state !== 'sensed') continue;
        const d = Math.hypot(e.at[0] - s.map!.at[0], e.at[1] - s.map!.at[1]);
        if (d > senseReach(map, s.map!.at, senseOf(s.player)) * 0.3) sensedAtEdge++;
      }
      const w = waiting(s.map)[0];
      if (w) {
        waited++;
        const m = meet(s, w);
        const v =
          exitViews(s, m).find((x) => !x.refused && x.exit.road !== 'talk') ??
          exitViews(s, m).find((x) => !x.refused)!;
        s =
          chooseExit(withPlayer(s, { ...s.player, stones: s.player.stones + 50 }), w.id, v.i)
            ?.state ?? s;
      }
    }
    expect(s.map!.course).toBeNull();
    expect(s.map!.road.length).toBeGreaterThan(5);
    expect(
      sensedAtEdge + s.map!.road.filter((l) => l.text.startsWith('You went round')).length,
    ).toBeGreaterThan(0);
    expect(waited).toBeGreaterThan(0);
    expect(s.chronicle.some((e) => e.type === 'encounter')).toBe(true);
  });
});

describe('the bounty board', () => {
  const inCity = (s: GameState): GameState => {
    const map = mapOf(s)!;
    const p = placeById(map, CITY)!;
    const r = enterAt(
      {
        ...s,
        player: { ...s.player, stones: 600 },
        map: { ...s.map!, at: [p.x, p.y], course: null },
      },
      map,
      p,
    );
    if (!r.ok) throw new Error(r.reason);
    return r.state;
  };

  it('posts three a month from the goals, the same for every visit', () => {
    const s = inCity(life());
    const map = mapOf(s)!;
    const city = placeById(map, CITY) as MapPlace;
    const a = postingsAt(s, map, city);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(3);
    expect(postingsAt(s, map, city)).toEqual(a);
    for (const p of a) expect(encounterTemplate(p.template).goal).toBeDefined();
    expect(new Set(a.map((p) => p.template)).size).toBe(a.length);
  });

  it('takes a posting, meets its goal at the spot, and pays at the board', () => {
    let s = atLayer(inCity(life()), 9);
    const map = mapOf(s)!;
    const city = placeById(map, CITY)!;
    const p = postingsAt(s, map, city)[0]!;
    const t = takePosting(s, map, city, p.id);
    if (!t.ok) throw new Error(t.reason);
    s = t.state;
    expect(claimPosting(s, map, p.id).ok).toBe(false);
    // Stand at the spot: the goal is met, and settled or waiting.
    s = reachPostings({ ...s, map: { ...s.map!, at: [p.spot[0], p.spot[1]], inside: null } }, map);
    const w = waiting(s.map)[0];
    if (w) {
      const v = exitViews(s, meet(s, w)).find(
        (x) => x.verdict === 'clear' && !x.refused && x.exit.road !== 'pass',
      );
      if (v) s = chooseExit(s, w.id, v.i)!.state;
    }
    const held = s.map!.postings.find((x) => x.id === p.id)!;
    if (!held.done) return; // a goal too hard for this life stays held
    s = inCity(s);
    const before = s.player.stones;
    const c = claimPosting(s, map, p.id);
    if (!c.ok) throw new Error(c.reason);
    expect(c.state.player.stones).toBe(before + p.pay);
    expect(c.state.map!.postings.some((x) => x.id === p.id)).toBe(false);
  });
});

describe('the v26 save', () => {
  it('migrates a v25 map to a quiet road, Careful and nothing met', () => {
    const s = life();
    const raw = JSON.parse(JSON.stringify(makeSave(s, 0))) as {
      version: number;
      state: { map: Record<string, unknown> };
    };
    raw.version = 25;
    for (const k of [
      'stance',
      'veiled',
      'notice',
      'encounters',
      'detour',
      'hidden',
      'postings',
      'road',
    ])
      delete raw.state.map[k];
    const loaded = loadSave(raw);
    expect(loaded.state.map!.stance).toBe('careful');
    expect(loaded.state.map!.encounters).toEqual([]);
    expect(loaded.state.map!.notice).toEqual({ n: 0, next: 1 });
  });
});
