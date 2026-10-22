// The journal 志 (design § UI and screens, The journal; The opening, built's talk): two tabs.
// Quests: those under way, the one followed first with its seal, those handed in folded away; a
// quest's page tells its giver, its reason, the steps done in gilt and the one under way with its
// place, later steps only counted, the reward, and Follow, Drop or Hand in. Codex: the mechanics
// met so far by area, each with a dot until opened, in plain words with the real numbers.
import { useState } from 'react';
import { CODEX_AREAS, fillSlots, type CodexEntry } from '../content/codex/index.ts';
import { hasQuest, quest } from '../content/quests.ts';
import { chainOffer, takeChainOffer } from '../core/chains.ts';
import { codexMet, seeCodex } from '../core/codex.ts';
import {
  dropQuest,
  followQuest,
  handIn,
  handInCheck,
  questPlace,
  stepsDone,
} from '../core/journal.ts';
import type { GameState, QuestState } from '../core/state.ts';
import { go, useNav } from './nav.ts';
import type { ScreenId } from './screens.ts';
import { useGame } from './store.ts';

type Tab = 'quests' | 'codex';

function QuestRow({
  q,
  game,
  picked,
  onPick,
}: {
  q: QuestState;
  game: GameState;
  picked: boolean;
  onPick: () => void;
}) {
  const def = quest(q.id);
  const followed = game.journal.followed === q.id;
  return (
    <li>
      <button
        type="button"
        className={`who${picked ? ' is-selected' : ''}`}
        aria-pressed={picked}
        onClick={onPick}
      >
        <span className={`quest-seal${followed ? ' is-followed' : ''}`} aria-hidden="true">
          志
        </span>
        <span>
          {def.title}
          <span className="caption">
            {' '}
            · {q.handed !== null ? 'handed in' : stepsDone(q) ? 'to hand in' : def.giver.name}
          </span>
        </span>
      </button>
    </li>
  );
}

function QuestPage({
  q,
  game,
  onHanded,
}: {
  q: QuestState;
  game: GameState;
  onHanded: () => void;
}) {
  const applyLife = useGame((s) => s.applyLife);
  const [said, setSaid] = useState<string | null>(null);
  const def = quest(q.id);
  const under = q.handed === null;
  const followed = game.journal.followed === q.id;
  const giverAt = questPlace(game, def.giver.place);
  const check = handInCheck(game, q.id);
  const act = (
    f: (s: GameState) => { ok: true; state: GameState } | { ok: false; reason: string },
  ) => {
    const r = f(game);
    if (!r.ok) return setSaid(r.reason);
    setSaid(null);
    applyLife(() => r.state);
  };
  return (
    <section className="panel quest-page" aria-labelledby="quest-title">
      <h2 id="quest-title" className="panel-heading">
        {def.title}
      </h2>
      <p className="caption">
        Given by {def.giver.name}
        {giverAt ? `, at ${giverAt.name}` : ''}
      </p>
      <p>{def.reason}</p>
      <h3 className="sub-heading spaced">Steps</h3>
      <ol className="quest-steps">
        {def.steps.slice(0, Math.min(def.steps.length, q.step + 1)).map((st, i) => {
          const done = i < q.step;
          const where = st.where ? questPlace(game, st.where) : null;
          return (
            <li key={i} className={done ? 'is-done' : 'is-now'}>
              {st.text}
              {!done && where && (
                <>
                  {' '}
                  <span className="caption">at {where.name}</span>{' '}
                  <button type="button" className="link-button" onClick={() => go('world')}>
                    Show on map →
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {q.step + 1 < def.steps.length && (
        <p className="caption">
          Step {q.step + 1} of {def.steps.length}.
        </p>
      )}
      {under && stepsDone(q) && (
        <p className="accent">Go back to {def.giver.name} to hand it in.</p>
      )}
      <p>
        <span className="caption">Reward:</span> {def.reward.text}
      </p>
      {!under && <p className="caption">{def.thanks}</p>}
      {under && (
        <div className="actions spaced">
          {stepsDone(q) && (
            <button
              type="button"
              className="button"
              disabled={!check.ok}
              title={check.ok ? undefined : check.reason}
              onClick={() => {
                act((s) => handIn(s, q.id));
                onHanded();
              }}
            >
              Hand in
            </button>
          )}
          {!followed && (
            <button
              type="button"
              className="button"
              onClick={() => applyLife((s) => followQuest(s, q.id))}
            >
              Follow
            </button>
          )}
          {followed && <span className="caption">Followed: its seal is on the map.</span>}
          {!def.origin && (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => act((s) => dropQuest(s, q.id))}
            >
              Drop
            </button>
          )}
        </div>
      )}
      {said && <p className="caption">{said}</p>}
    </section>
  );
}

/** The chain's next quest, offered at the top of Under way as soon as the one before is handed in. */
function Offer({ game }: { game: GameState }) {
  const applyLife = useGame((s) => s.applyLife);
  const q = chainOffer(game);
  if (!q) return null;
  return (
    <div className="quest-offer">
      <p className="caption">Offered · {q.giver.name}</p>
      <p>
        <strong>{q.title}</strong>
      </p>
      <p className="caption">{q.reason}</p>
      <button
        type="button"
        className="button spaced"
        onClick={() =>
          applyLife((s) => {
            const r = takeChainOffer(s);
            return r.ok ? r.state : s;
          })
        }
      >
        Take it
      </button>
    </div>
  );
}

function Quests({ game }: { game: GameState }) {
  // Handing a quest in moves the page on to what is under way (Jan's playtest after S1).
  const [pick, setPick] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  // A quest a later build lost isn't shown; the next day step drops it (core/journal.ts).
  const all = game.journal.quests.filter((q) => hasQuest(q.id));
  const under = all.filter((q) => q.handed === null);
  // The followed quest first, then the rest under way in the order taken.
  under.sort(
    (a, b) => Number(b.id === game.journal.followed) - Number(a.id === game.journal.followed),
  );
  const handed = all.filter((q) => q.handed !== null);
  const picked = all.find((q) => q.id === pick) ?? under[0] ?? handed[0];
  const offer = chainOffer(game);
  if (all.length === 0 && !offer) return <p className="caption">No quests taken yet.</p>;
  return (
    <div className="people-split">
      <section className="panel" aria-label="Quests">
        <h2 className="panel-heading">Under way</h2>
        <Offer game={game} />
        {under.length === 0 ? (
          !offer && <p className="caption">Nothing under way.</p>
        ) : (
          <ul className="people-list">
            {under.map((q) => (
              <QuestRow
                key={q.id}
                q={q}
                game={game}
                picked={picked?.id === q.id}
                onPick={() => setPick(q.id)}
              />
            ))}
          </ul>
        )}
        {handed.length > 0 && (
          <>
            <button
              type="button"
              className="link-button spaced"
              aria-expanded={showDone}
              onClick={() => setShowDone((x) => !x)}
            >
              Handed in ({handed.length}) {showDone ? '▴' : '▾'}
            </button>
            {showDone && (
              <ul className="people-list">
                {handed.map((q) => (
                  <QuestRow
                    key={q.id}
                    q={q}
                    game={game}
                    picked={picked?.id === q.id}
                    onPick={() => setPick(q.id)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      {picked && <QuestPage q={picked} game={game} onHanded={() => setPick(null)} />}
    </div>
  );
}

function Entry({ e }: { e: CodexEntry }) {
  return (
    <section className="panel codex-entry" aria-labelledby="codex-title">
      <h2 id="codex-title" className="panel-heading">
        {e.title} <span className="hanzi">{e.hanzi}</span>
      </h2>
      {e.text.map((t) => (
        <p key={t}>{fillSlots(t)}</p>
      ))}
      {e.numbers && e.numbers.length > 0 && (
        <table className="codex-numbers">
          <tbody>
            {e.numbers.map(([what, value]) => (
              <tr key={what}>
                <th scope="row">{fillSlots(what)}</th>
                <td>{fillSlots(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="spaced">
        <span className="caption">Where:</span>{' '}
        <button
          type="button"
          className="link-button"
          onClick={() => go(e.where.screen as ScreenId)}
        >
          {e.where.label} →
        </button>
      </p>
    </section>
  );
}

function Codex({ game, start }: { game: GameState; start: string | null }) {
  const applyLife = useGame((s) => s.applyLife);
  const [pick, setPick] = useState<string | null>(start);
  const met = codexMet(game);
  const picked = met.find((e) => e.id === pick) ?? met[0];
  if (!picked) return <p className="caption">Nothing met yet.</p>;
  const open = (id: string) => {
    setPick(id);
    applyLife((s) => seeCodex(s, id));
  };
  return (
    <div className="people-split">
      <section className="panel codex-list" aria-label="Codex">
        {CODEX_AREAS.map((a) => {
          const here = met.filter((e) => e.area === a.id);
          if (here.length === 0) return null;
          return (
            <div key={a.id} className="codex-area">
              <h3 className="sub-heading">
                {a.name} <span className="hanzi">{a.hanzi}</span>
              </h3>
              <ul className="people-list">
                {here.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className={`who${picked.id === e.id ? ' is-selected' : ''}`}
                      aria-pressed={picked.id === e.id}
                      onClick={() => open(e.id)}
                    >
                      {e.title}
                      {game.lineage.codex[e.id] === 'new' && (
                        <span className="fresh-dot" role="img" aria-label="new" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
      <Entry e={picked} />
    </div>
  );
}

export function JournalScreen() {
  const game = useGame((s) => s.game);
  const [tab, setTab] = useState<Tab>('quests');
  // A hint's Codex link opens the journal on its entry (ui/Toasts.tsx).
  const navSeq = useNav((s) => s.seq);
  const [arrived, setArrived] = useState(0);
  const [entry, setEntry] = useState<string | null>(null);
  if (navSeq !== arrived) {
    setArrived(navSeq);
    const sel = useNav.getState().select;
    if (sel?.startsWith('codex:')) {
      setTab('codex');
      setEntry(sel.slice(6));
    }
  }
  if (!game) return null;
  const fresh = Object.values(game.lineage.codex).some((v) => v === 'new');
  return (
    <div className="journal">
      <div className="seg journal-tabs" role="tablist" aria-label="The journal">
        {(
          [
            ['quests', 'Quests', '任务'],
            ['codex', 'Codex', '录'],
          ] as const
        ).map(([id, name, hanzi]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {name} <span className="hanzi">{hanzi}</span>
            {id === 'codex' && fresh && tab !== id && (
              <span className="menu-mark is-new" role="img" aria-label="something new" />
            )}
          </button>
        ))}
      </div>
      {tab === 'quests' ? <Quests game={game} /> : <Codex game={game} start={entry} />}
    </div>
  );
}
