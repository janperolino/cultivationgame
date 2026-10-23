// The fight on the stage (Fights you play): the life holds the fight under way (core/played.ts),
// and this keeps what the screen shows of it: the fight as it stands, the selected foe, the log and
// the outcomes the effects layer still has to play. Every roll lands on the fight's own seed, so a
// reload replays the actions to the same turn (the log starts over from there). The fight hands its
// end back only when you leave it, so the stage holds until then.
import { endGuide } from './guide.ts';
import { create } from 'zustand';
import { hasItem, item } from '../content/items.ts';
import { hasTechnique, technique } from '../content/techniques.ts';
import { card } from '../content/cards/index.ts';
import { encounterTemplate } from '../content/encounters/index.ts';
import {
  combatantIn,
  type Fight,
  type Join,
  type Outcome,
  type Tick,
} from '../core/combat/fight.ts';
import { PROJECTION } from '../content/resolver.ts';
import { capitalize } from './format.ts';
import { logLine } from '../core/combat/log.ts';
import { fightEnd, playTurn, type FightEnd, type YourAction } from '../core/played.ts';
import { cueGains, deltas, riseGains, type Delta } from './feel.ts';
import {
  currentFight,
  dropLostFight,
  finishFight,
  foeNames,
  type Finished,
} from '../core/playFight.ts';
import type { SceneFightBack } from '../core/goin.ts';
import type { GameState } from '../core/state.ts';
import { useGame } from './store.ts';

export interface LogEntry {
  turn: number;
  /** Who acted, and with what. */
  head: string;
  line: string;
  mine: boolean;
}

interface FightStore {
  fight: Fight | null;
  /** The foe the technique buttons price against. */
  target: string | null;
  log: LogEntry[];
  /** Outcomes and ticks the effects layer hasn't played yet, oldest first. */
  pending: { outcomes: Outcome[]; ticks: Tick[]; fight: Fight } | null;
  end: FightEnd | null;
  /** What the card or the road said when the fight went back to it, shown once. */
  after: string | null;
  /** What the fight and its hand-back gave or took (F1), shown as +n with `after`. */
  afterGains: Delta[];
}

export const useFight = create<FightStore>()(() => ({
  fight: null,
  target: null,
  log: [],
  pending: null,
  end: null,
  after: null,
  afterGains: [],
}));

function firstFoe(f: Fight, me: string): string | null {
  const side = combatantIn(f, me)?.side;
  return f.combatants.find((c) => c.side !== side && c.state === 'fighting')?.id ?? null;
}

/** What an outcome's actor did, in words: "Han Li · Rampart Palm". */
function head(f: Fight, o: Outcome): string {
  const who = combatantIn(f, o.actor)?.name ?? o.actor;
  const what =
    o.action === 'technique' && o.id && hasTechnique(o.id)
      ? technique(o.id).name
      : o.action === 'technique'
        ? (combatantIn(f, o.actor)?.techniques[o.id ?? '']?.technique.name ?? 'a technique')
        : (o.action === 'item' ||
              o.action === 'volley' ||
              o.action === 'detonate' ||
              o.action === 'flags') &&
            o.id
          ? hasItem(o.id)
            ? item(o.id).name
            : (combatantIn(f, o.actor)?.items[o.id]?.item.name ?? 'an item')
          : o.action;
  return `${who} · ${what}`;
}

/** The fight's title on the stage: who you spar with, the encounter, or the card. */
export function fightTitle(s: GameState, f: Fight): string {
  const from = s.fight?.from;
  if (!from || from.kind === 'spar') return `Sparring with ${foeNames(s, f)}`;
  if (from.kind === 'road') {
    const enc = s.map?.encounters.find((e) => e.id === from.enc);
    return enc ? encounterTemplate(enc.template).title : `Against ${foeNames(s, f)}`;
  }
  if (from.kind === 'trap') return `In your trap: ${foeNames(s, f)}`;
  if (from.kind === 'scene') return s.goin?.title || `Against ${foeNames(s, f)}`;
  const p = s.cards.pending.find((x) => x.uid === from.uid);
  return p ? card(p.card).title : `Against ${foeNames(s, f)}`;
}

/**
 * Puts the life's fight on the stage when the screen has none of it: a fight just opened by the
 * rules (a card, the road, a spar), or one a reload brought back.
 */
export function syncFight(s: GameState): void {
  const st = useFight.getState();
  if (!s.fight) {
    if (st.fight && !st.end) useFight.setState({ fight: null, log: [], pending: null });
    return;
  }
  if (st.fight) return;
  const f = currentFight(s);
  // A fight whose start a later build lost leaves the stage, and the clock runs again.
  if (!f) {
    useGame.getState().applyLife(dropLostFight);
    return;
  }
  useFight.setState({
    fight: f,
    target: firstFoe(f, s.player.id),
    log: [],
    pending: null,
    end: fightEnd(f, s.player.id),
    after: null,
  });
}

/** One exchange as the screen tells it: its lines, who joined and who faded, and the fight after. */
export interface Exchange {
  fight: Fight;
  /** What each action did, for the narrator (ai/outcome.ts `exchangeOutcome`). */
  outcomes: Outcome[];
  lines: LogEntry[];
  came: Join[];
  faded: string[];
  end: FightEnd | null;
  /** Your words, or the button's name. */
  said: string;
  /** Why a typed turn played as something else (P3.9c). */
  why: string | null;
  /** You gave face this exchange. */
  face: boolean;
}

/** A scene's fight tells each exchange on the go-in screen (ui/goin.ts), and holds the buttons while it does. */
let sceneTurn: ((x: Exchange) => void) | null = null;
let held: () => boolean = () => false;

export function setSceneTurn(f: (x: Exchange) => void, hold: () => boolean): void {
  sceneTurn = f;
  held = hold;
}

/** Your action in words: "Ember Palm", "Strike", "Bluff". */
function saidOf(f: Fight, me: string, a: YourAction): string {
  if (a.face) return 'Give face';
  const m = a.main;
  if (!m) return 'Wait';
  if (m.type === 'technique')
    return combatantIn(f, me)?.techniques[m.id]?.technique.name ?? 'An art';
  if (m.type === 'item') return combatantIn(f, me)?.items[m.id]?.item.name ?? 'An item';
  if (m.type === 'talk') return capitalize(m.style);
  if (m.type === 'defend' && a.minor?.type === 'take_cover') return 'Take cover and defend';
  return capitalize(m.type);
}

/** Who joined, as the log says it: the law against whoever started it, a projection's line. */
function cameLine(f: Fight, j: Join, me: string): LogEntry {
  const mine = j.who.side === combatantIn(f, me)?.side;
  return {
    turn: f.turn,
    head: j.who.name,
    line:
      j.why === 'projection'
        ? `arrives at ${combatantIn(f, j.charge ?? '')?.name ?? 'their charge'}'s side: “${PROJECTION.line}”`
        : `joins the fight, ${mine ? 'on your side' : 'against you'}`,
    mine,
  };
}

/** Plays your action and every foe's. */
export function act(action: YourAction, said?: string, why: string | null = null): void {
  // The first move ends the first fight turn's veil (ui/guide.ts).
  endGuide('fight-turn');
  const { fight, target, end } = useFight.getState();
  const me = useGame.getState().game?.player.id;
  if (!fight || !me || end || held()) return;
  let turn: ReturnType<typeof playTurn> = null;
  useGame.getState().applyLife((s) => {
    turn = playTurn(s, fight, action);
    return turn?.state ?? s;
  });
  const t = (turn as ReturnType<typeof playTurn>)?.turn;
  if (!t) return;
  const f = t.fight;
  const lines: LogEntry[] = [
    // Who joined as the turn began (P3.9c), and a projection whose turns ran out.
    ...t.came.map((j) => cameLine(f, j, me)),
    ...t.faded.map((id) => ({
      turn: f.turn,
      head: combatantIn(f, id)?.name ?? id,
      line: 'fades',
      mine: false,
    })),
    // The arrays on the ground act as the turn begins (K10): a strike, or a foe held.
    ...(t.ground ?? []).map((g) => ({
      turn: f.turn,
      head: `${g.name} · ${combatantIn(f, g.target)?.name ?? g.target}`,
      line:
        g.does === 'killing'
          ? `${g.damage ?? 0} from the array, never missing${g.hp ? ` · ${g.hp.hp}/${g.hp.max}` : ''}`
          : 'held by the lines this turn (定)',
      mine: true,
    })),
    ...t.ticks.map((k) => ({
      turn: f.turn,
      head: `${combatantIn(f, k.id)?.name ?? k.id} · ${k.status}`,
      line: `${k.damage} from ${k.status}`,
      mine: k.id !== me,
    })),
    ...t.outcomes.map((o) => ({
      turn: f.turn,
      head: head(f, o),
      line: logLine(f, o),
      mine: o.actor === me,
    })),
    // Every action of yours that didn't take says why, so no turn passes in silence (review
    // 2026-10-21); a foe's only for what holds it.
    ...t.skipped
      .filter(
        (x) =>
          x.reason === 'frozen' ||
          x.reason === 'held' ||
          x.reason === 'undertow' ||
          x.reason === 'not enough qi' ||
          (x.actor === me &&
            x.reason !== 'not in the fight' &&
            x.reason !== 'not commanded' &&
            combatantIn(f, me)?.state === 'fighting'),
      )
      .map((x) => ({
        turn: f.turn,
        head: combatantIn(f, x.actor)?.name ?? x.actor,
        line:
          x.reason === 'frozen'
            ? 'frozen, loses the turn'
            : x.reason === 'held'
              ? 'held, loses the turn'
              : x.reason,
        mine: x.actor === me,
      })),
  ];
  const stillThere =
    target && combatantIn(f, target)?.state === 'fighting' ? target : firstFoe(f, me);
  useFight.setState((st) => ({
    fight: f,
    target: stillThere,
    log: [...st.log, ...lines],
    pending: { outcomes: t.outcomes, ticks: t.ticks, fight: f },
    end: fightEnd(f, me),
  }));
  // Every exchange is saved, so a reload comes back to it rather than away from it.
  void useGame.getState().saveNow();
  if (useGame.getState().game?.fight?.from.kind === 'scene')
    sceneTurn?.({
      fight: f,
      outcomes: t.outcomes,
      lines,
      came: t.came,
      faded: t.faded,
      end: fightEnd(f, me),
      said: said ?? saidOf(fight, me, action),
      why,
      face: !!action.face,
    });
}

export function selectTarget(id: string): void {
  useFight.setState({ target: id });
}

/** The effects layer took the pending outcomes. */
export function takePending(): void {
  useFight.setState({ pending: null });
}

/** Leaves the ended fight: its end goes back to where it came from and the clock runs again. */
export function leaveFight(): void {
  const { fight } = useFight.getState();
  if (!fight) return;
  let text = '';
  let changed: Delta[] = [];
  let back: Finished | null = null;
  useGame.getState().applyLife((s) => {
    const r = finishFight(s, fight);
    back = r;
    text = r?.text ?? '';
    if (r) changed = deltas(s, r.state);
    return r?.state ?? s;
  });
  cueGains(changed);
  // A scene's fight goes back to the scene, which tells it (P3.9): no words over the stage.
  const scene = (back as Finished | null)?.scene;
  if (scene) {
    useFight.setState({ fight: null, target: null, log: [], pending: null, end: null });
    void useGame.getState().saveNow();
    sceneFightBack?.(scene, (back as unknown as Finished).end, fight);
    return;
  }
  useFight.setState({
    fight: null,
    target: null,
    log: [],
    pending: null,
    end: null,
    after: text || null,
    afterGains: changed,
  });
  void useGame.getState().saveNow();
}

let sceneFightBack: ((back: SceneFightBack, end: FightEnd, f: Fight) => void) | null = null;

/** The go-in screen takes a scene's fight back to tell it (ui/goin.ts). */
export function setSceneFightBack(
  f: (back: SceneFightBack, end: FightEnd, fight: Fight) => void,
): void {
  sceneFightBack = f;
}

/** The hand-back's words were read. */
export function dismissAfter(): void {
  riseGains(useFight.getState().afterGains);
  useFight.setState({ after: null, afterGains: [] });
}
