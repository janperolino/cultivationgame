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
import { combatantIn, type Fight, type Outcome, type Tick } from '../core/combat/fight.ts';
import { logLine } from '../core/combat/log.ts';
import { fightEnd, playTurn, type FightEnd, type YourAction } from '../core/played.ts';
import { currentFight, finishFight, foeNames } from '../core/playFight.ts';
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
}

export const useFight = create<FightStore>()(() => ({
  fight: null,
  target: null,
  log: [],
  pending: null,
  end: null,
  after: null,
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
        : o.action === 'item' && o.id
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
  if (!f) return;
  useFight.setState({
    fight: f,
    target: firstFoe(f, s.player.id),
    log: [],
    pending: null,
    end: fightEnd(f, s.player.id),
    after: null,
  });
}

/** Plays your action and every foe's. */
export function act(action: YourAction): void {
  // The first move ends the first fight turn's veil (ui/guide.ts).
  endGuide('fight-turn');
  const { fight, target, end } = useFight.getState();
  const me = useGame.getState().game?.player.id;
  if (!fight || !me || end) return;
  let turn: ReturnType<typeof playTurn> = null;
  useGame.getState().applyLife((s) => {
    turn = playTurn(s, fight, action);
    return turn?.state ?? s;
  });
  const t = (turn as ReturnType<typeof playTurn>)?.turn;
  if (!t) return;
  const f = t.fight;
  const lines: LogEntry[] = [
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
    ...t.skipped
      .filter(
        (x) => x.reason === 'frozen' || x.reason === 'undertow' || x.reason === 'not enough qi',
      )
      .map((x) => ({
        turn: f.turn,
        head: combatantIn(f, x.actor)?.name ?? x.actor,
        line: x.reason === 'frozen' ? 'frozen, loses the turn' : x.reason,
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
  useGame.getState().applyLife((s) => {
    const r = finishFight(s, fight);
    text = r?.text ?? '';
    return r?.state ?? s;
  });
  useFight.setState({
    fight: null,
    target: null,
    log: [],
    pending: null,
    end: null,
    after: text || null,
  });
  void useGame.getState().saveNow();
}

/** The hand-back's words were read. */
export function dismissAfter(): void {
  useFight.setState({ after: null });
}
