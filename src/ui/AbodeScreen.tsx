import { SLOTS } from '../content/cultivation.ts';
import { realm } from '../content/realms.ts';
import { dayShares, majorCheck, openSlots } from '../core/cultivation.ts';
import { formatDays, formatDuration, formatLadder, formatNumber, formatPercent } from './format.ts';
import { useGame, type AwaySummary } from './store.ts';
import { AgeBar, LadderBar, LifeEdgeCard } from './widgets.tsx';

const SLOT_NAMES = { qi: 'qi', body: 'body', soul: 'soul', study: 'study', practice: 'practice' };

function AwayCard({ away }: { away: AwaySummary }) {
  const dismissAway = useGame((s) => s.dismissAway);
  const { before, state } = away;
  const breakthroughs = state.glass.flares - before.glass.flares;
  const insight = state.insight.earned - before.insight.earned;
  const stones = before.stones - state.stones;
  const ready = majorCheck(state, 'qi');
  const lines: string[] = [];
  if (state.qi.stage !== before.qi.stage || state.qi.realm !== before.qi.realm) {
    lines.push(`Qi rose to ${formatLadder(state.qi)}.`);
  }
  for (const which of ['body', 'soul'] as const) {
    if (state[which].stage !== before[which].stage) {
      lines.push(`${which === 'body' ? 'Body' : 'Soul'} rose to ${formatLadder(state[which])}.`);
    }
  }
  if (breakthroughs > 0) {
    lines.push(
      `${breakthroughs} minor ${breakthroughs === 1 ? 'breakthrough' : 'breakthroughs'} on ${state.plan.auto} odds.`,
    );
  }
  if (insight >= 1) lines.push(`Insight +${formatNumber(insight)}.`);
  if (stones >= 1) lines.push(`${formatNumber(stones)} spirit stones burned as fuel.`);
  if (ready?.bar) {
    lines.push(
      ready.ready
        ? `You are ready to break through to ${ready.target.name}.`
        : `Your qi is full; ${ready.target.name} still waits on its requirements.`,
    );
  }

  return (
    <section className="panel card-away">
      <h2 className="panel-heading">While you were in seclusion</h2>
      <p>
        {formatDuration(away.countedMs)} away
        {away.awayMs > away.countedMs &&
          ` (of ${formatDuration(away.awayMs)}; offline time counts up to 12 hours)`}
        : {formatDays(away.days)} passed.
      </p>
      {lines.length > 0 && (
        <ul>
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      {away.atEdge && <p className="warn">You woke at the edge of your lifespan.</p>}
      <div className="actions">
        <button type="button" className="button" onClick={dismissAway}>
          Continue
        </button>
      </div>
    </section>
  );
}

export function AbodeScreen({ onCultivate }: { onCultivate: () => void }) {
  const game = useGame((s) => s.game);
  const away = useGame((s) => s.away);
  if (!game) return null;

  const shares = dayShares(game);
  const open = new Set(openSlots(game));
  const plan = SLOTS.filter((s) => open.has(s) && shares[s] > 0)
    .map((s) => `${formatPercent(shares[s])} ${SLOT_NAMES[s]}`)
    .join(' · ');
  const ready = majorCheck(game, 'qi');

  return (
    <>
      {away && <AwayCard away={away} />}
      <LifeEdgeCard />

      {!game.ended && ready?.ready && (
        <section className="panel card-ready">
          <p>
            Qi presses against the gate of {ready.target.name}. The breakthrough is yours to call.
          </p>
          <div className="actions">
            <button type="button" className="button" onClick={onCultivate}>
              Go to Cultivate
            </button>
          </div>
        </section>
      )}

      <section className="panel">
        <h2 className="realm-title">
          {formatLadder(game.qi)}
          <small>
            {game.character.name} · {game.character.pronouns}
          </small>
        </h2>
        <div className="bars">
          <LadderBar game={game} which="qi" />
          {open.has('body') && <LadderBar game={game} which="body" />}
          {open.has('soul') && <LadderBar game={game} which="soul" />}
          <AgeBar game={game} />
        </div>
        <dl className="stats">
          <div>
            <dt>Insight</dt>
            <dd>{formatNumber(game.insight.current)}</dd>
          </div>
          <div>
            <dt>Spirit stones</dt>
            <dd>{formatNumber(game.stones)}</dd>
          </div>
          {plan && (
            <div>
              <dt>Today</dt>
              <dd>{plan}</dd>
            </div>
          )}
        </dl>
        <p className="caption spaced">
          Lifespan {realm(game.qi.realm).lifespan} years at {realm(game.qi.realm).name}.
        </p>
      </section>
    </>
  );
}
