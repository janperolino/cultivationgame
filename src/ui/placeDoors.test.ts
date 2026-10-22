// A6's layouts by kind: the City's and Pacified Fort's grids, Spear-Plow's strip, the Lamp-Keeper
// Sect's front for an outsider and a member and its Inside, Beast-Butcher Gate shut, a seeded herb
// valley, and the tabs of nine.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BORDER_WILDS } from '../content/map/border-wilds.ts';
import { isOrganization, joinPower, leavePower, membershipsOf } from '../core/organizations.ts';
import { gateOf, placeKindOf } from '../core/map/gate.ts';
import { seatPowerAt } from '../core/joining.ts';
import { placeById, type MapPlace } from '../core/map/region.ts';
import { ensureMap, mapOf } from '../core/map/travel.ts';
import { realmStageOf } from '../core/orgs/trial.ts';
import { newLife, type GameState } from '../core/state.ts';
import { doorLine } from '../content/doorLines.ts';
import {
  doorsOf,
  gapTouches,
  gridTabs,
  hallFront,
  insideTabs,
  INSIDE_TILE,
  layoutOf,
  memberOf,
  SEAT_TILE,
  type Door,
} from './placeDoors.ts';

const life = (): GameState =>
  ensureMap(
    newLife({ name: 'Han Li', seed: 'a6', origin: { id: 'cave-orphan', choice: 'along' } }),
  );
const at = (s: GameState, id: string): MapPlace => placeById(mapOf(s)!, id)!;
const arts = (ds: readonly Door[]) => ds.map((d) => d.art);

describe('the grid: a city and a town', () => {
  it('lays the City out as nine Markets, then Hear, hire and rest and Work, its guild a link', () => {
    const s = life();
    const city = at(s, 'qm-shoukou-cheng');
    expect(layoutOf(placeKindOf(city)!)).toBe('grid');
    const tabs = gridTabs(doorsOf(s, mapOf(s)!, city));
    expect(tabs.map((t) => t.label)).toEqual(['Markets', 'Hear, hire and rest', 'Work']);
    expect(arts(tabs[0]!.doors)).toEqual([
      'stall',
      'alchemy',
      'refiner',
      'talisman',
      'parts',
      'house',
      'bounty',
      'mortal',
      'changer',
    ]);
    expect(arts(tabs[1]!.doors)).toContain('teahouse');
    // The guild's own doors wait behind its link, never in the grid.
    expect(tabs.flatMap((t) => t.doors).some((d) => d.group === 'power')).toBe(false);
    expect(seatPowerAt(mapOf(s)!, city)).toBe('qm-wanyi-hui');
    expect(doorLine(city.id, 'refiner')).toMatch(/Quench smoke/);
  });

  it('gives Pacified Fort the same grid, with Work and land and the March as its link', () => {
    const s = life();
    const fort = at(s, 'pacified-fort');
    expect(layoutOf(placeKindOf(fort)!)).toBe('grid');
    const tabs = gridTabs(doorsOf(s, mapOf(s)!, fort));
    expect(tabs.map((t) => t.label)).toContain('Work and land');
    expect(seatPowerAt(mapOf(s)!, fort)).toBe('qm-anbian-fu');
  });

  it('runs a group past nine into a second tab', () => {
    const many: Door[] = Array.from({ length: 11 }, (_, i) => ({
      id: `d${i}`,
      seal: '市',
      name: `Door ${i}`,
      sub: '',
      group: 'market',
      art: `d${i}`,
      room: 'market',
    }));
    const tabs = gridTabs(many);
    expect(tabs.map((t) => [t.label, t.doors.length])).toEqual([
      ['Markets', 9],
      ['Markets II', 2],
    ]);
  });
});

describe('the hall: a faction’s seat', () => {
  it('shows an outsider the Lamp-Keepers’ shop, the way in and a gift, Inside dimmed', () => {
    const s = life();
    const sect = at(s, 'qm-shoudeng-zong');
    expect(layoutOf(placeKindOf(sect)!)).toBe('hall');
    expect(memberOf(s, sect.id)).toBe(false);
    const front = hallFront(doorsOf(s, mapOf(s)!, sect), false);
    expect(front.map((d) => d.id)).toContain('join');
    expect(front.map((d) => d.id)).toContain('gift');
    expect(front.find((d) => d.id === 'board')?.later).toBe(true);
    expect(front.at(-1)).toMatchObject({ id: 'inside', later: true });
  });

  it('shows a member their seat first and opens Inside on every hall', () => {
    let s = life();
    for (const m of membershipsOf(s.world, s.player.id)) {
      s = { ...s, world: leavePower(s.world, s.player.id, m.power, s.calendar.day).world };
    }
    const r = joinPower(s.world, s.player.id, 'qm-shoudeng-zong', s.calendar.day, {
      you: true,
      realm: realmStageOf(s),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    s = { ...s, world: r.world };
    const sect = at(s, 'qm-shoudeng-zong');
    const doors = doorsOf(s, mapOf(s)!, sect);
    expect(memberOf(s, sect.id)).toBe(true);
    const front = hallFront(doors, true);
    expect(front[0]!.id).toBe('seat');
    expect(front.at(-1)).toMatchObject({ id: 'inside' });
    expect(front.at(-1)!.later).toBeFalsy();
    const inside = insideTabs(doors, sect.id).flatMap((t) => t.doors.map((d) => d.id));
    expect(inside).toEqual(expect.arrayContaining(['ground', 'elders', 'pavilion', 'board']));
    expect(inside).not.toContain('gift');
  });

  it('keeps Beast-Butcher Gate shut to a stranger: the hall layout, its gate read shut', () => {
    const s = life();
    const gate = at(s, 'qm-tushou-men');
    expect(placeKindOf(gate)).toBe('gate');
    expect(layoutOf('gate')).toBe('hall');
    expect(gateOf(s, mapOf(s)!, gate).kind).toBe('shut');
  });
});

describe('the painting whole: a village and a wild site', () => {
  it('strips Spear-Plow’s doors along the bottom, the March’s hall a link', () => {
    const s = life();
    const village = at(s, 'spear-plow');
    expect(layoutOf(placeKindOf(village)!)).toBe('village');
    const doors = doorsOf(s, mapOf(s)!, village).filter((d) => d.group !== 'power');
    expect(arts(doors)).toEqual(
      expect.arrayContaining(['mortal', 'fields', 'elder', 'farmhouse', 'barn']),
    );
  });

  it('opens a seeded herb valley as a wild site with no doors', () => {
    const s = life();
    const valley = mapOf(s)!.places.find((p) => p.kind === 'site' && p.sub === 'herb-valley')!;
    expect(layoutOf(placeKindOf(valley)!)).toBe('site');
    expect(doorsOf(s, mapOf(s)!, valley)).toEqual([]);
  });
});

describe('the preview', () => {
  it('shows the market’s gap only on the doors it touches', () => {
    const line = 'Hide runs short: the refiners eat more than the hunters bring in.';
    const door = (kind: 'parts' | 'alchemy') => ({
      id: kind,
      kind,
      name: kind,
      shops: [],
      count: 3,
    });
    expect(gapTouches(line, door('parts'))).toBe(true);
    expect(gapTouches(line, door('alchemy'))).toBe(false);
    expect(gapTouches(null, door('parts'))).toBe(false);
  });
});

describe('the briefs paint a site whole', () => {
  // Jan's call after the City: one site's brief carries every picture its screens can show, so it
  // is painted in one go. Every door an outsider or a member can meet at a place, its power's
  // tiles and a village's link to its power's hall, has a cell on the sheets that place reads.
  const manifest = JSON.parse(readFileSync('art/manifest.json', 'utf8')) as {
    assets: { out: string; pieces?: string[] }[];
  };
  const pieces = new Map<string, Set<string>>();
  for (const a of manifest.assets) {
    const m = /^src\/ui\/art\/places\/([^/]+)\/doors-\d+$/.exec(a.out);
    if (!m || !a.pieces) continue;
    const set = pieces.get(m[1]!) ?? new Set();
    for (const p of a.pieces) set.add(p);
    pieces.set(m[1]!, set);
  }

  it('leaves no door without its cell', () => {
    const s = life();
    const map = mapOf(s)!;
    const homes = BORDER_WILDS.homes;
    const missing: string[] = [];
    for (const p of map.places) {
      const kind = placeKindOf(p);
      if (!kind || kind === 'site') continue;
      const power = seatPowerAt(map, p);
      const seen: Door[] = [...doorsOf(s, map, p)];
      if (power && isOrganization(power)) {
        let m = s;
        for (const x of membershipsOf(m.world, m.player.id))
          m = { ...m, world: leavePower(m.world, m.player.id, x.power, m.calendar.day).world };
        for (const by of [undefined, 'birth'] as const) {
          const r = joinPower(m.world, m.player.id, power, m.calendar.day, {
            you: true,
            realm: realmStageOf(m),
            ...(by ? { by } : {}),
          });
          if (r.ok) {
            seen.push(...doorsOf({ ...m, world: r.world }, map, p));
            break;
          }
        }
        seen.push(SEAT_TILE, INSIDE_TILE);
      }
      // Where each door's picture is read: a power's doors from its seat's home, else the place.
      const folderOf = (d: Door) =>
        d.group === 'power' || p.id === power
          ? (homes[power ?? ''] ?? (pieces.has(power ?? '') ? power! : p.id))
          : (homes[p.id] ?? p.id);
      for (const d of seen) {
        const f = folderOf(d);
        if (!pieces.get(f)?.has(d.art)) missing.push(`${p.name}: ${d.art} (in ${f})`);
      }
      if (layoutOf(kind) === 'village' && power && !pieces.get(p.id)?.has('hall'))
        missing.push(`${p.name}: hall`);
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
