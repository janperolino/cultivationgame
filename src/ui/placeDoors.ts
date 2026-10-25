// A place's doors and how its layout lays them out (A6; docs/mockups/place-kinds-study.html, the
// place layouts talk, Jan's calls). Every door a place has, from its market's districts and firms
// to its power's halls, each with the group it sits in, the piece of the place's door sheet that
// paints it and the room A6.1 opens it in; then each kind's layout: a city's or a town's tabs of
// nine, a hall's front tiles and its members-only Inside, a village's strip. No React here.
import { PLACE_KIND_INFO, type PlaceKindId } from '../content/map/places.ts';
import { capitalize, possessive } from '../content/words.ts';
import {
  doorsAt,
  keeperName,
  SHOP_KIND_INFO,
  shop as shopById,
  STREETS,
  type Door as MarketDoor,
  type ShopKind,
} from '../content/shops.ts';
import { hasBoard, isMissionHall } from '../core/map/board.ts';
import { jobsAt } from '../core/jobs.ts';
import { placeKindOf } from '../core/map/gate.ts';
import type { MapPlace, RegionMap } from '../core/map/region.ts';
import { mapOf } from '../core/map/travel.ts';
import { mapsAt } from '../core/map/place.ts';
import { pavilionChapters } from '../core/halls.ts';
import { yourMark } from '../core/guarded.ts';
import { eldersHall, entryOf, seatPowerAt } from '../core/joining.ts';
import { isOrganization, theName } from '../core/organizations.ts';
import { examines } from '../core/craftGrade.ts';
import { farmsAt } from '../core/map/fields.ts';
import { brokerAt, dwellingAt, dwellingNoun } from '../core/dwellings.ts';
import { keeperId } from '../core/shops.ts';
import { opinion } from '../core/resolver/opinion.ts';
import type { GameState } from '../core/state.ts';

/** Where a door sits: a city's tab, or the power's own doors, its hall's front and Inside. */
export type DoorGroup = 'market' | 'hear' | 'work' | 'land' | 'power' | 'hall';

/** The room a door opens into (A6.1's eight; until then every room is a plain one). */
export type RoomKind =
  'market' | 'craft' | 'trading' | 'board' | 'teahouse' | 'departures' | 'hall' | 'changer';

export interface Door {
  /** The counter's key. */
  id: string;
  seal: string;
  name: string;
  /** The name's hanzi, for the preview. */
  hanzi?: string;
  sub: string;
  tag?: string;
  /** Shown dimmed, not opened: what you can't use yet. */
  later?: boolean;
  group: DoorGroup;
  /** Its piece on the place's door sheet (art/places/…/brief.md). */
  art: string;
  room: RoomKind;
  /** A district's or a firm's market door, for its preview. */
  market?: MarketDoor;
}

const ROOM_OF: Record<ShopKind, RoomKind> = {
  stall: 'market',
  parts: 'market',
  mortal: 'market',
  'black-market': 'market',
  alchemy: 'craft',
  refiner: 'craft',
  talisman: 'craft',
  house: 'trading',
  sect: 'trading',
  bounty: 'board',
};

/** A firm's piece on the sheet: its kind, and a second of a kind numbered. */
function firmArt(doors: readonly MarketDoor[], d: MarketDoor): string {
  const same = doors.filter((x) => x.kind === d.kind);
  const i = same.indexOf(d);
  return i > 0 ? `${d.kind}-${i + 1}` : d.kind;
}

/** Every door of a place, its power's own among them; a wild site has none. */
export function doorsOf(s: GameState, map: RegionMap, p: MapPlace): Door[] {
  const kind = placeKindOf(p);
  if (!kind || kind === 'site') return [];
  const info = PLACE_KIND_INFO[kind];
  const out: Door[] = [];
  // The power whose seat this is: its way in and a gift for an outsider, its elders' hall for a
  // member (the organizations checkpoint).
  const seat = seatPowerAt(map, p);
  if (seat) {
    const hall = eldersHall(s, s.player.id, seat);
    const entry = entryOf(s, s.player.id, seat);
    // Its training ground, where a member asks a senior, a fellow disciple or a junior to spar
    // (Fights you play).
    if (hall)
      out.push({
        id: 'ground',
        seal: '武',
        name: 'Training ground',
        hanzi: '演武场',
        sub: 'spar a senior, a fellow disciple or a junior',
        tag: 'members',
        group: 'power',
        art: 'ground',
        room: 'hall',
      });
    if (hall && !hall.guest)
      out.push({
        id: 'elders',
        seal: hall.title.hanzi.slice(0, 1),
        name: hall.title.name,
        hanzi: hall.title.hanzi,
        sub: hall.trial?.open
          ? 'the inner trial is held this month'
          : 'an elder’s lesson, a protector, being released',
        tag: hall.trial?.open ? 'trial' : 'members',
        group: 'power',
        art: 'elders',
        room: 'hall',
      });
    if (entry)
      out.push({
        id: 'join',
        seal: entry.title.hanzi.slice(0, 1),
        name: entry.title.name,
        hanzi: entry.title.hanzi,
        sub: entry.shut ?? entry.sub,
        group: 'power',
        art: 'join',
        room: 'hall',
      });
    if (!hall)
      out.push({
        id: 'gift',
        seal: '礼',
        name: 'Offer a gift',
        sub: 'remembered as tribute',
        group: 'power',
        art: 'gift',
        room: 'hall',
      });
    // A crafting guild examines crafters and sells its area's common styles (K6).
    if (examines(seat)) {
      out.push({
        id: 'exam',
        seal: '考',
        name: 'Examination hall',
        hanzi: '考堂',
        sub: 'one test batch at its bench for a grade badge',
        group: 'power',
        art: 'exam',
        room: 'hall',
      });
      out.push({
        id: 'counter',
        seal: '艺',
        name: 'The guild’s counter',
        sub: 'the common styles, sold openly',
        group: 'power',
        art: 'counter',
        room: 'trading',
      });
    }
  }
  // A door is a district, or a firm, a hall or the office alone (E5). A sect's own shop stands at
  // its seat as its exchange hall.
  const market = doorsAt(p.id);
  for (const d of market) {
    const k = SHOP_KIND_INFO[d.kind];
    const st = STREETS[d.kind];
    // A village's one shop goes by its own name: the village store, not a market.
    const one = kind === 'village' && d.count === 1 ? shopById(d.shops[0]!) : null;
    out.push({
      id: d.id,
      seal: (st?.hanzi ?? k.hanzi).slice(0, 1),
      name: capitalize(one?.name ?? d.name),
      hanzi: st?.hanzi ?? k.hanzi,
      sub: st ? `${d.count === 1 ? 'one shop' : `${d.count} shops`} · ${st.sells}` : k.name,
      tag: k.members ? 'members' : k.money === 'silver' ? 'silver' : k.posted ? 'posted rates' : '',
      group: d.kind === 'sect' ? 'hall' : 'market',
      art: st ? d.kind : firmArt(market, d),
      room: ROOM_OF[d.kind],
      market: d,
    });
  }
  // Its law hall, where a face it marked makes restitution (O5).
  const mark = isOrganization(p.id) ? yourMark(s, p.id) : null;
  if (mark)
    out.push({
      id: 'law-hall',
      seal: '律',
      name: 'Law hall',
      hanzi: '律堂',
      sub: `restitution for ${mark.method}`,
      tag: 'marked',
      group: 'hall',
      art: 'law-hall',
      room: 'hall',
    });
  // A power's own chapters, sold to its disciples by seat (O2).
  if (isOrganization(p.id) && pavilionChapters(p.id).length > 0)
    out.push({
      id: 'pavilion',
      seal: '经',
      name: 'Scripture pavilion',
      hanzi: '藏经阁',
      sub: `${possessive(capitalize(theName(p.id)), '’')} own chapters, by seat`,
      tag: 'members',
      group: 'hall',
      art: 'pavilion',
      room: 'hall',
    });
  // Work (O4): the posts and hires taken here, and a sect's mission hall, its bounty office.
  const jobs = jobsAt(p.id, s.map ? mapOf(s) : null);
  if (jobs.length > 0)
    out.push({
      id: 'work',
      seal: '差',
      name: 'Work',
      hanzi: '差事',
      sub: `${jobs.length === 1 ? 'one post' : `${jobs.length} posts and hires`}, by the shift`,
      group: 'work',
      art: 'work',
      room: 'board',
    });
  if (isMissionHall(p.id)) {
    const held = s.map?.postings.filter((x) => x.board === p.id && x.done).length ?? 0;
    out.push({
      id: 'board',
      seal: '任',
      name: 'Mission hall',
      hanzi: '任务堂',
      sub: held ? `${held} to be paid here` : 'the sect’s postings, paid in contribution',
      tag: held ? 'paid' : 'members',
      group: 'hall',
      art: 'mission',
      room: 'board',
    });
  }
  // A village or town rents and sells plots (K8).
  if (farmsAt(p)) {
    const held = s.player.crafts.plots.filter((x) => x.place === p.id).length;
    out.push({
      id: 'fields',
      seal: '田',
      name: 'Fields',
      hanzi: '田',
      sub: held
        ? held === 1
          ? 'your plot here'
          : 'your ' + held + ' plots here'
        : 'a plot of nine beds, rented or bought',
      group: 'land',
      art: 'fields',
      room: 'hall',
    });
  }
  if (kind === 'gate') return out;
  if (info.changer)
    out.push({
      id: 'changer',
      seal: '兑',
      name: 'Money changer',
      hanzi: '钱庄',
      sub: 'a stone for 110 taels, 120 back',
      group: 'market',
      art: 'changer',
      room: 'changer',
    });
  if (info.rumors === 'teahouse')
    out.push({
      id: 'talk',
      seal: '茶',
      name: 'Teahouse',
      hanzi: '茶楼',
      sub: 'a pot of tea: one rumor a day',
      group: 'hear',
      art: 'teahouse',
      room: 'teahouse',
    });
  if (info.rumors === 'elder')
    out.push({
      id: 'talk',
      seal: '老',
      name: 'The village elder',
      hanzi: '村老',
      sub: 'one rumor a day, for news of your own',
      group: 'hear',
      art: 'elder',
      room: 'teahouse',
    });
  const maps = mapsAt(s, p.id);
  if (maps.length > 0)
    out.push({
      id: 'maps',
      seal: '图',
      name: 'Map seller',
      hanzi: '图铺',
      sub: maps.length > 1 ? 'the region, and each kingdom' : 'the kingdom’s map',
      group: 'hear',
      art: 'maps',
      room: 'departures',
    });
  if (info.guides > 0)
    out.push({
      id: 'guides',
      seal: '导',
      name: 'Guides',
      hanzi: '向导',
      sub: `${info.guides === 1 ? 'one' : info.guides} for hire, a stone a day`,
      group: 'hear',
      art: 'guides',
      room: 'departures',
    });
  if (info.caravans > 0)
    out.push({
      id: 'caravans',
      seal: '队',
      name: 'Caravans',
      hanzi: '商队',
      sub: `${info.caravans === 1 ? 'one' : info.caravans} leaving a week`,
      group: 'hear',
      art: 'caravans',
      room: 'departures',
    });
  // The broker 牙行 lets rooms, chambers and courtyards; a village its farmhouses (K9).
  const broker = brokerAt(p);
  if (broker) {
    const mine = dwellingAt(s.player, p.id);
    out.push({
      id: 'broker',
      seal: broker === 'village' ? '舍' : '牙',
      name: broker === 'village' ? 'Farmhouse to let' : 'Broker 牙行',
      hanzi: broker === 'village' ? '农舍' : '牙行',
      sub: mine
        ? `your ${dwellingNoun(s, mine)} here`
        : broker === 'village'
          ? 'a house and two fields of its own'
          : 'rooms, chambers and courtyards',
      tag: mine ? 'yours' : undefined,
      group: 'hear',
      art: broker === 'village' ? 'farmhouse' : 'broker',
      room: 'departures',
    });
  }
  if (hasBoard(p) && !isMissionHall(p.id)) {
    const held = s.map?.postings.filter((x) => x.board === p.id && x.done).length ?? 0;
    out.push({
      id: 'board',
      seal: '榜',
      name: 'Bounty board',
      hanzi: '赏榜',
      sub: held ? `${held} to be paid here` : 'three postings a month',
      tag: held ? 'paid' : undefined,
      group: 'hear',
      art: 'board',
      room: 'board',
    });
  }
  if (info.bed !== null)
    out.push({
      id: 'bed',
      seal: '宿',
      name: kind === 'village' ? 'A bed in a barn' : 'Inn',
      hanzi: kind === 'village' ? '草棚' : '客栈',
      sub: `you sleep here by rule: ${info.bed} taels a night`,
      group: 'hear',
      art: kind === 'village' ? 'barn' : 'inn',
      room: 'teahouse',
    });
  return out;
}

// ---------------------------------------------------------------- the grid (city, town, Inside)

/** A door grid holds nine; a group past nine runs on in a second tab (A6, nothing scrolls). */
export const GRID = 9;

export interface Tab {
  key: string;
  label: string;
  hanzi: string;
  doors: Door[];
}

/** A group's doors in tabs of nine: Markets, Markets II. */
function paged(key: string, label: string, hanzi: string, doors: Door[]): Tab[] {
  const tabs: Tab[] = [];
  for (let i = 0; i < doors.length; i += GRID)
    tabs.push({
      key: i === 0 ? key : `${key}-${i / GRID + 1}`,
      label: i === 0 ? label : `${label} ${'I'.repeat(i / GRID + 1)}`,
      hanzi,
      doors: doors.slice(i, i + GRID),
    });
  return tabs;
}

/**
 * A city's or a town's tabs (Jadewater): Markets, Hear, hire and rest, Work (or Work and land).
 * The power seated there keeps its doors for its hall, one link at the tabs' end.
 */
export function gridTabs(doors: readonly Door[]): Tab[] {
  const of = (...g: DoorGroup[]) => doors.filter((d) => g.includes(d.group));
  const land = of('land').length > 0;
  return [
    ...paged('market', 'Markets', '市', of('market')),
    ...paged('hear', 'Hear, hire and rest', '闻', of('hear')),
    ...paged('work', land ? 'Work and land' : 'Work', '工', of('work', 'land')),
  ];
}

/** Inside a power (members only): every hall of it as a door card, in tabs of nine. */
export function insideTabs(doors: readonly Door[], power: string | null): Tab[] {
  const halls = doors.filter(
    (d) => d.group === 'hall' || d.group === 'work' || (d.group === 'power' && d.id !== 'gift'),
  );
  const label = power ? `${possessive(capitalize(theName(power)), '’')} halls` : 'The halls';
  return paged('inside', label, '内', halls);
}

// ---------------------------------------------------------------- the hall (a faction's seat)

/** The member's own tile: where the power's month with you is read (A6's talk, Jan's yes). */
export const SEAT_TILE: Door = {
  id: 'seat',
  seal: '席',
  name: 'Your seat',
  hanzi: '席位',
  sub: 'your rank, allowance, quota and leave',
  group: 'power',
  art: 'seat',
  room: 'hall',
};

/** The tile that opens Inside: the grid of the power's halls, members only. */
export const INSIDE_TILE: Door = {
  id: 'inside',
  seal: '内',
  name: 'Inside',
  hanzi: '内门',
  sub: 'members only',
  group: 'power',
  art: 'inside',
  room: 'hall',
};

/** A hall's front holds six tiles; more would crowd the row, and the rest are Inside. */
export const FRONT = 6;

/**
 * A hall's front (Cloudstep). An outsider meets what the power shows the world: its shop where it
 * sells outside, the way in, a gift, its examination hall and counter, a law hall that marked you,
 * the Mission hall dimmed and Inside dimmed. A member meets the ways they deal with it: their seat
 * first, the exchange hall, the Mission hall, the elders' hall, and Inside.
 */
export function hallFront(doors: readonly Door[], member: boolean): Door[] {
  const find = (id: string) => doors.find((d) => d.id === id);
  const shop = doors.filter((d) => d.group === 'hall' && d.room === 'trading');
  const markets = doors.filter((d) => d.group === 'market');
  const mission = find('board');
  if (member) {
    const tiles = [SEAT_TILE, ...shop, ...markets, mission, find('elders'), find('law-hall')];
    return [...tiles.filter((d): d is Door => !!d).slice(0, FRONT - 1), INSIDE_TILE];
  }
  const tiles = [
    ...shop,
    ...markets,
    find('join'),
    find('gift'),
    find('exam'),
    find('counter'),
    find('law-hall'),
    mission && { ...mission, later: true, sub: 'postings for members' },
  ].filter((d): d is Door => !!d);
  // What else an outsider may use here (a town's doors at a power's hall) waits a tile of its own.
  const open = doors.filter(
    (d) => !tiles.includes(d) && d !== mission && d.group !== 'power' && d.group !== 'hall',
  );
  return [...[...tiles, ...open].slice(0, FRONT - 1), { ...INSIDE_TILE, later: true }];
}

/** Whether you're a member of a power: its elders' hall knows you (a guest seat too). */
export function memberOf(s: GameState, power: string | null): boolean {
  return !!power && !!eldersHall(s, s.player.id, power);
}

// ---------------------------------------------------------------- village and wild site

/**
 * The strip along a village's or a wild site's bottom: its cards share the width, narrowing as
 * more come, up to ten (A6's talk: later phases add cards, P3.9's doors among them; never a new
 * layout, and never a scroll).
 */
export const STRIP_MOST = 10;

// ---------------------------------------------------------------- the preview

export interface Notable {
  name: string;
  keeper: string;
  trust: string;
}

/** A district's notable shops, their keepers and your trust with each (unknown till you've haggled). */
export function notables(s: GameState, d: MarketDoor): { notable: Notable[]; small: number } {
  const notable: Notable[] = [];
  let small = 0;
  for (const id of d.shops) {
    const sh = shopById(id);
    if (sh.small) {
      small = sh.weight;
      continue;
    }
    const k = keeperId(id);
    notable.push({
      name: sh.name,
      keeper: capitalize(keeperName(sh)),
      trust: s.world.kept[k] ? opinion(s.world, k, s.player.id, s.calendar.day).word : 'unknown',
    });
  }
  return { notable, small };
}

/** What a door sells, as the preview's tags. */
export function sellsTags(d: MarketDoor): string[] {
  const k = SHOP_KIND_INFO[d.kind];
  const st = STREETS[d.kind];
  const tags = st ? st.sells.split(/,? and |, /) : [k.name];
  if (k.repairs && !tags.some((t) => t.includes('mend'))) tags.push('mends gear');
  if (k.money === 'silver' && !tags.some((t) => t.includes('silver'))) tags.push('in silver');
  if (k.posted) tags.push('posted rates');
  if (k.members) tags.push('members');
  return tags.filter(Boolean);
}

/** The words that tie a market's gap line to a street (the preview shows it where it touches). */
const GAP_WORDS: Partial<Record<ShopKind, RegExp>> = {
  stall: /cop(y|ies)|mount|odd lot/i,
  alchemy: /pill|herb|alchem|elixir|poison|heal/i,
  refiner: /ore|steel|iron|refiner|gear|weapon|armou?r|blade|saber/i,
  talisman: /ink|talisman|paper|cinnabar/i,
  parts: /hide|horn|bone|beast|core|pelt|claw|fang/i,
  mortal: /grain|cloth|salt|rice|millet|mortal|food|oil/i,
  house: /import|trade|caravan/i,
  bounty: /core|bount/i,
};

/** Whether a market's gap line touches a door. */
export function gapTouches(line: string | null, d: MarketDoor | undefined): boolean {
  if (!line || !d) return false;
  return !!GAP_WORDS[d.kind]?.test(line);
}

/** The kinds a place screen lays out by (`placeKindOf`), with the hall layout for gate and hall. */
export type Layout = 'grid' | 'hall' | 'village' | 'site';

export function layoutOf(kind: PlaceKindId): Layout {
  if (kind === 'city' || kind === 'town') return 'grid';
  if (kind === 'hall' || kind === 'gate') return 'hall';
  return kind;
}
