// Laying and running arrays (K10, design § Sites and formations; content/formations.ts): an array
// from the Bag laid through placing in a site's slot or on open ground, the hand lifting its rarity
// (whole bands) and its strength (what is left), its eye charged from your purse; fed, taken up,
// burning its stones day by day wherever you are; a trap on open ground holding what walks in until
// you come to check it, and fought bound; the arrays on a fight's ground paying a day of stones a
// turn. core/arrays.ts reads them, core/placing.ts is the placing game.
import { TRAP } from '../content/formations.ts';
import { hasItem, item, itemKind, variantId, type ArrayUse } from '../content/items.ts';
import { RARITY_IDS, rarityRank, type RarityId } from '../content/rarity.ts';
import { template as rosterTemplate } from '../content/roster.ts';
import { RAIDERS } from '../content/dwellings.ts';
import {
  arrayBand,
  arrayName,
  arrayTier,
  arrayUse,
  burnOf,
  eyeHolds,
  fightArrays,
  gatheringSteps,
  running,
} from './arrays.ts';
import { fromCultivator } from './combat/combatant.ts';
import { fightEdge, isSure } from './combat/edge.ts';
import { onGround, startFight, type Fight } from './combat/fight.ts';
import { generateBeast } from './combat/generate.ts';
import { handLift } from './crafts.ts';
import {
  arraySlots as slotsHeld,
  dwellingById,
  dwellingHere,
  dwellingPlaceName,
  withDwelling,
} from './dwellings.ts';
import { kitOf } from './loot.ts';
import { bandAt } from './map/depth.ts';
import { bandRealm } from './map/encounters.ts';
import { gainItem } from './map/ground.ts';
import { areaAt, regionMap, type RegionMap } from './map/region.ts';
import type { FightEnd } from './played.ts';
import { pay, stonesOf, withStones, worthOf } from './purse.ts';
import { Rng } from './rng.ts';
import {
  addEvent,
  addItem,
  withPlayer,
  type Cultivator,
  type Dwelling,
  type GameState,
  type Ground,
  type LaidArray,
} from './state.ts';

type Done = { ok: true; state: GameState } | { ok: false; reason: string };
const no = (reason: string): Done => ({ ok: false, reason });

/** Where an array goes or stands: a dwelling's slot, or the open ground you stand on. */
export type Where = { dwelling: string } | { ground: string };

// ---------------------------------------------------------------- what you carry

export interface ArrayStack {
  /** The Bag's id: the thing at its rarity. */
  id: string;
  base: string;
  rarity: RarityId;
  n: number;
  use: ArrayUse;
}

/** The arrays in your Bag, a stack a thing and rarity. */
export function arraysCarried(c: Cultivator): ArrayStack[] {
  const out: ArrayStack[] = [];
  for (const [id, n] of Object.entries(c.items)) {
    if (n <= 0 || !hasItem(id)) continue;
    const it = item(id);
    if (itemKind(it) !== 'array' || !it.uses.array) continue;
    out.push({ id, base: it.id, rarity: it.rarity, n, use: it.uses.array });
  }
  return out;
}

/** The arrays you laid on open ground in the region you stand in, and those within reach. */
export function groundsHere(s: GameState): { all: Ground[]; near: Ground[] } {
  const life = s.map;
  if (!life) return { all: [], near: [] };
  const all = s.player.grounds.filter((g) => g.region === life.region);
  const near = all.filter(
    (g) => Math.hypot(g.at[0] - life.at[0], g.at[1] - life.at[1]) <= TRAP.reachLi,
  );
  return { all, near };
}

const groundById = (c: Cultivator, id: string) => c.grounds.find((g) => g.id === id) ?? null;
const withGround = (c: Cultivator, g: Ground): Cultivator => ({
  ...c,
  grounds: c.grounds.map((x) => (x.id === g.id ? g : x)),
});

/** The seed a spot's placing ground is drawn from: the lineage and the spot, so it reads the same. */
export function placingSeed(s: GameState, where: Where | 'here'): string {
  if (where !== 'here' && 'dwelling' in where) return `${s.lineage.id}/${where.dwelling}`;
  const at = s.map?.at ?? [0, 0];
  return `${s.lineage.id}/${s.map?.region ?? ''}/${Math.round(at[0] / 10)},${Math.round(at[1] / 10)}`;
}

// ---------------------------------------------------------------- laying

/** Why an array can't be laid at a dwelling you stand in, or on the ground here; null when it can. */
export function cantLay(
  s: GameState,
  at: { dwelling: string } | 'ground',
  thing: string,
): string | null {
  const c = s.player;
  if (!(c.items[thing] ?? 0) || !hasItem(thing) || !item(thing).uses.array)
    return 'You carry no such array.';
  const tier = item(thing).tier;
  if (worthOf(stonesOf(c)) < eyeHolds(tier))
    return `Its eye takes ${eyeHolds(tier)} low-grade stones to charge.`;
  if (at === 'ground') {
    if (!s.map || s.map.course) return 'Stop walking first.';
    if (s.map.inside) return 'Prepared ground is laid out in the open, not inside a place.';
    if (groundsHere(s).near.length) return 'One of your arrays already stands here.';
    return null;
  }
  const d = dwellingById(c, at.dwelling);
  if (!d || dwellingHere(s)?.id !== d.id) return 'You lay an array only where you stand.';
  const slots = slotsHeld(c, d);
  if (!slots) return 'Only land you claimed on a vein holds arrays.';
  if (d.arrays.length >= slots) return 'Every array slot here is taken.';
  return null;
}

/**
 * The rarity and strength a placing hand lays at: the hand's lift through Steady hands (the same
 * reach and Hand nodes as the bench's), its whole bands raising the rarity and what is left the
 * strength inside it. Nothing rolled.
 */
export function laidAt(
  c: Cultivator,
  rarity: RarityId,
  hand: number,
): { rarity: RarityId; strength: number } {
  const lift = handLift(c, 'formations', hand);
  const bands = Math.floor(lift + 1e-9);
  const rank = Math.min(RARITY_IDS.length - 1, rarityRank(rarity) + bands);
  const top = rank === RARITY_IDS.length - 1;
  return { rarity: RARITY_IDS[rank]!, strength: top ? 0 : Math.min(1, lift - bands) };
}

/** Lays an array from the Bag at a dwelling you stand in or on the open ground here. */
export function layArray(
  s: GameState,
  at: { dwelling: string } | 'ground',
  thing: string,
  hand: number,
): Done {
  const why = cantLay(s, at, thing);
  if (why) return no(why);
  const it = item(thing);
  const charge = eyeHolds(it.tier);
  const left = pay(stonesOf(s.player), charge);
  if (!left) return no(`Its eye takes ${charge} low-grade stones to charge.`);
  const day = s.calendar.day;
  const { rarity, strength } = laidAt(s.player, it.rarity, hand);
  const laid: LaidArray = {
    id: `arr-${Math.round(day * 1000)}-${s.player.grounds.length + s.player.dwellings.length}`,
    item: it.id,
    rarity,
    from: it.rarity,
    strength,
    stones: charge,
    laid: day,
  };
  let c = withStones(addItem(s.player, thing, -1), left);
  let line: { name: string; where: string };
  if (at === 'ground') {
    const life = s.map!;
    const g: Ground = {
      ...laid,
      region: life.region,
      at: [...life.at],
      held: null,
      asked: Math.floor(day),
    };
    c = { ...c, grounds: [...c.grounds, g] };
    line = { name: arrayName(laid), where: landName(s, life.at) };
  } else {
    const d = dwellingById(c, at.dwelling)!;
    c = withDwelling(c, { ...d, arrays: [...d.arrays, laid] });
    line = { name: arrayName(laid), where: dwellingPlaceName(s, d) };
  }
  const next = addEvent(withPlayer(s, c), 'dwelling', {
    what: 'laid',
    name: line.name,
    where: line.where,
    rarity,
  });
  return { ok: true, state: next };
}

/** The land a spot lies in, by name: its tract or kingdom, else the region. */
function landName(s: GameState, at: readonly [number, number]): string {
  return landIn(mapFor(s, s.map?.region ?? ''), at);
}

/** Where an array on open ground lies, by its land's name. */
export function groundWhere(s: GameState, g: Ground): string {
  return landIn(mapFor(s, g.region), g.at);
}

const landIn = (map: RegionMap | null, at: readonly [number, number]): string =>
  (map && areaAt(map, at)?.name) || map?.name || 'the wilds';

function mapFor(s: GameState, region: string): RegionMap | null {
  const gen = s.mapgen[region];
  return gen ? regionMap(gen) : null;
}

// ---------------------------------------------------------------- feeding and taking up

function arrayAt(c: Cultivator, where: Where, id: string): LaidArray | null {
  if ('dwelling' in where)
    return dwellingById(c, where.dwelling)?.arrays.find((a) => a.id === id) ?? null;
  const g = groundById(c, where.ground);
  return g && g.id === id ? g : null;
}

function withArray(c: Cultivator, where: Where, a: LaidArray): Cultivator {
  if ('dwelling' in where) {
    const d = dwellingById(c, where.dwelling)!;
    return withDwelling(c, { ...d, arrays: d.arrays.map((x) => (x.id === a.id ? a : x)) });
  }
  return withGround(c, { ...groundById(c, where.ground)!, ...a });
}

/** Whether you stand where an array is: inside its dwelling, or within reach of its ground. */
function standsAt(s: GameState, where: Where): boolean {
  if ('dwelling' in where) return dwellingHere(s)?.id === where.dwelling;
  return groundsHere(s).near.some((g) => g.id === where.ground);
}

/** What topping an array's eye up takes: what it lacks of full. */
export function feedCost(a: LaidArray): number {
  return Math.max(0, Math.round((eyeHolds(arrayTier(a)) - a.stones) * 100) / 100);
}

/** Tops an array's eye up from your purse, as far as the purse goes. Only where it stands. */
export function feedArray(s: GameState, where: Where, id: string): Done {
  const a = arrayAt(s.player, where, id);
  if (!a) return no('No such array.');
  if (!standsAt(s, where)) return no('You feed an array only where it stands.');
  const want = feedCost(a);
  if (want <= 0) return no('Its eye is full.');
  const have = worthOf(stonesOf(s.player));
  const give = Math.min(want, Math.floor(have * 100) / 100);
  const left = pay(stonesOf(s.player), give);
  if (!left || give <= 0) return no('You have no stones to give it.');
  const c = withArray(withStones(s.player, left), where, { ...a, stones: a.stones + give });
  return { ok: true, state: withPlayer(s, c) };
}

/** Takes an array up: its flags or disc back in the Bag at the rarity they were, its stones lost. */
export function takeUp(s: GameState, where: Where, id: string): Done {
  const a = arrayAt(s.player, where, id);
  if (!a) return no('No such array.');
  if (!standsAt(s, where)) return no('You take an array up only where it stands.');
  let c: Cultivator = s.player;
  if ('dwelling' in where) {
    const d = dwellingById(c, where.dwelling)!;
    c = withDwelling(c, { ...d, arrays: d.arrays.filter((x) => x.id !== id) });
  } else c = { ...c, grounds: c.grounds.filter((g) => g.id !== where.ground) };
  const r = gainItem(withPlayer(s, c), variantId(a.item, a.from), 1);
  return { ok: true, state: r.state };
}

// ---------------------------------------------------------------- the day

/**
 * Arrays across a stretch of days (at most a day): every eye burns what its array burns, a gathering
 * array past the vein double, a trap holding something five times; an eye run dry goes dark. Once a
 * day the world asks of each trap on open ground whether something walks across it.
 */
export function formationsDay(s: GameState, from: number, to: number): GameState {
  const c0 = s.player;
  if (!c0.grounds.length && !c0.dwellings.some((d) => d.arrays.length)) return s;
  const days = to - from;
  const dark: { name: string; where: string }[] = [];
  const caught: { name: string; where: string; took: string }[] = [];
  let c = c0;
  for (const d of c0.dwellings) {
    if (!d.arrays.length) continue;
    const past = gatheringSteps(d).pastCap;
    const arrays = d.arrays.map((a) => {
      if (!running(a)) return a;
      const gold = rarityRank(a.rarity) >= rarityRank('gold');
      const burn = burnOf(a, { pastCap: past && gold && arrayUse(a).does === 'gathering' }) * days;
      const stones = Math.max(0, a.stones - burn);
      if (stones <= 0) dark.push({ name: arrayName(a), where: dwellingPlaceName(s, d) });
      return { ...a, stones };
    });
    c = withDwelling(c, { ...d, arrays });
  }
  const grounds = c.grounds.map((g0) => {
    let g = g0;
    if (!running(g)) return g;
    g = { ...g, stones: Math.max(0, g.stones - burnOf(g, { holding: !!g.held }) * days) };
    // A held beast that eats the eye dry walks off.
    if (!running(g)) {
      dark.push({ name: arrayName(g), where: groundWhere(s, g) });
      return { ...g, held: null };
    }
    const u = arrayUse(g);
    if (u.does !== 'binding' || g.held) return { ...g, asked: Math.floor(to) };
    for (let day = g.asked + 1; day <= Math.floor(to); day++) {
      const map = mapFor(s, g.region);
      if (!map) break;
      // The world's roll, keyed by the spot and the day.
      const rng = Rng.fromString(`trap/${s.lineage.id}/${g.id}/${day}`);
      if (!rng.chance(TRAP.chance)) continue;
      const band = Math.max(0, bandAt(map, g.at));
      if (band <= arrayBand(g) + (u.beasts ?? 0)) {
        g = { ...g, held: { roster: RAIDERS.beast, band, since: day } };
        caught.push({
          name: arrayName(g),
          where: groundWhere(s, g),
          took: rosterTemplate(RAIDERS.beast).name.toLowerCase(),
        });
        break;
      }
      // Something stronger breaks through, and the eye's stones go with it.
      g = { ...g, stones: 0 };
      dark.push({ name: arrayName(g), where: groundWhere(s, g) });
      break;
    }
    return { ...g, asked: Math.floor(to) };
  });
  c = { ...c, grounds };
  let next = withPlayer(s, c);
  for (const l of dark) next = addEvent(next, 'dwelling', { what: 'dark', ...l });
  for (const l of caught) next = addEvent(next, 'dwelling', { what: 'trapped', ...l });
  return next;
}

// ---------------------------------------------------------------- a trap's catch

/** The beast a trap holds, built from the trap and the day it walked in, so a reload builds the same. */
function heldBeast(s: GameState, g: Ground) {
  const held = g.held!;
  const t = rosterTemplate(held.roster);
  const rng = Rng.fromString(`trap/${s.lineage.id}/${g.id}/beast/${held.since}`);
  const { realm, stage } = bandRealm(held.band, rng);
  return t.kind === 'beast'
    ? generateBeast(t, realm, stage, rng, { id: `trap-${g.id}`, side: 'them' })
    : null;
}

/** The fight with what a trap holds: you against it, bound on the trap's ground. */
export function trapFight(s: GameState, id: string): Fight | null {
  const g = groundById(s.player, id);
  if (!g?.held) return null;
  const beast = heldBeast(s, g);
  if (!beast) return null;
  const f = startFight([fromCultivator(s.player, 'you'), beast.combatant]);
  return onGround(f, fightArrays([g], 'you'));
}

/** Whether the trap's fight is a sure win, read as the road reads one. */
export function trapSure(s: GameState, id: string): boolean {
  const f = trapFight(s, id);
  if (!f) return false;
  const [me, ...foes] = f.combatants;
  return isSure(fightEdge(me!, foes, f.arrays));
}

/**
 * What a trap's catch comes to: won, its parts in your Bag and the trap set again; lost, it tears
 * free; fled or drawn off, it stays held.
 */
export function settleTrap(
  s: GameState,
  id: string,
  end: FightEnd,
): { state: GameState; text: string } {
  const g = groundById(s.player, id);
  if (!g?.held) return { state: s, text: '' };
  const name = rosterTemplate(g.held.roster).name.toLowerCase();
  if (end === 'won' || end === 'talked') {
    const beast = heldBeast(s, g);
    let next = withPlayer(s, withGround(s.player, { ...g, held: null }));
    if (beast)
      for (const [thing, n] of Object.entries(kitOf(beast).items))
        next = gainItem(next, thing, n).state;
    return {
      state: next,
      text: `The ${name} goes down inside the lines. You take what it carried, and set the disc again.`,
    };
  }
  if (end === 'lost' || end === 'yielded')
    return {
      state: withPlayer(s, withGround(s.player, { ...g, held: null })),
      text: `The ${name} tears free of the lines and is gone.`,
    };
  return { state: s, text: `You back off. The ${name} is still held.` };
}

/** Lets what a trap holds go; the trap stays set. */
export function letGo(s: GameState, id: string): Done {
  const g = groundById(s.player, id);
  if (!g?.held) return no('It holds nothing.');
  if (!groundsHere(s).near.some((x) => x.id === id)) return no('You let it go only where it is.');
  return { ok: true, state: withPlayer(s, withGround(s.player, { ...g, held: null })) };
}

/** The arrays on a played fight's ground pay a day's stones for every turn it ran (K10). */
export function burnFought(s: GameState, f: Fight): GameState {
  if (!f.arrays?.length || f.turn <= 0) return s;
  const ids = new Set(f.arrays.map((a) => a.id));
  const spend = (a: LaidArray): LaidArray =>
    ids.has(a.id)
      ? { ...a, stones: Math.max(0, a.stones - burnOf(a, { awake: true }) * f.turn) }
      : a;
  const c = s.player;
  const dwellings: Dwelling[] = c.dwellings.map((d) =>
    d.arrays.some((a) => ids.has(a.id)) ? { ...d, arrays: d.arrays.map(spend) } : d,
  );
  const grounds = c.grounds.map((g) => (ids.has(g.id) ? { ...g, ...spend(g) } : g));
  return withPlayer(s, { ...c, dwellings, grounds });
}
