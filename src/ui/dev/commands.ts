// The dev console's commands: testing shortcuts that change the open life through the same rules
// the game uses where they can (time runs through the day step, breakthroughs roll their odds,
// cards go through the feed), and set numbers directly where testing needs a jump. Dev builds only.
import { DAYS_PER_MONTH, DAYS_PER_YEAR } from '../../content/calendar.ts';
import { BOND_IDS, type BondId } from '../../content/bonds.ts';
import {
  ENCOUNTERS,
  encounterTemplate,
  hasEncounterTemplate,
} from '../../content/encounters/index.ts';
import { contact } from '../../core/map/encounters.ts';
import { ensureMap, getDevPace, hereWords, mapOf, setDevPace } from '../../core/map/travel.ts';
import { raise } from '../../core/map/fog.ts';
import { placeById } from '../../core/map/region.ts';
import type { Encounter } from '../../core/map/schema.ts';
import { HOME_REGION } from '../../content/resolver.ts';
import { makeBond } from '../../core/resolver/followers.ts';
import { addFame } from '../../core/resolver/names.ts';
import { SEAT_IDS, type SeatId } from '../../content/organizations.ts';
import { hasJob, job, JOBS } from '../../content/jobs.ts';
import { BRANCHES } from '../../content/hours.ts';
import { jobsView, quitJob, takeJob } from '../../core/jobs.ts';
import {
  addBalance,
  allowanceOf,
  becomeGuest,
  carriesGuarded,
  houseOf,
  membership,
  setSeat,
  donate,
  innerTrial,
  isOrganization,
  joinPower,
  leavePower,
  membershipsView,
  takeLesson,
  engageProtector,
  organization,
  rangeWords,
  realmStageOf,
  seatRanges,
  seatTitle,
  theName,
} from '../../core/organizations.ts';
import { CARDS, hasCard } from '../../content/cards/index.ts';
import { COMBAT_DAO_IDS, isCombatDao } from '../../content/daos.ts';
import { LADDERS, type LadderId } from '../../content/cultivation.ts';
import { COPY_KINDS, copyId, copyTitle, hasCopy } from '../../content/copies.ts';
import { hasItem, item, ITEMS } from '../../content/items.ts';
import { hasManual, MANUALS } from '../../content/manuals.ts';
import { registerManuals } from '../../content/nodes.ts';
import { hasMethod, METHODS } from '../../content/methods.ts';
import { hasRoutine, ROUTINES } from '../../content/routines.ts';
import { hasTechnique, TECHNIQUES } from '../../content/techniques.ts';
import { playDay, resolveByDefault } from '../../core/cards.ts';
import { barSize, majorCheck } from '../../core/cultivation.ts';
import { gainInsight } from '../../core/insight.ts';
import { capstoneOf, intentMoment, intentStage, readyingTier } from '../../core/intent.ts';
import {
  attentionFactor,
  heatLimit,
  heatUnsettled,
  inhaling,
  orbPosition,
} from '../../core/attention.ts';
import {
  breakThrough,
  gainCopy,
  gainManual,
  gainMethod,
  gainRoutine,
  gainTechnique,
  practice,
  readCopy,
} from '../../core/life.ts';
import { advance, daysPerRealMs } from '../../core/loop.ts';
import { madeUpLife } from '../../core/fixtures/madeUpLife.ts';
import { madeUpManuals } from '../../core/fixtures/madeUpManuals.ts';
import { addItem, ageYears, daysLived, withPlayer, type GameState } from '../../core/state.ts';
import { formatDays, formatLadder, formatNumber } from '../format.ts';
import { screens } from '../screens.ts';
import { useSeat } from '../seat.ts';
import type { GameStore } from '../store.ts';
import { shop, SHOP_KIND_INFO, SHOPS } from '../../content/shops.ts';
import { marketSum, restAt, restOf, whyOf } from '../../core/making.ts';
import { priceWords, purseWords } from '../../core/purse.ts';
import { buy, haggle, repair, sell, shelf, type ShopResult } from '../../core/shops.ts';
import {
  addProsperity,
  goodName,
  market,
  MARKETS,
  prosperityOf,
  prosperityWord,
  reachOf,
  seenIn,
  shopLots,
  shopPurse,
  shopTiers,
  supplyOf,
  thingOfGood,
  writtenProsperity,
} from '../../core/markets.ts';

export type Output = string | string[];

// `shelf`'s made-up manuals are known from the start in dev builds, before any save loads, so a
// life the command filled reloads with its bookcase whole. Production builds never hold them.
const MADE_UP = madeUpManuals(150);
if (import.meta.env.DEV) registerManuals(MADE_UP.manuals);

interface Command {
  usage: string;
  help: string;
  run(args: string[], store: GameStore): Output;
}

const UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };

/**
 * "90s", "30m", "2h" are real time; "10d" and "2y" are game days and years on the current clock.
 * A bare number is minutes.
 */
export function parseTime(text: string | undefined, s: GameState): number | null {
  const m = /^(\d+(?:\.\d+)?)(ms|s|m|h|d|y)?$/.exec(text?.trim() ?? '');
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? 'm';
  if (unit === 'd') return n / daysPerRealMs(s);
  if (unit === 'y') return (n * DAYS_PER_YEAR) / daysPerRealMs(s);
  return n * UNITS[unit]!;
}

const isLadder = (x: string | undefined): x is LadderId => LADDERS.includes(x as LadderId);

/** Applies a change to the open life, or says why it can't. */
function apply(store: GameStore, change: (s: GameState) => GameState, done: Output): Output {
  const err = store.devApply(change);
  return err ?? done;
}

function needGame(store: GameStore): GameState {
  if (!store.game) throw new Error('No life is open. Start or open one in Settings.');
  return store.game;
}

function summary(s: GameState, speed: number): string[] {
  const p = s.player;
  return [
    `${p.name}, ${formatLadder(p.qi)}; body ${formatLadder(p.body)}; soul ${formatLadder(p.soul)}`,
    `age ${ageYears(p, s.calendar.day).toFixed(2)} · day ${Math.floor(s.calendar.day)} · ${formatDays(daysLived(p, s.calendar.day))} lived`,
    `qi bar ${formatNumber(p.qi.bar)} / ${formatNumber(barSize(p.qi))} · insight ${formatNumber(p.insight.current)} (earned ${formatNumber(p.insight.earned)}) · stones ${formatNumber(p.stones)}`,
    `origin ${p.origin ? `${p.origin.id}/${p.origin.choice}` : 'none'} · root ${p.root} (${p.rootElements.join(', ')}) · talents ${p.talents.join(', ') || 'none'}`,
    `cards waiting: ${s.cards.pending.map((c) => c.card).join(', ') || 'none'} · clock ×${speed}`,
  ];
}

export const COMMANDS: Record<string, Command> = {
  help: {
    usage: 'help [command]',
    help: 'Lists the commands, or explains one.',
    run([name]) {
      if (name) {
        const c = COMMANDS[name];
        return c ? [c.usage, c.help] : `No command "${name}".`;
      }
      return Object.values(COMMANDS).map((c) => `${c.usage.padEnd(30)} ${c.help}`);
    },
  },
  speed: {
    usage: 'speed [n]',
    help: 'Shows or sets the clock multiplier (1 is real time). Kept in the URL.',
    run([n], store) {
      if (n === undefined) return `Clock ×${store.speed}.`;
      const v = Number(n);
      if (!Number.isFinite(v) || v <= 0 || v > 1_000_000) return 'Give a number above 0.';
      store.setSpeed(v);
      return `Clock ×${v}: a real minute is ${formatNumber(v)} minutes of play.`;
    },
  },
  skip: {
    usage: 'skip <time>',
    help: 'Plays time forward online: 90s, 30m, 2h real, or 10d, 2y of game time.',
    run([t], store) {
      const s = needGame(store);
      const ms = parseTime(t, s);
      if (ms === null) return 'Give a time like 30m, 2h, 10d or 1y.';
      const r = advance(s, ms, { step: playDay });
      const err = store.devApply(() => r.state);
      if (err) return err;
      const edge = r.atEdge ? ' Time stopped at the lifespan edge.' : '';
      return `Skipped ${formatDays(r.days)}: qi at ${formatLadder(r.state.player.qi)}.${edge}`;
    },
  },
  away: {
    usage: 'away <time>',
    help: 'Leaves and comes back after that much real time (offline, capped at 12h): the coming-back card.',
    run([t], store) {
      const s = needGame(store);
      const ms = parseTime(t, s);
      if (ms === null) return 'Give a time like 30m or 4h.';
      return store.devAway(ms) ?? 'Back from seclusion; see Cultivate.';
    },
  },
  insight: {
    usage: 'insight <n>',
    help: 'Adds insight, spendable and earned.',
    run([n], store) {
      const v = Number(n);
      if (!Number.isFinite(v) || v <= 0) return 'Give a positive number.';
      return apply(store, (s) => withPlayer(s, gainInsight(s.player, v)), `Insight +${v}.`);
    },
  },
  stones: {
    usage: 'stones <n>',
    help: 'Adds spirit stones (negative takes them away).',
    run([n], store) {
      const v = Number(n);
      if (!Number.isFinite(v)) return 'Give a number.';
      return apply(
        store,
        (s) => withPlayer(s, { ...s.player, stones: Math.max(0, s.player.stones + v) }),
        `Stones ${v >= 0 ? '+' : ''}${v}.`,
      );
    },
  },
  meet: {
    usage: 'meet [template] [band]',
    help: 'Lists the encounter templates; with an id, it meets you where you stand now (P3.7), settled by your stance or waiting.',
    run([id, b], store) {
      if (!id)
        return ENCOUNTERS.map(
          (t) =>
            `${t.id}: ${t.kind}${t.goal ? ` (${t.goal})` : ''}, bands ${t.bands[0]}–${t.bands[1]}`,
        );
      if (!hasEncounterTemplate(id)) return `No template ${id}.`;
      return apply(
        store,
        (s0) => {
          const s = ensureMap(s0);
          const t = encounterTemplate(id);
          const enc: Encounter = {
            id: `dev-${Math.floor(s.calendar.day * 1000)}`,
            template: id,
            seed: Math.floor(s.calendar.day * 7919) % 2147483647,
            band: b !== undefined && Number.isFinite(Number(b)) ? Number(b) : t.bands[0],
            at: [s.map!.at[0], s.map!.at[1]],
            meetAt: null,
            state: 'sensed',
            how: 'seen',
            tried: [],
            day: s.calendar.day,
            where: hereWords(s),
          };
          return contact(
            { ...s, map: { ...s.map!, encounters: [...s.map!.encounters, enc] } },
            enc.id,
          );
        },
        `Met ${id}.`,
      );
    },
  },
  at: {
    usage: 'at <place id>',
    help: 'Stands you at a place on the map, outside it, with no course.',
    run([id], store) {
      const s = needGame(store);
      const map = s && mapOf(ensureMap(s));
      const p = map && id ? placeById(map, id) : null;
      if (!p) return `No place ${id ?? ''} on the map.`;
      return apply(
        store,
        (g) => {
          const m = ensureMap(g);
          return { ...m, map: { ...m.map!, at: [p.x, p.y], course: null, inside: null } };
        },
        `At ${p.name}.`,
      );
    },
  },
  fast: {
    usage: 'fast [n | off]',
    help: 'Travels n times as far a day on the map (×10 unless told); off turns it back. Not saved.',
    run([n]) {
      if (n === 'off') {
        setDevPace(1);
        return 'Travel at your own pace.';
      }
      const v = n === undefined ? (getDevPace() === 1 ? 10 : 1) : Number(n);
      if (!Number.isFinite(v) || v <= 0 || v > 10_000) return 'Give a number above 0, or off.';
      setDevPace(v);
      return v === 1 ? 'Travel at your own pace.' : `Travel ×${v}: a day covers ${v} days of road.`;
    },
  },
  reveal: {
    usage: 'reveal [all]',
    help: 'Shows the whole region: every area and place Seen; all takes the hidden sites too.',
    run([which], store) {
      const s = needGame(store);
      const map = s && mapOf(ensureMap(s));
      if (!map) return 'No map yet.';
      const withHidden = which === 'all';
      return apply(
        store,
        (g) => {
          const m = ensureMap(g);
          let life = raise(m.map!, map.id, 'seen');
          for (const a of map.areas) life = raise(life, a.id, 'seen');
          for (const p of map.places) if (withHidden || !p.hidden) life = raise(life, p.id, 'seen');
          return { ...m, map: life };
        },
        `${map.name}: all Seen${withHidden ? ', hidden sites and all' : ''}.`,
      );
    },
  },
  org: {
    usage:
      'org [power id] [join [birth|adoption|marriage] | leave [to <id>] | trial | donate <low> | seat <seat> | points <n> | guest | lesson | protector]',
    help: 'Your memberships; with an id, its type, seats, treatment and allowances, and joins, leaves, sits the inner trial, donates stones, sets your seat, adds to your balance, takes a guest elder seat, buys an elder’s lesson or a protector there (O1 to O3).',
    run([id, verb, arg, to], store) {
      const s = needGame(store);
      const you = s.player.id;
      if (!id) {
        const rows = membershipsView(s);
        if (!rows.length) return 'You belong to no power.';
        return rows.map(
          (m) =>
            `${m.power}: ${m.title.name} ${m.title.hanzi} · ${m.balance} ${m.currency}${m.trial ? ` · ${m.trial}` : ''} · ${m.allowance}${m.dwelling ? ` · ${m.dwelling}` : ''}${m.quota ? ` · ${m.quota}` : ''}${m.leave ? ` · ${m.leave}` : ''}${m.protector ? ' · protector' : ''}`,
        );
      }
      if (!isOrganization(id)) return `${id} is no organization.`;
      const day = s.calendar.day;
      if (verb === 'join') {
        const by = arg === 'birth' || arg === 'adoption' || arg === 'marriage' ? arg : undefined;
        const r = joinPower(s.world, you, id, day, { you: true, realm: realmStageOf(s), by });
        return r.ok
          ? apply(store, (g) => ({ ...g, world: r.world }), `Joined ${theName(id)}.`)
          : r.why;
      }
      if (verb === 'leave') {
        const r = leavePower(s.world, you, id, day, {
          you: true,
          to: arg === 'to' ? to : undefined,
          carries: carriesGuarded(s, id),
        });
        if (!r.parting) return 'You don’t belong to it.';
        return apply(
          store,
          (g) => ({ ...g, world: r.world }),
          `Left: ${r.parting.kind}, ${r.parting.why}.`,
        );
      }
      if (verb === 'trial') {
        const r = innerTrial(s, id);
        if (!r.ok) return r.why;
        const words = `${r.verdict}: ${r.yours.toFixed(1)} against ${r.theirs.toFixed(1)}${r.passed ? ', the inner seat is yours' : ''}; ranked ${r.rank}${r.pill ? ', a Foundation Pill' : ''}.`;
        return apply(store, () => r.state, words);
      }
      if (verb === 'donate') {
        const r = donate(s, id, { stones: Number(arg) });
        return r.ok ? apply(store, () => r.state, `+${r.points} to ${theName(id)}.`) : r.why;
      }
      if (verb === 'seat') {
        if (!membership(s.world, you, houseOf(id))) return 'You don’t belong to it.';
        const seat = SEAT_IDS.find((k) => k === arg);
        if (!seat) return `A seat: ${SEAT_IDS.join(', ')}.`;
        return apply(
          store,
          (g) => ({ ...g, world: setSeat(g.world, you, id, seat) }),
          `Seated ${seat}.`,
        );
      }
      if (verb === 'points') {
        if (!membership(s.world, you, houseOf(id))) return 'You don’t belong to it.';
        const n = Number(arg);
        if (!Number.isFinite(n)) return 'Give a number.';
        return apply(
          store,
          (g) => ({ ...g, world: addBalance(g.world, you, id, n) }),
          `+${n} to your balance.`,
        );
      }
      if (verb === 'lesson' || verb === 'protector') {
        const r = verb === 'lesson' ? takeLesson(s, id) : engageProtector(s, id);
        const words =
          verb === 'lesson'
            ? 'An elder teaches you a day.'
            : 'An elder stands by your next breakthrough.';
        return r.ok ? apply(store, () => r.state, words) : r.why;
      }
      if (verb === 'guest') {
        const r = becomeGuest(s, id);
        return r.ok ? apply(store, () => r.state, `A guest elder of ${theName(id)}.`) : r.why;
      }
      const o = organization(id);
      const ranges = seatRanges(id);
      const holder = realmStageOf(s).realm;
      const monthly = (k: SeatId) => {
        const lower = k === 'outer' || k === 'inner' || k === 'true';
        const a = allowanceOf(id, k, lower ? holder : ranges[k].to.realm);
        return `${a.stones} low${a.pills ? ` and ${a.pills} pills` : ''} a month`;
      };
      return [
        `${o.name} ${o.hanzi}: ${o.type}, ${o.treatment}${o.branchOf ? `, a branch of ${o.branchOf}` : ''}`,
        `  joins by ${o.preset.join.join(', ')} · ${o.preset.currency.name} · leaves ${o.preset.leave.words}`,
        `  gives ${o.gives.join(', ')}`,
        ...SEAT_IDS.slice()
          .reverse()
          .map(
            (k) =>
              `  ${seatTitle(id, k).name} ${seatTitle(id, k).hanzi}: ${rangeWords(ranges[k])} · ${monthly(k)}`,
          ),
      ];
    },
  },
  job: {
    usage: 'job [<job id> [take | leave]]',
    help: 'Your jobs and their shifts kept and missed; with an id, takes it or leaves it by its giver’s rule (O4). `job all` lists every job.',
    run([id, verb], store) {
      const s = needGame(store);
      if (!id) {
        const rows = jobsView(s);
        if (!rows.length) return 'You hold no job.';
        return rows.map(
          (j) =>
            `${j.id}: ${j.name} ${j.hanzi} for ${j.giver} · ${j.shift.map((h) => BRANCHES[h]!.hanzi).join('')} · ${j.pay} · kept ${j.kept}, missed ${j.missed} this month${j.here ? '' : ' · away from the post'}`,
        );
      }
      if (id === 'all')
        return JOBS.map(
          (j) =>
            `${j.id}: ${j.name} · ${j.place ?? 'on the road'} · ${j.power ?? 'no power'}${j.seat ? ` from ${j.seat}` : ''}`,
        );
      if (!hasJob(id)) return `No job ${id}; \`job all\` lists them.`;
      const r = verb === 'leave' ? quitJob(s, id) : takeJob(s, id);
      if (!r.ok) return r.reason;
      return apply(store, () => r.state, `${verb === 'leave' ? 'Left' : 'Took'} ${job(id).name}.`);
    },
  },
  purse: {
    usage: 'purse <low|mid|high|top|taels> <n>',
    help: 'Adds stones of a grade, or silver taels.',
    run([grade, n], store) {
      const v = Number(n);
      if (!Number.isFinite(v)) return 'Give a grade and a number.';
      return apply(
        store,
        (s) => {
          const p = s.player;
          if (grade === 'taels') return withPlayer(s, { ...p, silver: Math.max(0, p.silver + v) });
          if (grade === 'low') return withPlayer(s, { ...p, stones: Math.max(0, p.stones + v) });
          if (grade !== 'mid' && grade !== 'high' && grade !== 'top') return s;
          const h = { ...p.higherStones, [grade]: Math.max(0, p.higherStones[grade] + v) };
          return withPlayer(s, { ...p, higherStones: h });
        },
        `${grade} ${v >= 0 ? '+' : ''}${v}.`,
      );
    },
  },
  shop: {
    usage: 'shop [id] [buy <slot> [n] | sell <thing> [n] | haggle | repair <thing>]',
    help: 'Lists the shops; with an id, its shelf this month, and buys, sells, haggles or mends there.',
    run([id, verb, arg, n], store) {
      if (!id) return SHOPS.map((x) => `${x.id}: ${x.name} (${x.kind})`);
      if (!SHOPS.some((x) => x.id === id)) return `No shop ${id}.`;
      const s = needGame(store);
      const act = (r: ShopResult, done: string): Output =>
        r.ok ? apply(store, () => r.state, done) : r.reason;
      if (verb === 'buy')
        return act(buy(s, id, Number(arg), n ? Number(n) : undefined), `Bought from line ${arg}.`);
      if (verb === 'sell' && arg) return act(sell(s, id, arg, n ? Number(n) : 1), `Sold ${arg}.`);
      if (verb === 'haggle') {
        const r = haggle(s, id);
        return act(r, `Haggled: ${Math.round((r.off ?? 0) * 100)}% off today.`);
      }
      if (verb === 'repair' && arg) return act(repair(s, id, arg), `Mended ${arg}.`);
      const ware = (t: string) => (hasCopy(t) ? copyTitle(t) : item(t).name);
      const silver = SHOP_KIND_INFO[shop(id).kind].money === 'silver';
      const cost = (p: number) => (silver ? `${p} taels` : priceWords(p));
      return [
        `${shop(id).name}, this month · you hold ${purseWords(s.player)}`,
        ...shelf(s, id).map(
          (l) =>
            `  ${l.slot}. ${ware(l.thing)} ×${l.n} (${l.thing}): ${cost(l.price)} each${l.standing ? (l.endless ? ' · stands all month' : ' · on the shelf') : ''}`,
        ),
      ];
    },
  },
  prosper: {
    usage: 'prosper <place id> [±n]',
    help: 'Shows a place’s prosperity, or moves it by n; it eases back a step a year.',
    run([id, n], store) {
      if (!id) return 'Give a place: a town’s id or an atlas place’s.';
      const s = needGame(store);
      const day = s.calendar.day;
      const words = (w: typeof s.world) => {
        const p = prosperityOf(w, id, day);
        const was = writtenProsperity(id);
        return `${id}: ${prosperityWord(p)} (${p})${p === was ? '' : `, written ${prosperityWord(was)} (${was})`}`;
      };
      if (n === undefined) return words(s.world);
      const v = Number(n);
      if (!Number.isInteger(v)) return 'Give a whole number, like +2 or -1.';
      const world = addProsperity(s.world, id, v, day);
      return apply(store, (g) => ({ ...g, world }), words(world));
    },
  },
  market: {
    usage: 'market [town or place id]',
    help: 'Lists the markets; with an id, its prosperity, needs, line of why, monthly sum, reach, shops, the copies it made and the supplies moved off their rest.',
    run([id], store) {
      const s = needGame(store);
      const day = s.calendar.day;
      const month = Math.floor(day / DAYS_PER_MONTH);
      const line = (m: (typeof MARKETS)[number]) =>
        `${m.id}: ${m.name} (${m.kind}, ${prosperityWord(prosperityOf(s.world, m.id, day))})`;
      if (!id) return MARKETS.map(line);
      const m = market(id);
      if (!m) return `No market ${id}.`;
      const off = Object.keys(s.world.supply[m.id] ?? {});
      return [
        line(m),
        `  needs: ${m.needs.join(', ') || 'nothing written'}`,
        `  why: ${whyOf(s.world, m, day) ?? 'nothing is off'}`,
        '  the monthly sum, furthest off first (used, made, carried a month; rest):',
        ...[...marketSum(s.world, m, month).goods.values()]
          .map((g) => ({ g, rest: restAt(g, month) }))
          .sort((a, b) => Math.abs(Math.log(b.rest / 100)) - Math.abs(Math.log(a.rest / 100)))
          .slice(0, 8)
          .map(
            ({ g, rest }) =>
              `    ${goodName(g.thing)} (${g.need}): ${Math.round(g.used)} used ×${g.pressure}, ${Math.round(g.made)} made, ${Math.round(g.carried)} carried; ${Math.round(rest)}%`,
          ),
        `  reaches: ${
          reachOf(m)
            .map((o) => o.name)
            .join(', ') || 'only its own goods'
        }`,
        ...m.shops.map((sid) => {
          const sh = shop(sid);
          const purse = shopPurse(s.world, sh, day);
          const money =
            SHOP_KIND_INFO[sh.kind].money === 'silver' ? `${purse} taels` : priceWords(purse);
          return `  ${sh.door.split('/').at(-1)} · ${sid}: ${sh.name}, purse ${money}, ${shopLots(s.world, sh, day)} display lots, tiers ${shopTiers(sh).join(', ')}`;
        }),
        `  copies made here: ${
          Object.keys(s.world.copied[m.id] ?? {})
            .map(copyTitle)
            .join(', ') || 'none'
        }`,
        ...(off.length ? ['  supplies moved:'] : ['  every supply at its rest']),
        ...off.map((good) => {
          const thingId = thingOfGood(good);
          const seen = seenIn(s.world, m, thingId);
          const now = Math.round(supplyOf(s.world, m, thingId, day));
          const rest = restOf(s.world, m, thingId, month);
          const at = rest !== null ? `rest ${Math.round(rest)}%` : `written ${seen.supply}%`;
          return `    ${goodName(thingId)} (${good}): ${now}%, ${at} (${seen.source})`;
        }),
      ];
    },
  },
  follow: {
    usage: 'follow <person> [pay|loyalty|fear|goal]',
    help: "Makes someone you've met follow you (P3.4b); pay asks 30 stones a month.",
    run([id, kind], store) {
      if (!id) return 'Give a person id, like old-sha.';
      const bond = (kind ?? 'loyalty') as BondId;
      if (!BOND_IDS.includes(bond)) return `A bond is one of ${BOND_IDS.join(', ')}.`;
      return apply(
        store,
        (s) => ({
          ...s,
          world: makeBond(
            s.world,
            {
              follower: id,
              leader: s.player.id,
              kind: bond,
              wage: bond === 'pay' ? 30 : undefined,
            },
            s.calendar.day,
          ),
        }),
        `${id} follows you (${bond}).`,
      );
    },
  },
  fame: {
    usage: 'fame <renown|infamy> <points>',
    help: 'Adds points of renown or infamy in the Border Wilds (P3.4b).',
    run([kind, n], store) {
      if (kind !== 'renown' && kind !== 'infamy') return 'Say renown or infamy.';
      const v = Number(n);
      if (!Number.isFinite(v)) return 'Give a number.';
      return apply(
        store,
        (s) => ({
          ...s,
          world: addFame(s.world, s.player.id, HOME_REGION, kind, v, s.calendar.day),
        }),
        `${kind === 'renown' ? 'Renown' : 'Infamy'} +${v}.`,
      );
    },
  },
  item: {
    usage: 'item <id> [n]',
    help: 'Adds an item by id, one unless told.',
    run([id, n], store) {
      if (!id) return 'Give an item id, like foundation-pill.';
      const v = n === undefined ? 1 : Number(n);
      if (!hasItem(id)) return `No item ${id}.`;
      if (!Number.isInteger(v)) return 'Give a whole number.';
      return apply(store, (s) => withPlayer(s, addItem(s.player, id, v)), `${id} +${v}.`);
    },
  },
  kit: {
    usage: 'kit',
    help: 'Adds one of every gear item, five Mending and Qi-Restoring Pills and three talismans.',
    run(_args, store) {
      return apply(
        store,
        (s) => {
          let c = s.player;
          for (const it of ITEMS) if (it.uses.equip) c = addItem(c, it.id, 1);
          c = addItem(addItem(c, 'spring-returning-pill', 5), 'qi-restoring-pill', 5);
          return withPlayer(s, addItem(c, 'ember-talisman', 3));
        },
        'Every gear item, pills and talismans added.',
      );
    },
  },
  pill: {
    usage: 'pill [qi|body|soul] [n]',
    help: "Adds a path's Foundation gate pills: the Foundation Pill unless told.",
    run([which, n], store) {
      const gates = {
        qi: 'foundation-pill',
        body: 'marrow-washing-pill',
        soul: 'soul-condensing-pill',
      };
      if (which && !(which in gates)) return COMMANDS.item!.run(['foundation-pill', which], store);
      const id = gates[(which ?? 'qi') as keyof typeof gates];
      return COMMANDS.item!.run([id, n ?? '1'], store);
    },
  },
  fill: {
    usage: 'fill [qi|body|soul] [percent]',
    help: 'Sets a bar, qi at 100% unless told; up to 150%.',
    run(args, store) {
      const which = isLadder(args[0]) ? args[0] : 'qi';
      const pct = Number((isLadder(args[0]) ? args[1] : args[0]) ?? 100);
      if (!Number.isFinite(pct) || pct < 0 || pct > 150) return 'Give a percent from 0 to 150.';
      return apply(
        store,
        (s) => {
          const l = s.player[which];
          return withPlayer(s, { ...s.player, [which]: { ...l, bar: (barSize(l) * pct) / 100 } });
        },
        `The ${which} bar is at ${pct}%.`,
      );
    },
  },
  up: {
    usage: 'up [n] [qi|body|soul]',
    help: 'Fills the bar past full and breaks through, n times, retrying failures; majors need what they need.',
    run(args, store) {
      const s = needGame(store);
      const which = (args.find(isLadder) as LadderId | undefined) ?? 'qi';
      const n = Number(args.find((a) => !isLadder(a)) ?? 1);
      if (!Number.isInteger(n) || n < 1 || n > 60) return 'Give a count from 1 to 60.';
      const lines: string[] = [];
      let next = s;
      for (let i = 0; i < n; i++) {
        let climbed = false;
        for (let tries = 0; tries < 30 && !climbed; tries++) {
          const l = next.player[which];
          next = withPlayer(next, {
            ...next.player,
            [which]: { ...l, bar: barSize(l) * 1.5, unsettledUntil: 0 },
          });
          const r = breakThrough(next, which);
          if (!r.attempted) {
            const m = majorCheck(next.player, which);
            lines.push(
              m
                ? `Stopped before ${m.target.name}: ${!m.gate ? 'no gate item (try pill)' : !m.insight ? `insight short of ${m.target.insightThreshold} earned` : 'not allowed yet'}.`
                : 'Nothing further to break through.',
            );
            i = n;
            break;
          }
          next = r.state;
          climbed = r.success;
        }
      }
      const err = store.devApply(() => next);
      if (err) return err;
      return [...lines, `${which} is at ${formatLadder(next.player[which])}.`];
    },
  },
  cards: {
    usage: 'cards',
    help: 'Lists every card id.',
    run: () => CARDS.map((c) => `${c.id.padEnd(34)} ${c.title}`),
  },
  card: {
    usage: 'card <id>',
    help: 'Puts a card in the feed now, whatever its trigger.',
    run([id], store) {
      if (!id || !hasCard(id)) return 'Give a card id (see cards).';
      return apply(
        store,
        (s) => ({
          ...s,
          cards: {
            ...s.cards,
            pending: [...s.cards.pending, { uid: s.cards.nextUid, card: id, day: s.calendar.day }],
            drawn: { ...s.cards.drawn, [id]: s.calendar.day },
            nextUid: s.cards.nextUid + 1,
          },
        }),
        `${id} waits in the feed.`,
      );
    },
  },
  settle: {
    usage: 'settle',
    help: 'Resolves every waiting card by its default choice.',
    run(_, store) {
      return apply(
        store,
        (s) => {
          let next = s;
          while (next.cards.pending.length)
            next = resolveByDefault(next, next.cards.pending[0]!.uid);
          return next;
        },
        'Every waiting card settled by default.',
      );
    },
  },
  method: {
    usage: 'method [id]',
    help: 'Hands over a method; without an id, lists them.',
    run([id], store) {
      if (!id)
        return METHODS.map((m) => `${m.id.padEnd(30)} ${m.ladder} · ${m.rarity} · tier ${m.tier}`);
      if (!hasMethod(id)) return `No method "${id}".`;
      return apply(store, (s) => gainMethod(s, id, 'is handed'), `Handed the ${id}.`);
    },
  },
  manual: {
    usage: 'manual [id]',
    help: 'Hands over a loose manual; without an id, lists them.',
    run([id], store) {
      if (!id) return MANUALS.map((m) => `${m.id.padEnd(30)} ${m.kind} · ${m.rarity}`);
      if (!hasManual(id)) return `No manual "${id}".`;
      return apply(store, (s) => gainManual(s, id, 'is handed'), `Handed the ${id}.`);
    },
  },
  copy: {
    usage: 'copy [id]',
    help: 'Hands over a copy to read: manual:tide-counting, method:pine-wind, technique:rampart-palm. Without an id, lists the kinds.',
    run([id], store) {
      if (!id) {
        return [
          'manual:<id>     a loose manual (see manual)',
          'method:<id>     a method (see method)',
          'technique:<id>  a technique (see technique)',
        ];
      }
      // A bare manual, method or technique id takes the first kind that has it.
      const full = hasCopy(id) ? id : COPY_KINDS.map((k) => copyId(k, id)).find(hasCopy);
      if (!full) return `No copy "${id}".`;
      return apply(store, (s) => gainCopy(s, full, 'is handed'), `Handed a copy: ${full}.`);
    },
  },
  practice: {
    usage: 'practice <id>',
    help: 'Puts a known technique in the first free practice slot.',
    run([id], store) {
      const s = needGame(store);
      if (!id) return 'Give a technique id.';
      const r = practice(s, id);
      if (!r.check.ok) return r.check.reason;
      return apply(store, (g) => practice(g, id).state, `Practicing ${id}.`);
    },
  },
  queue: {
    usage: 'queue <copy>',
    help: 'Adds an owned copy to the end of the reading queue: manual:tide-counting, or a bare id.',
    run([id], store) {
      const s = needGame(store);
      if (!id) return 'Give a copy id.';
      const full = hasCopy(id) ? id : COPY_KINDS.map((k) => copyId(k, id)).find(hasCopy);
      if (!full) return `No copy "${id}".`;
      const r = readCopy(s, full);
      if (!r.check.ok) return r.check.reason;
      return apply(store, (g) => readCopy(g, full).state, `Queued ${full}.`);
    },
  },
  chronicle: {
    usage: 'chronicle',
    help: 'Writes a made-up long chronicle over the open life: Lan Shu before it, then this life to 46 through Foundation and 18 years of seclusion. Moves the calendar on; the cultivator stays.',
    run(_args, store) {
      return apply(store, madeUpLife, 'Wrote a made-up chronicle: two lives, 3,115 to 3,213.');
    },
  },
  shelf: {
    usage: 'shelf',
    help: 'Fills the bookcase with 150 made-up manuals, most finished. Dev builds only.',
    run(_args, store) {
      const made = MADE_UP;
      const add = (have: string[], more: string[]) => [...new Set([...have, ...more])];
      return apply(
        store,
        (s) =>
          withPlayer(s, {
            ...s.player,
            manuals: add(
              s.player.manuals,
              made.manuals.map((m) => m.id),
            ),
            nodes: add(s.player.nodes, made.learned),
          }),
        `Shelved ${made.manuals.length} made-up manuals.`,
      );
    },
  },
  seat: {
    usage: 'seat',
    help: 'Prints the seat: attending, the factor, focus, heat and the orbs in the cave.',
    run(_, store) {
      const s = needGame(store);
      const a = useSeat.getState().attention;
      if (!a) return 'The seat has not started.';
      const lines = [
        `${a.attended ? 'attending' : 'away'} · ×${attentionFactor(a, s.player).toFixed(2)} · focus ${Math.round(a.focus * 100)}% · heat ${a.heat.toFixed(2)} of ${heatLimit(s.player).toFixed(2)}${heatUnsettled(a) ? ' · unsettled' : ''}`,
        `${a.caught} drawn in, ${a.timed} on the inhale · ${inhaling(a.t) ? 'inhaling' : 'exhaling'} · next orb in ${Math.max(0, a.nextOrbAt - a.t).toFixed(1)} s`,
      ];
      for (const o of a.orbs) {
        const [x, y] = orbPosition(o, a.t);
        lines.push(
          `  orb ${o.id} ${o.tint} at (${x.toFixed(0)}, ${y.toFixed(0)}), fades in ${(o.fades - a.t).toFixed(1)} s`,
        );
      }
      return lines;
    },
  },
  orb: {
    usage: 'orb',
    help: 'Brings the next orb now, if the figure is on screen.',
    run() {
      const a = useSeat.getState().attention;
      if (!a) return 'The seat has not started.';
      useSeat.setState({ attention: { ...a, nextOrbAt: a.t } });
      return 'An orb drifts in.';
    },
  },
  technique: {
    usage: 'technique [id]',
    help: 'Teaches a technique; without an id, lists them.',
    run([id], store) {
      if (!id) return TECHNIQUES.map((t) => `${t.id.padEnd(30)} ${t.name}`);
      if (!hasTechnique(id)) return `No technique "${id}".`;
      return apply(store, (s) => gainTechnique(s, id, 'is taught'), `Taught ${id}.`);
    },
  },
  intent: {
    usage: 'intent <dao> [ready]',
    help: 'Learns the capstone that readies a Dao’s next Intent stage and breaks through with a moment; with ready, stops a moment away (the epiphany card can come).',
    run([dao, only], store) {
      if (!dao || !isCombatDao(dao)) return `Give a combat Dao: ${COMBAT_DAO_IDS.join(', ')}.`;
      return apply(
        store,
        (s) => {
          const p = s.player;
          const next = intentStage(p, dao) + 1;
          const cap = capstoneOf(dao, readyingTier(p, dao, next));
          if (!cap) return s;
          const ready = withPlayer(s, { ...p, nodes: [...new Set([...p.nodes, cap])] });
          return only === 'ready' ? ready : intentMoment(ready, dao, 'epiphany');
        },
        only === 'ready' ? `Ready in ${dao}.` : `A moment in ${dao}.`,
      );
    },
  },
  routine: {
    usage: 'routine [id]',
    help: 'Teaches a routine; without an id, lists them.',
    run([id], store) {
      if (!id) return ROUTINES.map((r) => `${r.id.padEnd(30)} ${r.name}`);
      if (!hasRoutine(id)) return `No routine "${id}".`;
      return apply(store, (s) => gainRoutine(s, id, 'is taught'), `Taught ${id}.`);
    },
  },
  unlock: {
    usage: 'unlock <screen|all>',
    help: 'Shows a screen in the menu before it is reached.',
    run([id], store) {
      const ids =
        id === 'all'
          ? [...screens.flatMap((x) => (x.unlock ? [x.unlock] : [])), 'techniques']
          : id
            ? [id]
            : [];
      if (!ids.length) return 'Give a screen id or all.';
      return apply(
        store,
        (s) => ({ ...s, unlocks: [...new Set([...s.unlocks, ...ids])] }),
        `Unlocked ${ids.join(', ')}.`,
      );
    },
  },
  state: {
    usage: 'state',
    help: 'Prints where the life stands.',
    run: (_, store) => summary(needGame(store), store.speed),
  },
  save: {
    usage: 'save',
    help: 'Saves now.',
    run(_, store) {
      void store.saveNow();
      return 'Saved.';
    },
  },
  clear: {
    usage: 'clear',
    help: 'Clears the console.',
    run: () => [],
  },
};

/** Runs one line, returning what to print. */
export function runCommand(line: string, store: GameStore): Output {
  const [name, ...args] = line.trim().split(/\s+/);
  if (!name) return [];
  const c = COMMANDS[name.toLowerCase()];
  if (!c) return `Unknown command "${name}". Try help.`;
  try {
    return c.run(args, store);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
