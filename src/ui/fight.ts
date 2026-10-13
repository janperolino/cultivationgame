// The fight in progress on the Combat screen: the session's, never saved, the way a scene is. The
// rules run in core/spar.ts against the open life through the store, so every roll lands on the
// life's `combat` stream; this keeps the fight, the selected foe, the log and the outcomes the
// effects layer still has to play. A reload mid-fight drops it, and nothing is spent until it ends.
import { create } from 'zustand';
import { hasItem, item } from '../content/items.ts';
import { hasTechnique, technique } from '../content/techniques.ts';
import {
  combatantIn,
  type Action,
  type Fight,
  type Outcome,
  type Tick,
} from '../core/combat/fight.ts';
import { logLine } from '../core/combat/log.ts';
import { endSpar, playTurn, sparResult, startSpar, YOU, type SparResult } from '../core/spar.ts';
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
  foe: string;
  /** The foe the technique buttons price against. */
  target: string | null;
  log: LogEntry[];
  /** Outcomes and ticks the effects layer hasn't played yet, oldest first. */
  pending: { outcomes: Outcome[]; ticks: Tick[]; fight: Fight } | null;
  result: SparResult | null;
}

export const useFight = create<FightStore>()(() => ({
  fight: null,
  foe: '',
  target: null,
  log: [],
  pending: null,
  result: null,
}));

const firstFoe = (f: Fight) =>
  f.combatants.find((c) => c.side !== YOU && c.state === 'fighting')?.id ?? null;

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

/** Opens a spar against a roster template; returns why not, or null. */
export function beginSpar(templateId: string): string | null {
  let started: ReturnType<typeof startSpar> = null;
  const ok = useGame.getState().applyLife((s) => {
    started = startSpar(s, templateId);
    return started?.state ?? s;
  });
  const r = started as ReturnType<typeof startSpar>;
  if (!ok || !r) return 'No fight can start now.';
  useFight.setState({
    fight: r.fight,
    foe: r.foe,
    target: firstFoe(r.fight),
    log: [],
    pending: null,
    result: null,
  });
  return null;
}

/** Plays the player's action and every foe's; closes the spar when it ends. */
export function act(action: Omit<Action, 'actor'>): void {
  const { fight, target, foe } = useFight.getState();
  const me = useGame.getState().game?.player.id;
  if (!fight || !me || useFight.getState().result) return;
  let turn: ReturnType<typeof playTurn>['turn'] | null = null;
  useGame.getState().applyLife((s) => {
    const r = playTurn(s, fight, { ...action, actor: me });
    turn = r.turn;
    return r.state;
  });
  const t = turn as ReturnType<typeof playTurn>['turn'] | null;
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
  const result = sparResult(f, me);
  const stillThere = target && combatantIn(f, target)?.state === 'fighting' ? target : firstFoe(f);
  useFight.setState((st) => ({
    fight: f,
    target: stillThere,
    log: [...st.log, ...lines],
    pending: { outcomes: t.outcomes, ticks: t.ticks, fight: f },
    result,
  }));
  if (result) useGame.getState().applyLife((s) => endSpar(s, f, foe));
}

export function selectTarget(id: string): void {
  useFight.setState({ target: id });
}

/** The effects layer took the pending outcomes. */
export function takePending(): void {
  useFight.setState({ pending: null });
}

/** Leaves the finished spar for the list. */
export function leaveSpar(): void {
  useFight.setState({ fight: null, foe: '', target: null, log: [], pending: null, result: null });
}
