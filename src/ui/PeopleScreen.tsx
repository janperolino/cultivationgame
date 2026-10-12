// The People screen, thin (design § UI and screens; § Professions, people and powers): everyone
// you've met, with what they are to you, how they feel in words, and their realm and whereabouts
// as you last saw or heard them; the newest updates on top; and each person's page with their log,
// which is your chronicle filtered by them. Portraits wait for the cast list; full in M5.
import { useState } from 'react';
import { placeName } from '../content/origins.ts';
import { BONDS, person, regardWords } from '../content/people.ts';
import { realm, stageName } from '../content/realms.ts';
import { eventText, lifeWhen } from '../core/chronicle.ts';
import { knownPeople, peopleFeed, personLog } from '../core/people.ts';
import type { GameState, PersonRecord } from '../core/state.ts';
import { capitalize } from './format.ts';
import { useGame } from './store.ts';

/** Their realm as you know it, in words. */
function realmWords(id: string, r: PersonRecord): string {
  if (person(id).mortal) return 'a mortal';
  if (!r.realm) return 'realm unknown';
  return `${realm(r.realm.realm).name}, ${stageName(r.realm.realm, r.realm.stage)}`;
}

function whereWords(r: PersonRecord): string {
  return r.where ? `last heard of at ${placeName(r.where)}` : 'whereabouts unknown';
}

function PersonPage({ game, id, onBack }: { game: GameState; id: string; onBack: () => void }) {
  const p = person(id);
  const r = game.player.people[id]!;
  const c = game.player;
  const log = personLog(game, id);
  return (
    <section className="panel person-page" aria-labelledby="person-name">
      <div className="actions">
        <button type="button" className="button button-quiet" onClick={onBack}>
          ← Everyone
        </button>
      </div>
      <h2 id="person-name" className="realm-title">
        {p.name}
        <small>{capitalize(BONDS[r.bond])}</small>
      </h2>
      <p>{p.summary}</p>
      <dl className="person-facts">
        <div>
          <dt>Feeling</dt>
          <dd>
            {p.name} {regardWords(r.regard)}.
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
        <ul className="person-log">
          {log.map((e, i) => (
            <li key={`${e.day}-${i}`}>
              <span className="caption">{capitalize(lifeWhen(c, e.day))}</span>
              {eventText(game, e)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="caption">Nothing yet.</p>
      )}
    </section>
  );
}

export function PeopleScreen() {
  const game = useGame((s) => s.game);
  const [open, setOpen] = useState<string | null>(null);
  if (!game) return null;
  const c = game.player;
  if (open && c.people[open]) {
    return <PersonPage game={game} id={open} onBack={() => setOpen(null)} />;
  }
  const people = knownPeople(c);
  const feed = peopleFeed(game, 6);

  return (
    <>
      <section className="panel">
        <h2 className="panel-heading">Lately</h2>
        {feed.length ? (
          <ul className="person-log">
            {feed.map((e, i) => (
              <li key={`${e.day}-${i}`}>
                <span className="caption">{capitalize(lifeWhen(c, e.day))}</span>
                {eventText(game, e)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="caption">No news of anyone.</p>
        )}
      </section>
      <section className="panel">
        <h2 className="panel-heading">Everyone you have met</h2>
        {people.length ? (
          <ul className="people-list">
            {people.map(({ id, record }) => (
              <li key={id}>
                <button type="button" className="person-row" onClick={() => setOpen(id)}>
                  <strong>{person(id).name}</strong>
                  <span>{capitalize(BONDS[record.bond])}</span>
                  <span className="caption">
                    {regardWords(record.regard)} · {realmWords(id, record)} · {whereWords(record)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="caption">You have met no one worth remembering yet.</p>
        )}
      </section>
    </>
  );
}
