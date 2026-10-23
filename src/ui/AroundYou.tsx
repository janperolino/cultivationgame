// Around you 周遭 (People and ties' design, Street time and Around you; P3.9b). Beside a place's doors,
// a line every 15 to 30 seconds from its crowd, its hours, the kept who live there and what your
// deeds stirred (core/aroundYou.ts); one in four is a small place card, taken up by its choices or by
// Go in with a key. The column is the place's pulse: the lines fade as they age and nothing waits on
// you. No popups, no GLM, and no looping paint: each line is static text.
import { useEffect, useRef, useState } from 'react';
import type { AroundCard } from '../content/aroundYou.ts';
import { aroundFindings, aroundGap, aroundLine, playCard } from '../core/aroundYou.ts';
import type { MapPlace, RegionMap } from '../core/map/region.ts';
import { goInAt } from './goin.ts';
import { useSettings } from './settings.ts';
import { useGame } from './store.ts';
import { GoInHour } from './GoInHour.tsx';

interface Line {
  n: number;
  text: string;
  card: AroundCard | null;
  /** What came of the card, once taken up. */
  done?: string;
}

/** Lines kept on screen; older ones scroll off. */
const KEPT = 4;

export function AroundYou({ map, place }: { map: RegionMap; place: MapPlace }) {
  const keyed = useSettings((s) => !!s.openRouterKey);
  const [lines, setLines] = useState<Line[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const n = useRef(0);
  useEffect(() => {
    let timer: number;
    let first = true;
    const next = () => {
      const g = useGame.getState().game;
      // What the place's kept frames turned up since you were here: told first.
      const f = first && g ? aroundFindings(g, place.id) : null;
      first = false;
      if (f?.lines.length) {
        useGame.getState().applyLife(() => f.state);
        setLines(f.lines.slice(-KEPT).map((text, i) => ({ n: -1 - i, text, card: null })));
      } else if (g) {
        const i = n.current++;
        const l = aroundLine(g, place.id, i);
        setLines((ls) => [...ls, { n: i, text: l.text, card: l.card }].slice(-KEPT));
      }
      timer = window.setTimeout(next, aroundGap(place.id, n.current) * 1000);
    };
    timer = window.setTimeout(next, 4000);
    return () => window.clearTimeout(timer);
  }, [place.id]);
  const take = (l: Line, i: number) => {
    const g = useGame.getState().game;
    if (!g || !l.card) return;
    const r = playCard(g, l.card, i);
    if (typeof r === 'string') return;
    useGame.getState().applyLife(() => r.state);
    setLines((ls) => ls.map((x) => (x.n === l.n ? { ...x, done: r.text } : x)));
    setOpen(null);
  };
  if (!lines.length) return null;
  return (
    <aside className="place-around panel" aria-live="polite">
      <div className="map-label">
        Around you <span className="hanzi">周遭</span>
      </div>
      {lines.map((l, i) => (
        <div
          key={l.n}
          className={`place-around-line${l.card ? ' is-card' : ''}`}
          style={{ opacity: 0.45 + (0.55 * (i + 1)) / lines.length }}
        >
          <p>{l.text}</p>
          {l.done ? (
            <p className="muted">{l.done}</p>
          ) : (
            l.card && (
              <div className="place-around-acts">
                {open === l.n ? (
                  l.card.choices.map((c, ci) => (
                    <button
                      type="button"
                      key={c.label}
                      className="goin-chip"
                      onClick={() => take(l, ci)}
                    >
                      {c.label}
                    </button>
                  ))
                ) : (
                  <button type="button" className="goin-chip" onClick={() => setOpen(l.n)}>
                    Step in
                  </button>
                )}
                {keyed && (
                  <button
                    type="button"
                    className="goin-chip"
                    title="Go into the street with the narrator"
                    onClick={() => goInAt(map, place, null, undefined, l.text)}
                  >
                    Go in 入 <GoInHour />
                  </button>
                )}
              </div>
            )
          )}
        </div>
      ))}
    </aside>
  );
}
