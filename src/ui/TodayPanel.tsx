// What the day is doing, in the middle of Cultivate's band while no card waits (A3, Jan's pick
// from docs/mockups/cultivate-empty-study.html): the copy being read, what is practiced, and the
// qi a day with when the bar fills. Only today's work, never the other ladders' next steps (Jan's
// call). With nothing read or practiced, its row says so and links to the tab that sets it up.
import { copyTitle, readDays } from '../content/copies.ts';
import { MASTERY } from '../content/mastery.ts';
import { technique } from '../content/techniques.ts';
import { barSize, dayRates } from '../core/cultivation.ts';
import { ladderMethod } from '../core/methods.ts';
import { readingCopy, readProgress } from '../core/reading.ts';
import type { GameState } from '../core/state.ts';
import { daysToNextLevel, knownTechniques, mastery } from '../core/techniques.ts';
import { readDaysLeft } from './bookcase.ts';
import { formatDays, formatRate } from './format.ts';
import { goToTab, type RoutineTab } from './nav.ts';

/** Two techniques at most, so the qi row always has its place. */
const PRACTICE_ROWS = 2;

interface Row {
  key: string;
  title: string;
  line: string;
  /** A bar's fill, 0 to 1. */
  fill?: number;
  tone?: 'read' | 'practice';
  /** An empty row's way to fill it. */
  link?: { label: string; tab: RoutineTab };
}

/** "in about 6 days", or what stands in the way when nothing moves it. */
function inAbout(days: number | null, stalled: string): string {
  if (days === null || !Number.isFinite(days)) return stalled;
  return `in about ${formatDays(days)}`;
}

function todayRows(game: GameState): Row[] {
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const rows: Row[] = [];

  const reading = readingCopy(c);
  if (reading) {
    const left = readDaysLeft(c, reading, rates.study);
    rows.push({
      key: 'read',
      title: `Reading ${copyTitle(reading)}`,
      line: Number.isFinite(left)
        ? `done in about ${formatDays(left)}`
        : 'it waits for a study hour',
      fill: Math.min(1, readProgress(c, reading) / readDays(reading)),
      tone: 'read',
    });
  } else {
    rows.push({
      key: 'read',
      title: 'Nothing on the reading stand',
      line: 'a copy read gives its manual',
      link: { label: 'Study →', tab: 'study' },
    });
  }

  const practiced = Object.entries(rates.practiceEach).slice(0, PRACTICE_ROWS);
  for (const [id, rate] of practiced) {
    const m = mastery(c, id);
    const next = MASTERY[m.level + 1];
    rows.push({
      key: `practice-${id}`,
      title: `Practicing ${technique(id).name}`,
      line: next
        ? `${next.name.toLowerCase()} ${inAbout(daysToNextLevel(c, id, rate), 'when it has hours')}`
        : 'its mastery is complete',
      fill: m.next === null ? 1 : m.fraction,
      tone: 'practice',
    });
  }
  if (practiced.length === 0 && knownTechniques(c).length > 0) {
    rows.push({
      key: 'practice',
      title: 'Nothing in practice',
      line: 'a technique practiced grows its mastery',
      link: { label: 'Practice →', tab: 'practice' },
    });
  }

  if (!ladderMethod(c, 'qi')) {
    rows.push({ key: 'qi', title: 'No method yet', line: 'the qi drifts close and slides off' });
  } else {
    const stones = c.plan.burnStones ? Math.min(rates.stoneCap, Math.floor(c.stones)) : 0;
    const perDay = rates.qi + stones * rates.qiPerStone;
    const left = Math.max(0, barSize(c.qi) - c.qi.bar);
    rows.push({
      key: 'qi',
      title: `${formatRate(perDay)} qi a day`,
      line:
        left <= 0
          ? 'the bar is full; the breakthrough waits'
          : `the bar fills ${inAbout(perDay > 0 ? left / perDay : null, 'with no qi hours')}`,
    });
  }
  return rows;
}

export function TodayPanel({ game }: { game: GameState }) {
  const rows = todayRows(game);
  return (
    <div className="today">
      <p className="band-kicker">
        <span>Today</span>
        <span>Seclusion is quiet</span>
      </p>
      <div className="today-rows">
        {rows.map((r) => (
          <div
            key={r.key}
            className={`today-row${r.tone ? ` is-${r.tone}` : ''}${r.link ? ' is-empty' : ''}`}
          >
            <strong>{r.title}</strong>
            <span>
              {r.line}
              {r.link && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => goToTab(r.link!.tab)}
                  >
                    {r.link.label}
                  </button>
                </>
              )}
            </span>
            {r.fill !== undefined && (
              <div className="today-bar" aria-hidden="true">
                <i style={{ width: `${r.fill * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
