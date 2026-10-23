// Going in: places and people (P3.9b): the frame's rules (moving by its ticks, guarded rooms and
// their ways in, made frames), a resident's seed, the crowd's faces and the realm rule, the playbook's
// stall, its theft of your own sect's Foundation Pill the night before the tournament and a break-in
// at a stranger's house, a Foundation fight heard across a town, the moment's sizes, the fold, the
// voice kept, a person met last week naming what you did, and the save.
import { describe, expect, it } from 'vitest';
import { CROWD_TAGS } from '../content/crowd.ts';
import { NEW_FACE } from '../content/goin.ts';
import { DOOR_KIND_IDS, DOOR_KINDS, doorKindOf } from '../content/doorKinds.ts';
import { HOUSEHOLDS } from '../content/households.ts';
import { MOMENT, ROOM } from '../content/memories.ts';
import { PLACE_AIR } from '../content/placeAir.ts';
import { crowdCount, crowdRealm, facesAt, makeFace, placeFacts } from './crowd.ts';
import {
  makeFrame,
  moveTicks,
  ownerHome,
  placeFrames,
  residentOf,
  type DoorRef,
} from './frames.ts';
import { checkPlan, endScene, runTurn } from './goin.ts';
import {
  crowdHere,
  engageFace,
  enterSpot,
  findings,
  goInPlace,
  happeningAt,
  movesHere,
  moveTo,
  sitLecture,
} from './goinPlace.ts';
import { enterAt } from './map/gate.ts';
import { placeById, type MapPlace } from './map/region.ts';
import { ensureMap, mapOf } from './map/travel.ts';
import { joinPower } from './orgs/membership.ts';
import { step } from './resolver/plan.ts';
import { remember } from './resolver/opinion.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave } from './save/format.ts';
import { newLife, withPlayer, type GameState } from './state.ts';
import { fold, foldable, keepLasts, needsFold, voiceOf } from './voices.ts';

const FORT = 'pacified-fort';
const CITY = 'qm-shoukou-cheng';

const life = (seed = 'places'): GameState => {
  const s = ensureMap(
    newLife({ name: 'Han Li', seed, origin: { id: 'conscript', choice: 'along' } }),
  );
  const q = { ...s, map: { ...s.map!, notice: { n: 0, next: 1e9 } } };
  return withPlayer(q, { ...q.player, stones: 600, silver: 100 });
};

const place = (s: GameState, id: string): MapPlace => placeById(mapOf(s)!, id)!;

const inside = (s: GameState, id: string): GameState => {
  const p = place(s, id);
  const at = { ...s, map: { ...s.map!, at: [p.x, p.y] as [number, number], course: null } };
  const r = enterAt(at, mapOf(s)!, p);
  if (!r.ok) throw new Error(r.reason);
  return r.state;
};

const DOORS: DoorRef[] = [
  { id: 'stall', name: 'the free market', art: 'stall', group: 'market' },
  { id: 'alchemy', name: 'Pill Street', art: 'alchemy', group: 'market' },
  { id: 'teahouse', name: 'the Quiet Moon', art: 'teahouse', group: 'hear' },
  { id: 'inn', name: 'Inn', art: 'inn', group: 'hear' },
  { id: 'board', name: 'the bounty board', art: 'board', group: 'work' },
];

/** At an hour of the day: 子 is 0, 辰 is 4. */
const atHour = (s: GameState, branch: number): GameState => ({
  ...s,
  calendar: { day: Math.floor(s.calendar.day) + (branch + 0.5) / 12 },
});

function goIn(s: GameState, id: string, door: string | null, doors = DOORS): GameState {
  const r = goInPlace(s, { place: place(s, id), doors, door });
  if (typeof r === 'string') throw new Error(r);
  return r;
}

function join(s: GameState, power: string): GameState {
  const r = joinPower(s.world, s.player.id, power, s.calendar.day);
  if (!r.ok) throw new Error('could not join');
  return { ...s, world: r.world };
}

const foundation = (s: GameState): GameState =>
  withPlayer(s, {
    ...s.player,
    qi: { ...s.player.qi, realm: 'foundation-establishment', stage: 3 },
    body: { ...s.player.body, realm: 'foundation-establishment', stage: 1 },
    soul: { ...s.player.soul, realm: 'foundation-establishment', stage: 1 },
  });

describe('the door kinds and the crowd', () => {
  it('maps every A6 door to a kind, and every kind has three features', () => {
    expect(DOOR_KIND_IDS.length).toBe(17);
    for (const k of DOOR_KIND_IDS) expect(DOOR_KINDS[k].features.length).toBe(3);
    expect(doorKindOf('house-2')).toBe('trading');
    expect(doorKindOf('black-market')).toBe('market');
    expect(doorKindOf('elders')).toBe('hall');
  });

  it('writes air and crowd for about thirty places, with tags from the sixteen', () => {
    const ids = Object.keys(PLACE_AIR);
    expect(ids.length).toBeGreaterThanOrEqual(28);
    for (const id of ids) {
      const tags = Object.keys(PLACE_AIR[id]!.crowd);
      expect(tags.length).toBeGreaterThanOrEqual(3);
      for (const t of tags) expect(CROWD_TAGS).toContain(t);
    }
  });

  it('keeps a city a little alive at night, and a village asleep', () => {
    const city = placeFacts(CITY);
    const village = placeFacts('spear-plow');
    expect(city.at).toBe('city');
    expect(village.at).toBe('village');
    const midnight = 100 + 0.5 / 12;
    const noon = 100 + 6.5 / 12;
    expect(crowdCount(city, 'street', noon)).toBe(60);
    expect(crowdCount(city, 'street', midnight)).toBe(15);
    expect(crowdCount(village, 'street', midnight)).toBe(0);
    // A shop shuts at night.
    expect(crowdCount(city, 'craft', midnight)).toBe(0);
  });

  it('draws the same faces for the same frame and hour', () => {
    const f = placeFacts(FORT);
    const a = facesAt(f, 'street:streets', 50.4, 20);
    expect(a).toEqual(facesAt(f, 'street:streets', 50.4, 20));
    expect(a.length).toBe(4);
    expect(facesAt(f, 'street:streets', 50.6, 20)).not.toEqual(a);
  });

  it('reads realms by the general rule: Foundation 1 in 20 in a town, 1 in 10 in a city', () => {
    const count = (id: string) => {
      const f = placeFacts(id);
      const rng = new Rng(7);
      let fe = 0;
      for (let i = 0; i < 20000; i++) if (crowdRealm(rng, f).realm !== 'qi-condensation') fe++;
      return fe / 20000;
    };
    expect(count(FORT)).toBeGreaterThan(0.04);
    expect(count(FORT)).toBeLessThan(0.06);
    expect(count(CITY)).toBeGreaterThan(0.085);
    expect(count(CITY)).toBeLessThan(0.115);
  });

  it('makes a face the same person every time, kept by their seed', () => {
    const s = life();
    const f = placeFacts(FORT);
    const face = facesAt(f, 'street:streets', 50.4, 20)[0]!;
    const a = makeFace(s.world, face, f, 50.4, 'x', s.lineage.id);
    const b = makeFace(s.world, face, f, 50.4, 'x', s.lineage.id);
    expect(a.actor.name).toBe(b.actor.name);
    expect(a.actor.face?.key).toBe(face.key);
    expect(a.born).toBeLessThan(0 + 1);
  });
});

describe('frames', () => {
  it('writes a street a district, its doors and their rooms', () => {
    const city = placeFrames(true, DOORS, null, null);
    expect(city.filter((f) => f.kind === 'street').map((f) => f.id)).toEqual([
      'street:market',
      'street:hear',
      'street:work',
    ]);
    const town = placeFrames(false, DOORS, null, null);
    expect(town.filter((f) => f.kind === 'street').length).toBe(1);
    expect(town.some((f) => f.id === 'room:inn:0' && f.way === 'paid')).toBe(true);
  });

  it('moves free within a door, a tick door to door, four between districts', () => {
    const fr = placeFrames(true, DOORS, null, null);
    const f = (id: string) => fr.find((x) => x.id === id)!;
    expect(moveTicks(fr, f('door:inn'), f('room:inn:0'))).toBe(0);
    expect(moveTicks(fr, f('door:inn'), f('door:teahouse'))).toBe(1);
    expect(moveTicks(fr, f('door:inn'), f('door:stall'))).toBe(4);
  });

  it('seeds a resident by the place, the district and the name', () => {
    const s = life();
    const a = residentOf(s.world, FORT, 'streets', 'a merchant’s house off the wharf', 'w', 40);
    const b = residentOf(s.world, FORT, 'streets', 'A merchant’s house off the wharf', 'w', 40);
    expect(a).toEqual(b);
    expect(residentOf(s.world, FORT, 'streets', 'a hut by the wall', 'w', 40).seed).not.toBe(
      a.seed,
    );
    expect(HOUSEHOLDS[a.owner]).toBeDefined();
    expect(a.born).toBeLessThan(0);
    // Who is home by the hour: a world roll, the same each time.
    expect(ownerHome(a, 40.02)).toEqual(ownerHome(a, 40.02));
  });

  it('makes three frames a door a scene, and reads a home as a resident’s', () => {
    const s = life();
    let frames = placeFrames(false, DOORS, null, null);
    const at = frames.find((f) => f.id === 'door:inn')!;
    const home = makeFrame(s.world, FORT, frames, at, 'a cooper’s house behind the inn', 40, 'w');
    expect(typeof home).not.toBe('string');
    if (typeof home === 'string') return;
    expect(home.ground).toBe('resident');
    expect(home.resident).toBeDefined();
    frames = [...frames, home];
    for (const name of ['the cellar under the inn', 'an alley behind the inn']) {
      const m = makeFrame(s.world, FORT, frames, at, name, 40, 'w');
      if (typeof m !== 'string') frames = [...frames, m];
    }
    expect(typeof makeFrame(s.world, FORT, frames, at, 'a gambling den', 40, 'w')).toBe('string');
  });
});

describe('going in at a place', () => {
  it('opens at a door with its keeper and moves by the rule', () => {
    let s = atHour(inside(life(), CITY), 6);
    s = goIn(s, CITY, 'inn');
    expect(s.goin!.place!.at).toBe('door:inn');
    expect(s.goin!.scene.actors.some((a) => a.id.startsWith('keeper:'))).toBe(true);
    const moves = movesHere(s);
    expect(moves.find((m) => m.frame.id === 'door:teahouse')?.ticks).toBe(1);
    expect(moves.find((m) => m.frame.id === 'street:market')?.ticks).toBe(4);
    // A paid room is barred until you pay; you have the silver, so you walk in and pay.
    const room = moves.find((m) => m.frame.id === 'room:inn:0')!;
    expect(room.barred).toBeNull();
    const t0 = s.goin!.scene.tick;
    const r = moveTo(s, 'street:market');
    if (typeof r === 'string') throw new Error(r);
    expect(r.state.goin!.scene.tick - t0).toBe(4);
    // The keeper stays at the inn.
    expect(r.state.goin!.scene.actors.some((a) => a.id === `keeper:${CITY}:inn`)).toBe(false);
    const back = moveTo(r.state, 'door:inn');
    if (typeof back === 'string') throw new Error(back);
    expect(back.state.goin!.scene.actors.some((a) => a.id === `keeper:${CITY}:inn`)).toBe(true);
  });

  it('runs a stall: a face engaged buys from your Bag', () => {
    let s = atHour(inside(life('stall'), FORT), 5);
    s = withPlayer(s, { ...s.player, items: { ...s.player.items, 'beast-hide': 3 } });
    s = goIn(s, FORT, 'stall');
    const crowd = crowdHere(s);
    expect(crowd.count).toBeGreaterThan(0);
    const face = crowd.faces[0]!;
    s = engageFace(s, face.key);
    const buyer = s.goin!.scene.actors.at(-1)!;
    expect(buyer.face?.key).toBe(face.key);
    const chat = runTurn(s, { actor: s.player.id, steps: [step('chat', { target: buyer.id })] });
    expect(chat.results[0]?.refused).toBeNull();
    // The chat leaves an evening with them, its story the engine's line.
    const done = endScene(chat.state);
    const m = done.world.memories.find((x) => x.holder === buyer.id && x.row === 'company');
    expect(m?.row).toBe('company');
    expect(m?.what).toContain(s.goin!.place!.name);
    expect(done.world.kept[buyer.id]?.face).toBe(face.key);
  });

  it('makes someone you name in the crowd, the same person all scene (talk first)', () => {
    const s = goIn(atHour(inside(life('named'), FORT), 5), FORT, 'stall');
    expect(crowdHere(s).count).toBeGreaterThan(0);
    const who = 'the woman counting silver by the well';
    const talk = { actor: s.player.id, steps: [step('chat', { target: NEW_FACE, who })] };
    const c = checkPlan(s, talk);
    expect(c.refused).toBeNull();
    expect(c.stake).toBe(false);
    const r = runTurn(s, talk);
    const her = r.state.goin!.scene.actors.at(-1)!;
    expect(her.looks).toBe('woman counting silver by the well');
    expect(r.results[0]?.step.target).toBe(her.id);
    // The same words find her again, and nobody new is made.
    const again = runTurn(r.state, talk);
    expect(again.state.goin!.scene.actors.length).toBe(r.state.goin!.scene.actors.length);
    expect(again.results[0]?.step.target).toBe(her.id);
  });

  it('breaks into a stranger’s house: shut until forced, its store taken, found by morning', () => {
    let s = foundation(atHour(inside(life('break-in'), FORT), 0));
    s = goIn(s, FORT, null);
    const r = enterSpot(s, 'a merchant’s house off the market');
    if (typeof r === 'string') throw new Error(r);
    s = r.state;
    const house = s.goin!.place!.frames.find((f) => f.made)!;
    expect(house.resident).toBeDefined();
    const way = s.goin!.scene.features.find((f) => f.id === `way:${house.id}`)!;
    expect(way).toBeDefined();
    const store = s.goin!.scene.stores![way.id]!;
    expect(Object.keys(store.items).length + store.taels).toBeGreaterThan(0);
    const silver = s.player.silver;
    const t = runTurn(s, {
      actor: s.player.id,
      steps: [step('burgle', { target: way.id, thing: 'everything' })],
    });
    expect(t.results[0]?.check?.verdict).not.toBe('short');
    expect(t.state.player.silver).toBeGreaterThanOrEqual(silver + store.taels);
    const robbed = t.state.goin!.place!.frames.find((f) => f.id === house.id)!;
    expect(robbed.robbed).toBeDefined();
    let after = endScene(t.state);
    expect(after.world.frames[FORT]?.some((f) => f.id === house.id)).toBe(true);
    // The morning after, the robbery is found: word of the place, no heat (no trace).
    after = { ...after, calendar: { day: after.calendar.day + 2 } };
    const f = findings(after, FORT);
    expect(f.words.some((w) => w.includes('robbed'))).toBe(true);
  });

  it('steals your own sect’s Foundation Pill from its treasury the night before', () => {
    let s = foundation(atHour(inside(join(life('pill'), 'qm-tushou-men'), 'qm-tushou-men'), 0));
    const doors: DoorRef[] = [
      { id: 'elders', name: 'the elders’ hall', art: 'elders', group: 'hall' },
    ];
    s = goIn(s, 'qm-tushou-men', 'elders', doors);
    const way = s.goin!.scene.features.find((f) => f.id.startsWith('way:room:elders:1'))!;
    expect(way).toBeDefined();
    const store = s.goin!.scene.stores![way.id]!;
    expect(store.items['foundation-pill']).toBeGreaterThanOrEqual(1);
    const had = s.player.items['foundation-pill'] ?? 0;
    const t = runTurn(s, {
      actor: s.player.id,
      steps: [step('burgle', { target: way.id, thing: 'foundation-pill' })],
    });
    if (t.results[0]?.check?.verdict !== 'short')
      expect(t.state.player.items['foundation-pill']).toBe(had + 1);
    else expect(t.state.player.items['foundation-pill'] ?? 0).toBe(had);
  });

  it('hears a Foundation fight across a town', () => {
    let s = foundation(atHour(inside(life('noise'), FORT), 6));
    s = goIn(s, FORT, null);
    const face = crowdHere(s).faces[0]!;
    s = engageFace(s, face.key);
    const them = s.goin!.scene.actors.at(-1)!;
    const sc = { ...s.goin!.scene, noise: { li: 5, until: s.goin!.scene.tick + 3 } };
    s = { ...s, goin: { ...s.goin!, scene: sc } };
    const t = runTurn(s, { actor: s.player.id, steps: [step('chat', { target: them.id })] });
    expect(t.state.goin!.scene.log.some((l) => l.includes('The whole of'))).toBe(true);
  });

  it('holds the lecture on the 1st at 辰 for members, and pays insight by the soul', () => {
    let s = inside(join(life('lecture'), 'qm-tushou-men'), 'qm-tushou-men');
    s = { ...s, calendar: { day: 30 * 4 + 4.2 / 12 } };
    const doors: DoorRef[] = [
      { id: 'elders', name: 'the elders’ hall', art: 'elders', group: 'hall' },
    ];
    s = goIn(s, 'qm-tushou-men', 'elders', doors);
    const h = happeningAt(
      s,
      'qm-tushou-men',
      s.goin!.place!.frames.find((f) => f.id === 'door:elders'),
    );
    expect(h?.on).toBe(true);
    expect(s.goin!.scene.actors.some((a) => a.id === 'elder:qm-tushou-men')).toBe(true);
    const before = s.player.insight.current;
    const r = sitLecture(s, true);
    if (typeof r === 'string') throw new Error(r);
    expect(r.state.player.insight.current).toBeGreaterThan(before);
  });
});

describe('what GLM found', () => {
  it('brings a buyer to your mat when you wait with wares, and checks a plan at a face', () => {
    let s = atHour(inside(life('mat'), FORT), 5);
    s = withPlayer(s, { ...s.player, items: { ...s.player.items, 'beast-hide': 3 } });
    s = goIn(s, FORT, 'stall');
    const t = runTurn(s, { actor: s.player.id, steps: [step('wait')] });
    expect(t.stopped).toBe('someone stops at your mat');
    const buyer = t.state.goin!.scene.actors.at(-1)!;
    expect(buyer.face).toBeDefined();
    // A plan aimed at a face not yet made is checked on the face made.
    const face = crowdHere(s).faces[1]!;
    const c = checkPlan(s, {
      actor: s.player.id,
      steps: [step('chat', { target: `face:${face.key}` })],
    });
    expect(c.refused).toBeNull();
  });

  it('puts you inside a house once its lock is forced, to take what is kept there', () => {
    let s = foundation(atHour(inside(life('inside'), FORT), 0));
    s = goIn(s, FORT, null);
    const r = enterSpot(s, 'a cooper’s house by the wall');
    if (typeof r === 'string') throw new Error(r);
    s = r.state;
    const house = s.goin!.place!.frames.find((f) => f.made)!;
    const forced = runTurn(s, { actor: s.player.id, steps: [step('break', { target: house.id })] });
    if (forced.results[0]?.check?.verdict === 'short') return;
    expect(forced.state.goin!.place!.at).toBe(house.id);
    const silver = forced.state.player.silver;
    const kept = forced.state.goin!.scene.stores![`store:${house.id}`]!;
    const took = runTurn(forced.state, {
      actor: s.player.id,
      steps: [step('burgle', { target: house.id, thing: 'everything' })],
    });
    if (took.results.at(-1)?.check?.verdict === 'short') return;
    expect(took.state.player.silver).toBe(silver + kept.taels);
    expect(took.state.goin!.place!.frames.find((f) => f.id === house.id)?.robbed).toBeDefined();
  });

  it('forces a lock and takes the silver in one plan, as GLM writes it', () => {
    let s = foundation(atHour(inside(life('one-plan'), FORT), 0));
    s = goIn(s, FORT, null);
    const r = enterSpot(s, 'a cooper’s house by the wall');
    if (typeof r === 'string') throw new Error(r);
    s = r.state;
    const house = s.goin!.place!.frames.find((f) => f.made)!;
    const way = `way:${house.id}`;
    const kept = s.goin!.scene.stores![way]!;
    const t = runTurn(s, {
      actor: s.player.id,
      steps: [
        step('break', { target: way, uses: [way] }),
        step('burgle', { target: way, uses: [way], thing: 'taels' }),
      ],
    });
    if (t.results.some((x) => x.check?.verdict === 'short')) return;
    expect(t.results.every((x) => !x.refused)).toBe(true);
    expect(t.state.player.silver).toBe(s.player.silver + kept.taels);
  });

  it('reads forcing a house’s lock as its way in', () => {
    let s = foundation(atHour(inside(life('way'), FORT), 0));
    s = goIn(s, FORT, null);
    const r = enterSpot(s, 'a cooper’s house by the wall');
    if (typeof r === 'string') throw new Error(r);
    const house = r.state.goin!.place!.frames.find((f) => f.made)!;
    const c = checkPlan(r.state, {
      actor: s.player.id,
      steps: [step('break', { target: house.id })],
    });
    expect(c.refused).toBeNull();
  });
});

describe('what lasts', () => {
  it('sizes a moment: slight ±2, real ±5 with a step behind it, one a person a scene', () => {
    let s = atHour(inside(life('moment'), FORT), 5);
    s = goIn(s, FORT, 'teahouse');
    const keeper = s.goin!.scene.actors.find((a) => a.id.startsWith('keeper:'))!;
    const lasts = (sign: 'good' | 'bad') => ({
      said: [],
      address: [],
      felt: [],
      moment: {
        about: keeper.id,
        reason: 'Remembered my late wife',
        story: 'x',
        tag: 'kin' as const,
        sign,
      },
    });
    const slight = keepLasts(s, lasts('good'));
    const m = slight.world.memories.find((x) => x.row === 'moment')!;
    expect(m.value).toBe(MOMENT.slight);
    expect(m.tag).toBe('kin');
    // One a person a scene.
    const twice = keepLasts(slight, lasts('good'));
    expect(twice.world.memories.filter((x) => x.row === 'moment').length).toBe(1);
    const talk = runTurn(s, { actor: s.player.id, steps: [step('ask', { target: keeper.id })] });
    const real = keepLasts(talk.state, lasts('bad'), talk.results);
    const r = real.world.memories.find((x) => x.row === 'moment')!;
    if (talk.results[0]?.check?.verdict !== 'short') expect(r.value).toBe(-MOMENT.real);
  });

  it('keeps a voice: three lines, how they address you once, a memory’s own words', () => {
    let s = atHour(inside(life('voice'), FORT), 5);
    s = goIn(s, FORT, 'teahouse');
    const keeper = s.goin!.scene.actors.find((a) => a.id.startsWith('keeper:'))!;
    const said = ['a', 'b', 'c', 'd'].map((l) => ({ about: keeper.id, line: `Line ${l}` }));
    s = keepLasts(s, {
      said,
      address: [{ about: keeper.id, address: 'young master' }],
      felt: [],
      moment: null,
    });
    s = keepLasts(s, {
      said: [],
      address: [{ about: keeper.id, address: 'brat' }],
      felt: [],
      moment: null,
    });
    const v = voiceOf(s.world, keeper.id);
    expect(v.lines).toEqual(['Line b', 'Line c', 'Line d']);
    expect(v.address).toBe('young master');
  });

  it('folds the oldest faded rows past forty, and never one worth 20', () => {
    let w = life().world;
    for (let i = 0; i < ROOM.rows + 5; i++)
      w = remember(
        w,
        { holder: 'old-liu', about: 'p', row: 'told-new', note: `n${i}`, what: `story ${i}` },
        i,
      );
    w = remember(
      w,
      { holder: 'old-liu', about: 'p', row: 'saved-life', what: 'pulled me out of the river' },
      0,
    );
    const day = 1000;
    expect(needsFold(w, 'old-liu', 'p')).toBe(true);
    const rows = foldable(w, 'old-liu', 'p', day);
    expect(rows.length).toBe(6);
    expect(rows.some((m) => m.row === 'saved-life')).toBe(false);
    const folded = fold(w, 'old-liu', 'p', rows, day);
    expect(folded.memories.filter((m) => m.holder === 'old-liu').length).toBe(ROOM.rows);
    expect(voiceOf(folded, 'old-liu').summary).toContain('story 0');
  });

  it('saves the scene inside a place, and brings a v55 save up with its memories’ stories', () => {
    let s = atHour(inside(life('save'), FORT), 5);
    s = goIn(s, FORT, 'inn');
    const back = loadSave(JSON.parse(JSON.stringify(makeSave(s, 1))));
    expect(back.state.goin?.place?.at).toBe('door:inn');
    const raw = JSON.parse(JSON.stringify(makeSave(life('old'), 1))) as {
      version: number;
      state: { world: Record<string, unknown> };
    };
    raw.version = 55;
    raw.state.world.memories = [
      { id: 1, holder: 'a', about: 'b', row: 'paid-fairly', value: 3, day: 1, known: [] },
    ];
    delete raw.state.world.voices;
    delete raw.state.world.frames;
    const old = loadSave(raw);
    expect(old.version).toBe(56);
    expect(old.state.world.memories[0]?.what).toBe('Paid me fairly');
    expect(old.state.world.voices).toEqual({});
  });
});
