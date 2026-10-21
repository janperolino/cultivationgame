// Quests are offered where they live (design § UI and screens, The journal): at a board, a shop's
// or a hall's counter, or by a person where they stand. A giver's quests show here as rows with
// their reason and reward, taken with Take; one of theirs with every step done is handed in here.
import { useState } from 'react';
import { quest, type QuestGiver } from '../content/quests.ts';
import {
  handIn,
  handInCheck,
  offersAt,
  questPlace,
  stepsDone,
  takeQuest,
} from '../core/journal.ts';
import type { GameState } from '../core/state.ts';
import { useGame } from './store.ts';

export function QuestOffers({
  game,
  kind,
  place,
  who,
}: {
  game: GameState;
  kind: QuestGiver['kind'];
  /** The map place the giver stands at. */
  place: string;
  /** The person or shop, when the giver is one. */
  who?: string;
}) {
  const applyLife = useGame((s) => s.applyLife);
  const [said, setSaid] = useState<string | null>(null);
  const offers = offersAt(game, { kind, place, who }, { dev: import.meta.env.DEV });
  // Quests of this giver's under way with every step done, to hand in.
  const toHand = game.journal.quests.filter((q) => {
    if (q.handed !== null || !stepsDone(q)) return false;
    const g = quest(q.id).giver;
    return g.kind === kind && g.who === who && questPlace(game, g.place)?.id === place;
  });
  if (offers.length === 0 && toHand.length === 0) return null;
  const run = (
    f: (s: GameState) => { ok: true; state: GameState } | { ok: false; reason: string },
  ) => {
    const r = f(game);
    if (!r.ok) return setSaid(r.reason);
    setSaid(null);
    applyLife(() => r.state);
  };
  return (
    <div className="place-rows quest-offers">
      {toHand.map((q) => {
        const def = quest(q.id);
        const check = handInCheck(game, q.id);
        return (
          <div key={q.id} className="place-row is-plain">
            <span>
              <span className="quest-seal is-followed" aria-hidden="true">
                志
              </span>
              <span className="place-row-name">{def.title}</span>
              <br />
              <span className="place-sub">Every step done · {def.reward.text}</span>
            </span>
            <button
              type="button"
              className="place-btn is-primary"
              disabled={!check.ok}
              title={check.ok ? undefined : check.reason}
              onClick={() => run((s) => handIn(s, q.id))}
            >
              Hand in
            </button>
          </div>
        );
      })}
      {offers.map((q) => (
        <div key={q.id} className="place-row is-plain">
          <span>
            <span className="quest-seal" aria-hidden="true">
              志
            </span>
            <span className="place-row-name">{q.title}</span>
            <br />
            <span className="place-sub">
              {q.reason} · {q.steps.length} step{q.steps.length === 1 ? '' : 's'} · {q.reward.text}
            </span>
          </span>
          <button
            type="button"
            className="place-btn is-primary"
            onClick={() => run((s) => takeQuest(s, q.id))}
          >
            Take
          </button>
        </div>
      ))}
      {said && <p className="caption">{said}</p>}
    </div>
  );
}
