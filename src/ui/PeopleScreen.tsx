// The People screen (design § UI and screens, The People screen; docs/mockups/people-study.html,
// B and C, and P3.4's mockup): everyone you've met on the left, as circles grouped by where you
// met them or as a web of threads, the powers that know you under them, and the chosen person's
// page on the right, so opening someone never hides the list. A seal stands in for a portrait,
// trust is a word with five notches behind it, read from the memories you know they hold, and
// fresh news is a gold dot. The page shows their nature as far as you've seen it, what they
// remember of you and their ties as you know them; their log is your chronicle filtered by them.
// A follower's page says why they follow and how that breaks, and your name's reach by region
// sits under the powers (P3.4b). Full in M5.
import { QuestOffers } from './QuestOffers.tsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { placeName } from '../content/origins.ts';
import { person, TIES, type TieId } from '../content/people.ts';
import type { TrustWord } from '../content/resolver.ts';
import { realm, stageName } from '../content/realms.ts';
import { worldWhen } from '../core/chronicle.ts';
import {
  bondView,
  hasNews,
  knownPeople,
  newsDay,
  peopleCircles,
  personLog,
  personView,
  namesView,
  powersView,
  type PersonView,
} from '../core/people.ts';
import { membershipsView, personSeat } from '../core/organizations.ts';
import { knowsTie } from '../core/resolver/opinion.ts';
import type { GameState, PersonRecord } from '../core/state.ts';
import { capitalize } from './format.ts';
import { askSpar } from '../core/playFight.ts';
import { sparWhy, whereIs } from '../core/spar.ts';
import { goToPlace, mapOf } from '../core/map/travel.ts';
import { placeById } from '../core/map/region.ts';
import { go } from './nav.ts';
import { clampZoom, viewAt, type Size, type View } from './panzoom.ts';
import {
  BOND_Y,
  DISC_R,
  NAME_Y,
  nearest,
  ringLabels,
  ringFor,
  tieLinks,
  WEB_CENTRE,
  WEB_MAX,
  WEB_SIZE,
  webBounds,
  webLayout,
  YOU_R,
} from './peopleWeb.ts';
import { useGame } from './store.ts';
import { BUTTON_STEP, usePanZoom } from './usePanZoom.ts';
import { EventLine } from './widgets.tsx';
import { goInAt, useGoIn } from './goin.ts';
import { useSettings } from './settings.ts';
import { canCompact, fold, foldable, voiceOf } from '../core/voices.ts';

/** Their realm as you know it, in words. */
function realmWords(id: string, r: PersonRecord): string {
  if (person(id).mortal) return 'a mortal';
  if (!r.realm) return 'realm unknown';
  return `${realm(r.realm.realm).name}, ${stageName(r.realm.realm, r.realm.stage)}`;
}

function whereWords(r: PersonRecord): string {
  return r.where ? `last heard of at ${placeName(r.where)}` : 'whereabouts unknown';
}

/** Warm, cold or hostile: the seal's tint and the thread's color, from trust as a level. */
function tone(level: number): 'warm' | 'cold' | 'hot' {
  return level > 0 ? 'warm' : level < 0 ? 'hot' : 'cold';
}

/** What they are to you, in words. */
function tieWords(tie: TieId | null): string {
  return tie ? TIES[tie] : 'an acquaintance';
}

function Seal({ id, level, size }: { id: string; level: number; size?: 'sm' | 'big' }) {
  return (
    <span className={`seal tone-${tone(level)}${size ? ` seal-${size}` : ''}`} aria-hidden="true">
      {person(id).hanzi}
    </span>
  );
}

function FreshDot({ label }: { label: string }) {
  return <span className="fresh-dot" role="img" aria-label={label} />;
}

/** Trust as its word, with five quiet notches behind it as a glance, read as you know them. */
function Trust({ word, level }: { word: TrustWord; level: number }) {
  const notches = [];
  for (let i = -2; i <= 2; i++) {
    const lit =
      i === 0
        ? level === 0
          ? 'centre'
          : ''
        : level > 0 && i > 0 && i <= level
          ? 'up'
          : level < 0 && i < 0 && i >= level
            ? 'down'
            : '';
    notches.push(<i key={i} className={lit} />);
  }
  return (
    <span className="regard">
      <span className="notches" aria-hidden="true">
        {notches}
      </span>
      <span className={`regard-${tone(level)}`}>{word}</span>
      <span className="caption">as you read it</span>
    </span>
  );
}

/** What they remember of you, each with its fade as a thin bar. */
function Memories({ name, view }: { name: string; view: PersonView }) {
  return (
    <>
      <h3 className="sub-heading spaced">What {name} remembers of you</h3>
      {view.memories.length ? (
        <ul className="memories">
          {view.memories.map((m, i) => (
            <li key={i} className="memory">
              <span className="memory-text">
                {m.text}
                {m.motive && <span className="memory-why"> · {m.motive} ×2</span>}
                {m.never ? (
                  <span className="caption"> · never fades</span>
                ) : m.fading ? (
                  <span className="caption"> · fading</span>
                ) : null}
              </span>
              <span className={`memory-value regard-${tone(Math.sign(m.value))}`}>
                {m.value > 0 ? `+${m.value}` : `−${-m.value}`}
              </span>
              <span className="memory-bar" aria-hidden="true">
                <i
                  className={m.value > 0 ? 'up' : 'down'}
                  style={{ width: `${Math.round(m.share * 100)}%` }}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="caption">Nothing you know of.</p>
      )}
      {view.unknown > 0 && <p className="caption">{name} may remember things you don't know of.</p>}
    </>
  );
}

/**
 * Between you (P3.9b; design § Memories carry their story): the stories behind what they remember of
 * you, faded ones too, each in the engine's words and theirs; what they keep of your history, the
 * lines that sound most like them and what they call you. Compact folds a long tie's oldest rows.
 */
function BetweenYou({ game, id, name }: { game: GameState; id: string; name: string }) {
  const me = game.player.id;
  const rows = game.world.memories.filter(
    (m) => m.holder === id && m.about === me && m.known.includes(me) && (m.what || m.felt),
  );
  const v = voiceOf(game.world, id);
  if (!rows.length && !v.summary && !v.lines.length && !v.address) return null;
  const compact = canCompact(game.world, id, me);
  return (
    <>
      <h3 className="sub-heading spaced">Between you</h3>
      {v.summary && <p className="caption">{v.summary}</p>}
      <ul className="person-thread">
        {rows
          .slice()
          .reverse()
          .map((m) => (
            <li key={m.id}>
              <span className="caption">{worldWhen(m.day)}</span> {m.what}
              {m.felt && <span className="between-felt"> “{m.felt}”</span>}
            </li>
          ))}
      </ul>
      {(v.lines.length > 0 || v.address) && (
        <p className="caption">
          {v.address && (
            <>
              {name} calls you “{v.address}”.{' '}
            </>
          )}
          {v.lines.map((l) => `“${l}”`).join(' ')}
        </p>
      )}
      {compact && (
        <button
          type="button"
          className="button button-quiet"
          title="Fold the oldest faded memories into their summary"
          onClick={() =>
            useGame.getState().applyLife((s) => ({
              ...s,
              world: fold(
                s.world,
                id,
                me,
                foldable(s.world, id, me, s.calendar.day, true),
                s.calendar.day,
              ),
            }))
          }
        >
          Compact
        </button>
      )}
    </>
  );
}

/** Small chips: their leans, wants and likes as far as you know them. */
function Chips({ words, more }: { words: string[]; more?: string }) {
  return (
    <span className="chips">
      {words.map((w) => (
        <span key={w} className="chip">
          {w}
        </span>
      ))}
      {more && <span className="chip chip-unknown">{more}</span>}
      {!words.length && !more && <span className="caption">nothing seen yet</span>}
    </span>
  );
}

/**
 * What you can do with someone (Fights you play): spar while they stand where you are, and seek
 * them out, a course to where you last heard of them. The rest of the row waits for the People
 * layer.
 */
function PersonActs({ game, id }: { game: GameState; id: string }) {
  const [said, setSaid] = useState<string | null>(null);
  const who = `person:${id}`;
  const sparNo = sparWhy(game, who);
  const where = whereIs(game, id);
  const map = game.map ? mapOf(game) : null;
  const here = game.map?.inside ?? null;
  const seekNo = !where
    ? 'You don’t know where they are.'
    : where === here
      ? 'They are where you are.'
      : !map || !placeById(map, where)
        ? 'They are beyond this map.'
        : null;
  const { mapAct } = useGame.getState();
  const keyed = useSettings((x) => !!x.openRouterKey);
  return (
    <>
      <div className="actions spaced">
        <button
          type="button"
          className="button"
          disabled={!!sparNo}
          title={sparNo ?? undefined}
          onClick={() =>
            setSaid(
              mapAct((s) => {
                const r = askSpar(s, who);
                return typeof r === 'string' ? { ok: false, reason: r } : { ok: true, state: r };
              }),
            )
          }
        >
          Spar
        </button>
        <button
          type="button"
          className="button"
          disabled={!!seekNo}
          title={seekNo ?? undefined}
          onClick={() => {
            const err = mapAct((s) => goToPlace(s, where!, true));
            if (err) setSaid(err);
            else go('world');
          }}
        >
          Seek them out
        </button>
        <button type="button" className="button" disabled title="Letters arrive with M5">
          Write a letter
        </button>
      </div>
      {/* The person door (P3.9b): talk or go in where you both stand, never sought out. */}
      {keyed && here && where === here && map && placeById(map, here) && (
        <div className="actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              const why = goInAt(map, placeById(map, here)!, null, id);
              if (why) setSaid(why);
              else useGoIn.setState({ words: `I go over to ${person(id).name} and talk` });
            }}
          >
            Talk
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              const why = goInAt(map, placeById(map, here)!, null, id);
              if (why) setSaid(why);
            }}
          >
            Go in 入
          </button>
        </div>
      )}
      {(said ?? sparNo) && <p className="caption">{said ?? sparNo}</p>}
      {/* A person offers their quests where they stand (design § The journal). */}
      {here && where === here && <QuestOffers game={game} kind="person" place={here} who={id} />}
    </>
  );
}

function PersonPage({ game, id }: { game: GameState; id: string }) {
  const p = person(id);
  const r = game.player.people[id]!;
  const view = personView(game, id);
  const bond = bondView(game, id);
  const seat = personSeat(game.world, id, r.realm?.realm);
  const n = view.nature;
  const log = personLog(game, id).slice().reverse();
  return (
    <section className="panel person-page" aria-labelledby="person-name">
      <div className="person-top">
        <Seal id={id} level={view.level} size="big" />
        <div>
          <h2 id="person-name" className="person-name">
            {p.name}
          </h2>
          <span className="bond-pill">{capitalize(tieWords(view.tie))}</span>
        </div>
      </div>
      <p className="person-summary">{p.summary}</p>
      {seat && <p className="caption">{capitalize(seat)}</p>}
      <dl className="person-facts person-nature">
        <div>
          <dt>Nature</dt>
          <dd>
            <Chips
              words={n.words}
              more={
                n.hidden
                  ? n.hidden === 1
                    ? "one more you haven't seen"
                    : `${n.hidden} more you haven't seen`
                  : undefined
              }
            />
          </dd>
        </div>
        <div>
          <dt>Wants</dt>
          <dd>
            <Chips
              words={n.motives}
              more={
                n.unknownMotives
                  ? n.unknownMotives === 1
                    ? "a reason you don't know"
                    : "reasons you don't know"
                  : undefined
              }
            />
          </dd>
        </div>
        {n.likes.length > 0 && (
          <div>
            <dt>Likes</dt>
            <dd>
              <Chips words={n.likes} />
            </dd>
          </div>
        )}
        <div>
          <dt>Trust</dt>
          <dd>
            <Trust word={view.trust} level={view.level} />
          </dd>
        </div>
        {bond && (
          <div>
            <dt>Follows you</dt>
            <dd>
              {capitalize(bond.words)} <span className="caption">· {bond.breaks}</span>
            </dd>
          </div>
        )}
      </dl>
      <Memories name={p.name} view={view} />
      <BetweenYou game={game} id={id} name={p.name} />
      {(view.ties.length > 0 || view.hiddenTies > 0) && (
        <>
          <h3 className="sub-heading spaced">Their ties, as you know them</h3>
          <ul className="their-ties">
            {view.ties.map((t) => (
              <li key={t.id}>
                <span className="caption">{t.label}</span> {t.name}
              </li>
            ))}
            {view.hiddenTies > 0 && <li className="caption">… a tie you haven't learned</li>}
          </ul>
        </>
      )}
      <dl className="person-facts spaced">
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
            In {worldWhen(r.met)}
            {r.place ? `, at ${placeName(r.place)}` : ''}
          </dd>
        </div>
      </dl>
      <h3 className="sub-heading spaced">In your life</h3>
      {log.length ? (
        <ul className="person-thread">
          {log.map((e, i) => (
            <li key={`${e.day}-${i}`} className={i === 0 ? 'is-newest' : undefined}>
              <span className="caption">{worldWhen(e.day)}</span>
              <EventLine game={game} e={e} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="caption">Nothing yet.</p>
      )}
      <PersonActs game={game} id={id} />
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
      {peopleCircles(game).map((circle) => (
        <div key={circle.key} className="people-circle">
          <h3 className="circle-head">
            <span className="sub-heading">{circle.label}</span>
            <span className="hanzi circle-hanzi">{circle.hanzi}</span>
          </h3>
          <ul className="people-list">
            {circle.people.map(({ id }) => {
              const v = personView(game, id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`who${id === selected ? ' is-selected' : ''}`}
                    aria-pressed={id === selected}
                    onClick={() => onSelect(id)}
                  >
                    <Seal id={id} level={v.level} size="sm" />
                    <span className="who-text">
                      <span className="who-name">{person(id).name}</span>
                      <span className={`who-line regard-${tone(v.level)}`}>
                        {capitalize(tieWords(v.tie))} · {v.trust}
                      </span>
                    </span>
                    {hasNews(game, id) && <FreshDot label="News" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

/** The web opens framing everyone, never zoomed in past this. */
const HOME_MAX_ZOOM = 1.4;

/**
 * The web of threads: drag to pan, wheel or pinch to zoom, tap someone to open their page. It
 * opens framing everyone; Re-centre goes back there.
 */
function Web({
  game,
  selected,
  onSelect,
}: {
  game: GameState;
  selected: string;
  onSelect: (id: string) => void;
}) {
  // Who sits where reads only the people, the world and the day: worked out once a day or a
  // change, never on a tick or a pan frame.
  const day = Math.floor(game.calendar.day);
  const { everyone, views, nodes, links, labels, bounds } = useMemo(() => {
    const everyone = knownPeople(game.player);
    const views = new Map(everyone.map((p) => [p.id, personView(game, p.id)]));
    const shown = nearest(
      everyone.map((p) => {
        const v = views.get(p.id)!;
        return { id: p.id, tie: v.tie, level: v.level, heard: p.record.heard };
      }),
    ).map((p) => ({ ...p, name: person(p.id).name, bond: tieWords(p.tie) }));
    const nodes = webLayout(shown);
    // The faint threads between people you know are tied to each other.
    const links = tieLinks(
      nodes,
      game.world.ties.filter(
        (t) => t.a !== game.player.id && t.b !== game.player.id && knowsTie(t, game.player.id),
      ),
    );
    // The ring labels go where nobody sits, and the view frames them with everyone.
    const labels = ringLabels(nodes);
    const bounds = webBounds(
      nodes,
      labels.map((l) => l.box),
    );
    return { everyone, views, nodes, links, labels, bounds };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.player.people, game.world, day]);
  const home = (screen: Size): View => {
    const k = clampZoom(Math.min(HOME_MAX_ZOOM, screen.w / bounds.w, screen.h / bounds.h));
    return viewAt(
      k,
      { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 },
      { x: screen.w / 2, y: screen.h / 2 },
    );
  };
  const { box, view, handlers, zoomBy, recentre } = usePanZoom(WEB_SIZE, home);

  const { x: cx, y: cy } = WEB_CENTRE;
  const color = (level: number) =>
    level > 0 ? 'var(--crack)' : level < 0 ? 'var(--warn)' : 'var(--muted)';

  return (
    <div className="people-web">
      <div className="web-canvas-wrap">
        <div ref={box} className="web-canvas" {...handlers}>
          <svg
            role="group"
            aria-label="The web of threads: closer to the centre means closer to you"
          >
            {view && (
              <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                {labels.map((l) => (
                  <g key={l.level}>
                    <circle className="web-ring" cx={cx} cy={cy} r={ringFor(l.level)} />
                    <text className="web-ring-label" textAnchor="middle" x={l.x} y={l.y}>
                      {l.text}
                    </text>
                  </g>
                ))}
                {nodes.map((n) => (
                  <path
                    key={`t-${n.id}`}
                    className={`web-thread tone-${tone(n.level)}`}
                    d={n.thread}
                    stroke={color(n.level)}
                  />
                ))}
                {links.map((l) => (
                  <line key={l.key} className="web-tie" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
                ))}
                <g className="web-you" aria-hidden="true">
                  <circle cx={cx} cy={cy} r={YOU_R} />
                  <text x={cx} y={cy}>
                    我
                  </text>
                </g>
                {nodes.map((n) => {
                  const p = person(n.id);
                  const v = views.get(n.id)!;
                  return (
                    <g
                      key={n.id}
                      className={`web-node tone-${tone(n.level)}${n.id === selected ? ' is-selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={n.id === selected}
                      aria-label={`${p.name}, ${tieWords(v.tie)}, ${v.trust}`}
                      onClick={() => onSelect(n.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelect(n.id);
                        }
                      }}
                    >
                      {n.id === selected && (
                        <circle className="web-halo" cx={n.x} cy={n.y} r={DISC_R + 5} />
                      )}
                      <circle
                        className="web-disc"
                        cx={n.x}
                        cy={n.y}
                        r={DISC_R}
                        stroke={color(n.level)}
                      />
                      <text className={`web-seal tone-${tone(n.level)}`} x={n.x} y={n.y}>
                        {p.hanzi}
                      </text>
                      <text className="web-name" x={n.x} y={n.y + NAME_Y}>
                        {p.name}
                      </text>
                      <text className="web-bond" x={n.x} y={n.y + BOND_Y}>
                        {tieWords(v.tie)}
                      </text>
                      {hasNews(game, n.id) && (
                        <circle
                          className="web-fresh"
                          cx={n.x + DISC_R * 0.75}
                          cy={n.y - DISC_R * 0.75}
                          r={3}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>
        <div className="tree-tools" role="group" aria-label="View">
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => zoomBy(BUTTON_STEP)}
          >
            +
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom out"
            onClick={() => zoomBy(1 / BUTTON_STEP)}
          >
            −
          </button>
          <button type="button" className="button tree-recentre" onClick={recentre}>
            Re-centre
          </button>
        </div>
      </div>
      <p className="web-legend caption">
        <span>
          <i className="legend-warm" />
          friendly or trusting
        </span>
        <span>
          <i className="legend-cold" />
          neutral
        </span>
        <span>
          <i className="legend-hot" />
          wary or hostile
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

/** The powers that know you, and your standing with each; heat's cap shows beside it. */
function Powers({ game }: { game: GameState }) {
  const yours = membershipsView(game);
  const mine = new Set(yours.map((m) => m.power));
  const powers = powersView(game).filter((x) => !mine.has(x.power));
  if (!powers.length && !yours.length) return null;
  return (
    <div className="people-powers">
      <h3 className="sub-heading">Powers that know you</h3>
      <dl>
        {yours.map((m) => (
          <div key={m.power}>
            <dt>{m.name}</dt>
            <dd>
              {m.title.name} <span className="hanzi">{m.title.hanzi}</span> · {m.balance}{' '}
              {m.currency}
            </dd>
          </div>
        ))}
        {powers.map((x) => (
          <div key={x.power}>
            <dt>{capitalize(x.name)}</dt>
            <dd className={x.word === 'unknown' ? 'caption' : undefined}>
              {x.word}
              {x.capped && <span className="regard-hot"> · held down by heat</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** How far your name carries, by region: renown and infamy apart, each 0 to 9. */
function YourName({ game }: { game: GameState }) {
  const names = namesView(game);
  if (!names.length) return null;
  return (
    <div className="people-powers">
      <h3 className="sub-heading">Your name</h3>
      <dl>
        {names.map((x) => (
          <div key={x.region}>
            <dt>{capitalize(x.name)}</dt>
            <dd>
              renown {x.renown} · infamy {x.infamy} <span className="caption">· {x.words}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type Shown = 'circles' | 'web';

export function PeopleScreen() {
  const game = useGame((s) => s.game);
  const seePerson = useGame((s) => s.seePerson);
  const [view, setView] = useState<Shown>('circles');
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
        <Powers game={game} />
        <YourName game={game} />
      </section>
      <div ref={page} className="people-page-col">
        <PersonPage game={game} id={selected} />
      </div>
    </div>
  );
}
