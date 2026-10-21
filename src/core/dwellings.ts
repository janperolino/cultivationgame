// Dwellings and sites (design § Professions, people and powers: Sites and formations, Dwellings are
// sites; K9). One record for every place you live: a broker's room or chamber, a farmhouse, a
// courtyard, a medicine garden, a mansion, a cave on a city's spirit hill, your seat's quarters,
// and what you claim in the wild, a thatched hut, a cave abode on a vein you read, a hidden valley
// or a spirit mountain. At most one a place, and one of them is your abode. A dwelling stands at
// its land's qi density plus its steps (a chamber's small array, a vein's tier; K10's arrays), and
// seclusion reads the steps on O2's ladder. Its land is its plot slots, each a plot by K8's rules;
// its store a second grid opened only there. A site in the wild is found by its concealment and
// raided by its worth, and the land's beasts come for its raised qi and its old herbs.
import { SEAT_IDS } from '../content/organizations.ts';
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../content/calendar.ts';
import {
  CAVE_GROWS,
  DWELLINGS,
  LAPSED_KEEP_DAYS,
  QUARTERS,
  QUARTERS_NAMES,
  QUARTERS_OPEN_DAYS,
  RAIDS,
  RENT_PERIODS,
  STEP_MULT,
  STEP_PAST,
  BUNK_NAME,
  WORKS,
  type DwellingKind,
  type RentPeriod,
  type WorkId,
} from '../content/dwellings.ts';
import { PLOT } from '../content/farming.ts';
import { hasItem, item, stackSize, variantId } from '../content/items.ts';
import { hasJob, isHire, job } from '../content/jobs.ts';
import { veinAt } from '../content/map/index.ts';
import { realmScale } from '../content/realms.ts';
import { BANDS } from '../content/map/travel.ts';
import {
  alarmed,
  arraySlots as heldSlots,
  concealingBands,
  growingSteps,
  guardBand,
  stepsOf,
} from './arrays.ts';
import { ALARM_DAYS } from '../content/formations.ts';
import { isRipe } from './farming.ts';
import { bagStacks, splitsOf, stow } from './gear.ts';
import { inSphere } from './guarded.ts';
import { bandAt, edgeBand, qiAt } from './map/depth.ts';
import { raise } from './map/fog.ts';
import { placeKindOf } from './map/gate.ts';
import { ENTER_LI } from '../content/map/places.ts';
import { gainItem } from './map/ground.ts';
import {
  areaAt,
  onLand,
  placeById,
  terrainAt,
  type MapPlace,
  type RegionMap,
} from './map/region.ts';
import { mapOf, mapPlaceOf } from './map/travel.ts';
import { veinById, veinsKnown, type Vein } from './map/veins.ts';
import { houseOf, isOrganization, organization } from './orgs/identity.ts';
import { membershipsOf } from './orgs/membership.ts';
import { seatOf } from './orgs/seats.ts';
import { realmStageOf } from './orgs/trial.ts';
import { stats } from './stats.ts';
import { priceOf } from './prices.ts';
import { pay, stonesOf, withStones } from './purse.ts';
import { addStanding } from './resolver/opinion.ts';
import {
  addEvent,
  addItem,
  unlock,
  withPlayer,
  type Cultivator,
  type Dwelling,
  type GameState,
  type PendingCard,
  type Plot,
} from './state.ts';

type Done = { ok: true; state: GameState } | { ok: false; reason: string };
const no = (reason: string): Done => ({ ok: false, reason });

// ---------------------------------------------------------------- reading

export const dwellingById = (c: Cultivator, id: string): Dwelling | null =>
  c.dwellings.find((d) => d.id === id) ?? null;
export const dwellingAt = (c: Cultivator, place: string): Dwelling | null =>
  c.dwellings.find((d) => d.place === place) ?? null;

/** A rented dwelling whose rent has run out: its store kept a month, nothing else. */
export const lapsed = (d: Dwelling, day: number): boolean =>
  d.held === 'rented' && d.until !== null && day >= d.until;

/** Your abode, while you still hold it. */
export function abodeOf(c: Cultivator): Dwelling | null {
  return c.abode ? dwellingById(c, c.abode) : null;
}

/** Seclusion by steps above the land: ×1.1, ×1.3, ×1.6, ×2, then ×1.25 a step. */
export function stepMult(steps: number): number {
  if (steps <= 0) return 1;
  if (steps < STEP_MULT.length) return STEP_MULT[steps]!;
  return STEP_MULT[STEP_MULT.length - 1]! * STEP_PAST ** (steps - STEP_MULT.length + 1);
}

/** The dwelling you stand in: inside its place, no course set, its rent paid. */
export function dwellingHere(s: GameState): Dwelling | null {
  const inside = s.map?.inside;
  if (!inside || s.map?.course) return null;
  const d = dwellingAt(s.player, inside);
  return d && !lapsed(d, s.calendar.day) ? d : null;
}

/** The qi density a dwelling stands at on the ladder: its land's, its steps and its gathering arrays'. */
export function densityOf(s: GameState, d: Dwelling): number {
  const map = mapOf(s);
  const p = map ? placeById(map, d.place) : undefined;
  const land = map && p ? qiAt(map, [p.x, p.y]) : 3;
  return Math.min(9, land + stepsOf(d));
}

/** A dwelling's name: its kind's, or the seat's for your quarters. */
export function dwellingName(s: GameState, d: Dwelling): string {
  if (d.kind === 'quarters' && d.power) {
    const seat = seatOf(s.world, s.player.id, d.power, realmStageOf(s));
    if (organization(houseOf(d.power)).type === 'dynasty') return BUNK_NAME;
    return seat ? QUARTERS_NAMES[seat] : DWELLINGS.quarters.name;
  }
  return DWELLINGS[d.kind].name;
}

/**
 * A dwelling's name as a noun after "your" or "the": lowercased, with no article or "Your" of its
 * own ("barracks bunk", "cave", "spirit mountain"; the crafts checkpoint's "your a barracks bunk").
 */
export function dwellingNoun(s: GameState, d: Dwelling): string {
  return dwellingName(s, d)
    .replace(/^(a|an|the|your) /i, '')
    .toLowerCase();
}

/** Where a dwelling stands, by name: its town or seat, or for a site in the wild the land it is in. */
export function dwellingPlaceName(s: GameState, d: Dwelling): string {
  const map = mapOf(s);
  const p = map ? placeById(map, d.place) : undefined;
  if (!map || !p) return d.place;
  if (p.kind !== 'site') return p.name;
  return (p.area && map.byId.get(p.area)?.name) || map.name;
}

// ---------------------------------------------------------------- the store

/** Squares a store's things fill: a square a stack-full, times its bulk. */
export function storeUsed(items: Readonly<Record<string, number>>): number {
  let n = 0;
  for (const [id, k] of Object.entries(items)) {
    if (k <= 0 || !hasItem(id)) continue;
    const it = item(id);
    n += Math.ceil(k / stackSize(it)) * (it.bulk ?? 1);
  }
  return n;
}

/** Whether the store can be opened: you stand in it, or a lapsed lease still keeps it a month. */
function storeOpen(s: GameState, d: Dwelling): boolean {
  return s.map?.inside === d.place && !s.map.course && d.store > 0;
}

/** Sets one of the Bag's stacks in the store: the `at`-th stack of the item, whole. */
export function toStore(s: GameState, id: string, thing: string, at: number): Done {
  const d = dwellingById(s.player, id);
  if (!d || !storeOpen(s, d)) return no('The store opens only where it stands.');
  // A lapsed lease keeps the store a month for taking out, never for putting in.
  if (lapsed(d, s.calendar.day))
    return no('Your lease has run out: the store only gives back now.');
  const stack = bagStacks(s.player).filter((x) => x.id === thing)[at];
  if (!stack) return no('You hold no such stack.');
  const items = { ...d.items, [thing]: (d.items[thing] ?? 0) + stack.n };
  if (storeUsed(items) > d.store) return no('The store has no room for it.');
  let c = addItem(s.player, thing, -stack.n);
  if (stack.split !== null) {
    const splits = splitsOf(s.player, thing).filter((_, i) => i !== stack.split);
    c = { ...c, splits: { ...c.splits, [thing]: splits } };
  }
  return { ok: true, state: withPlayer(s, withDwelling(c, { ...d, items })) };
}

/** Takes a thing out of the store into the Bag, as many as it has room for. */
export function fromStore(s: GameState, id: string, thing: string): Done {
  const d = dwellingById(s.player, id);
  if (!d || !(storeOpen(s, d) || (lapsed(d, s.calendar.day) && s.map?.inside === d.place)))
    return no('The store opens only where it stands.');
  const n = d.items[thing] ?? 0;
  if (n <= 0) return no('There is none in the store.');
  const r = stow(s.player, thing, n);
  if (r.left === n) return no('Your pack has no room for it.');
  const items = { ...d.items, [thing]: r.left };
  if (r.left <= 0) delete items[thing];
  return { ok: true, state: withPlayer(s, withDwelling(r.c, { ...d, items })) };
}

// ---------------------------------------------------------------- holding

const withDwellings = (c: Cultivator, dwellings: Dwelling[]): Cultivator => ({ ...c, dwellings });
export const withDwelling = (c: Cultivator, d: Dwelling): Cultivator =>
  withDwellings(
    c,
    c.dwellings.some((x) => x.id === d.id)
      ? c.dwellings.map((x) => (x.id === d.id ? d : x))
      : [...c.dwellings, d],
  );

function fresh(kind: DwellingKind, place: string, day: number): Dwelling {
  const info = DWELLINGS[kind];
  return {
    id: `${kind}@${place}`,
    kind,
    place,
    held: 'claimed',
    until: null,
    period: null,
    steps: info.steps,
    slots: info.slots,
    store: info.store,
    items: {},
    built: [],
    work: null,
    since: day,
    power: null,
    raid: null,
    raided: null,
    arrays: [],
  };
}

/** Takes a dwelling in: your abode if you have none, and the Dwelling screen opens. */
function takeIn(s: GameState, d: Dwelling, line: string): GameState {
  let c = withDwelling(s.player, d);
  if (!abodeOf(c)) c = { ...c, abode: d.id };
  const next = addEvent(withPlayer(s, c), 'dwelling', {
    what: line,
    name: dwellingName(s, d),
    where: dwellingPlaceName(s, d),
  });
  return unlock(next, 'dwelling', true);
}

/** Makes a dwelling you hold your abode: home, and a free bed. */
export function makeAbode(s: GameState, id: string): Done {
  const d = dwellingById(s.player, id);
  if (!d || lapsed(d, s.calendar.day)) return no('You don’t hold it.');
  if (s.player.abode === id) return no('It is your abode already.');
  const next = withPlayer(s, { ...s.player, abode: id });
  return {
    ok: true,
    state: addEvent(next, 'dwelling', {
      what: 'abode',
      name: dwellingName(s, d),
      where: dwellingPlaceName(s, d),
    }),
  };
}

/** Drops a dwelling: its slots' plots end with it and its store's things are left behind. */
function drop(c: Cultivator, d: Dwelling): Cultivator {
  const plots = c.crafts.plots.filter((p) => !(p.held === 'slot' && p.place === d.place));
  const dwellings = c.dwellings.filter((x) => x.id !== d.id);
  const abode = c.abode === d.id ? (dwellings[0]?.id ?? null) : c.abode;
  return { ...c, dwellings, abode, crafts: { ...c.crafts, plots } };
}

/**
 * What giving a dwelling up costs, in words for the ask: its beds end with it, and its arrays and
 * store come with you where you stand in it, else stay behind. Null when nothing is lost.
 */
export function givingUpLoses(s: GameState, id: string): string | null {
  const d = dwellingById(s.player, id);
  if (!d) return null;
  const here = s.map?.inside === d.place;
  const beds = s.player.crafts.plots.filter((p) => p.held === 'slot' && p.place === d.place);
  const sown = beds.reduce((n, p) => n + p.beds.filter((b) => b !== null).length, 0);
  const stored = Object.values(d.items).reduce((n, k) => n + k, 0);
  const out: string[] = [];
  if (sown) out.push(`its ${sown} sown bed${sown === 1 ? '' : 's'} end with it`);
  if (!here && d.arrays.length)
    out.push(`its ${d.arrays.length} laid array${d.arrays.length === 1 ? '' : 's'} stay behind`);
  if (!here && stored) out.push('its store stays behind');
  if (here && (d.arrays.length || stored))
    out.push('its arrays and store come into your pack, what won’t fit set down here');
  return out.length ? out.join('; ') : null;
}

/**
 * Gives a dwelling up: a squatter's deed ends with it. A seat's quarters go only with the seat.
 * Standing in it, you take its arrays up and its store with you (review 2026-10-21).
 */
export function giveUp(s: GameState, id: string): Done {
  const d = dwellingById(s.player, id);
  if (!d) return no('You don’t hold it.');
  if (d.held === 'seat') return no('Your quarters go with your seat: ask to be released.');
  let next = withPlayer(s, drop(s.player, d));
  if (s.map?.inside === d.place) {
    for (const a of d.arrays) next = gainItem(next, variantId(a.item, a.from), 1).state;
    for (const [thing, n] of Object.entries(d.items)) next = gainItem(next, thing, n).state;
  }
  // The deed ends with the last claim on that power's land (review 2026-10-21).
  const squatsOn = (power: string) =>
    next.player.dwellings.some((x) => x.held === 'claimed' && x.power === power);
  if (d.held === 'claimed' && d.power && !squatsOn(d.power))
    next = { ...next, world: endSquat(next.world, s, d.power) };
  return {
    ok: true,
    state: addEvent(next, 'dwelling', {
      what: 'gave-up',
      name: dwellingName(s, d),
      where: dwellingPlaceName(s, d),
    }),
  };
}

function endSquat(w: GameState['world'], s: GameState, power: string): GameState['world'] {
  return {
    ...w,
    standing: w.standing.filter(
      (x) => !(x.power === power && x.about === s.player.id && x.row === 'squatting'),
    ),
  };
}

// ---------------------------------------------------------------- the broker 牙行

/** A richer place's prices run up the realm curve by its band (the Border Wilds' all ×1). */
export function priceScale(density: number): number {
  return Math.round(9 ** (Math.max(0, density - 3) / 3) * 100) / 100;
}

export interface Offer {
  kind: DwellingKind;
  name: string;
  hanzi: string;
  seal: string;
  line: string;
  steps: number;
  store: number;
  slots: number;
  /** Rent by period, and the price to buy, in low-grade stones here. */
  rent: { period: RentPeriod; price: number }[];
  buy: number | null;
  /** Why it can't be had now, or null. */
  why: string | null;
}

/** Whether a place has a broker: a town or a city; a village lets its farmhouses itself. */
export function brokerAt(p: MapPlace): 'broker' | 'village' | null {
  const k = placeKindOf(p);
  if (k === 'town' || k === 'city') return 'broker';
  if (k === 'village') return 'village';
  return null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** What the broker at a place lets and sells: more and better in a bigger and richer place. */
export function offersAt(s: GameState, p: MapPlace): Offer[] {
  const map = mapOf(s);
  const who = brokerAt(p);
  if (!map || !who) return [];
  const kind = placeKindOf(p);
  const scale = priceScale(qiAt(map, [p.x, p.y]));
  const vein = veinAt(p.id);
  const held = dwellingAt(s.player, p.id);
  const out: Offer[] = [];
  const add = (k: DwellingKind, o: Partial<Offer> = {}) => {
    const info = DWELLINGS[k];
    const city = kind === 'city';
    const base = {
      rent: Object.entries(info.rent ?? {}).map(([period, price]) => ({
        period: period as RentPeriod,
        price: round1(price! * scale * (k === 'courtyard' && city ? 1.5 : 1)),
      })),
      buy: info.buy ? round1(info.buy * scale * (k === 'courtyard' && city ? 1.5 : 1)) : null,
    };
    out.push({
      kind: k,
      name: info.name,
      hanzi: info.hanzi,
      seal: info.seal,
      line: info.line,
      steps: info.steps,
      store: info.store,
      slots: k === 'courtyard' && city ? 1 : info.slots,
      ...base,
      why: held ? `You hold ${dwellingName(s, held).toLowerCase()} here already.` : null,
      ...o,
    });
  };
  if (who === 'village') {
    add('farmhouse');
    return out;
  }
  add('room');
  add('chamber');
  add('courtyard');
  if (kind === 'town') add('garden');
  if (kind === 'city') {
    add('mansion');
    // The spirit hill's caves, where the city stands on a vein: its slope a tier 2 step, its crown
    // the vein's own, up the realm curve a tier past 2.
    if (vein >= 2) add('hill-cave', { steps: 2, slots: 3 });
    if (vein >= 3) {
      const price = round1(90 * 3 ** (vein - 2) * scale);
      add('crown-cave', {
        steps: vein,
        slots: 1 + vein,
        rent: [{ period: 'season', price }],
        line: `on the tier ${vein} vein itself, an elder’s peak for rent`,
      });
    }
  }
  return out;
}

/** Rents or buys from the broker where you stand. */
export function takeFromBroker(
  s: GameState,
  p: MapPlace,
  kind: DwellingKind,
  how: RentPeriod | 'bought',
): Done {
  const o = offersAt(s, p).find((x) => x.kind === kind);
  if (!o) return no('Nobody here lets that.');
  if (o.why) return no(o.why);
  if (s.map?.inside !== p.id) return no(`You aren’t in ${p.name}.`);
  const price = how === 'bought' ? o.buy : (o.rent.find((r) => r.period === how)?.price ?? null);
  if (price === null) return no('It isn’t had that way.');
  const left = pay(stonesOf(s.player), price);
  if (!left) return no(`It costs ${price} low, and your purse can’t cover it.`);
  const day = s.calendar.day;
  const d: Dwelling = {
    ...fresh(kind, p.id, day),
    held: how === 'bought' ? 'bought' : 'rented',
    until: how === 'bought' ? null : day + RENT_PERIODS[how],
    period: how === 'bought' ? null : how,
    steps: o.steps,
    slots: o.slots,
  };
  const paid = withPlayer(s, withStones(s.player, left));
  return { ok: true, state: takeIn(paid, d, how === 'bought' ? 'bought' : 'rented') };
}

/** A rent's price for another period, as the broker set it. */
export function rentPrice(s: GameState, d: Dwelling): number | null {
  if (d.held !== 'rented' || !d.period) return null;
  const map = mapOf(s);
  const p = map ? placeById(map, d.place) : undefined;
  if (!p) return null;
  const o = offersAt({ ...s, player: { ...s.player, dwellings: [] } }, p).find(
    (x) => x.kind === d.kind,
  );
  return o?.rent.find((r) => r.period === d.period)?.price ?? null;
}

/** Pays a rented dwelling a period ahead. */
export function payAhead(s: GameState, id: string): Done {
  const d = dwellingById(s.player, id);
  const price = d ? rentPrice(s, d) : null;
  if (!d || price === null || !d.period) return no('Nothing is owed on it.');
  const left = pay(stonesOf(s.player), price);
  if (!left) return no(`It costs ${price} low, and your purse can’t cover it.`);
  const from = Math.max(d.until ?? s.calendar.day, s.calendar.day);
  const next = { ...d, until: from + RENT_PERIODS[d.period] };
  return { ok: true, state: withPlayer(s, withDwelling(withStones(s.player, left), next)) };
}

// ---------------------------------------------------------------- claiming in the wild

export interface Claim {
  kind: DwellingKind;
  /** The site it makes or takes: a vein's, a found site's, or bare land where you stand. */
  vein?: Vein;
  site?: MapPlace;
  at: [number, number];
  /** The power whose sphere it lies in: claiming it is a deed against them. */
  power: string | null;
  /** Why it can't be claimed now, or null. */
  why: string | null;
}

/** The power whose sphere holds a spot, the nearest up its atlas parents. */
export function sphereAt(map: RegionMap, at: [number, number]): string | null {
  const ids = [
    ...map.places.filter((p) => p.kind === 'atlas').map((p) => p.id),
    ...map.areas.filter((a) => a.kind === 'kingdom').map((a) => a.id),
  ];
  for (const id of ids) {
    if (!isOrganization(id) || houseOf(id) !== id) continue;
    if (inSphere(id, at, map)) return id;
  }
  return null;
}

/**
 * The power a claim is a deed against: its sphere's, your own power's too, unless you hold its
 * elder seat or higher there (the crafts play checkpoint, Jan's call: an elder takes a cave freely).
 */
function squatOn(s: GameState, power: string | null): string | null {
  if (!power) return null;
  const seat = seatOf(s.world, s.player.id, power, realmStageOf(s));
  return seat && SEAT_IDS.indexOf(seat) >= SEAT_IDS.indexOf('elder') ? null : power;
}

/** Hidden-valley spots: falling water, a sinkhole, a herb valley. */
const VALLEY_SITES = new Set(['falls', 'herb-valley']);
const isValleySpot = (p: MapPlace) =>
  p.kind === 'site' && (VALLEY_SITES.has(p.sub) || /sinkhole/i.test(p.name));

/** A wild claim stands within a look's reach of where you stand. */
const CLAIM_LI = 60;

/**
 * What can be claimed where you stand: a vein you have read close by (a cave abode, or a spirit
 * mountain over a vein a tier above the land's), a found falls, sinkhole or herb valley you stand
 * in (a hidden valley), or the bare land under you (a thatched hut).
 */
export function claimsHere(s: GameState): Claim[] {
  const map = mapOf(s);
  const life = s.map;
  if (!map || !life) return [];
  const at = life.at;
  const out: Claim[] = [];
  const near = (x: number, y: number) => Math.hypot(x - at[0], y - at[1]) <= CLAIM_LI;
  const taken = (place: string) => s.player.dwellings.some((d) => d.place === place);
  for (const id of veinsKnown(life)) {
    const v = veinById(map, s.lineage.id, id);
    if (!v || !near(v.x, v.y)) continue;
    const madeId = `made:${v.id}`;
    // A site another life dug is theirs; one you gave up is yours to claim again.
    const mine = (s.mapgen[map.id]?.made ?? []).some(
      (m) => m.id === madeId && m.by === s.player.id,
    );
    const owned = !mine && map.places.some((p) => p.id === madeId);
    out.push({
      kind: v.tier > 1 ? 'mountain' : 'cave',
      vein: v,
      at: [v.x, v.y],
      power: squatOn(s, sphereAt(map, [v.x, v.y])),
      why: taken(madeId)
        ? 'You hold it already.'
        : owned
          ? 'Someone dug in here before you.'
          : null,
    });
  }
  const inside = life.inside ? placeById(map, life.inside) : undefined;
  if (inside && isValleySpot(inside))
    out.push({
      kind: 'valley',
      site: inside,
      at: [inside.x, inside.y],
      power: squatOn(s, sphereAt(map, [inside.x, inside.y])),
      why: taken(inside.id) ? 'You hold it already.' : null,
    });
  if (!life.inside && onLand(map, at)) {
    const near = (li: number, p: MapPlace) => Math.hypot(p.x - at[0], p.y - at[1]) < li;
    const settled = map.places.some((p) => p.kind !== 'site' && p.kind !== 'heart' && near(300, p));
    const stands = map.places.find((p) => near(ENTER_LI, p));
    out.push({
      kind: 'hut',
      at: [Math.round(at[0]), Math.round(at[1])],
      power: squatOn(s, sphereAt(map, at)),
      why: settled
        ? 'This land is a town’s: its broker lets courtyards.'
        : stands
          ? `${stands.name} stands here already.`
          : null,
    });
  }
  return out;
}

/** Claims what `claimsHere` offers at an index: free in the wild, a deed against a power in its sphere. */
export function claim(s: GameState, index: number): Done {
  const map = mapOf(s);
  const c0 = claimsHere(s)[index];
  if (!map || !s.map || !c0) return no('There is nothing here to claim.');
  if (c0.why) return no(c0.why);
  const day = s.calendar.day;
  let next = s;
  let place: string;
  if (c0.site) place = c0.site.id;
  else {
    // A hut, a cave abode or a spirit mountain is a site the world keeps after you.
    place = c0.vein ? `made:${c0.vein.id}` : `made:${Math.round(day)}:${c0.at[0]},${c0.at[1]}`;
    const sub = c0.kind === 'mountain' ? 'peak' : c0.kind === 'cave' ? 'cave' : 'hut';
    const name =
      c0.kind === 'mountain'
        ? 'A spirit mountain'
        : c0.kind === 'cave'
          ? 'A cave abode on a local vein'
          : 'A thatched hut';
    const area = areaAt(map, c0.at);
    const site = {
      id: place,
      sub: sub as 'peak' | 'cave' | 'hut',
      name,
      x: c0.at[0],
      y: c0.at[1],
      area: area?.id ?? null,
      terrain: terrainAt(map, c0.at),
      hidden: true,
      rating: 0,
      features: [],
      by: s.player.id,
      day,
    };
    const gen = s.mapgen[map.id]!;
    const made = [...(gen.made ?? []).filter((m) => m.id !== place), site];
    next = { ...next, mapgen: { ...next.mapgen, [map.id]: { ...gen, made } } };
    next = { ...next, map: raise(next.map!, place, 'seen') };
    const built = mapOf(next)!;
    site.rating = concealmentAt(built, placeById(built, place)!, DWELLINGS[c0.kind].hides ?? 0);
    // A fresh gen, so the map is built again with the rating rather than the 0 it was read with
    // (review 2026-10-21).
    next = { ...next, mapgen: { ...next.mapgen, [map.id]: { ...gen, made: [...made] } } };
  }
  const steps = c0.vein ? c0.vein.tier : 0;
  const slots = c0.kind === 'cave' ? DWELLINGS.cave.slots + steps : DWELLINGS[c0.kind].slots;
  const d: Dwelling = { ...fresh(c0.kind, place, day), steps, slots, power: c0.power };
  if (c0.power)
    next = {
      ...next,
      world: addStanding(
        next.world,
        { power: c0.power, about: s.player.id, row: 'squatting' },
        day,
      ),
    };
  return { ok: true, state: takeIn(next, d, 'claimed') };
}

/** The most slots a claimed dwelling grows to by clearing land. */
export function slotCap(d: Dwelling): number {
  if (d.kind === 'cave') return DWELLINGS.cave.slots + d.steps + CAVE_GROWS;
  return DWELLINGS[d.kind].grows ?? d.slots;
}

/** The array slots a dwelling's vein holds (K10 lays them): one at tier 1, one more a tier. */
export function arraySlots(c: Cultivator, d: Dwelling): number {
  return heldSlots(d, stats(c).arraysHeld ?? 0);
}

// ---------------------------------------------------------------- concealment, worth and raids

/**
 * A site's concealment, as a band: the land's edge band, what its spot gives (a cave a band,
 * a hidden valley two), a band more behind falls or in karst, and a band more for a hidden site.
 * A soul at that band or above finds it (the comparison looking around uses).
 */
export function concealmentAt(map: RegionMap, p: MapPlace, hides: number): number {
  const edge = Math.max(0, edgeBand(map, [p.x, p.y]));
  const water = p.sub === 'falls' || p.terrain === 'karst' || /sinkhole/i.test(p.name) ? 1 : 0;
  const hidden = p.kind === 'site' && p.hidden && !p.id.startsWith('made:') ? 1 : 0;
  return edge + hides + water + hidden;
}

export interface SiteRead {
  /** Its concealment band, and against beasts, a band less for each step of raised qi. */
  concealment: number;
  againstBeasts: number;
  /** The land's band where it stands: who comes looking. */
  land: number;
  worth: number;
  storeWorth: number;
  bedsWorth: number;
  /** The band its warding arrays turn away, against men and against beasts; −1 with none (K10). */
  guard: number;
  guardBeasts: number;
  /** A raider's month at the land's band: less than this isn't worth the walk. */
  wage: number;
  /**
   * The band a raider comes at, thief or beast (the crafts play checkpoint, Jan's call: "up to the
   * area and value"): the land's, and one above for a site worth ten raiders' months, or a beast for
   * a hundred-year bed; never more, so the area is the cap.
   */
  raider: number;
  beastRaider: number;
  /** The oldest bed in its slots, in years. */
  oldest: number;
  thievesFind: boolean;
  beastsFind: boolean;
  thievesCome: boolean;
  beastsDrawn: boolean;
  /** Guarded by a town's watch or a power's seat: raids by worth never come. */
  watched: boolean;
}

/** A band's realm's wage (30 low at Qi Condensation), up the realm curve. */
function wageAt(band: number): number {
  const b = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!;
  return RAIDS.wage * realmScale(b.realm);
}

const bedYears = (grown: number) => grown / DAYS_PER_YEAR;

/** How a site reads to the world: its concealment, worth and guard, and who would come. */
export function readSite(s: GameState, d: Dwelling): SiteRead | null {
  const map = mapOf(s);
  const p = map ? placeById(map, d.place) : undefined;
  if (!map || !p) return null;
  const watched = d.held !== 'claimed';
  const concealment = concealmentAt(map, p, DWELLINGS[d.kind].hides ?? 0) + concealingBands(d);
  const againstBeasts = Math.max(0, concealment - stepsOf(d));
  const land = Math.max(0, bandAt(map, [p.x, p.y]));
  let storeWorth = 0;
  for (const [id, n] of Object.entries(d.items)) if (hasItem(id)) storeWorth += priceOf(id) * n;
  let bedsWorth = 0;
  let oldest = 0;
  for (const plot of slotPlots(s.player, d)) {
    for (const b of plot.beds) {
      if (!b) continue;
      if (isRipe(b)) bedsWorth += priceOf(b.crop) * 10;
      oldest = Math.max(oldest, bedYears(b.grown));
    }
  }
  const worth = Math.round(storeWorth + bedsWorth);
  const wage = wageAt(land);
  const guard = guardBand(d, 'thieves');
  const guardBeasts = guardBand(d, 'beast');
  const thievesFind = land >= concealment;
  const beastsFind = land >= againstBeasts;
  const rich = worth >= RAIDS.rich * wage;
  const raider = land + (rich ? 1 : 0);
  const beastRaider = land + (rich || oldest >= RAIDS.oldBed[1]! ? 1 : 0);
  return {
    concealment,
    againstBeasts,
    land,
    worth,
    storeWorth: Math.round(storeWorth),
    bedsWorth: Math.round(bedsWorth),
    guard,
    guardBeasts,
    wage,
    raider,
    beastRaider,
    oldest,
    thievesFind,
    beastsFind,
    // A warding array turns raiders at its band or under (K10): the weaker turn from it.
    thievesCome: !watched && thievesFind && worth > wage && raider > guard,
    beastsDrawn: !watched && (stepsOf(d) > 0 || oldest >= RAIDS.oldBed[0]!),
    watched,
  };
}

/** The plots laid out in a dwelling's slots. */
export function slotPlots(c: Cultivator, d: Dwelling): Plot[] {
  return c.crafts.plots.filter((p) => p.held === 'slot' && p.place === d.place);
}

/** Lays out a plot in an empty slot of a dwelling you stand in: nine beds of plain earth. */
export function layOutPlot(s: GameState, id: string): Done {
  const d = dwellingById(s.player, id);
  if (!d || s.map?.inside !== d.place) return no('You lay out land only where it lies.');
  if (lapsed(d, s.calendar.day)) return no('Your lease has run out.');
  if (slotPlots(s.player, d).length >= d.slots) return no('Every slot holds a plot already.');
  const map = mapOf(s)!;
  const p = placeById(map, d.place)!;
  const day = s.calendar.day;
  const n = s.player.crafts.plots.filter((x) => x.place === d.place).length + 1;
  const plot: Plot = {
    id: `${d.place}#${n}-${Math.floor(day)}`,
    place: d.place,
    held: 'slot',
    until: d.held === 'rented' ? d.until : null,
    land: terrainAt(map, [p.x, p.y]),
    density: densityOf(s, d),
    soil: 0,
    beds: Array.from({ length: PLOT.beds }, () => null),
    there: day,
    pests: 0,
  };
  const c = {
    ...s.player,
    crafts: { ...s.player.crafts, plots: [...s.player.crafts.plots, plot] },
  };
  return { ok: true, state: withPlayer(s, c) };
}

/** The ripest bed's index in a dwelling's slot plots, or the oldest's. */
function pickBed(c: Cultivator, d: Dwelling, by: 'ripest' | 'oldest') {
  let best: { plot: string; bed: number; grown: number } | null = null;
  for (const plot of slotPlots(c, d))
    plot.beds.forEach((b, i) => {
      if (!b || (by === 'ripest' && !isRipe(b))) return;
      if (!best || b.grown > best.grown) best = { plot: plot.id, bed: i, grown: b.grown };
    });
  return best as { plot: string; bed: number; grown: number } | null;
}

function takeBed(c: Cultivator, at: { plot: string; bed: number } | null): Cultivator {
  if (!at) return c;
  const plots = c.crafts.plots.map((p) =>
    p.id === at.plot ? { ...p, beds: p.beds.map((b, i) => (i === at.bed ? null : b)) } : p,
  );
  return { ...c, crafts: { ...c.crafts, plots } };
}

/** Thieves left alone: a third of the store's worth, the dearest things first. */
export function thievesTake(c: Cultivator, d: Dwelling): { c: Cultivator; took: string[] } {
  const rows = Object.entries(d.items)
    .filter(([id, n]) => n > 0 && hasItem(id))
    .map(([id, n]) => ({ id, n, each: priceOf(id) }))
    .sort((a, b) => b.each - a.each);
  const total = rows.reduce((t, r) => t + r.each * r.n, 0);
  let want = total * RAIDS.share;
  const items = { ...d.items };
  const took: string[] = [];
  for (const r of rows) {
    if (want <= 0) break;
    const k = Math.min(r.n, Math.ceil(want / Math.max(0.01, r.each)));
    items[r.id] = r.n - k;
    if (items[r.id]! <= 0) delete items[r.id];
    want -= k * r.each;
    took.push(item(r.id).name);
  }
  return { c: takeBed(withDwelling(c, { ...d, items }), pickBed(c, d, 'ripest')), took };
}

/** The raid card's settling: what thieves or a beast take, or nothing when driven off. */
export function settleRaid(s: GameState, rid: number, outcome: 'taken' | 'driven'): GameState {
  const d = s.player.dwellings.find((x) => x.raid?.uid === rid);
  if (!d) return s;
  const cleared = { ...d, raid: null };
  if (outcome === 'driven') return withPlayer(s, withDwelling(s.player, cleared));
  const where = dwellingPlaceName(s, d);
  if (d.raid!.kind === 'thieves') {
    const r = thievesTake(s.player, d);
    const c = withDwelling(r.c, { ...dwellingById(r.c, d.id)!, raid: null });
    return addEvent(withPlayer(s, c), 'dwelling', {
      what: 'robbed',
      name: dwellingName(s, d),
      where,
      took: r.took.slice(0, 3).join(', ') || 'nothing worth the walk',
    });
  }
  const bed = pickBed(s.player, d, 'oldest');
  const plot = bed ? s.player.crafts.plots.find((p) => p.id === bed.plot) : null;
  const crop = plot?.beds[bed!.bed]?.crop;
  const c = withDwelling(takeBed(s.player, bed), cleared);
  return addEvent(withPlayer(s, c), 'dwelling', {
    what: 'grazed',
    name: dwellingName(s, d),
    where,
    took: crop && hasItem(crop) ? item(crop).name : 'nothing',
  });
}

/**
 * Queues a card where a system says it happens (K9's raids), never drawn: it waits in the feed
 * with its variables and its words, and settles by its default once its urgent days pass.
 */
function queueCard(
  s: GameState,
  id: string,
  vars: Record<string, number> = {},
  words: Record<string, string> = {},
): { state: GameState; uid: number } {
  const entry: PendingCard = { uid: s.cards.nextUid, card: id, day: s.calendar.day, vars, words };
  return {
    uid: entry.uid,
    state: {
      ...s,
      cards: {
        ...s.cards,
        pending: [...s.cards.pending, entry],
        drawn: { ...s.cards.drawn, [id]: s.calendar.day },
        nextUid: entry.uid + 1,
      },
    },
  };
}

/** Once a month the world asks of each site you hold in the wild: does anything find it and come? */
function raidsMonth(s: GameState, month: number): GameState {
  let next = s;
  for (const d of s.player.dwellings) {
    if (d.held !== 'claimed' || d.raid || d.raided === month) continue;
    const r = readSite(next, d);
    if (!r) continue;
    let kind: 'thieves' | 'beast' | null = null;
    let band = r.raider;
    if (r.thievesCome) kind = 'thieves';
    else if (r.beastsDrawn && r.beastsFind) {
      band = r.beastRaider;
      // Beasts turn from a ward at their band or above (K10).
      if (band > r.guardBeasts) kind = 'beast';
    }
    const marked = { ...dwellingById(next.player, d.id)!, raided: month };
    if (!kind) {
      next = withPlayer(next, withDwelling(next.player, marked));
      continue;
    }
    const here = next.map?.inside === d.place && !next.map.course ? 1 : 0;
    const q = queueCard(
      next,
      kind === 'thieves' ? 'raid-thieves' : 'raid-beast',
      // An alarm lets the card wait twice as long (K10).
      { here, band, ...(alarmed(d) ? { wait: ALARM_DAYS } : {}) },
      // `_place` lets the day step keep `here` true whenever you stand at the site (craftCardsHere).
      {
        site: dwellingName(next, d).toLowerCase(),
        where: dwellingPlaceName(next, d),
        _place: d.place,
      },
    );
    next = withPlayer(
      q.state,
      withDwelling(q.state.player, { ...marked, raid: { uid: q.uid, kind, band } }),
    );
  }
  return next;
}

// ---------------------------------------------------------------- your seat's quarters

/** Where a membership houses you: a sect's seat, or a dynasty's post (its barracks, its school). */
function quartersPlace(s: GameState, map: RegionMap, power: string): string | null {
  const house = houseOf(power);
  if (organization(house).type === 'dynasty') {
    for (const h of s.player.jobs) {
      if (!hasJob(h.id)) continue;
      const j = job(h.id);
      if (isHire(j) || !j.power || houseOf(j.power) !== house) continue;
      const p = j.place ? mapPlaceOf(map, j.place) : null;
      if (p) return p.id;
    }
    return null;
  }
  return placeById(map, power) ? power : null;
}

/**
 * Keeps your seat's quarters in step with your memberships: a member is housed by seat (the steps
 * capped by the place's vein, the store and the slots growing with the seat); a membership gone
 * takes its quarters, the footlocker handed back on a clean parting and forfeit otherwise.
 */
export function syncQuarters(s: GameState): GameState {
  const map = mapOf(s);
  if (!map) return s;
  const day = s.calendar.day;
  let c = s.player;
  const want = new Map<string, Dwelling>();
  for (const m of membershipsOf(s.world, s.player.id)) {
    if (m.guest || !isOrganization(m.power)) continue;
    const place = quartersPlace(s, map, m.power);
    if (!place) continue;
    // One a place: a room you already hold there serves (review 2026-10-21).
    if (c.dwellings.some((x) => x.place === place && x.held !== 'seat')) continue;
    const seat = seatOf(s.world, s.player.id, m.power, realmStageOf(s));
    if (!seat) continue;
    const q = QUARTERS[seat];
    const vein = Math.max(0, veinAt(place));
    const id = `quarters@${place}`;
    const had = dwellingById(c, id);
    want.set(id, {
      ...(had ?? fresh('quarters', place, day)),
      held: 'seat',
      power: m.power,
      steps: Math.min(q.steps, vein),
      store: Math.max(had?.store ?? 0, q.store),
      slots: q.slots,
    });
  }
  let next = s;
  for (const d of c.dwellings) {
    if (d.held !== 'seat' || want.has(d.id)) continue;
    // Parted: the footlocker comes with you on a clean parting, and stays on a betrayal.
    const last = [...s.world.standing]
      .filter((x) => x.power === houseOf(d.power ?? '') && x.about === s.player.id)
      .sort((a, b) => b.day - a.day)[0];
    c = drop(c, d);
    next = withPlayer(next, c);
    if (last?.row === 'parted')
      for (const [id, n] of Object.entries(d.items)) next = gainItem(next, id, n).state;
    c = next.player;
  }
  for (const d of want.values()) {
    const had = dwellingById(c, d.id);
    if (had && JSON.stringify(had) === JSON.stringify(d)) continue;
    c = withDwelling(c, d);
    if (!abodeOf(c)) c = { ...c, abode: d.id };
  }
  return c === s.player ? next : withPlayer(next, c);
}

// ---------------------------------------------------------------- building your own base

export interface WorkOffer {
  id: WorkId;
  name: string;
  line: string;
  days: number;
  low: number;
  why: string | null;
}

/** What can be built at a dwelling: land cleared, the store dug deeper, a quiet chamber. */
export function worksAt(d: Dwelling): WorkOffer[] {
  if (d.held !== 'claimed') return [];
  const busy = d.work ? 'Another work is under way.' : null;
  const out: WorkOffer[] = [];
  const cap = slotCap(d);
  out.push({
    id: 'clear',
    name: 'Clear land for a slot',
    line: `slot ${d.slots + 1} of ${cap} at most`,
    days: WORKS.clear.days,
    low: WORKS.clear.low,
    why: d.slots >= cap ? 'Its land is all cleared.' : busy,
  });
  const dig = WORKS.store.find((w) => w.from === d.store);
  out.push({
    id: 'store',
    name: 'Dig the store deeper',
    line: dig ? `${dig.from} → ${dig.to} squares` : 'as deep as it goes',
    days: dig?.days ?? 0,
    low: dig?.low ?? 0,
    why: dig ? busy : 'It is as deep as it goes.',
  });
  out.push({
    id: 'chamber',
    name: 'Cut a quiet chamber',
    line: `injuries mend ×${WORKS.chamber.mend} while you stay`,
    days: WORKS.chamber.days,
    low: WORKS.chamber.low,
    why: d.built.includes('chamber') ? 'It has one.' : busy,
  });
  return out;
}

/** Starts a work, paid now; it runs on the days you spend there. */
export function startWork(s: GameState, id: string, work: WorkId): Done {
  const d = dwellingById(s.player, id);
  const w = d ? worksAt(d).find((x) => x.id === work) : null;
  if (!d || !w) return no('Nothing like that can be built there.');
  if (w.why) return no(w.why);
  const left = pay(stonesOf(s.player), w.low);
  if (!left) return no(`It takes ${w.low} low of timber and stone.`);
  const c = withDwelling(withStones(s.player, left), { ...d, work: { id: work, left: w.days } });
  return { ok: true, state: withPlayer(s, c) };
}

function finishWork(d: Dwelling): Dwelling {
  switch (d.work?.id) {
    case 'clear':
      return { ...d, slots: d.slots + 1, work: null };
    case 'store': {
      const dig = WORKS.store.find((w) => w.from === d.store);
      return { ...d, store: dig?.to ?? d.store, work: null };
    }
    case 'chamber':
      return { ...d, built: [...d.built, 'chamber'], work: null };
    default:
      return { ...d, work: null };
  }
}

// ---------------------------------------------------------------- the day step

/** Days a rented dwelling's lapsed store is kept, then sold for the debt. */
const keptUntil = (d: Dwelling) => (d.until ?? 0) + LAPSED_KEEP_DAYS;

/**
 * Dwellings across a stretch of days (at most a day): rent comes off the purse as its time turns
 * (or the lease runs out, the store kept a month), the work under way goes on while you're there,
 * a quiet chamber mends injuries faster, the quarters follow your seat, slot plots read their
 * dwelling's density, and once a month the world asks whether anything finds a wild site and comes.
 */
export function dwellingsDay(s0: GameState, from: number, to: number): GameState {
  const s = syncQuarters(s0);
  if (!s.player.dwellings.length) return s;
  const here = dwellingHere(s);
  const lines: { what: string; d: Dwelling; work?: string }[] = [];
  let c = s.player;
  for (const d0 of s.player.dwellings) {
    let d = d0;
    // Rent: paid on by the period while the purse covers it; else the lease runs out.
    if (d.held === 'rented' && d.until !== null && to >= d.until && from < d.until) {
      const price = rentPrice({ ...s, player: c }, d);
      const left = price !== null ? pay(stonesOf(c), price) : null;
      if (left && d.period) {
        c = withStones(c, left);
        d = { ...d, until: d.until + RENT_PERIODS[d.period] };
      } else {
        // Its slots' plots end with the lease, and it is no one's abode; its store is kept a month.
        c = {
          ...c,
          abode: c.abode === d.id ? null : c.abode,
          crafts: {
            ...c.crafts,
            plots: c.crafts.plots.filter((p) => !(p.held === 'slot' && p.place === d.place)),
          },
        };
        lines.push({ what: 'lapsed', d });
      }
    }
    if (lapsed(d, to) && to >= keptUntil(d)) {
      c = drop(c, d);
      continue;
    }
    if (here?.id === d.id && d.work) {
      const left = d.work.left - (to - from);
      if (left <= 0) {
        lines.push({ what: 'built', d, work: d.work.id });
        d = finishWork(d);
      } else d = { ...d, work: { ...d.work, left } };
    }
    c = withDwelling(c, d);
    // Plots in its slots read its density, and its growing arrays' steps on top (K10).
    const density = Math.min(9, densityOf(s, d) + growingSteps(d));
    if (slotPlots(c, d).some((p) => p.density !== density))
      c = {
        ...c,
        crafts: {
          ...c.crafts,
          plots: c.crafts.plots.map((p) =>
            p.held === 'slot' && p.place === d.place ? { ...p, density } : p,
          ),
        },
      };
  }
  if (!abodeOf(c)) {
    const live = c.dwellings.find((d) => !lapsed(d, to));
    c = { ...c, abode: live?.id ?? null };
  }
  // A quiet chamber mends injuries ×1.5 while you stay.
  if (here?.built.includes('chamber')) {
    const extra = (to - from) * (WORKS.chamber.mend - 1);
    for (const l of ['qi', 'body', 'soul'] as const)
      if (c[l].injuredUntil > to)
        c = { ...c, [l]: { ...c[l], injuredUntil: Math.max(to, c[l].injuredUntil - extra) } };
  }
  let next = withPlayer(s, c);
  for (const l of lines)
    next = addEvent(next, 'dwelling', {
      what: l.what,
      name: dwellingName(next, l.d),
      where: dwellingPlaceName(next, l.d),
      ...(l.work ? { work: l.work } : {}),
    });
  // A raid's card reads whether you stand there now, so you can face them if you came back.
  next = markHere(next);
  const m0 = Math.floor(from / DAYS_PER_MONTH);
  const m1 = Math.floor(to / DAYS_PER_MONTH);
  if (m1 > m0) next = raidsMonth(next, m1);
  return next;
}

/** Sets each waiting raid card's `here`: whether you stand at its site with no course set. */
function markHere(s: GameState): GameState {
  const raids = s.player.dwellings.filter((d) => d.raid);
  if (!raids.length) return s;
  const pending = s.cards.pending.map((p) => {
    const d = raids.find((x) => x.raid!.uid === p.uid);
    if (!d) return p;
    const here = s.map?.inside === d.place && !s.map.course ? 1 : 0;
    return p.vars?.here === here ? p : { ...p, vars: { ...p.vars, here } };
  });
  return { ...s, cards: { ...s.cards, pending } };
}

/** Whether the Dwelling screen opens: a dwelling you took, or a month at your seat's quarters. */
export function dwellingOpens(s: GameState): boolean {
  return s.player.dwellings.some(
    (d) => d.held !== 'seat' || s.calendar.day - d.since >= QUARTERS_OPEN_DAYS,
  );
}

/** Days of rent left, or null when it isn't rented. */
export function rentLeft(d: Dwelling, day: number): number | null {
  return d.held === 'rented' && d.until !== null ? Math.max(0, Math.ceil(d.until - day)) : null;
}

/** A band's name: what lives there, "Qi Condensation 4–6". */
export function bandName(band: number): string {
  const b = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!;
  return b.realm === 'qi-condensation'
    ? `Qi Condensation ${b.name.replace('layers ', '').replace(' to ', '–')}`
    : b.name;
}
