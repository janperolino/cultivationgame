// The Chronicle screen (design § UI and screens): your life as a biography, newest year first, each
// line under the season it happened in. Earlier lives in the slot stay, under their own heading.
// The cards that settled themselves can be left out, so the choices and milestones stand clear.
import { useState } from 'react';
import { bySeason, settledItself } from '../core/chronicle.ts';
import { capitalize } from './format.ts';
import { useGame } from './store.ts';
import { EventLine } from './widgets.tsx';

const PAGE = 120;

export function ChronicleScreen() {
  const game = useGame((s) => s.game);
  const [shown, setShown] = useState(PAGE);
  const [all, setAll] = useState(true);
  if (!game) return null;
  const c = game.player;
  const events = game.chronicle
    .slice()
    .reverse()
    .filter((e) => all || !settledItself(e));
  const hidden = all ? 0 : game.chronicle.filter(settledItself).length;
  const groups = bySeason(c, events.slice(0, shown));

  return (
    <section className="panel">
      <div className="chronicle-head">
        <h2 className="panel-heading">The life of {c.name}</h2>
        <div className="seg" role="group" aria-label="Which lines to show">
          <button type="button" aria-pressed={all} onClick={() => setAll(true)}>
            Everything
          </button>
          <button type="button" aria-pressed={!all} onClick={() => setAll(false)}>
            Leave out what settled itself
          </button>
        </div>
      </div>
      {hidden > 0 && (
        <p className="caption">
          Leaving out {hidden === 1 ? 'one card' : `${hidden} cards`} that settled without you.
        </p>
      )}
      <div className="biography">
        {groups.map((g, i) => (
          <div key={`${g.when}-${i}`} className="biography-season">
            <h3 className="sub-heading">{capitalize(g.when)}</h3>
            <ul>
              {g.items.map((e, j) => (
                <li key={`${e.day}-${j}`}>
                  <EventLine game={game} e={e} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {events.length > shown && (
        <div className="actions">
          <button
            type="button"
            className="button button-quiet"
            onClick={() => setShown((n) => n + PAGE)}
          >
            Further back
          </button>
        </div>
      )}
    </section>
  );
}
