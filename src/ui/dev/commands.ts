// The dev console's commands: testing shortcuts that change the open life through the same rules
// the game uses where they can (time runs through the day step, breakthroughs roll their odds,
// cards go through the feed), and set numbers directly where testing needs a jump. Dev builds only.
import { CARDS, hasCard } from '../../content/cards/index.ts';
import { LADDERS, type LadderId } from '../../content/cultivation.ts';
import { COPY_KINDS, copyId, hasCopy } from '../../content/copies.ts';
import { ITEMS } from '../../content/items.ts';
import { hasManual, MANUALS } from '../../content/manuals.ts';
import { registerManuals } from '../../content/nodes.ts';
import { hasMethod, METHODS } from '../../content/methods.ts';
import { hasRoutine, ROUTINES } from '../../content/routines.ts';
import { hasTechnique, TECHNIQUES } from '../../content/techniques.ts';
import { playDay, resolveByDefault } from '../../core/cards.ts';
import { barSize, majorCheck } from '../../core/cultivation.ts';
import { gainInsight } from '../../core/insight.ts';
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
} from '../../core/life.ts';
import { advance, daysPerRealMs } from '../../core/loop.ts';
import { madeUpManuals } from '../../core/madeUpManuals.ts';
import { addItem, ageYears, daysLived, withPlayer, type GameState } from '../../core/state.ts';
import { formatDays, formatLadder, formatNumber } from '../format.ts';
import { screens } from '../screens.ts';
import { useSeat } from '../seat.ts';
import type { GameStore } from '../store.ts';

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
  if (unit === 'y') return (n * 360) / daysPerRealMs(s);
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
      return store.devAway(ms) ?? 'Back from seclusion; see the Abode.';
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
  item: {
    usage: 'item <id> [n]',
    help: 'Adds an item by id, one unless told.',
    run([id, n], store) {
      if (!id) return 'Give an item id, like foundation-pill.';
      const v = n === undefined ? 1 : Number(n);
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
          c = addItem(addItem(c, 'mending-pill', 5), 'qi-restoring-pill', 5);
          return withPlayer(s, addItem(c, 'ember-talisman', 3));
        },
        'Every gear item, pills and talismans added.',
      );
    },
  },
  pill: {
    usage: 'pill [n]',
    help: 'Adds Foundation Pills.',
    run([n], store) {
      return COMMANDS.item!.run(['foundation-pill', n ?? '1'], store);
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
        id === 'all' ? screens.flatMap((x) => (x.unlock ? [x.unlock] : [])) : id ? [id] : [];
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
