import { AUTO_IDS, AUTO_SETTINGS, GRADES, type SlotId } from '../content/cultivation.ts';
import { method } from '../content/methods.ts';
import { realm } from '../content/realms.ts';
import { root } from '../content/roots.ts';
import { technique } from '../content/techniques.ts';
import {
  barFill,
  dayRates,
  dayShares,
  inTutorial,
  majorCheck,
  minorOdds,
  nextStep,
  openSlots,
  qiSpeed,
  type LadderId,
} from '../core/cultivation.ts';
import { itemCount, type GameState } from '../core/state.ts';
import { formatLadder, formatNumber, formatPercent, LADDER_LABELS } from './format.ts';
import { useGame } from './store.ts';
import { LadderBar, LifeEdgeCard } from './widgets.tsx';

const SLOT_INFO: Record<SlotId, { name: string; what: string }> = {
  qi: { name: 'Qi', what: 'cultivate qi with your method' },
  body: { name: 'Body', what: 'temper flesh and bone' },
  soul: { name: 'Soul', what: 'nourish the soul' },
  study: { name: 'Study', what: 'study for insight' },
  practice: { name: 'Practice', what: 'practice a technique or recipe' },
};

const ITEM_NAMES: Record<string, string> = {
  'foundation-pill': 'Foundation Pill',
  'core-forming-pill': 'core-forming pill',
};

function PlanPanel({ game }: { game: GameState }) {
  const setPlan = useGame((s) => s.setPlan);
  const open = openSlots(game.player);
  const shares = dayShares(game.player);
  const rates = dayRates(game.player, game.calendar.day);
  const speed = qiSpeed(game.player);
  const perDay: Partial<Record<SlotId, string>> = {
    qi: `+${formatNumber(rates.qi)} qi a day`,
    body: `+${formatNumber(rates.body)} tempering a day`,
    soul: `+${formatNumber(rates.soul)} nourishment a day`,
    study: `+${formatNumber(rates.insight)} insight a day, with every day's trickle`,
    practice:
      rates.practice > 0 && game.player.practicing
        ? `+${rates.practice.toFixed(2)} practice days a day on ${technique(game.player.practicing).name}`
        : 'Nothing to practice: pick a technique on the Techniques screen.',
  };
  const r = root(game.player.root);
  const m = game.player.method ? method(game.player.method) : null;
  const qiWhy = m
    ? `Qi speed ×${speed.total.toFixed(2)}: root ×${speed.root}, method fit ×${speed.fit}, qi density ×${speed.density}, Aptitude ×${speed.aptitude.toFixed(2)}${speed.nodes !== 1 ? `, tree nodes ×${speed.nodes.toFixed(2)}` : ''}${inTutorial(game.player.qi) ? '. Layers 1–3 ignore the root and the fit' : ''}.`
    : 'No method yet: qi days give nothing.';

  return (
    <section className="panel" aria-labelledby="plan-heading">
      <h2 id="plan-heading" className="panel-heading">
        Seclusion
      </h2>
      <p className="muted">
        Each day goes where you send it. Lifespan caps the total, so spreading too thin means dying
        before the next breakthrough.
      </p>
      <div className="plan">
        {open.map((slot) => (
          <div key={slot} className="plan-row">
            <label htmlFor={`share-${slot}`} title={SLOT_INFO[slot].what}>
              {SLOT_INFO[slot].name}
            </label>
            <div>
              <input
                id={`share-${slot}`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={game.player.plan.shares[slot]}
                onChange={(e) =>
                  setPlan({
                    shares: { ...game.player.plan.shares, [slot]: Number(e.target.value) },
                  })
                }
                aria-valuetext={`${formatPercent(shares[slot])} of each day`}
              />
              <span className="caption" title={slot === 'qi' ? qiWhy : undefined}>
                {perDay[slot]}
              </span>
            </div>
            <span className="value">{formatPercent(shares[slot])}</span>
          </div>
        ))}
      </div>
      <p className="caption spaced">
        {m ? `${m.name} on a ${r.name.toLowerCase()}. ` : ''}
        {qiWhy}
      </p>
      <div className="settings-row">
        <div className="field">
          <span id="auto-label">Minor breakthroughs</span>
          <div className="seg" role="group" aria-labelledby="auto-label">
            {AUTO_IDS.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={game.player.plan.auto === id}
                onClick={() => setPlan({ auto: id })}
              >
                {AUTO_SETTINGS[id].name}
              </button>
            ))}
          </div>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={game.player.plan.burnStones}
            onChange={(e) => setPlan({ burnStones: e.target.checked })}
          />
          Burn spirit stones on qi days
          {rates.stoneCap > 0 && (
            <span className="caption">
              (up to {formatNumber(rates.stoneCap)} a day, {formatNumber(game.player.stones)} held)
            </span>
          )}
        </label>
      </div>
      <p className="caption spaced">
        {game.player.plan.auto === 'off'
          ? 'Minor breakthroughs wait for you; offline, a full bar holds.'
          : game.player.plan.auto === 'bold'
            ? 'Minor breakthroughs go the moment a bar is full.'
            : `Minor breakthroughs go on their own at ${formatPercent(AUTO_SETTINGS[game.player.plan.auto].minOdds)} odds or a bar at 150%, online and off.`}{' '}
        Major breakthroughs are always yours to call, and never happen offline.
      </p>
    </section>
  );
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return <li className={met ? 'is-met' : undefined}>{children}</li>;
}

function LadderPanel({ game, which }: { game: GameState; which: LadderId }) {
  const breakThrough = useGame((s) => s.breakThrough);
  const l = game.player[which];
  const step = nextStep(l);
  const fill = barFill(l);
  const unsettled = game.calendar.day < l.unsettledUntil;
  const injured = game.calendar.day < l.injuredUntil;
  const grades = l.grades.map((g) => GRADES.find((x) => x.id === g)!.name.toLowerCase());

  let body: React.ReactNode;
  if (step.kind === 'top') {
    body = <p className="muted">There is nowhere higher to climb.</p>;
  } else if (step.kind === 'minor') {
    const odds = minorOdds(game.player, which);
    body = (
      <div className="actions">
        <button
          type="button"
          className="button"
          disabled={fill < 1 || !!game.ended}
          onClick={() => breakThrough(which)}
        >
          Break through to {formatLadder({ ...l, stage: step.stage })} ·{' '}
          {fill < 1 ? 'not yet' : formatPercent(odds)}
        </button>
        <span className="caption">
          {fill < 1
            ? `${formatPercent(fill)} of the way.`
            : odds >= 1
              ? 'This step always holds.'
              : 'Filling past full raises the odds; a failure costs a fifth of the bar.'}
        </span>
      </div>
    );
  } else {
    const check = majorCheck(game.player, which)!;
    const target = check.target;
    const gateName = check.gateItem ? (ITEM_NAMES[check.gateItem] ?? check.gateItem) : null;
    const grade = GRADES.find((g) => g.id === check.grade)!;
    body = (
      <>
        <ul className="reqs" aria-label={`Requirements for ${target.name}`}>
          <Requirement met={check.bar}>A full bar ({formatPercent(fill)})</Requirement>
          <Requirement met={check.insight}>
            Insight ever earned {formatNumber(game.player.insight.earned)} of{' '}
            {formatNumber(target.insightThreshold)}
          </Requirement>
          {gateName && (
            <Requirement met={check.gate}>
              {gateName} ({itemCount(game.player, check.gateItem!)} held)
            </Requirement>
          )}
          {which !== 'qi' && (
            <Requirement met={check.cap}>At most one realm ahead of your qi</Requirement>
          )}
        </ul>
        <p className="caption spaced">
          As things stand: a {grade.name.toLowerCase()} breakthrough ({grade.stages >= 0 ? '+' : ''}
          {grade.stages} in a fight). Qi past full, insight past the threshold, and the other two
          ladders at {target.name} each raise the grade.
        </p>
        <div className="actions">
          <button
            type="button"
            className="button"
            disabled={!check.ready || !!game.ended}
            onClick={() => breakThrough(which)}
          >
            Break through to {target.name} · {formatPercent(check.odds)}
          </button>
          <span className="caption">
            A failure {gateName ? `uses the ${gateName}, ` : ''}halves the bar and injures for
            years.
          </span>
        </div>
      </>
    );
  }

  return (
    <div className="ladder">
      <div className="ladder-head">
        <h3>
          {LADDER_LABELS[which]}: {formatLadder(l)}
        </h3>
        <span className="caption">
          {grades.length > 0 && `${grades.join(', ')} · `}
          {unsettled ? 'unsettled' : injured ? 'injured, slowed' : `${realm(l.realm).hanzi}`}
        </span>
      </div>
      <div className="bars">
        <LadderBar game={game} which={which} />
      </div>
      {body}
    </div>
  );
}

export function CultivateScreen() {
  const game = useGame((s) => s.game);
  if (!game) return null;
  const open = openSlots(game.player);
  const ladders = (['qi', 'body', 'soul'] as const).filter((l) => l === 'qi' || open.includes(l));

  return (
    <>
      <LifeEdgeCard />
      <PlanPanel game={game} />
      <section className="panel" aria-labelledby="bt-heading">
        <h2 id="bt-heading" className="panel-heading">
          Breakthroughs
        </h2>
        {ladders.map((which) => (
          <LadderPanel key={which} game={game} which={which} />
        ))}
      </section>
    </>
  );
}
