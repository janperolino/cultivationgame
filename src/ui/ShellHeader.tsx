import { ratesHere } from '../core/life.ts';
import { BRANCHES } from '../content/hours.ts';
import { worldWhen } from '../core/chronicle.ts';
import { purseWords, stonesOf, stonesWords } from '../core/purse.ts';
import { hourOfDay } from '../core/wheel.ts';
import { formatNumber, formatRate } from './format.ts';
import { useGame } from './store.ts';
import type { GameState } from '../core/state.ts';
import { InsightGlyph, StoneGlyph } from './icons.tsx';
import { Why } from './widgets.tsx';

/** The stones as the top shows them: the low-grade count alone, or every grade held. */
function stoneWords(stones: ReturnType<typeof stonesOf>): string {
  if (stones.slice(1).every((n) => n === 0)) return formatNumber(Math.floor(stones[0]));
  return stonesWords(stones, formatNumber);
}

/** The stones and the insight, each with its "?": at the top, and under the figure on Cultivate (F1). */
export function PurseStats({ game, className }: { game: GameState; className: string }) {
  const c = game.player;
  const rates = ratesHere(game);
  return (
    <dl className={className}>
      <div>
        <dt>
          <StoneGlyph />
          <span className="visually-hidden">Spirit stones</span>
        </dt>
        <dd>
          {stoneWords(stonesOf(c))}{' '}
          <Why label="What spirit stones do here">
            Spirit stones: you hold {purseWords(c)}.{' '}
            {c.plan.burnStones
              ? `On qi days you burn up to ${rates.stoneCap} low-grade stones, each adding ${formatRate(rates.qiPerStone)} qi. Turn burning off on the Routine screen.`
              : 'Burning stones is off: they wait in your pouch. Turn it on from the Routine screen.'}
          </Why>
        </dd>
      </div>
      <div>
        <dt>
          <InsightGlyph />
          <span className="visually-hidden">Insight</span>
        </dt>
        <dd>
          {formatNumber(c.insight.current)}{' '}
          <Why label="Where insight comes from">
            Insight: {formatNumber(c.insight.current)} to spend on tree nodes, and{' '}
            {formatNumber(c.insight.earned)} earned in all. Breakthroughs count what you have
            earned, so spending never delays them. Today&apos;s wheel gives about{' '}
            {formatRate(rates.insight)} a day.
          </Why>
        </dd>
      </div>
    </dl>
  );
}

/**
 * The top of every screen (A2; docs/mockups/shell-study.html): no bar, the brand floating on the
 * left and the season, the hour, the stones and the insight on the right, over whatever the
 * screen shows. On Cultivate the stones and insight sit under the figure instead (F1), so
 * `purse` is off there.
 */
export function ShellHeader({ purse = true }: { purse?: boolean }) {
  const game = useGame((s) => s.game);
  const c = game?.player;
  const rates = game ? ratesHere(game) : null;
  const branch = game ? BRANCHES[hourOfDay(game.calendar.day)]! : null;
  return (
    <header className="shell-top">
      <p className="brand">
        Severed Heaven <span className="hanzi brand-hanzi">断天</span>
      </p>
      {game && c && rates && branch && (
        <div className="top-res">
          <p className="top-when">
            <b>{worldWhen(game.calendar.day)}</b>
            <small>
              {branch.time[0]!.toUpperCase() + branch.time.slice(1)} · hour of {branch.name}
            </small>
          </p>
          {purse && <span className="top-sep" aria-hidden="true" />}
          {purse && <PurseStats game={game} className="top-stats" />}
        </div>
      )}
    </header>
  );
}
