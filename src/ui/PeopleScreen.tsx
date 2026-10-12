// The People screen (design § UI and screens, The People screen; docs/mockups/people-study.html,
// B and C): everyone you've met on the left, as circles grouped by where you met them or as a web
// of threads, and the chosen person's page on the right, so opening someone never hides the list.
// A seal stands in for a portrait, feeling is words with seven notches behind them, and fresh
// news is a gold dot. Their log is your chronicle filtered by them. Full in M5.
import { useEffect, useRef, useState } from 'react';
import { placeName } from '../content/origins.ts';
import { BONDS, person, REGARD_MAX, REGARD_MIN, regardWords } from '../content/people.ts';
import { realm, stageName } from '../content/realms.ts';
import { lifeWhen } from '../core/chronicle.ts';
import { hasNews, knownPeople, newsDay, peopleCircles, personLog } from '../core/people.ts';
import type { GameState, PersonRecord } from '../core/state.ts';
import { capitalize } from './format.ts';
import {
  labelAngle,
  nearest,
  ringFor,
  WEB_CENTRE,
  WEB_MAX,
  webLayout,
  webViewBox,
} from './peopleWeb.ts';
import { useGame } from './store.ts';
import { EventLine } from './widgets.tsx';

/** Their realm as you know it, in words. */
function realmWords(id: string, r: PersonRecord): string {
  if (person(id).mortal) return 'a mortal';
  if (!r.realm) return 'realm unknown';
  return `${realm(r.realm.realm).name}, ${stageName(r.realm.realm, r.realm.stage)}`;
}

function whereWords(r: PersonRecord): string {
  return r.where ? `last heard of at ${placeName(r.where)}` : 'whereabouts unknown';
}

/** Warm, cold or hostile: the seal's tint and the thread's color. */
function tone(regard: number): 'warm' | 'cold' | 'hot' {
  return regard > 0 ? 'warm' : regard < 0 ? 'hot' : 'cold';
}

function Seal({ id, regard, size }: { id: string; regard: number; size?: 'sm' | 'big' }) {
  return (
    <span className={`seal tone-${tone(regard)}${size ? ` seal-${size}` : ''}`} aria-hidden="true">
      {person(id).hanzi}
    </span>
  );
}

function FreshDot({ label }: { label: string }) {
  return <span className="fresh-dot" role="img" aria-label={label} />;
}

/** Feeling as words, with seven quiet notches behind them as a glance, never a number. */
function Regard({ name, regard }: { name: string; regard: number }) {
  const notches = [];
  for (let i = REGARD_MIN; i <= REGARD_MAX; i++) {
    const lit =
      i === 0
        ? regard === 0
          ? 'centre'
          : ''
        : regard > 0 && i > 0 && i <= regard
          ? 'up'
          : regard < 0 && i < 0 && i >= regard
            ? 'down'
            : '';
    notches.push(<i key={i} className={lit} />);
  }
  return (
    <span className="regard">
      <span className="notches" aria-hidden="true">
        {notches}
      </span>
      <span className={`regard-${tone(regard)}`}>
        {name} {regardWords(regard)}
      </span>
    </span>
  );
}

function PersonPage({ game, id }: { game: GameState; id: string }) {
  const p = person(id);
  const r = game.player.people[id]!;
  const c = game.player;
  const log = personLog(game, id).slice().reverse();
  return (
    <section className="panel person-page" aria-labelledby="person-name">
      <div className="person-top">
        <Seal id={id} regard={r.regard} size="big" />
        <div>
          <h2 id="person-name" className="person-name">
            {p.name}
          </h2>
          <span className="bond-pill">{capitalize(BONDS[r.bond])}</span>
        </div>
      </div>
      <p className="person-summary">{p.summary}</p>
      <dl className="person-facts">
        <div>
          <dt>Feeling</dt>
          <dd>
            <Regard name={p.name} regard={r.regard} />
          </dd>
        </div>
        <div>
          <dt>Realm</dt>
          <dd>{capitalize(realmWords(id, r))}</dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{capitalize(whereWords(r))}</dd>
        </div>
        <div>
          <dt>Met</dt>
          <dd>
            In {lifeWhen(c, r.met)}
            {r.place ? `, at ${placeName(r.place)}` : ''}
          </dd>
        </div>
      </dl>
      <h3 className="sub-heading spaced">In your life</h3>
      {log.length ? (
        <ul className="person-thread">
          {log.map((e, i) => (
            <li key={`${e.day}-${i}`} className={i === 0 ? 'is-newest' : undefined}>
              <span className="caption">{capitalize(lifeWhen(c, e.day))}</span>
              <EventLine game={game} e={e} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="caption">Nothing yet.</p>
      )}
      <div className="actions spaced">
        <button type="button" className="button" disabled title="Letters arrive with M5">
          Write a letter
        </button>
        <button type="button" className="button" disabled title="Travel arrives with M3">
          Seek them out
        </button>
      </div>
    </section>
  );
}

function Circles({
  game,
  selected,
  onSelect,
}: {
  game: GameState;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {peopleCircles(game.player).map((circle) => (
        <div key={circle.key} className="people-circle">
          <h3 className="circle-head">
            <span className="sub-heading">{circle.label}</span>
            <span className="hanzi circle-hanzi">{circle.hanzi}</span>
          </h3>
          <ul className="people-list">
            {circle.people.map(({ id, record }) => (
              <li key={id}>
                <button
                  type="button"
                  className={`who${id === selected ? ' is-selected' : ''}`}
                  aria-pressed={id === selected}
                  onClick={() => onSelect(id)}
                >
                  <Seal id={id} regard={record.regard} size="sm" />
                  <span className="who-text">
                    <span className="who-name">{person(id).name}</span>
                    <span className={`who-line regard-${tone(record.regard)}`}>
                      {capitalize(BONDS[record.bond])} · {regardWords(record.regard)}
                    </span>
                  </span>
                  {hasNews(game, id) && <FreshDot label="News" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

const RINGS: [number, string][] = [
  [3, 'would bleed for you'],
  [1, 'thinks well of you'],
  [0, 'indifferent'],
  [-2, 'wary, or worse'],
];

function Web({
  game,
  selected,
  onSelect,
}: {
  game: GameState;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const everyone = knownPeople(game.player);
  const shown = nearest(everyone);
  const nodes = webLayout(shown);
  const box = webViewBox(nodes);
  // The ring labels go where nobody sits, reading away from the centre.
  const at = (labelAngle(nodes) * Math.PI) / 180;
  const [cos, sin] = [Math.cos(at), Math.sin(at)];
  const lowest = Math.min(0, ...nodes.map((n) => n.regard));
  const { x: cx, y: cy } = WEB_CENTRE;
  const color = (regard: number) =>
    regard > 0 ? 'var(--crack)' : regard < 0 ? 'var(--warn)' : 'var(--muted)';
  return (
    <div className="people-web">
      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        role="group"
        aria-label="The web of threads: closer to the centre means closer to you"
      >
        {RINGS.filter(([regard]) => regard >= lowest).map(([regard, label]) => (
          <g key={regard}>
            <circle className="web-ring" cx={cx} cy={cy} r={ringFor(regard)} />
            <text
              className="web-ring-label"
              textAnchor="middle"
              x={cx + ringFor(regard) * cos}
              y={cy + ringFor(regard) * sin + (sin < 0 ? -3 : 10)}
            >
              {label}
            </text>
          </g>
        ))}
        {nodes.map((n) => (
          <path
            key={`t-${n.id}`}
            className={`web-thread tone-${tone(n.regard)}`}
            d={n.thread}
            stroke={color(n.regard)}
          />
        ))}
        <g className="web-you" aria-hidden="true">
          <circle cx={cx} cy={cy} r={26} />
          <text x={cx} y={cy}>
            我
          </text>
        </g>
        {nodes.map((n) => {
          const p = person(n.id);
          const r = game.player.people[n.id]!;
          return (
            <g
              key={n.id}
              className={`web-node${n.id === selected ? ' is-selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={n.id === selected}
              aria-label={`${p.name}, ${BONDS[r.bond]}, ${regardWords(r.regard)}`}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(n.id);
                }
              }}
            >
              <circle className="web-disc" cx={n.x} cy={n.y} r={21} stroke={color(n.regard)} />
              <text className={`web-seal tone-${tone(n.regard)}`} x={n.x} y={n.y}>
                {p.hanzi}
              </text>
              <text className="web-name" x={n.x} y={n.y + 38}>
                {p.name}
              </text>
              <text className="web-bond" x={n.x} y={n.y + 52}>
                {BONDS[r.bond]}
              </text>
              {hasNews(game, n.id) && (
                <circle className="web-fresh" cx={n.x + 16} cy={n.y - 16} r={3.5} />
              )}
            </g>
          );
        })}
      </svg>
      <p className="web-legend caption">
        <span>
          <i className="legend-warm" />
          warm
        </span>
        <span>
          <i className="legend-cold" />
          indifferent
        </span>
        <span>
          <i className="legend-hot" />
          hostile
        </span>
        <span>closer to the centre means closer to you</span>
        {everyone.length > WEB_MAX && (
          <span>
            your nearest {WEB_MAX} of {everyone.length}; the circles hold everyone
          </span>
        )}
      </p>
    </div>
  );
}

type View = 'circles' | 'web';

export function PeopleScreen() {
  const game = useGame((s) => s.game);
  const seePerson = useGame((s) => s.seePerson);
  const [view, setView] = useState<View>('circles');
  const [chosen, setChosen] = useState<string | null>(null);
  const page = useRef<HTMLDivElement>(null);

  const people = game ? knownPeople(game.player) : [];
  // The chosen person, or whoever has news, or whoever was heard of last.
  const selected =
    (chosen && game?.player.people[chosen] ? chosen : null) ??
    people.find((p) => game && hasNews(game, p.id))?.id ??
    people[0]?.id ??
    null;
  const fresh = game && selected ? newsDay(game, selected) : 0;

  // Reading their page reads their news.
  useEffect(() => {
    if (selected) seePerson(selected);
  }, [selected, fresh, seePerson]);

  if (!game) return null;
  if (!selected) {
    return (
      <section className="panel">
        <p className="caption">You have met no one worth remembering yet.</p>
      </section>
    );
  }

  const select = (id: string) => {
    setChosen(id);
    // On a phone the page sits under the list, so bring it into view.
    if (window.innerWidth < 900) page.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <div className={`people-split view-${view}`}>
      <section className="panel people-side" aria-label="Everyone you have met">
        <div className="people-side-head">
          <h2 className="panel-heading">Everyone you have met</h2>
          <div className="seg" role="group" aria-label="How to show them">
            <button
              type="button"
              aria-pressed={view === 'circles'}
              onClick={() => setView('circles')}
            >
              Circles
            </button>
            <button type="button" aria-pressed={view === 'web'} onClick={() => setView('web')}>
              Web of threads
            </button>
          </div>
        </div>
        {view === 'circles' ? (
          <Circles game={game} selected={selected} onSelect={select} />
        ) : (
          <Web game={game} selected={selected} onSelect={select} />
        )}
      </section>
      <div ref={page} className="people-page-col">
        <PersonPage game={game} id={selected} />
      </div>
    </div>
  );
}
