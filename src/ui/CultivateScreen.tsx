import { useState } from 'react';
import { AUTO_IDS, AUTO_SETTINGS, GRADES } from '../content/cultivation.ts';
import { ELEMENT_INFO } from '../content/elements.ts';
import { hasMethod, method } from '../content/methods.ts';
import { realm } from '../content/realms.ts';
import { root } from '../content/roots.ts';
import { hasRoutine, routine } from '../content/routines.ts';
import { technique } from '../content/techniques.ts';
import {
  barFill,
  dayRates,
  inTutorial,
  ladderOpen,
  majorCheck,
  minorOdds,
  nextStep,
  qiSpeed,
  type LadderId,
} from '../core/cultivation.ts';
import { ladderMethod } from '../core/methods.ts';
import { itemCount, type GameState } from '../core/state.ts';
import { canFollow } from '../core/wheel.ts';
import { DayWheel, WheelStrip } from './DayWheel.tsx';
import { formatLadder, formatNumber, formatPercent, formatRate, LADDER_LABELS } from './format.ts';
import { useGame } from './store.ts';
import { LadderBar, LifeEdgeCard } from './widgets.tsx';

const ITEM_NAMES: Record<string, string> = {
  'foundation-pill': 'Foundation Pill',
  'core-forming-pill': 'core-forming pill',
};

function DayPanel({ game }: { game: GameState }) {
  const setPlan = useGame((s) => s.setPlan);
  const c = game.player;
  const rates = dayRates(c, game.calendar.day);
  const speed = qiSpeed(c);
  const r = root(c.root);
  const m = ladderMethod(c, 'qi');
  const elements = c.rootElements.map((e) => ELEMENT_INFO[e].name.toLowerCase()).join(' and ');
  const qiWhy = m
    ? `Qi speed ×${speed.total.toFixed(2)}: root ×${speed.root}, method fit ×${speed.fit}, qi density ×${speed.density}, Aptitude ×${speed.aptitude.toFixed(2)}${speed.nodes !== 1 ? `, tree nodes ×${speed.nodes.toFixed(2)}` : ''}${inTutorial(c.qi) ? '. Layers 1–3 ignore the root, the fit and the element hours' : ''}.`
    : 'No cultivation method yet: qi hours give nothing.';
  const day = [
    rates.qi > 0 && `+${formatRate(rates.qi)} qi`,
    rates.body > 0 && `+${formatRate(rates.body)} tempering`,
    rates.soul > 0 && `+${formatRate(rates.soul)} nourishment`,
    `+${formatRate(rates.insight)} insight`,
    rates.practice > 0 &&
      c.practicing &&
      `+${formatRate(rates.practice)} practice days on ${technique(c.practicing).name}`,
  ].filter(Boolean);

  return (
    <section className="panel" aria-labelledby="day-heading">
      <h2 id="day-heading" className="panel-heading">
        The day
      </h2>
      <DayWheel game={game} />
      <p className="rates spaced">A day of seclusion: {day.join(' · ')}.</p>
      <p className="caption">
        {m ? `${m.name} on a ${r.name.toLowerCase()} of ${elements}. ` : ''}
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
                aria-pressed={c.plan.auto === id}
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
            checked={c.plan.burnStones}
            onChange={(e) => setPlan({ burnStones: e.target.checked })}
          />
          Burn spirit stones in qi hours
          {rates.stoneCap > 0 && (
            <span className="caption">
              (up to {formatNumber(rates.stoneCap)} a day, {formatNumber(c.stones)} held)
            </span>
          )}
        </label>
      </div>
      <p className="caption spaced">
        {c.plan.auto === 'off'
          ? 'Minor breakthroughs wait for you; offline, a full bar holds.'
          : c.plan.auto === 'bold'
            ? 'Minor breakthroughs go the moment a bar is full.'
            : `Minor breakthroughs go on their own at ${formatPercent(AUTO_SETTINGS[c.plan.auto].minOdds)} odds or a bar at 150%, online and off.`}{' '}
        Major breakthroughs are always yours to call, and never happen offline.
      </p>
    </section>
  );
}

function RoutinesPanel({ game }: { game: GameState }) {
  const { followRoutine, saveRoutine, forgetRoutine } = useGame.getState();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const c = game.player;
  const following = dayRates(c, game.calendar.day).routine;
  const learned = c.routines.filter(hasRoutine).map(routine);
  const same = (hours: readonly string[]) => hours.every((k, i) => c.wheel[i] === k);

  return (
    <section className="panel" aria-labelledby="routines-heading">
      <h2 id="routines-heading" className="panel-heading">
        Routines
      </h2>
      <p className="muted">
        Follow a routine learned from a teacher, manual or sect exactly, all twelve hours, and every
        waking hour pays a tenth more. A wheel you save yourself earns no discipline.
      </p>
      {learned.length > 0 && (
        <ul className="routines">
          {learned.map((r) => {
            const check = canFollow(c, r.hours);
            const isFollowed = following?.id === r.id;
            return (
              <li key={r.id} className="routine">
                <div className="routine-head">
                  <strong>
                    {r.name} <span className="hanzi">{r.hanzi}</span>
                  </strong>
                  <WheelStrip hours={r.hours} />
                </div>
                <p className="caption">From {r.source}.</p>
                <div className="actions">
                  {isFollowed ? (
                    <span className="accent">Following: discipline +10% on every waking hour.</span>
                  ) : (
                    <button
                      type="button"
                      className="button"
                      disabled={!check.ok || !!game.ended}
                      onClick={() => setError(followRoutine(r.hours))}
                    >
                      Follow
                    </button>
                  )}
                  {!check.ok && <span className="caption">{check.reason}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {c.savedRoutines.length > 0 && (
        <ul className="routines">
          {c.savedRoutines.map((r) => (
            <li key={r.name} className="routine">
              <div className="routine-head">
                <strong>{r.name}</strong>
                <WheelStrip hours={r.hours} />
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="button"
                  disabled={same(r.hours) || !!game.ended}
                  onClick={() => setError(followRoutine(r.hours))}
                >
                  {same(r.hours) ? 'In use' : 'Use'}
                </button>
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => forgetRoutine(r.name)}
                >
                  Forget
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form
        className="routine-save"
        onSubmit={(e) => {
          e.preventDefault();
          const why = saveRoutine(name);
          setError(why);
          if (!why) setName('');
        }}
      >
        <label className="field">
          <span>Save this wheel as a routine</span>
          <input
            type="text"
            value={name}
            maxLength={40}
            placeholder="A name"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button type="submit" className="button" disabled={!!game.ended}>
          Save
        </button>
      </form>
      {error && <p className="warn">{error}</p>}
    </section>
  );
}

const ART_NAMES: Record<LadderId, string> = {
  qi: 'cultivation method',
  body: 'tempering art',
  soul: 'nourishing art',
};

function MethodsPanel({ game }: { game: GameState }) {
  const c = game.player;
  return (
    <section className="panel" aria-labelledby="methods-heading">
      <h2 id="methods-heading" className="panel-heading">
        Methods
      </h2>
      <ul className="methods">
        {(['qi', 'body', 'soul'] as const).map((which) => {
          const m = ladderMethod(c, which);
          const known = c.methods.filter((id) => hasMethod(id) && method(id).ladder === which);
          return (
            <li key={which}>
              <span className="label">{LADDER_LABELS[which]}</span>
              {m ? (
                <span title={`From ${m.source}.`}>
                  {m.name} <span className="hanzi">{m.hanzi}</span>
                  {m.element && (
                    <span className="caption">
                      {' '}
                      · {ELEMENT_INFO[m.element].name.toLowerCase()}: its hours match{' '}
                      {ELEMENT_INFO[m.element].name.toLowerCase()} hours
                    </span>
                  )}
                </span>
              ) : (
                <span className="muted">
                  No {ART_NAMES[which]}
                  {known.length === 0 &&
                    (which === 'qi'
                      ? ': qi hours give nothing.'
                      : `: the ${which} grows only from the world until you find one.`)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
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
  const ladders = (['qi', 'body', 'soul'] as const).filter((l) => ladderOpen(game.player, l));

  return (
    <>
      <LifeEdgeCard />
      <DayPanel game={game} />
      <RoutinesPanel game={game} />
      <MethodsPanel game={game} />
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
