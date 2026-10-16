// Routine › Study (design § UI and screens, the Routine row; § Cultivation, Reading): the copy
// being read, with its bar, time left, lump and how well it suits you; the queue after it, reordered
// and pruned, a waiting copy saying why; the unread copies on the shelf, each with Queue; and what
// study gives.
import { useState } from 'react';
import { copyManual, copyTitle, readDays, readLump, SUITS_CAP } from '../content/copies.ts';
import { MANUAL_KINDS } from '../content/manuals.ts';
import { rarity } from '../content/rarity.ts';
import { dayRates } from '../core/cultivation.ts';
import { insightMultiplier } from '../core/insight.ts';
import {
  readingCopy,
  readingQueue,
  readProgress,
  suitsYou,
  unqueuedCopies,
  waitsOn,
} from '../core/reading.ts';
import type { Cultivator, GameState } from '../core/state.ts';
import { aptitudeMultiplier } from '../core/stats.ts';
import { readDaysLeft } from './bookcase.ts';
import { StillSpine } from './Bookcase.tsx';
import { formatNumber, formatRate } from './format.ts';
import { RarityName } from './MethodCard.tsx';
import { go, goToTab } from './nav.ts';
import { useGame } from './store.ts';
import { rings } from './beacons.ts';
import { useBeacons } from './useBeacons.ts';
import { practiceTime } from './techniqueList.ts';
import { Why } from './widgets.tsx';

/** "White method · 3 study days", what a queued or shelved copy is and how long it reads. */
function copyMeta(id: string): string {
  const m = copyManual(id);
  return `${rarity(m.rarity).name} ${MANUAL_KINDS[m.kind].name.toLowerCase()} · tier ${m.tier} · ${formatNumber(readDays(id))} study days`;
}

/** "in 19 days" at today's study hours, or that the wheel has none. */
function leftWords(c: Cultivator, id: string, studyPerDay: number): string {
  const days = readDaysLeft(c, id, studyPerDay);
  return days === Infinity
    ? 'no study hour on the wheel'
    : `${practiceTime(days)} at today's hours`;
}

/** "suits you ×1.25" with its reasons in a "?". */
function Suits({ c, id }: { c: Cultivator; id: string }) {
  const s = suitsYou(c, id);
  return (
    <span className={s.total > 1 ? 'study-suits is-good' : 'study-suits'}>
      suits you ×{Number(s.total.toFixed(2))}
      <Why label="How well it suits you">
        {s.reasons.length === 0 ? (
          <span>Nothing about it fits you more or less than anything else: ×1.</span>
        ) : (
          s.reasons.map((r) => (
            <span key={r.label}>
              {r.label[0]!.toUpperCase() + r.label.slice(1)}: ×{Number(r.factor.toFixed(3))}
            </span>
          ))
        )}
        {s.capped && (
          <span>
            Together they come to more than ×{SUITS_CAP}, so ×{SUITS_CAP}.
          </span>
        )}
        <span>
          Reading speed is your study days × Aptitude × how well it suits you: a method by its fit
          to your root, a technique by a kin at Comprehension and your tiers in its Dao, anything of
          an element your root holds. Capped at ×{SUITS_CAP}.
        </span>
      </Why>
    </span>
  );
}

function ReadingNow({ game }: { game: GameState }) {
  const unqueue = useGame((s) => s.unqueue);
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const id = readingCopy(c);
  const queue = readingQueue(c);
  const hours = rates.count.study;
  const head = (
    <div className="study-head">
      <h2 className="panel-heading">Reading now</h2>
      <span className="caption">
        {hours === 0
          ? 'No hour of the day goes to study.'
          : `${hours} of 12 hours · ${formatRate(rates.study)} study days a day`}
      </span>
      <button type="button" className="link-button" onClick={() => goToTab('day')}>
        Change hours on the wheel
      </button>
    </div>
  );
  if (!id) {
    return (
      <section className="panel study-now" aria-label="Reading now">
        {head}
        <p className="muted">
          {queue.length > 0
            ? 'Nothing in the queue can be read yet: each waits on something, below.'
            : 'Nothing is being read. Queue a copy from the shelf, and it begins at once.'}
        </p>
      </section>
    );
  }
  const m = copyManual(id);
  const need = readDays(id);
  const done = readProgress(c, id);
  const lump = readLump(id) * insightMultiplier(c);
  return (
    <section className="panel study-now" aria-label="Reading now">
      {head}
      <div className="study-book">
        <StillSpine c={c} m={m} />
        <div className="study-book-body">
          <h3 className="study-book-name">
            <RarityName m={m} /> <span className="hanzi">{m.hanzi}</span>
          </h3>
          <span className="caption">{copyMeta(id)}</span>
          <div
            className="bar study-bar"
            role="progressbar"
            aria-label={`Reading ${copyTitle(id)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((done / need) * 100)}
          >
            <div className="bar-fill" style={{ width: `${Math.min(100, (done / need) * 100)}%` }} />
          </div>
          <p className="study-figures">
            <span>
              {formatNumber(done)} of {formatNumber(need)} study days
            </span>
            <span className="muted">done in {leftWords(c, id, rates.study)}</span>
            <span className="muted">+{formatNumber(lump)} insight when done</span>
            <Suits c={c} id={id} />
          </p>
        </div>
        <button type="button" className="button button-quiet" onClick={() => unqueue(id)}>
          Stop
        </button>
      </div>
    </section>
  );
}

function UpNext({ game }: { game: GameState }) {
  const { unqueue, moveQueued } = useGame.getState();
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const queue = readingQueue(c);
  const now = readingCopy(c);
  const rest = queue.filter((id) => id !== now);
  if (rest.length === 0) return null;
  return (
    <section className="panel" aria-labelledby="up-next-heading">
      <h2 id="up-next-heading" className="panel-heading">
        Up next
      </h2>
      <p className="caption">When one is done the next that can be read begins by itself.</p>
      <ol className="study-queue">
        {rest.map((id) => {
          const at = queue.indexOf(id);
          const waits = waitsOn(c, id);
          const m = copyManual(id);
          return (
            <li key={id} className={`study-row${waits ? ' is-waiting' : ''}`}>
              <span className="study-place" aria-hidden="true">
                {at + 1}
              </span>
              <StillSpine c={c} m={m} />
              <div className="study-row-body">
                <span>
                  <RarityName m={m} /> <span className="hanzi">{m.hanzi}</span>
                </span>
                {waits ? (
                  <span className="caption warn">
                    Waits: {waits.replace(/\.$/, '')}. Skipped until then.
                  </span>
                ) : (
                  <span className="caption">
                    {copyMeta(id)} · {leftWords(c, id, rates.study)}
                  </span>
                )}
              </div>
              <div className="study-row-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${m.name} up`}
                  disabled={at === 0}
                  onClick={() => moveQueued(id, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${m.name} down`}
                  disabled={at === queue.length - 1}
                  onClick={() => moveQueued(id, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Take ${m.name} out of the queue`}
                  onClick={() => unqueue(id)}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Shelf({ game }: { game: GameState }) {
  const readCopy = useGame((s) => s.readCopy);
  const [error, setError] = useState<string | null>(null);
  const c = game.player;
  const unqueued = unqueuedCopies(c);
  const empty = readingQueue(c).length === 0;
  const bs = useBeacons();
  return (
    <section className="panel" aria-labelledby="shelf-heading">
      <h2 id="shelf-heading" className="panel-heading">
        Unread on the shelf
      </h2>
      {unqueued.length === 0 ? (
        <p className="caption">Every copy you own is read or queued.</p>
      ) : (
        <ul className="study-queue">
          {unqueued.map((id) => {
            const m = copyManual(id);
            return (
              <li key={id} className="study-row">
                <StillSpine c={c} m={m} />
                <div className="study-row-body">
                  <span>
                    <RarityName m={m} /> <span className="hanzi">{m.hanzi}</span>
                  </span>
                  <span className="caption">{copyMeta(id)}</span>
                </div>
                <button
                  type="button"
                  className={`button${rings(bs, 'read-now', { id }) ? ' beacon-ring' : ''}`}
                  disabled={!!game.ended}
                  onClick={() => setError(readCopy(id))}
                >
                  {empty ? 'Read now' : 'Queue'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="warn">{error}</p>}
      <button
        type="button"
        className="link-button"
        onClick={() => go('trees', { pick: 'manuals' })}
      >
        Open the bookcase
      </button>
    </section>
  );
}

function StudyGives({ game }: { game: GameState }) {
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const insight = rates.hours.filter((h) => h.kind === 'study').reduce((a, h) => a + h.insight, 0);
  return (
    <section className="panel" aria-labelledby="study-gives-heading">
      <h2 id="study-gives-heading" className="panel-heading">
        What study gives
      </h2>
      <dl className="study-gives">
        <dt>Insight a day</dt>
        <dd>+{formatRate(insight)}</dd>
        <dt>Study days a day</dt>
        <dd>{formatRate(rates.study)}</dd>
        <dt>Aptitude</dt>
        <dd>×{aptitudeMultiplier(c).toFixed(2)}</dd>
      </dl>
      <p className="caption">
        Every study hour gives insight whether or not a copy is being read; a copy read gives its
        lump of insight when done.
      </p>
    </section>
  );
}

export function StudyTab({ game }: { game: GameState }) {
  return (
    <div className="study-split">
      <div className="study-main">
        <ReadingNow game={game} />
        <UpNext game={game} />
      </div>
      <div className="study-side">
        <Shelf game={game} />
        <StudyGives game={game} />
      </div>
    </div>
  );
}
