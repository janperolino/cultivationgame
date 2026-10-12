// The Chronicle screen (design § UI and screens): your life as a biography, newest year first, each
// line under the season it happened in. Earlier lives in the slot stay, under their own heading.
import { useState } from 'react';
import { eventText, lifeWhen } from '../core/chronicle.ts';
import type { ChronicleEvent } from '../core/state.ts';
import { useGame } from './store.ts';

const PAGE = 120;

export function ChronicleScreen() {
  const game = useGame((s) => s.game);
  const [shown, setShown] = useState(PAGE);
  if (!game) return null;
  const c = game.player;
  const events = game.chronicle.slice().reverse();
  const visible = events.slice(0, shown);

  // Group by "the spring of the fourteenth year", in the order they come.
  const groups: { when: string; items: ChronicleEvent[] }[] = [];
  for (const e of visible) {
    const when = e.day < c.bornDay ? 'A past life' : lifeWhen(c, e.day);
    const last = groups.at(-1);
    if (last?.when === when) last.items.push(e);
    else groups.push({ when, items: [e] });
  }

  return (
    <section className="panel">
      <h2 className="panel-heading">The life of {c.name}</h2>
      <div className="biography">
        {groups.map((g, i) => (
          <div key={`${g.when}-${i}`} className="biography-season">
            <h3 className="sub-heading">{g.when[0]!.toUpperCase() + g.when.slice(1)}</h3>
            <ul>
              {g.items.map((e, j) => (
                <li key={`${e.day}-${j}`}>{eventText(game, e)}</li>
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
