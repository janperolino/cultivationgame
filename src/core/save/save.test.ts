import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { eventText } from '../chronicle.ts';
import { chronicleEvent, newLife, noteBreakthrough, type GameState } from '../state.ts';
import { ensureMap } from '../map/travel.ts';
import { decodeSaveFile, encodeSaveFile } from './file.ts';
import { loadSave, makeSave, SAVE_VERSION, SaveError } from './format.ts';
import { SaveSlots } from './slots.ts';

const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const v0 = fixture('v0');
/** An old life's method, at Mastery after the v5 migration so it loses no speed. */
const MASTERED = { practice: 180, fedUntil: 0 };

let open: SaveSlots[] = [];
function slots(): SaveSlots {
  const s = new SaveSlots('test', { indexedDB: new IDBFactory(), IDBKeyRange });
  open.push(s);
  return s;
}
afterEach(() => {
  open.forEach((s) => s.close());
  open = [];
});

function played(): GameState {
  const s = newLife({ name: 'Han Li', mode: 'gentle', seed: 'test' });
  return {
    ...s,
    calendar: { day: s.calendar.day + 400.25 },
    player: {
      ...s.player,
      qi: { ...s.player.qi, stage: 3, bar: 52.5 },
      insight: { current: 3, earned: 10 },
      stones: 42,
    },
    chronicle: [
      ...s.chronicle,
      chronicleEvent(4720, 'legacy', { text: 'A quiet year.' }, ['player'], null),
    ],
  };
}

const withStones = (s: GameState, stones: number): GameState => ({
  ...s,
  player: { ...s.player, stones },
});

describe('save format', () => {
  it('migrates the v0 fixture', () => {
    const save = loadSave(v0);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.savedAt).toBe(1790000000000);
    const s = save.state;
    const p = s.player;
    expect(s.mode).toBe('gentle');
    expect(p).toMatchObject({ id: 'player', name: 'Lin Mo', pronouns: 'he/him' });
    expect(s.calendar.day).toBe(15.5 * 360);
    expect(p.qi).toMatchObject({ realm: 'qi-condensation', stage: 2, bar: 140, grades: [] });
    expect(p).toMatchObject({ root: 'true', methods: { 'garrison-standard': MASTERED } });
    expect(p.plan.auto).toBe('safe');
    expect(p.body.stage).toBe(1);
    expect(p.insight).toEqual({ current: 7, earned: 7 });
    expect(p.stones).toBe(12);
    expect(s.rng).toEqual({ breakthrough: 123456 });
    expect(s.chronicle.map((c) => c.data.text)).toEqual(v0.log);
    expect(s.rewindCharges).toBe(1);
  });

  it('migrates a v2 save: the cultivator moves into player, the rng into named streams', () => {
    const v2 = fixture('v2');
    const s = loadSave(v2).state;
    const p = s.player;
    expect(s.mode).toBe('ironman');
    expect(p).toMatchObject({
      name: 'Nameless',
      root: 'single',
      methods: { 'garrison-standard': MASTERED },
    });
    expect(p.qi).toMatchObject({ stage: 4, bar: 120.5 });
    expect(p.insight).toEqual({ current: 40, earned: 64 });
    expect(p.items).toEqual({ 'foundation-pill': 1 });
    expect(p.flags).toEqual(['hours-study']);
    expect(s.unlocks).toEqual([
      'cultivate',
      'routine',
      'techniques',
      'map',
      'character',
      'people',
      'chronicle',
    ]);
    expect(p.techniques).toEqual({ 'rampart-palm': { practice: 0 } });
    expect(p.practicing).toEqual(['rampart-palm']);
    expect(p.nodes).toEqual([]);
    expect(s.seed).toBe(v2.state.glass.seed);
    expect(s.rng).toEqual({ breakthrough: v2.state.rng });
    expect(s.chronicle.map((e) => [e.day, e.type, e.data.text])).toEqual(
      v2.state.chronicle.map((e: { day: number; text: string }) => [e.day, 'legacy', e.text]),
    );
  });

  it('migrates a v3 save: the wheel by the default rule, and a method on each ladder', () => {
    const v3 = fixture('v3');
    const p = loadSave(v3).state.player;
    // A mixed root spares every hour but earth's, so study takes 戌 and practice 未.
    expect(p.wheel).toEqual([
      ...['sleep', 'sleep', 'qi', 'qi', 'qi', 'qi', 'qi', 'practice'],
      ...['qi', 'qi', 'study', 'qi'],
    ]);
    expect(p.flags).toEqual(['hours-study', 'hours-practice']);
    expect(p.rootElements).toEqual(['wood', 'fire', 'metal', 'water']);
    expect(p.methods).toEqual({ 'garrison-standard': MASTERED });
    expect(p.activeMethods).toEqual({ qi: 'garrison-standard', body: null, soul: null });
    expect(p).not.toHaveProperty('method');
    expect(p.routines).toEqual(['watch-rotation']);
    expect(p.plan).toEqual({ auto: 'safe', burnStones: true });
    // Body keeps its bar, but gains nothing from its hours until an art turns up.
    expect(p.body).toMatchObject(v3.state.player.body);
    // Its one climbed stage came from the world alone, which leaves a white method's growth.
    expect(p.body.growth).toMatchObject([{ stage: 2, method: null, rarity: 'white' }]);
    expect(p.nodes).toEqual(['qi-sensing-breath']);
    expect(p.techniques).toEqual(v3.state.player.techniques);
  });

  it('migrates a v4 save: methods at Mastery, and growth recorded for the stages climbed', () => {
    const v4 = fixture('v4');
    const p = loadSave(v4).state.player;
    expect(p.methods).toEqual({ 'garrison-standard': MASTERED, 'stone-bearing': MASTERED });
    expect(p.activeMethods).toEqual(v4.state.player.activeMethods);
    // Qi climbed layers 2 and 3 on the garrison's white method, which leaves nothing on a root it
    // fits; the body has climbed nothing yet.
    expect(p.qi.growth.map((g) => [g.realm, g.stage, g.method, g.rarity])).toEqual([
      ['qi-condensation', 2, 'garrison-standard', 'white'],
      ['qi-condensation', 3, 'garrison-standard', 'white'],
    ]);
    expect(Object.values(p.qi.growth[0]!.growth)).toEqual([0, 0, 0]);
    expect(p.body.growth).toEqual([]);
    expect(p.contemplation).toEqual({});
    expect(p.qi.bar).toBe(v4.state.player.qi.bar);
  });

  it('migrates a v6 save: the chronicle typed, the placeholder life a cave orphan who went along', () => {
    const v6 = fixture('v6');
    const s = loadSave(v6).state;
    const old = v6.state.chronicle as { day: number; kind: string; text: string }[];
    expect(s.chronicle.map((e) => [e.day, e.type, e.data.text])).toEqual(
      old.map((e) => [e.day, 'legacy', e.text]),
    );
    expect(s.chronicle.map((e) => eventText(s, e))).toEqual(old.map((e) => e.text));
    expect(s.player).toMatchObject({
      talents: [],
      origin: { id: 'cave-orphan', choice: 'along' },
      place: 'qm-anbian-fu',
    });
    // What it already holds won't come again as a card; what it doesn't, will.
    expect(Object.keys(s.cards.drawn).sort()).toEqual([
      'errand-cave-along',
      'first-technique-cave-along',
    ]);
    expect(s.cards.pending).toEqual([]);
    expect(s.cards.checked).toBe(Math.floor(s.calendar.day));
    expect(s.unlocks).toEqual(expect.arrayContaining(['character', 'chronicle']));
  });

  it('migrates a v5 save: P1.3 nodes stay where their new paths hold, the rest refund', () => {
    const v5 = fixture('v5');
    const p = loadSave(v5).state.player;
    // Pure Strand now grows from Fine Qi, Steady Return from Widening Sea, and Ninefold
    // Circulation from three branch ends; the others' new paths are all owned.
    expect(p.nodes).toEqual([
      'qi-sensing-breath',
      'qi-smooth-meridians',
      'qi-stone-swallowing',
      'qi-patient-gate',
      'qi-deep-dantian',
      'soul-inner-lamp',
      'soul-clear-mind',
      'soul-night-reading',
    ]);
    // Their P1.3 costs come back, 60 + 45 + 120; insight ever earned is untouched.
    expect(p.insight).toEqual({ current: 200 + 225, earned: 900 });
  });

  it('renames the Abode to Cultivate and Cultivate to Routine, in the unlocks and the seen record', () => {
    const raw = JSON.parse(JSON.stringify(makeSave(played(), 1)));
    raw.version = 26;
    raw.state.unlocks = ['abode', 'cultivate', 'techniques', 'map'];
    raw.state.seen.screen = { abode: 'seen', cultivate: 'noticed', map: 'seen' };
    const s = loadSave(raw).state;
    expect(s.unlocks).toEqual(['cultivate', 'routine', 'techniques', 'map']);
    expect(s.seen.screen).toEqual({ cultivate: 'seen', routine: 'noticed', map: 'seen' });
  });

  it('renames walking on foot to Light step and Travel by day', () => {
    const raw = JSON.parse(JSON.stringify(makeSave(ensureMap(played()), 1)));
    raw.version = 27;
    raw.state.map.roadRoutine = 'walk';
    raw.state.map.way = 'foot';
    const s = loadSave(raw).state;
    expect(s.map!.roadRoutine).toBe('by-day');
    expect(s.map!.way).toBe('light-step');
  });

  it('rejects saves from a newer game and damaged saves', () => {
    expect(() => loadSave({ ...makeSave(played(), 1), version: SAVE_VERSION + 1 })).toThrow(
      SaveError,
    );
    expect(() => loadSave({ version: SAVE_VERSION, savedAt: 1, state: { qi: 'lots' } })).toThrow(
      /failed its check/,
    );
    expect(() => loadSave('nope')).toThrow(SaveError);
  });

  it('round-trips a compressed export file, and reads plain JSON too', async () => {
    const save = makeSave(played(), 1234);
    const bytes = await encodeSaveFile(save, 5678);
    expect([bytes[0], bytes[1]]).toEqual([0x1f, 0x8b]);
    expect(await decodeSaveFile(bytes)).toEqual(save);

    const plain = new TextEncoder().encode(
      JSON.stringify({ format: 'severed-heaven-slot', exportedAt: 1, save: v0 }),
    );
    expect((await decodeSaveFile(plain)).state.player.name).toBe('Lin Mo');
    await expect(decodeSaveFile(new TextEncoder().encode('{}'))).rejects.toThrow(SaveError);
  });
});

describe('save slots', () => {
  it('round-trips a save through IndexedDB', async () => {
    const db = slots();
    expect(await db.load(1)).toBeNull();
    const save = makeSave(played(), 1000);
    await db.write(1, save);
    const loaded = await db.load(1);
    expect(loaded).toEqual({ save, from: 'current' });
    const list = await db.list();
    expect(list[0]).toMatchObject({
      slot: 1,
      empty: false,
      name: 'Han Li',
      qiStage: 3,
      savedAt: 1000,
    });
    expect(list[1]).toEqual({ slot: 2, empty: true });
  });

  it('falls back to the backup when the latest save is damaged', async () => {
    const db = slots();
    const first = makeSave(played(), 1000);
    const second = makeSave(withStones(played(), 99), 2000);
    await db.write(2, first);
    await db.write(2, second);
    await db.writeRaw(2, { version: SAVE_VERSION, savedAt: 3000, state: { garbage: true } });

    const loaded = await db.load(2);
    expect(loaded?.from).toBe('backup');
    expect(loaded?.save).toEqual(first);
    expect(loaded?.warning).toMatch(/previous autosave/);

    // The next write keeps the good backup rather than rotating the damaged save into it.
    const third = makeSave(withStones(played(), 7), 4000);
    await db.write(2, third);
    await db.writeRaw(2, 'corrupt');
    expect((await db.load(2))?.save).toEqual(first);
  });

  it('queues an unload write synchronously, rotating the backup', async () => {
    const db = slots();
    const first = makeSave(played(), 1000);
    expect(db.writeNow(1, first)).toBe(false); // nothing known about the slot yet
    await db.write(1, first);
    const second = makeSave(withStones(played(), 5), 2000);
    expect(db.writeNow(1, second)).toBe(true);
    // IndexedDB orders this read after the queued put.
    expect((await db.load(1))?.save).toEqual(second);
    await db.writeRaw(1, 'corrupt');
    expect((await db.load(1))?.save).toEqual(first);
  });

  it('throws when both the save and the backup are damaged', async () => {
    const db = slots();
    await db.writeRaw(3, 'corrupt');
    await expect(db.load(3)).rejects.toThrow(SaveError);
    expect((await db.list())[2]).toMatchObject({ empty: false, broken: true });
  });

  it('exports and imports a slot, recording the export date', async () => {
    const db = slots();
    const save = makeSave(played(), 1000);
    await db.write(1, save);
    const { bytes } = await db.exportSlot(1, 9999);
    expect((await db.list())[0]?.lastExportAt).toBe(9999);
    await db.importSlot(3, bytes);
    expect((await db.load(3))?.save).toEqual(save);
  });

  it('gives gentle mode one rewind that refills at the next major breakthrough', async () => {
    const db = slots();
    const start = played();
    await db.write(1, makeSave(start, 1000), { rewindPoint: true });
    const later = { ...withStones(start, 0), calendar: { day: start.calendar.day + 900 } };
    await db.write(1, makeSave(later, 2000));

    const back = await db.rewind(1, 5000);
    expect(back.savedAt).toBe(5000);
    expect(back.state.calendar.day).toBe(start.calendar.day);
    expect(back.state.player.stones).toBe(42);
    expect(back.state.rewindCharges).toBe(0);
    expect((await db.load(1))?.save).toEqual(back);
    await expect(db.rewind(1, 6000)).rejects.toThrow(/spent/);

    expect(noteBreakthrough(back.state, false).rewindCharges).toBe(0);
    expect(noteBreakthrough(back.state, true).rewindCharges).toBe(1);
  });

  it('never rewinds in ironman', async () => {
    const db = slots();
    const s = newLife({ name: 'Iron', mode: 'ironman' });
    expect(s.rewindCharges).toBe(0);
    await db.write(1, makeSave(s, 1), { rewindPoint: true });
    await expect(db.rewind(1, 2)).rejects.toThrow(/gentle/);
    expect(noteBreakthrough(s, true).rewindCharges).toBe(0);
  });
});
