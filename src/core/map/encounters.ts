// Encounters on the map (design § The world, Encounters on the map, Scene templates; § The
// resolver, Away and the idle half; P3.7's talk). The road's notice fills as you move and an
// encounter comes when it is full: a template picked by the kind's shares, where you stand and the
// band, its people regenerated from its seed. It shows at the edge of your sight ahead on your
// course, or springs on you when your Perception falls short of its Stealth, or has found you first
// when its Perception is a realm beyond your Stealth. Your stance settles it on the engine by the
// resolver's verdicts, with no dice; anything the stance can't settle waits as a card and stops the
// course. Nobody dies on the map.
import { ENCOUNTERS, encounterTemplate } from '../../content/encounters/index.ts';
import { MORTALS } from '../../content/encounters/mortals.ts';
import {
  COVER_HELP,
  CONTACT_LI,
  GO_ROUND_LI,
  HIDING_DAYS,
  KIND_SHARES,
  MAX_AHEAD,
  NIGHT_HOURS,
  NIGHT_SHIFT,
  NOTICE_CAMP,
  NOTICE_FLYING,
  NOTICE_GROUP,
  NOTICE_HEAT,
  NOTICE_NIGHT,
  NOTICE_OFF,
  NOTICE_ROAD,
  NOTICE_THRESHOLD,
  ROAD_PEOPLE_SPREAD,
  ROBBED_SHARE,
  SHORT_WOUND,
  RECENT_LINES,
  TOWN_PEACE_LI,
  RECENT_WEIGHT,
  WEAK_LOOKING,
} from '../../content/encounters/pace.ts';
import {
  ENCOUNTER_KINDS,
  type EncounterKind,
  type Exit,
  type ExitOutcome,
  type Role,
  type Stake,
  type Template,
} from '../../content/encounters/schema.ts';
import { hasItem, item, rarityRange, variantId } from '../../content/items.ts';
import { BANDS, CLOSED_TERRAINS, ROAD_ROUTINES } from '../../content/map/travel.ts';
import { RARITY_IDS, type RarityId } from '../../content/rarity.ts';
import { realm as realmInfo, realmIndex, REALMS, type RealmId } from '../../content/realms.ts';
import { CLOSE_WOUND } from '../../content/resolver.ts';
import { template as rosterTemplate } from '../../content/roster.ts';
import { hasCopy } from '../../content/copies.ts';
import { startFight, preview, type Fight } from '../combat/fight.ts';
import { edgeWords, fightEdge, isSure } from '../combat/edge.ts';
import { hpLost, openFight, type FightEnd } from '../played.ts';
import type { Combatant } from '../combat/combatant.ts';
import { generateBeast, generateCultivator, generatePack } from '../combat/generate.ts';
import type { Npc } from '../combat/generate.ts';
import { kitOf } from '../loot.ts';
import { asMember, isOrganization } from '../organizations.ts';
import { GUARDED, LAW_HALL_PARTY } from '../../content/organizations.ts';
import {
  artCopy,
  lawHallAt,
  lawHallBand,
  lawHallRoster,
  liftByPaying,
  seenUsing,
  yourMark,
} from '../guarded.ts';
import {
  canPay,
  pay,
  realmGrade,
  receive,
  spend,
  stonesOf,
  takeShare,
  withStones,
} from '../purse.ts';
import { nameOf, personSlots } from '../people.ts';
import { hashSeed, Rng } from '../rng.ts';
import {
  actorFromCultivator,
  actorFromNpc,
  lowestShown,
  plainActor,
  sizeAt,
  YOU,
  type Actor,
} from '../resolver/actor.ts';
import { capability, isBeyond, readRealm, verdict, type Verdict } from '../resolver/check.ts';
import { applyEffects } from '../resolver/effects.ts';
import { grudges } from '../resolver/opinion.ts';
import { step } from '../resolver/plan.ts';
import { checkFor, startScene, type Scene, type SceneFeature } from '../resolver/scene.ts';
import { endState, heatOf, startState, statesOf, type RealmStage } from '../resolver/world.ts';
import { addEvent, addItem, itemCount, withPlayer, withStream, type GameState } from '../state.ts';
import { seasonOf } from '../chronicle.ts';
import { bandAt, edgeBand } from './depth.ts';
import type { Pt } from './geometry.ts';
import { known, raise, sightAt } from './fog.ts';
import { bedAt } from './gate.ts';
import { areaAt, terrainAt, type RegionMap } from './region.ts';
import { nearRoad } from './route.ts';
import { gainItem } from './ground.ts';
import type { Encounter, MapLife, Stance } from './schema.ts';

/** The fight's edge lives with the combat rules, since a card's fight reads it too. */
export { fightEdge, type FightEdge } from '../combat/edge.ts';

// ---------------------------------------------------------------- hooks

let copyGain: (s: GameState, id: string) => GameState = (s) => s;

/** How a copy in the loot comes home: life.ts registers `gainCopy`, so a copy never goes in the Bag. */
export function setCopyGain(f: (s: GameState, id: string) => GameState): void {
  copyGain = f;
}

// ---------------------------------------------------------------- bands and people

/** The realm and stage a band's people stand at, seeded within its third. */
export function bandRealm(band: number, rng: Rng): { realm: RealmId; stage: number } {
  const b = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!;
  const stages = realmInfo(b.realm).stages;
  if (b.third === null) return { realm: b.realm, stage: rng.int(1, stages) };
  const inThird: number[] = [];
  for (let s = 1; s <= stages; s++)
    if (Math.min(3, Math.max(1, Math.ceil((s * 3) / stages))) === b.third) inThird.push(s);
  return { realm: b.realm, stage: rng.pick(inThird.length ? inThird : [1]) };
}

export interface Met {
  enc: Encounter;
  template: Template;
  you: Actor;
  /** Everyone the template's roles brought, on the encounter's side. */
  actors: Actor[];
  /** By actor id: the NPC behind a generated actor, for their kit. */
  npcs: Record<string, Npc>;
  /** By role id: its actors. */
  roles: Record<string, Actor[]>;
  scene: Scene;
}

const THEM = 'them';

function roleActors(s: GameState, enc: Encounter, role: Role, npcs: Record<string, Npc>): Actor[] {
  const rng = new Rng(hashSeed(`${enc.id}/${enc.seed}/${role.id}`));
  const at = bandRealm(Math.max(0, enc.band + (role.band ?? 0)), rng);
  const who = role.who;
  const idOf = (i: number) => `${enc.id}:${role.id}:${i + 1}`;
  if ('roster' in who) {
    const t = rosterTemplate(who.roster);
    if (t.kind === 'beast') {
      const pack = role.count
        ? Array.from({ length: rng.int(role.count[0], role.count[1]) }, (_, i) =>
            generateBeast(t, at.realm, at.stage, rng, { id: idOf(i), side: THEM }),
          )
        : generatePack(t, at.realm, at.stage, rng, THEM).map((n, i) => ({
            ...n,
            combatant: { ...n.combatant, id: idOf(i) },
          }));
      return pack.map((n) => {
        npcs[n.combatant.id] = n;
        return actorFromNpc(n, { name: role.name });
      });
    }
    const n = role.count ? rng.int(role.count[0], role.count[1]) : 1;
    return Array.from({ length: n }, (_, i) => {
      const npc = generateCultivator(t, at.realm, at.stage, rng, { id: idOf(i), side: THEM });
      npcs[idOf(i)] = npc;
      return actorFromNpc(npc, { name: role.name });
    });
  }
  if ('mortal' in who) {
    const n = role.count ? rng.int(role.count[0], role.count[1]) : 1;
    return Array.from({ length: n }, (_, i) =>
      plainActor({ id: idOf(i), name: role.name, side: THEM }),
    );
  }
  // The hunting power's law hall: its own disciples, as many as the hunt sends (O5).
  if ('lawHall' in who) {
    const roster = enc.power ? lawHallRoster(enc.power) : null;
    const t = roster ? rosterTemplate(roster) : null;
    if (!t || t.kind !== 'cultivator') return [];
    const ch = encounterTemplate(enc.template).where.lawHall ?? 1;
    return Array.from({ length: LAW_HALL_PARTY[ch].count }, (_, i) => {
      const npc = generateCultivator(t, at.realm, at.stage, rng, { id: idOf(i), side: THEM });
      npcs[idOf(i)] = npc;
      return actorFromNpc(npc, { name: role.name });
    });
  }
  // A person the world keeps: the one with a grudge, or someone from home.
  const person = plotPerson(s, who.person);
  const t = rosterTemplate(who.person === 'grudge' ? 'garrison-deserter' : 'march-conscript');
  if (t.kind !== 'cultivator') return [];
  const npc = generateCultivator(t, at.realm, at.stage, rng, { id: idOf(0), side: THEM });
  npcs[idOf(0)] = npc;
  return [actorFromNpc(npc, { name: person ? nameOf(s, person) : role.name })];
}

/** Who a plot's role is: the first who holds a grudge, or the first of your origin's people. */
export function plotPerson(s: GameState, needs: 'grudge' | 'home'): string | null {
  if (needs === 'grudge') return grudges(s.world, s.player.id, s.calendar.day)[0]?.who ?? null;
  return Object.values(personSlots(s.player))[0] ?? null;
}

const FAVORS: Partial<Record<string, SceneFeature['favors']>> = {
  cover: ['stealth'],
  dark: ['stealth'],
  height: ['perception'],
};

/** The encounter's people and its scene, regenerated from its seed. */
export function meet(s: GameState, enc: Encounter): Met {
  const template = encounterTemplate(enc.template);
  const npcs: Record<string, Npc> = {};
  const roles: Record<string, Actor[]> = {};
  const actors: Actor[] = [];
  // Each stands as their power stands behind them: named, backed, its talisman carried (O3).
  for (const r of template.roles) {
    const a = roleActors(s, enc, r, npcs).map((x) => asMember(s.world, x));
    roles[r.id] = a;
    actors.push(...a);
  }
  const you = asMember(s.world, actorFromCultivator(s));
  const features: SceneFeature[] = template.place.features.map((f, i) => ({
    id: `f${i + 1}`,
    name: f.name,
    tags: [...f.tags],
    favors: [...new Set(f.tags.flatMap((t) => FAVORS[t] ?? []))],
  }));
  const scene = startScene({
    place: enc.id,
    region: s.map?.region,
    kind: 'wilds',
    traffic: template.place.traffic,
    danger: bandRealm(Math.max(0, enc.band), new Rng(enc.seed)),
    features,
    actors: [you, ...actors],
    players: [you.id],
  });
  return { enc, template, you, actors, npcs, roles, scene };
}

// ---------------------------------------------------------------- what you can judge

export interface ExitView {
  i: number;
  exit: Exit;
  /** The true verdict, which decides. */
  verdict: Verdict;
  /** What your character can judge: "?" against what you can't read. */
  judged: Verdict | '?';
  /** "you'd need 4 exchanges, they need 7"; "Stealth against their noses". */
  why: string;
  /** Why it can't be chosen now. */
  refused: string | null;
  tried: boolean;
  /** An escape talisman the flee burns to come clear (K5), by rule. */
  burns?: string;
  /** A fight that is a sure win (Fights you play): it resolves on its own; anything less is played. */
  sure?: boolean;
}

function faced(m: Met, e: Exit): Actor[] {
  const id = e.against ?? m.template.roles[0]?.id;
  if (!id) return [];
  return e.road === 'fight' ? m.actors : (m.roles[id] ?? []);
}

/** Whether you can read every one of them: a fight against what you can't read is "?". */
function readsAll(you: Actor, them: readonly Actor[]): boolean {
  return them.every((t) => readRealm(you, t).kind !== 'beyond');
}

export function exitViews(s: GameState, m: Met): ExitView[] {
  return m.template.exits.map((exit, i) => withEscape(s, m, exitView(s, m, exit, i)));
}

/**
 * A flee that would fall short burns an escape talisman by rule (K5, Earth Escape 土遁符), the
 * lowest that reaches the tier of whoever it flees, and comes clear.
 */
function withEscape(s: GameState, m: Met, v: ExitView): ExitView {
  if (v.exit.act !== 'flee' || v.verdict === 'clear' || v.refused) return v;
  const top = Math.max(1, ...faced(m, v.exit).map((a) => tierOfRealm(realmOfTop(a))));
  const tal = Object.keys(s.player.items)
    .filter(
      (id) =>
        itemCount(s.player, id) > 0 && hasItem(id) && item(id).uses.escape && item(id).tier >= top,
    )
    .sort((a, b) => item(a).tier - item(b).tier)[0];
  if (!tal) return v;
  const it = item(tal);
  return {
    ...v,
    verdict: 'clear',
    judged: 'clear',
    why: `an ${it.name} burned: you go through the ${it.uses.escape!.through}`,
    burns: tal,
  };
}

function exitView(s: GameState, m: Met, exit: Exit, i: number): ExitView {
  const tried = m.enc.tried.includes(i);
  let refused: string | null = tried ? 'Tried, and it fell short: nothing has changed.' : null;
  if (exit.cost?.stones && !canPay(stonesOf(s.player), exit.cost.stones))
    refused = `It costs ${exit.cost.stones} low-grade stones.`;
  if (exit.cost?.item && itemCount(s.player, exit.cost.item) <= 0)
    refused = `You have no ${hasItem(exit.cost.item) ? item(exit.cost.item).name : exit.cost.item}.`;
  // The law hall's fine is taken only from a face it marked, at cold and up; while it knows your
  // face it won't let you walk on (O5).
  const fines = [exit.pass, exit.close, exit.short].some((o) =>
    o?.stakes?.some((k) => k.do === 'fine'),
  );
  const mark = m.template.where.lawHall && m.enc.power ? yourMark(s, m.enc.power) : null;
  if (fines && !refused) {
    if (!mark) refused = 'They hold nothing against you.';
    else if (mark.onSight) refused = 'They won’t take a fine from you now.';
    else if (!canPay(stonesOf(s.player), mark.fine)) refused = `The fine is ${mark.fineWords}.`;
  }
  if (mark && exit.road === 'pass' && !refused)
    refused = 'They know your face; they won’t let you walk on.';
  const them = faced(m, exit);
  if (exit.road === 'fight') {
    const edge = fightEdge(m.you.combatant!, them.map((a) => a.combatant!).filter(Boolean));
    const reads = readsAll(m.you, them);
    const judged = reads ? edge.verdict : '?';
    const why = judged === '?' ? 'fight · you can’t read them' : `fight · ${edgeWords(edge)}`;
    return {
      i,
      exit,
      verdict: edge.verdict,
      judged,
      why,
      refused,
      tried,
      sure: isSure(edge, reads),
    };
  }
  if (exit.road === 'take' || exit.road === 'pass' || exit.road === 'deal') {
    const why =
      exit.road === 'deal'
        ? fines
          ? mark
            ? `the fine: ${mark.fineWords}${mark.slip ? ' and the slip' : ''}`
            : 'a fine'
          : exit.cost?.stones
            ? `${exit.cost.stones} low-grade stones`
            : exit.cost?.item
              ? `one ${hasItem(exit.cost.item) ? item(exit.cost.item).name : exit.cost.item}`
              : 'a deal'
        : exit.road === 'take'
          ? 'an hour off your road'
          : 'walk on';
    return { i, exit, verdict: 'clear', judged: 'clear', why, refused, tried };
  }
  const target = them[0];
  const check = checkFor(
    s,
    m.scene,
    m.you,
    step(exit.act, target && exit.road === 'talk' ? { target: target.id } : {}),
  );
  if (!check)
    return {
      i,
      exit,
      verdict: 'clear',
      judged: 'clear',
      why: 'nothing stands against it',
      refused,
      tried,
    };
  const words: Record<string, string> = {
    sneak: 'Stealth against their senses',
    hide: 'Stealth with the cover against their senses',
    flee: 'Speed against theirs',
    threaten: 'your presence against their nerve',
  };
  const why =
    words[exit.act] ??
    (exit.road === 'talk' ? 'a talk: what you bring against what stands against it' : '');
  return { i, exit, verdict: check.verdict, judged: check.judged, why, refused, tried };
}

// ---------------------------------------------------------------- the stance

/** Whether the encounter must wait for you whatever your stance: a kept person, a plot. */
export function isBig(t: Template): boolean {
  return t.kind === 'plot' || t.roles.some((r) => r.big);
}

/**
 * The exit your stance takes, or null when it can't settle it (P3.7's talk). Avoid slips away,
 * takes finds and walks on; Careful hunts the sure kills too; Bold takes clear or close. No stance
 * talks or spends, and the big things always wait. Gathering is the gather hour's (O4): a stance
 * gathers a find only on a road wheel that keeps one, and otherwise leaves it.
 */
export function stancePick(
  t: Template,
  views: readonly ExitView[],
  stance: Stance,
  gathers = true,
): number | null {
  if (isBig(t)) return null;
  const ok = (v: Verdict | '?') => v === 'clear' || (stance === 'bold' && v === 'close');
  const roads = stance === 'avoid' ? ['slip', 'take', 'pass'] : ['fight', 'slip', 'take', 'pass'];
  for (const v of views) {
    if (v.refused || v.exit.big || !roads.includes(v.exit.road)) continue;
    if (!gathers && v.exit.act === 'gather') continue;
    if (ok(v.judged)) return v.i;
  }
  return null;
}

/**
 * What your stance does with a card while you're there (Fights you play): it settles its pick,
 * unless the pick is a fight that isn't a sure win, which Bold goes into on the stage and Careful
 * leaves waiting for you. Away, every pick settles by its verdict.
 */
export function stanceThere(
  t: Template,
  views: readonly ExitView[],
  stance: Stance,
  gathers = true,
): { settle: number } | { play: number } | null {
  const pick = stancePick(t, views, stance, gathers);
  if (pick === null) return null;
  const v = views[pick]!;
  if (v.exit.road !== 'fight' || v.sure) return { settle: pick };
  return stance === 'bold' ? { play: pick } : null;
}

// ---------------------------------------------------------------- settling

/** A rarity from the band's finds: "green and blue" at layers 7 to 9. */
function rarityOfBand(band: number, rng: Rng): RarityId {
  const words = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!.finds.split(/ and |, /);
  const ids = words
    .map((w) => w.trim())
    .filter((w): w is RarityId => (RARITY_IDS as readonly string[]).includes(w));
  return ids.length ? rng.pick(ids) : 'white';
}

/** A find from a written thing at the band's rarity, held in its range. */
function findId(id: string, band: number, rng: Rng): string {
  if (!hasItem(id)) return id;
  const it = item(id);
  const range = rarityRange(it);
  let r = rarityOfBand(band, rng);
  if (!range.includes(r))
    r =
      RARITY_IDS.indexOf(r) < RARITY_IDS.indexOf(range[0]!) ? range[0]! : range[range.length - 1]!;
  const tier = Math.max(
    it.tier,
    realmIndex(BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!.realm) + 1,
  );
  return variantId(
    id,
    r,
    it.kind === 'herb' || it.kind === 'material'
      ? {}
      : { tier: tier === it.tier ? undefined : tier },
  );
}

function gain(s: GameState, id: string, n: number): GameState {
  if (hasCopy(id)) return copyGain(s, id);
  return gainItem(s, id, n).state;
}

export interface Settled {
  state: GameState;
  /** What the card says happened, second person. */
  text: string;
  /** Still on the card: a talk that fell short. */
  stays: boolean;
  verdict: Verdict;
}

function applyStakes(s: GameState, m: Met, stakes: readonly Stake[], rng: Rng): GameState {
  let st = s;
  const pid = st.player.id;
  for (const k of stakes) {
    switch (k.do) {
      case 'wound':
        st = applyEffects(st, null, [
          { do: 'wound', who: pid, share: k.share, days: k.days },
        ]).state;
        break;
      case 'stones':
        // A loss is paid as a price, as far as the purse reaches; a gain comes in low.
        st = withPlayer(
          st,
          withStones(
            st.player,
            k.n < 0 ? spend(stonesOf(st.player), -k.n) : receive(stonesOf(st.player), k.n),
          ),
        );
        break;
      case 'robbed': {
        // A share of every grade, whole stones of each.
        st = withPlayer(st, withStones(st.player, takeShare(stonesOf(st.player), k.share)));
        if (k.item) {
          const held = Object.entries(st.player.items)
            .filter(([, n]) => n > 0)
            .map(([id]) => id)
            .sort();
          if (held.length) st = withPlayer(st, addItem(st.player, rng.pick(held), -1));
        }
        break;
      }
      case 'item':
        st = k.n >= 0 ? gain(st, k.id, k.n) : withPlayer(st, addItem(st.player, k.id, k.n));
        break;
      case 'loot': {
        const from = k.role ? (m.roles[k.role] ?? []) : m.actors;
        for (const a of from) {
          const npc = m.npcs[a.id];
          if (!npc) continue;
          const h = kitOf(npc);
          for (const [id, n] of Object.entries(h.items)) st = gain(st, id, n);
          // What they carried arrives as they counted it, in their realm's grade at most.
          const purse = receive(stonesOf(st.player), h.stones, realmGrade(npc.realm));
          st = withPlayer(st, withStones(st.player, purse));
        }
        break;
      }
      case 'find': {
        const id = rng.pick(k.things);
        st = gain(st, findId(id, m.enc.band, rng), rng.int(k.n[0], k.n[1]));
        break;
      }
      case 'fuel': {
        const l = st.player.qi;
        st = withPlayer(st, {
          ...st.player,
          qi: { ...l, bar: Math.max(0, l.bar + k.share * Math.max(1, l.bar || 100)) },
        });
        break;
      }
      case 'hours':
        if (st.map) st = { ...st, map: { ...st.map, detour: st.map.detour + k.n * 40 } };
        break;
      case 'site':
        st = findNearestHidden(st, m.enc.at);
        break;
      case 'memory': {
        const who = m.roles[k.role]?.[0];
        if (who)
          st = applyEffects(st, null, [
            { do: 'memory', who: who.id, about: pid, row: k.row },
          ]).state;
        break;
      }
      case 'standing':
        st = applyEffects(st, null, [
          { do: 'standing', power: k.power, about: pid, row: k.row },
        ]).state;
        break;
      case 'heat':
        st = applyEffects(st, null, [
          { do: 'heat', holder: st.map?.region ?? 'qm-bianhuang', n: k.n },
        ]).state;
        break;
      case 'karma':
        st = applyEffects(st, null, [{ do: 'karma', who: pid, n: k.n }]).state;
        break;
      case 'place':
        break;
      case 'fine':
        if (m.enc.power) {
          const r = liftByPaying(st, m.enc.power, 'fine');
          if (r.ok) st = r.state;
        }
        break;
      case 'their-standing':
        if (m.enc.power)
          st = applyEffects(st, null, [
            { do: 'standing', power: m.enc.power, about: pid, row: k.row },
          ]).state;
        break;
    }
  }
  return st;
}

/**
 * The art your fight on the road rides on: the technique of yours that lands the most on those you
 * face, unrolled, if it beats your plain strike (O5: what the watchers see you throw).
 */
function artThrown(you: Combatant, foes: readonly Combatant[]): string | null {
  const f = startFight([{ ...you, side: YOU }, ...foes.map((c) => ({ ...c, side: THEM }))]);
  let best: { id: string | null; n: number } = { id: null, n: 0 };
  for (const t of foes) {
    const strike = preview(f, you.id, { type: 'strike', target: t.id });
    if (strike && strike.chance * strike.damage > best.n)
      best = { id: null, n: strike.chance * strike.damage };
    for (const id of Object.keys(you.techniques)) {
      const p = preview(f, you.id, { type: 'technique', id, target: t.id });
      if (p && p.chance * p.damage > best.n) best = { id, n: p.chance * p.damage };
    }
  }
  return best.id;
}

/** The nearest hidden site that isn't Seen turns Seen: a lead followed. */
function findNearestHidden(s: GameState, at: Pt): GameState {
  const life = s.map;
  const map = mapHook(s);
  if (!life || !map) return s;
  const site = map.places
    .filter((p) => p.hidden && known(life, p.id) !== 'seen')
    .sort((a, b) => Math.hypot(a.x - at[0], a.y - at[1]) - Math.hypot(b.x - at[0], b.y - at[1]))[0];
  if (!site) return s;
  return addEvent({ ...s, map: raise(life, site.id, 'seen') }, 'found', { place: site.name });
}

let mapHook: (s: GameState) => RegionMap | null = () => null;
/** How the region's map is found from a state: travel.ts registers its mapOf, since travel.ts imports this file. */
export function setMapOf(f: (s: GameState) => RegionMap | null): void {
  mapHook = f;
}

/** Robbers: a person on the card whose motives hold greed. */
function isGreedy(m: Met): boolean {
  return m.template.roles.some(
    (r) =>
      r.motives?.includes('greed') &&
      !('roster' in r.who && rosterTemplate(r.who.roster).kind === 'beast'),
  );
}

/** The outcome an exit gives at a verdict, with the act's own when the template leaves it out. */
function outcomeOf(
  m: Met,
  e: Exit,
  v: Verdict,
): { o: ExitOutcome; extra: Stake[]; stays: boolean } {
  if (v === 'clear') return { o: e.pass, extra: [], stays: false };
  if (v === 'close') {
    if (e.close) return { o: e.close, extra: [], stays: false };
    const wound: Stake[] =
      e.road === 'fight' || e.road === 'slip'
        ? [{ do: 'wound', share: CLOSE_WOUND.share, days: CLOSE_WOUND.days }]
        : [];
    return { o: e.pass, extra: wound, stays: false };
  }
  if (e.short) return { o: e.short, extra: [], stays: false };
  if (e.road === 'talk')
    return {
      o: { text: 'It doesn’t land. They hear you out and don’t move.', line: 'is not heard out' },
      extra: [],
      stays: true,
    };
  // A slip or a fight fallen short: they have you, and the fight goes as the fight would.
  const greedy = isGreedy(m);
  const lost: Stake[] = [{ do: 'wound', share: SHORT_WOUND.share, days: SHORT_WOUND.days }];
  if (greedy) lost.push({ do: 'robbed', share: ROBBED_SHARE, item: true });
  return {
    o: {
      text:
        e.road === 'slip'
          ? 'They see you, and it comes to blows you don’t win. You limp on.'
          : 'It goes against you. You limp away hurt.',
      line: `comes off worst against ${m.template.roles[0]?.name ?? 'the road'}`,
    },
    extra: lost,
    stays: false,
  };
}

/**
 * Settles an encounter by an exit at its true verdict: the stakes land, the road gets a line and the
 * chronicle one, and the card leaves, unless a talk fell short and it stays with that exit spent.
 */
export function settle(
  s: GameState,
  encId: string,
  i: number,
  by: 'you' | 'stance',
): Settled | null {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc) return null;
  const m = meet(s, enc);
  const view = exitViews(s, m)[i];
  if (!view || view.refused) return null;
  const e = view.exit;
  let st = s;
  if (view.burns) st = withPlayer(st, addItem(st.player, view.burns, -1));
  if (e.cost?.stones) {
    const after = pay(stonesOf(st.player), e.cost.stones)!;
    st = withPlayer(st, withStones(st.player, after));
  }
  if (e.cost?.item) st = withPlayer(st, addItem(st.player, e.cost.item, -1));
  const rng = new Rng(hashSeed(`${enc.id}/settle/${i}`));
  const { o, extra, stays } = outcomeOf(m, e, view.verdict);
  st = applyStakes(st, m, [...(o.stakes ?? []), ...extra], rng);
  // A fight shows the art you throw to everyone there; a power's own is known for it (O5).
  if (e.road === 'fight' && m.you.combatant) {
    const art = artThrown(
      m.you.combatant,
      faced(m, e)
        .map((a) => a.combatant)
        .filter((c): c is Combatant => !!c),
    );
    if (art)
      st = seenUsing(st, [artCopy(art)], m.actors, m.you, {
        place: enc.id,
        ...(life.region ? { region: life.region } : {}),
      }).state;
  }
  return closeCard(st, m, i, o, [...(o.stakes ?? []), ...extra], {
    stays,
    met: view.verdict !== 'short',
    kind: by === 'stance' ? 'settled' : e.road === 'fight' ? 'fight' : 'choice',
    verdict: view.verdict,
  });
}

/**
 * The card's end once its stakes have landed: it stays with that exit spent when a talk fell
 * short, or leaves with a road line and a chronicle line, its posting met when it was.
 */
function closeCard(
  st0: GameState,
  m: Met,
  i: number,
  o: ExitOutcome,
  stakes: readonly Stake[],
  how: { stays: boolean; met: boolean; kind: string; verdict: Verdict },
): Settled {
  let st = st0;
  const enc = m.enc;
  const { stays, verdict: v } = how;
  const l = st.map!;
  if (stays) {
    return {
      state: {
        ...st,
        map: {
          ...l,
          encounters: l.encounters.map((x) =>
            x.id === enc.id ? { ...x, tried: [...x.tried, i] } : x,
          ),
        },
      },
      text: o.text,
      stays: true,
      verdict: v,
    };
  }
  const hurt = stakes.some((k) => k.do === 'wound');
  const kind = how.kind !== 'settled' && hurt ? 'hurt' : how.kind;
  const postings =
    enc.posting && how.met
      ? l.postings.map((p) => (p.id === enc.posting ? { ...p, done: true } : p))
      : l.postings;
  st = {
    ...st,
    map: {
      ...l,
      postings,
      encounters: l.encounters.filter((x) => x.id !== enc.id),
      road: [
        ...l.road,
        { day: st.calendar.day, kind: m.template.kind, text: o.text, template: m.template.id },
      ].slice(-40),
    },
  };
  st = addEvent(st, 'encounter', { line: o.line, where: enc.where, kind });
  return { state: st, text: o.text, stays: false, verdict: v };
}

// ---------------------------------------------------------------- fights you play

/**
 * The fight an exit opens on the stage: you against whoever the exit faces, regenerated from the
 * encounter's seed, so a reload builds the same start. Null when it isn't a fight.
 */
export function roadFight(s: GameState, encId: string, i: number): Fight | null {
  const enc = s.map?.encounters.find((e) => e.id === encId);
  if (!enc) return null;
  const m = meet(s, enc);
  const e = m.template.exits[i];
  if (!e || e.road !== 'fight' || !m.you.combatant) return null;
  const foes = faced(m, e)
    .map((a) => a.combatant)
    .filter((c): c is Combatant => !!c)
    .map((c) => ({ ...c, side: THEM }));
  if (!foes.length) return null;
  return startFight([{ ...m.you.combatant, side: YOU }, ...foes]);
}

/**
 * Opens an exit's fight on the stage instead of settling it by its verdict: the card waits, and
 * the course with it, until the fight ends. Null when the exit isn't a fight you can take.
 */
export function playExit(s: GameState, encId: string, i: number): GameState | null {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc || s.fight) return null;
  const view = exitViews(s, meet(s, enc))[i];
  if (!view || view.refused || view.exit.road !== 'fight') return null;
  const start = roadFight(s, encId, i);
  if (!start) return null;
  const waits: GameState = {
    ...s,
    map: {
      ...life,
      encounters: life.encounters.map((e) =>
        e.id === encId ? { ...e, state: 'waiting', meetAt: null } : e,
      ),
    },
  };
  return openFight(waits, { kind: 'road', enc: encId, exit: i }, start);
}

/** What the HP a fight took comes home as: none under a quarter, close to a half, short past it. */
function woundFrom(lost: number): Stake[] {
  if (lost >= 0.5) return [{ do: 'wound', share: SHORT_WOUND.share, days: SHORT_WOUND.days }];
  if (lost >= 0.25) return [{ do: 'wound', share: CLOSE_WOUND.share, days: CLOSE_WOUND.days }];
  return [];
}

/**
 * A road fight you played, handed back to its card (Fights you play): won, the exit's pass and a
 * wound by the HP it took; fallen, its short as the verdict would have it; fled or drawn off, you
 * are away with the wound; yielded, robbers rob you and anyone else lets you go; talked down, the
 * pass without their kit. The arts you threw are seen by everyone there.
 */
export function settlePlayed(
  s: GameState,
  encId: string,
  i: number,
  end: FightEnd,
  f: Fight,
  used: readonly string[] = [],
): Settled | null {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc) return null;
  const m = meet(s, enc);
  const e = m.template.exits[i];
  if (!e) return null;
  const them = m.template.roles[0]?.name ?? 'them';
  const wound = woundFrom(hpLost(f, s.player.id));
  let o: ExitOutcome;
  let extra: Stake[] = [];
  let verdict: Verdict = 'clear';
  switch (end) {
    case 'won':
      o = e.pass;
      extra = wound;
      break;
    case 'talked':
      o = { ...e.pass, stakes: (e.pass.stakes ?? []).filter((k) => k.do !== 'loot') };
      extra = wound;
      break;
    case 'lost': {
      const r = outcomeOf(m, e, 'short');
      o = r.o;
      extra = r.extra;
      verdict = 'short';
      break;
    }
    case 'yielded':
      verdict = 'short';
      if (isGreedy(m)) {
        o = {
          text: 'You yield. They take what they want and let you go.',
          line: `yields to ${them} and is robbed`,
        };
        extra = [{ do: 'robbed', share: ROBBED_SHARE, item: true }];
      } else o = { text: 'You yield, and they let you go.', line: `yields to ${them}` };
      break;
    default:
      verdict = 'close';
      o = {
        text: `You break away from ${them} and leave them behind.`,
        line: `breaks away from ${them}`,
      };
      extra = wound;
  }
  const rng = new Rng(hashSeed(`${enc.id}/played/${i}`));
  const stakes = [...(o.stakes ?? []), ...extra];
  let st = applyStakes(s, m, stakes, rng);
  if (used.length)
    st = seenUsing(st, used.map(artCopy), m.actors, m.you, {
      place: enc.id,
      ...(life.region ? { region: life.region } : {}),
    }).state;
  return closeCard(st, m, i, o, stakes, {
    stays: false,
    met: end === 'won' || end === 'talked',
    kind: 'fight',
    verdict,
  });
}

/** Goes round a sensed encounter that hasn't found you: 60 li more cross-country. */
export function goRound(s: GameState, encId: string, by: 'you' | 'stance' = 'you'): GameState {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc || !canGoRound(enc)) return s;
  const t = encounterTemplate(enc.template);
  const text = `You went round ${t.title.charAt(0).toLowerCase()}${t.title.slice(1)}.`;
  const next: GameState = {
    ...s,
    map: {
      ...life,
      detour: life.detour + GO_ROUND_LI,
      encounters: life.encounters.filter((e) => e.id !== encId),
      road: [...life.road, { day: s.calendar.day, kind: t.kind, text, template: t.id }].slice(-40),
    },
  };
  return by === 'stance'
    ? next
    : addEvent(next, 'encounter', {
        line: `goes round ${t.title.toLowerCase()}`,
        where: enc.where,
        kind: 'choice',
      });
}

export function canGoRound(enc: Encounter): boolean {
  return enc.state === 'sensed' && enc.how === 'seen';
}

/**
 * Lets a stance settle what it can when you reach it; the rest waits and stops the course. While
 * you're there (`played`), a stance settles only a sure fight, and Bold goes into a clear or close
 * one on the stage (Fights you play); away, every fight settles by its verdict.
 */
export function contact(s: GameState, encId: string, played = false): GameState {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc) return s;
  const m = meet(s, enc);
  const routine = [...ROAD_ROUTINES, ...life.ownRoutines].find((r) => r.id === life.roadRoutine);
  const gathers = !!routine?.hours.includes('gather');
  // A law hall that knows your face waits for you like a plot, the first time a season (the
  // checkpoint's fix): no stance slips it, so the fine is put to you.
  const law = m.template.where.lawHall && enc.power && yourMark(s, enc.power) ? enc.power : null;
  const lastMet = law ? life.lawMet?.[law] : undefined;
  const holds = !!law && (lastMet === undefined || s.calendar.day - lastMet >= GUARDED.coolDays);
  const views = exitViews(s, m);
  const pick = holds ? null : stancePick(m.template, views, life.stance, gathers);
  const there = played && !holds ? stanceThere(m.template, views, life.stance, gathers) : null;
  if (there && 'play' in there && !s.fight) {
    const r = playExit(s, encId, there.play);
    if (r) return r;
  } else if (pick !== null && (!played || (there && 'settle' in there))) {
    const r = settle(s, encId, pick, 'stance');
    if (r && !r.stays) return r.state;
  }
  return {
    ...s,
    map: {
      ...life,
      ...(holds && law ? { lawMet: { ...life.lawMet, [law]: s.calendar.day } } : {}),
      encounters: life.encounters.map((e) =>
        e.id === encId ? { ...e, state: 'waiting', meetAt: null } : e,
      ),
    },
  };
}

/** You answer a card yourself: an exit, or going round. */
export function chooseExit(s: GameState, encId: string, i: number): Settled | null {
  return settle(s, encId, i, 'you');
}

export function waiting(life: MapLife | null): Encounter[] {
  return life?.encounters.filter((e) => e.state === 'waiting') ?? [];
}

// ---------------------------------------------------------------- the stance, the veil and talismans

/** Sets the stance; what waits on the road is tried again by it, so a bolder stance can settle it. */
export function setStance(s: GameState, stance: Stance): GameState {
  if (!s.map) return s;
  let st: GameState = { ...s, map: { ...s.map, stance } };
  for (const e of waiting(st.map)) st = contact(st, e.id, true);
  return st;
}

/** How far down you can show your realm: none without concealment (Veiled Aura, Hidden Realm). */
export function veilReach(s: GameState): { shown: RealmStage; stages: number } | null {
  const you = actorFromCultivator(s);
  const stages = you.stats.concealment ?? 0;
  if (stages < 1) return null;
  return { shown: lowestShown(you), stages };
}

/**
 * Travelling veiled (P3.7): a cover showing your concealment's lowest realm, which the watch and the
 * road's cultivators read; acting above it blows it, as any cover. Off, the cover ends.
 */
export type VeilCheck = { ok: true; state: GameState } | { ok: false; reason: string };
export function setVeil(s: GameState, on: boolean): VeilCheck {
  const life = s.map;
  if (!life) return { ok: false, reason: 'The map isn’t ready.' };
  const day = s.calendar.day;
  let world = s.world;
  for (const c of statesOf(world, s.player.id, 'cover', day)) world = endState(world, c.id);
  if (on) {
    const v = veilReach(s);
    if (!v)
      return {
        ok: false,
        reason: 'You have no concealment to veil your realm with (Veiled Aura, on the Qi tree).',
      };
    world = startState(
      world,
      s.player.id,
      { kind: 'cover', shown: v.shown, fooled: [] },
      day,
    ).world;
  }
  return { ok: true, state: { ...s, world, map: { ...life, veiled: on } } };
}

// ---------------------------------------------------------------- sensing

export function onRoadAt(map: RegionMap, p: Pt): boolean {
  return nearRoad(map, p);
}

/** How far you see on the map where you stand, or sense, whichever is farther. */
export function senseReach(map: RegionMap, p: Pt, sense: number): number {
  return Math.max(sightAt(map, p), sense);
}

function tierOfRealm(r: RealmId): number {
  return realmIndex(r) + 1;
}

/** Your Stealth against someone's perception: a burned talisman holds it at its tier's size against those up to its tier. */
function stealthAgainst(s: GameState, you: Actor, them: Actor): number {
  const own = capability(you, 'stealth');
  const h = s.map?.hidden;
  if (!h || h.until <= s.calendar.day) return own;
  const theirTier = tierOfRealm(realmOfTop(them));
  if (theirTier > h.tier) return own;
  const r = REALMS[Math.min(REALMS.length - 1, h.tier - 1)]!.id;
  return Math.max(own, sizeAt({ realm: r, stage: realmInfo(r).stages }));
}

function realmOfTop(a: Actor): RealmId {
  const rs = [a.rungs.qi, a.rungs.body, a.rungs.soul];
  return rs.reduce((best, r) => (realmIndex(r.realm) > realmIndex(best.realm) ? r : best)).realm;
}

export interface Sensed {
  how: Encounter['how'];
  /** A talisman was burned to keep from being found. */
  burned: string | null;
}

/** How an encounter meets you: seen at your sight's edge, sprung from hiding, or found you first. */
export function senseHow(s: GameState, m: Met, closed: boolean): Sensed {
  const t = m.template;
  if (!m.actors.length || t.kind === 'place' || t.kind === 'omen')
    return { how: 'seen', burned: null };
  const you = m.you;
  // It notices you: its Perception against your Stealth, a realm beyond and it found you first.
  const foundBy = (st: GameState) =>
    m.actors.some((a) => isBeyond(stealthAgainst(st, you, a), capability(a, 'perception')));
  let burned: string | null = null;
  if (foundBy(s)) {
    const top = Math.max(...m.actors.map((a) => tierOfRealm(realmOfTop(a))));
    const tal = Object.keys(s.player.items)
      .filter(
        (id) =>
          itemCount(s.player, id) > 0 && hasItem(id) && (item(id).uses.hide?.tier ?? 0) >= top,
      )
      .sort((a, b) => item(a).uses.hide!.tier - item(b).uses.hide!.tier)[0];
    if (!tal) return { how: 'found', burned: null };
    burned = tal;
  }
  if (t.lurks) {
    const help = closed ? COVER_HELP : 0;
    const theirs = Math.max(
      ...m.actors.map((a) => {
        const mortal =
          MORTALS[
            (t.roles.find((r) => a.id.includes(`:${r.id}:`))?.who as { mortal?: string })?.mortal ??
              ''
          ];
        return capability(a, 'stealth', { uses: help + (mortal?.hides ?? 0) });
      }),
    );
    if (verdict(capability(you, 'perception'), theirs) === 'short')
      return { how: 'sprung', burned };
  }
  return { how: 'seen', burned };
}

// ---------------------------------------------------------------- what comes

function hourIsNight(hour: number): boolean {
  return NIGHT_HOURS.includes(hour);
}

/** What the road can bring here: the templates whose where holds, by kind. */
function eligible(s: GameState, map: RegionMap, p: Pt, hour: number, onRoad: boolean): Template[] {
  const terrain = terrainAt(map, p);
  const night = hourIsNight(hour);
  const season = seasonOf(s.calendar.day);
  return ENCOUNTERS.filter((t) => {
    const w = t.where;
    if (t.goal) return false;
    if (w.terrain && !w.terrain.includes(terrain)) return false;
    if (w.road === 'on' && !onRoad) return false;
    if (w.road === 'off' && onRoad) return false;
    if (w.hours === 'night' && !night) return false;
    if (w.hours === 'day' && night) return false;
    if (w.season && !w.season.includes(season)) return false;
    if (
      w.site &&
      !map.places.some(
        (q) => w.site!.includes(q.sub as never) && Math.hypot(q.x - p[0], q.y - p[1]) < 1500,
      )
    )
      return false;
    if (w.needs && !plotPerson(s, w.needs)) return false;
    if (w.lawHall && lawHallHere(s, map, p)?.chapter !== w.lawHall) return false;
    return true;
  });
}

/** The powers whose seats stand on a map. */
const powersCache = new Map<string, string[]>();
function powersOn(map: RegionMap): string[] {
  let out = powersCache.get(map.id);
  if (!out) {
    out = map.places.filter((q) => q.kind === 'atlas' && isOrganization(q.id)).map((q) => q.id);
    powersCache.set(map.id, out);
  }
  return out;
}

/** The law hall walking the road at a spot (O5): the most hunting power whose sphere holds it. */
function lawHallHere(s: GameState, map: RegionMap, p: Pt) {
  return lawHallAt(s.world, powersOn(map), p, s.calendar.day, map);
}

/** The band an encounter of a kind comes at: the spot's off the road, people at yours ±1 on it. */
function bandFor(
  map: RegionMap,
  p: Pt,
  kind: EncounterKind,
  onRoad: boolean,
  yourBand: number,
  rng: Rng,
): number {
  const here = bandAt(map, p);
  if (!onRoad || kind === 'beast' || kind === 'place' || kind === 'omen') return here;
  const lo = edgeBand(map, p);
  const hi = Math.max(here, lo + 3);
  const b = yourBand + rng.int(-ROAD_PEOPLE_SPREAD, ROAD_PEOPLE_SPREAD);
  return Math.max(lo, Math.min(hi, b));
}

export interface Draw {
  template: Template;
  band: number;
  /** The power whose law hall walks it, for a law hall's encounter. */
  power?: string;
}

/** Picks what comes: a kind by its shares, then a template at the band by weight. */
/** Whether a spot lies within a day's walk of a town or city (TOWN_PEACE_LI), where the watch keeps the road. */
export function inPeace(map: RegionMap, p: Pt): boolean {
  return map.places.some(
    (q) =>
      (q.sub === 'town' || q.sub === 'city') && Math.hypot(q.x - p[0], q.y - p[1]) < TOWN_PEACE_LI,
  );
}

export function draw(
  s: GameState,
  map: RegionMap,
  p: Pt,
  hour: number,
  yourBand: number,
  rng: Rng,
): Draw | null {
  const onRoad = onRoadAt(map, p);
  // The watch keeps the road a day's walk round a town or city: nothing hostile comes there, by
  // the spot it would come at or where you stand.
  const calm = inPeace(map, p) || (!!s.map && inPeace(map, s.map.at));
  const pool = eligible(s, map, p, hour, onRoad).filter((t) => !(calm && t.hostile));
  const shares = { ...KIND_SHARES[onRoad ? 'road' : 'off'] };
  if (hourIsNight(hour))
    for (const [k, n] of Object.entries(NIGHT_SHIFT))
      shares[k as EncounterKind] = Math.max(0, shares[k as EncounterKind] + n!);
  const kinds = ENCOUNTER_KINDS.filter((k) => shares[k] > 0 && pool.some((t) => t.kind === k));
  if (!kinds.length) return null;
  const total = kinds.reduce((n, k) => n + shares[k], 0);
  let u = rng.next() * total;
  const kind = kinds.find((k) => (u -= shares[k]) < 0) ?? kinds[kinds.length - 1]!;
  const band = bandFor(map, p, kind, onRoad, yourBand, rng);
  const ofKind = pool.filter((t) => t.kind === kind);
  const dist = (t: Template) =>
    band < t.bands[0] ? t.bands[0] - band : band > t.bands[1] ? band - t.bands[1] : 0;
  const near = Math.min(...ofKind.map(dist));
  const fits = ofKind.filter((t) => dist(t) === near);
  const looksWeak = s.map?.veiled ?? false;
  // What the road brought lately comes less, so a crossing isn't the same post rider ten times.
  const recent = new Set([
    ...(s.map?.road ?? []).slice(-RECENT_LINES).map((l) => l.template),
    ...(s.map?.encounters ?? []).map((x) => x.template),
  ]);
  const weight = (t: Template) =>
    (t.weight ?? 1) *
    (recent.has(t.id) ? RECENT_WEIGHT : 1) *
    (looksWeak && t.roles.some((r) => r.motives?.includes('greed')) && t.kind === 'cultivator'
      ? WEAK_LOOKING
      : 1);
  const wTotal = fits.reduce((n, t) => n + weight(t), 0);
  let v = rng.next() * wTotal;
  const template = fits.find((t) => (v -= weight(t)) < 0) ?? fits[fits.length - 1]!;
  // The law hall comes as the strongest of the seat its hunt sends, whatever your band (O5).
  const law = template.where.lawHall ? lawHallHere(s, map, p) : null;
  if (law) return { template, band: lawHallBand(law.power, law.chapter), power: law.power };
  return { template, band: Math.max(0, band) };
}

/** The point on the course a reach of li ahead, and its index. */
function aheadOn(life: MapLife, li: number): { at: Pt; i: number } {
  const c = life.course!;
  let at: Pt = life.at;
  let left = li;
  for (let i = c.at; i < c.pts.length; i++) {
    const q = c.pts[i]!;
    const d = Math.hypot(q[0] - at[0], q[1] - at[1]);
    if (d >= left)
      return { at: [at[0] + ((q[0] - at[0]) * left) / d, at[1] + ((q[1] - at[1]) * left) / d], i };
    left -= d;
    at = q;
  }
  return { at, i: c.pts.length - 1 };
}

function whereWords(map: RegionMap, p: Pt): string {
  return areaAt(map, p)?.name ?? map.name;
}

/**
 * An encounter comes: drawn, its people made, sensed. Seen ones stand ahead on the course at the
 * edge of your sight or sense (Avoid goes round them at once); sprung ones and those that found you
 * meet you where you stand.
 */
export function arrive(
  s: GameState,
  map: RegionMap,
  hour: number,
  yourBand: number,
  sense: number,
  rng: Rng,
  played = false,
): GameState {
  const life = s.map!;
  if (!life.course || life.encounters.filter((e) => e.state === 'sensed').length >= MAX_AHEAD)
    return s;
  const reach = senseReach(map, life.at, sense);
  const ahead = aheadOn(life, reach);
  const d = draw(s, map, ahead.at, hour, yourBand, rng);
  if (!d) return s;
  const id = `e${Math.floor(s.calendar.day)}-${rng.int(0, 1e9)}`;
  const enc: Encounter = {
    id,
    template: d.template.id,
    seed: rng.int(0, 2 ** 31 - 1),
    band: d.band,
    at: [ahead.at[0], ahead.at[1]],
    meetAt: ahead.i,
    state: 'sensed',
    how: 'seen',
    tried: [],
    day: s.calendar.day,
    where: whereWords(map, ahead.at),
    ...(d.power ? { power: d.power } : {}),
  };
  const closed = CLOSED_TERRAINS.includes(terrainAt(map, life.at));
  const m = meet(s, enc);
  const sensed = senseHow(s, m, closed);
  let st = s;
  if (sensed.burned) {
    st = withPlayer(st, addItem(st.player, sensed.burned, -1));
    st = {
      ...st,
      map: {
        ...st.map!,
        hidden: { until: st.calendar.day + HIDING_DAYS, tier: item(sensed.burned).uses.hide!.tier },
      },
    };
  }
  const met = sensed.how !== 'seen';
  const placed: Encounter = met
    ? {
        ...enc,
        how: sensed.how,
        at: [life.at[0], life.at[1]],
        meetAt: null,
        where: whereWords(map, life.at),
      }
    : enc;
  st = { ...st, map: { ...st.map!, encounters: [...st.map!.encounters, placed] } };
  if (met) return contact(st, placed.id, played);
  if (
    st.map!.stance === 'avoid' &&
    placed.how === 'seen' &&
    d.template.kind !== 'place' &&
    d.template.kind !== 'omen'
  )
    return goRound(st, placed.id, 'stance');
  return st;
}

/**
 * A written encounter placed ahead on the course at a point (the origin's board quest's road
 * beast): seen at the edge of your sight, met when the course reaches it, and gone round at once
 * on Avoid, as a drawn one is.
 */
export function placeAhead(
  s: GameState,
  map: RegionMap,
  template: string,
  band: number,
  index: number,
  id: string,
): GameState {
  const life = s.map!;
  if (!life.course || life.encounters.some((e) => e.id === id)) return s;
  const t = encounterTemplate(template);
  const at = life.course.pts[index]!;
  const enc: Encounter = {
    id,
    template,
    seed: hashSeed(`${id}/${s.lineage.id}`),
    band,
    at: [at[0], at[1]],
    meetAt: index,
    state: 'sensed',
    how: 'seen',
    tried: [],
    day: s.calendar.day,
    where: whereWords(map, at),
  };
  const st = { ...s, map: { ...life, encounters: [...life.encounters, enc] } };
  if (st.map.stance === 'avoid' && t.kind !== 'place' && t.kind !== 'omen')
    return goRound(st, id, 'stance');
  return st;
}

/** The road's notice an hour adds: on a road or off it, by night, heat, flying and a group. */
export function noticeRate(
  s: GameState,
  map: RegionMap,
  hour: number,
  moving: boolean,
  flying: boolean,
): number {
  const life = s.map!;
  const onRoad = onRoadAt(map, life.at);
  let n = moving ? (onRoad ? NOTICE_ROAD : NOTICE_OFF) : NOTICE_CAMP;
  if (moving && hourIsNight(hour)) n *= NOTICE_NIGHT;
  // Heat is held by a region or a power, never by you: the hotter of the region and the land you
  // stand in (a kingdom, a power's ground) is what hunts you on the road.
  const day = s.calendar.day;
  const area = areaAt(map, life.at);
  const landHeat = area ? heatOf(s.world, area.id, day) : 0;
  const heat = Math.max(heatOf(s.world, life.region, day), landHeat);
  n *= 1 + heat / NOTICE_HEAT;
  if (flying) n *= NOTICE_FLYING;
  if (life.group) n *= NOTICE_GROUP;
  return n;
}

/**
 * One hour of the road: the notice fills, and when it is full an encounter comes; then anything
 * sensed that you have reached is met. Nothing fills while a card waits, since you are camped.
 */
export function roadHour(
  s: GameState,
  map: RegionMap,
  hour: number,
  share: number,
  moving: boolean,
  flying: boolean,
  yourBand: number,
  sense: number,
  played = false,
): GameState {
  let st = s;
  const life = st.map!;
  if (!life.course || waiting(life).length) return st;
  // A bed indoors (an inn, a village's barn) is safe: a camp in the open or a moving hour fills it.
  const sheltered = !moving && bedAt(map, life.at) !== null;
  if (!sheltered) {
    const n = life.notice.n + noticeRate(st, map, hour, moving, flying) * share;
    if (n >= life.notice.next) {
      const { value, state } = withStream(st, 'road', (rng) => {
        const next = NOTICE_THRESHOLD[0] + rng.next() * (NOTICE_THRESHOLD[1] - NOTICE_THRESHOLD[0]);
        return {
          next,
          after: arrive(
            { ...st, map: { ...st.map!, notice: { n: 0, next } } },
            map,
            hour,
            yourBand,
            sense,
            rng,
            played,
          ),
        };
      });
      // Only the road's stream moved here; any stream `arrive` advanced keeps its roll.
      st = { ...value.after, rng: { ...value.after.rng, road: state.rng.road! } };
    } else st = { ...st, map: { ...life, notice: { ...life.notice, n } } };
  }
  return meetReached(st, played);
}

/** Meets every sensed encounter the course has reached; `played` while you're there. */
export function meetReached(s: GameState, played = false): GameState {
  let st = s;
  const life = st.map;
  if (!life?.course) return st;
  for (const e of life.encounters) {
    if (e.state !== 'sensed' || e.meetAt === null) continue;
    const near = Math.hypot(e.at[0] - life.at[0], e.at[1] - life.at[1]) < CONTACT_LI;
    if (life.course.at >= e.meetAt || near) st = contact(st, e.id, played);
    if (waiting(st.map).length || st.fight) break;
  }
  return st;
}
