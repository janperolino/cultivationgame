// Breakthroughs at the Abode (P2.4; design § Cultivation, Breakthroughs and grades; § UI and
// screens). Under the figure, a row of up to three buttons, Qi, Body and Soul, each naming its
// next step once that ladder's bar is full. A minor step starts the scene at once; a major one
// opens the panel between the figure and the stats: the ladder, the target, the odds, the grade
// meter, the requirements as a checklist, three offering slots and a strip of the things you hold
// that can be offered, each saying what it does on this attempt. At the lifespan edge the same
// panel holds the last chance, with the gate pill alone. Every rule lives in core.
import { useState, type CSSProperties } from 'react';
import {
  GRADE_SCORES,
  GRADES,
  LADDERS,
  MAX_OFFERINGS,
  type GradeId,
  type LadderId,
} from '../content/cultivation.ts';
import { item } from '../content/items.ts';
import { realm, stageName } from '../content/realms.ts';
import {
  barFill,
  ladderOpen,
  lastChance,
  majorCheck,
  majorRequirements,
  minorOdds,
  nextStep,
  type MajorCheck,
  type MarginPart,
  type Requirement,
} from '../core/cultivation.ts';
import { offerable, offerEffect, type OfferEffect } from '../core/offerings.ts';
import { atLifespanEdge, itemCount, type GameState } from '../core/state.ts';
import { formatNumber, formatPercent, gradeGives, LADDER_LABELS } from './format.ts';
import {
  closePanel,
  filling,
  letFill,
  openPanel,
  stepState,
  useScene,
  type PanelOpen,
} from './scene.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';

/** The meter's scale: the margin score runs 0 to 4. */
const METER_MAX = 4;

const gradeOf = (id: GradeId) => GRADES.find((g) => g.id === id)!;
const points = (x: number) => `${x >= 0 ? '+' : '−'}${Math.round(Math.abs(x) * 100)}`;
const signed = (x: number, digits = 2) => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(digits)}`;

/** The name of a ladder's next step: "Foundation Establishment", or "fifth layer". */
function targetName(game: GameState, which: LadderId): string {
  const step = nextStep(game.player[which]);
  if (step.kind === 'top') return 'the top';
  return step.kind === 'major' ? realm(step.realm).name : stageName(step.realm, step.stage);
}

// ---------------------------------------------------------------- the row

/**
 * The row under the figure: a button for each ladder whose bar is full, naming its next step, and
 * dimmer while a major's other requirements aren't met. Nothing shows while a scene plays.
 */
export function BreakthroughRow({ game }: { game: GameState }) {
  const playing = useScene((s) => !!s.play);
  const panel = useScene((s) => s.panel);
  const quiet = useScene((s) => s.quietUntil);
  const beginScene = useGame((s) => s.beginScene);
  if (playing) return null;
  const c = game.player;
  const edge = atLifespanEdge(game);
  const buttons = LADDERS.filter((w) => ladderOpen(c, w)).flatMap((which) => {
    const state = stepState(game, which);
    if (state === 'hidden') return [];
    const step = nextStep(c[which]);
    const major = step.kind === 'major';
    const last = which === 'qi' && major && edge;
    const waiting = !last && filling(game, which, quiet);
    const odds = minorOdds(c, which);
    const tail = last
      ? state === 'ready'
        ? 'last chance'
        : 'no last chance'
      : state === 'not-ready'
        ? 'not ready'
        : waiting
          ? 'letting it fill'
          : major
            ? null
            : odds >= 1
              ? 'certain'
              : formatPercent(odds);
    const label = [LADDER_LABELS[which], targetName(game, which), tail].filter(Boolean).join(' · ');
    const open = panel?.ladder === which;
    return [
      <button
        key={which}
        type="button"
        className={`button bt-step is-${which}${state === 'ready' && !waiting ? '' : ' is-dim'}${open ? ' is-open' : ''}`}
        aria-expanded={major ? open : undefined}
        onClick={() => {
          if (!major) beginScene(which);
          else if (open) closePanel();
          else openPanel(which, last);
        }}
      >
        {label}
      </button>,
    ];
  });
  if (!buttons.length) return null;
  return (
    <div className="bt-row" role="group" aria-label="Breakthroughs">
      {buttons}
    </div>
  );
}

// ---------------------------------------------------------------- the grade meter

/** The words for a source of margin. */
function partLabel(p: MarginPart): string {
  if (p.source === 'offering') return item(p.item!).name;
  if (p.source === 'method') return "the method's margin";
  return p.source;
}

function partClass(p: MarginPart): string {
  if (p.source === 'offering') return `is-offering rarity-${item(p.item!).rarity}`;
  return `is-${p.source}`;
}

/**
 * The grade as a meter (D2.1): a bar from 0 to 4 with the thresholds marked, each source a
 * labeled segment as it lands, and the grade it earns in words.
 */
function GradeMeter({ check, last }: { check: MajorCheck; last: boolean }) {
  const shown = check.parts.filter((p) => p.value > 0.0049);
  // Each segment runs from the sum before it, clamped to the meter.
  const ends = shown.map((_, i) => shown.slice(0, i + 1).reduce((t, p) => t + p.value, 0));
  const segments = shown.map((p, i) => {
    const from = Math.min(METER_MAX, ends[i]! - p.value);
    const to = Math.min(METER_MAX, ends[i]!);
    return { p, i, width: ((to - from) / METER_MAX) * 100 };
  });
  const grade = last ? 'flawed' : check.grade;
  const g = gradeOf(grade);
  const blocked = !last && !check.heavenly && check.score >= GRADE_SCORES.heavenly;
  return (
    <div className="grade-meter">
      <div className="grade-line">
        <span className="caption">Grade</span>
        <strong className={`grade-word is-${grade}`}>{g.name}</strong>
        <span className="caption">
          {last ? 'flawed at best, on the last chance' : gradeGives(grade, check.target.name)}
          {!last && grade !== 'ordinary' && '; a third of the speed and odds echoes on for life'}
        </span>
      </div>
      <div
        className="grade-bar"
        role="meter"
        aria-label={`Grade margin ${check.score.toFixed(2)} of ${METER_MAX}: ${g.name.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={METER_MAX}
        aria-valuenow={Math.min(METER_MAX, check.score)}
      >
        <div className="grade-segments">
          {segments.map(({ p, i, width }) => (
            <span
              key={`${p.source}-${p.item ?? ''}-${i}`}
              className={`grade-seg ${partClass(p)}`}
              style={{ width: `${width}%`, '--i': i } as CSSProperties}
              title={`${partLabel(p)} ${signed(p.value)}`}
            >
              <span className="grade-seg-label">{partLabel(p)}</span>
            </span>
          ))}
        </div>
        {GRADES.filter((x) => x.id !== 'flawed').map((x) => (
          <span
            key={x.id}
            className={`grade-tick${check.score >= GRADE_SCORES[x.id] ? ' is-reached' : ''}`}
            style={{ left: `${(GRADE_SCORES[x.id] / METER_MAX) * 100}%` }}
          >
            <span className="grade-tick-label">{x.name}</span>
          </span>
        ))}
      </div>
      <p className="caption grade-legend">
        {shown.length
          ? shown.map((p) => `${partLabel(p)} ${signed(p.value)}`).join(' · ')
          : 'Nothing past the bare minimum yet.'}{' '}
        <Why label="How the grade is worked out">
          Qi past a full bar scores up to a point at 150%; insight past the threshold up to a point
          at double it; each other ladder half a point at the peak of this realm and a full point
          once at {check.target.name}. A gold or better method adds its margin, and surging
          offerings theirs. Ordinary needs {GRADE_SCORES.ordinary}, superior {GRADE_SCORES.superior}
          , perfect {GRADE_SCORES.perfect} and heavenly {GRADE_SCORES.heavenly}, which also needs a
          gold or better method or offering.
        </Why>
      </p>
      {blocked && (
        <p className="caption warn">The margin reaches heavenly, but heavenly needs gold.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- the panel

function requirementText(game: GameState, check: MajorCheck, r: Requirement): string {
  const c = game.player;
  switch (r.id) {
    case 'bar':
      return `A full bar (${formatPercent(check.fill)})`;
    case 'insight':
      return `Insight ever earned: ${formatNumber(c.insight.earned)} of ${formatNumber(check.target.insightThreshold)}`;
    case 'gate':
      return `A ${item(check.gateItem!).name} (${itemCount(c, check.gateItem!)} held)`;
    case 'cap':
      return `At most one realm ahead of your qi (${realm(c.qi.realm).name})`;
  }
}

/** What an offering does on this attempt, in a few words: "+0.13 grade, −4 odds". */
function effectWords(e: OfferEffect): string {
  const words: string[] = [];
  if (e.margin) words.push(`${signed(e.margin)} grade`);
  if (Math.abs(e.odds) > 1e-9) words.push(`${points(e.odds)} odds`);
  if (e.purifying) words.push(`clears ${Math.round(e.detox)} toxicity, halves an injury`);
  if (e.guarding) words.push('keeps the bar on a failure');
  if (e.heavenly) words.push('opens heavenly');
  return words.join(', ') || 'nothing on this ladder';
}

/** The panel, open on a ladder's major breakthrough or the last chance. */
export function BreakthroughPanel({ game }: { game: GameState }) {
  const panel = useScene((s) => s.panel);
  const playing = useScene((s) => !!s.play);
  if (!panel || playing || game.ended) return null;
  // A fresh panel for each ladder, so the offerings chosen for one never carry to another.
  return <Panel key={`${panel.ladder}-${panel.lastChance}`} game={game} panel={panel} />;
}

function Panel({ game, panel }: { game: GameState; panel: PanelOpen }) {
  const beginScene = useGame((s) => s.beginScene);
  const tryLast = useGame((s) => s.lastChance);
  // Items laid beside the gate pill; the session's, never saved.
  const [chosen, setChosen] = useState<string[]>([]);
  const c = game.player;
  const which = panel.ladder;
  const last = panel.lastChance;
  // Only what is still held stays chosen.
  const laid = last
    ? []
    : chosen.filter(
        (id, i) => itemCount(c, id) > chosen.slice(0, i).filter((x) => x === id).length,
      );
  const check = majorCheck(c, which, laid);
  if (!check) return null;
  const chance = last ? lastChance(c) : null;
  const odds = chance ? chance.odds : check.odds;
  const ready = chance ? chance.possible : check.ready;
  const reqs = majorRequirements(check).filter((r) => !(last && r.id === 'bar'));
  const allMet = reqs.every((r) => r.met);
  const gate = check.gateItem;
  const extra = check.offerings.laid.filter((id, i) => !(gate && i === 0 && id === gate));
  const room = MAX_OFFERINGS - (gate ? 1 : 0) - extra.length;
  const strip = offerable(c).filter((id) => id !== gate);
  const label = LADDER_LABELS[which];
  const atCap = check.fill >= 1.5 - 1e-9;

  // Slot k: the gate pill locked into the first on a qi major, then what is laid, in order.
  const slots: { id: string | null; locked: boolean; needed?: boolean; index?: number }[] = [];
  if (gate) slots.push({ id: check.gate ? gate : null, locked: true, needed: !check.gate });
  extra.forEach((id, index) => slots.push({ id, locked: false, index }));
  while (slots.length < MAX_OFFERINGS) slots.push({ id: null, locked: last });

  const lay = (id: string) => {
    if (room <= 0) return;
    setChosen([...laid, id]);
  };
  const lift = (index: number) => setChosen(laid.filter((_, i) => i !== index));

  return (
    <section className={`panel bt-panel is-${which}`} aria-labelledby="bt-panel-heading">
      <div className="bt-head">
        <h2 id="bt-panel-heading" className="panel-heading">
          {label} · {check.target.name} <span className="hanzi">{check.target.hanzi}</span>
        </h2>
        <div className="bt-odds">
          <strong>{formatPercent(odds)}</strong>
          <span className="caption">
            {last ? 'the last chance' : 'odds'}{' '}
            <Why label="How the odds are worked out">
              {last
                ? 'At the edge of your lifespan, below a full bar, the odds shrink with the bar and then by more. The gate pill is laid alone, and a failure ends the life.'
                : `The realm's own odds, a step for each 10% past full, the margin you bring, your method${check.gradeOdds ? `, ${points(check.gradeOdds)} from the grades of your breakthroughs on this ladder` : ''} and the offerings. At the figure the scene adds up to 10% more for the gates you catch.`}
            </Why>
          </span>
        </div>
      </div>

      <GradeMeter check={check} last={last} />

      {allMet ? (
        <p className="bt-ready">
          <span aria-hidden="true">●</span> Ready
        </p>
      ) : (
        <ul className="reqs" aria-label={`Requirements for ${check.target.name}`}>
          {reqs.map((r) => (
            <li key={r.id} className={r.met ? 'is-met' : undefined}>
              {requirementText(game, check, r)}
            </li>
          ))}
        </ul>
      )}
      {chance && !chance.possible && <p className="warn">{chance.reason}</p>}

      <div className="bt-slots" role="group" aria-label="Offerings laid">
        {slots.map((s, k) => (
          <button
            key={k}
            type="button"
            className={`bt-slot${s.id ? ' is-filled' : ''}${s.locked ? ' is-locked' : ''}${s.needed ? ' is-needed' : ''}`}
            disabled={s.locked || !s.id}
            aria-label={
              s.id
                ? `${item(s.id).name}${s.locked ? ', the gate pill' : ', lift it off'}`
                : s.needed
                  ? `The ${item(gate!).name}, needed`
                  : 'An empty offering slot'
            }
            onClick={() => s.index !== undefined && lift(s.index)}
          >
            {s.id ? (
              <>
                <span className={`rarity-${item(s.id).rarity}`}>{item(s.id).name}</span>
                {s.locked && <span className="caption">gate</span>}
              </>
            ) : s.needed ? (
              <>
                <span>{item(gate!).name}</span>
                <span className="caption warn">needed</span>
              </>
            ) : (
              <span className="caption">{last ? '—' : 'empty'}</span>
            )}
          </button>
        ))}
      </div>

      {last ? (
        <p className="caption">The last chance lays the gate pill alone.</p>
      ) : strip.length > 0 ? (
        <div className="bt-strip-wrap">
          <span className="caption">
            Click to lay, click a slot to lift it off. Whatever is laid is spent, win or lose.
          </span>
          <ul className="bt-strip" aria-label="Things you can offer">
            {strip.map((id) => {
              const held = itemCount(c, id) - laid.filter((x) => x === id).length;
              const it = item(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="bt-offer"
                    disabled={held <= 0 || room <= 0}
                    onClick={() => lay(id)}
                  >
                    <span className={`rarity-${it.rarity}`}>{it.name}</span>
                    <span className="caption">×{held}</span>
                    <span className="bt-offer-effect">
                      {effectWords(offerEffect(c, which, id))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {check.offerings.clash && (
            <p className="caption warn">
              Two surging things clash: the worst twentieth of rolls fails and injures, whatever the
              odds.
            </p>
          )}
        </div>
      ) : (
        <p className="caption">
          You hold nothing else that can be offered. Herbs, stones and pearls from the world can be
          laid here.
        </p>
      )}

      <div className="actions">
        <button
          type="button"
          className="button"
          disabled={!ready}
          onClick={() => {
            if (last) {
              closePanel();
              tryLast();
            } else beginScene(which, laid);
          }}
        >
          {last ? `Last breakthrough · ${formatPercent(odds)}` : `Begin · ${formatPercent(odds)}`}
        </button>
        {!last && check.bar && !atCap && (
          <button
            type="button"
            className="button button-quiet"
            onClick={() => letFill(game, which)}
          >
            Wait, let it fill
          </button>
        )}
        <button type="button" className="button button-quiet" onClick={closePanel}>
          Close
        </button>
        <Why label="What a failure costs">
          {last
            ? 'If it fails, the life ends.'
            : `A failure spends ${gate ? 'the pill and ' : ''}the offerings, halves the bar and injures for years. Waiting lets the bar fill on: each 10% past full raises the odds and the grade.`}
        </Why>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the "?" on each ladder

/** What a ladder's next step needs, for the "?" on its line in the stats. */
export function StepNeeds({ game, which }: { game: GameState; which: LadderId }) {
  const c = game.player;
  const l = c[which];
  const step = nextStep(l);
  if (step.kind === 'top') return <>There is nowhere higher to climb.</>;
  const fill = barFill(l);
  if (step.kind === 'minor') {
    const odds = minorOdds(c, which);
    return (
      <>
        Next: the {stageName(step.realm, step.stage)}, once the bar is full ({formatPercent(fill)}{' '}
        now). {fill >= 1 ? (odds >= 1 ? 'It always holds.' : `Now at ${formatPercent(odds)}.`) : ''}{' '}
        The button shows under the figure; past full, each 10% raises the odds.
      </>
    );
  }
  const check = majorCheck(c, which)!;
  const needs = majorRequirements(check).map((r) => {
    const t = requirementText(game, check, r);
    return t.charAt(0).toLowerCase() + t.slice(1);
  });
  return (
    <>
      Next: {check.target.name}, a major breakthrough. It needs {needs.join('; ')}. Once the bar is
      full, its button under the figure opens the panel where the offerings are laid and the grade
      is shown.
    </>
  );
}
