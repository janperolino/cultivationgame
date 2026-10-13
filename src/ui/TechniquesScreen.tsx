// The Techniques screen (design § UI and screens; P2.5b, mockup A of the Techniques screen
// canvas): a list of every known technique beside one technique's page. The page holds its
// rarity, line and chapter, the line's known chapters as a strip, its mastery as five steps with
// the time to the next, what it gives, its kin, its Art's passives (design § Cultivation, Where
// manuals live), and the button that sends practice days to it.
import { useRef, useState, type KeyboardEvent } from 'react';
import { techniqueArt } from '../content/manuals.ts';
import { MASTERY } from '../content/mastery.ts';
import { rarity } from '../content/rarity.ts';
import { REALMS } from '../content/realms.ts';
import { techniqueChapter, type Technique } from '../content/techniques.ts';
import { tree } from '../content/trees/index.ts';
import { dayRates } from '../core/cultivation.ts';
import type { Cultivator } from '../core/state.ts';
import {
  canPractice,
  daysToNextLevel,
  kinshipBonus,
  knownTechniques,
  mastery,
  masteryNeed,
  techniqueAccuracy,
  techniqueKin,
  techniqueSealed,
} from '../core/techniques.ts';
import { hourKindOpen } from '../core/wheel.ts';
import { formatNumber, formatPercent, formatRate, LADDER_LABELS } from './format.ts';
import { ManualNodeRow } from './ManualNodes.tsx';
import { RarityName } from './MethodCard.tsx';
import { go, goToManual } from './nav.ts';
import { useGame } from './store.ts';
import { knownChapters, practiceTime, techniqueRows } from './techniqueList.ts';
import { Why } from './widgets.tsx';

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Each mastery level adds this to checks with the technique (design § Cultivation, Mastery). */
const CHECKS_A_LEVEL = 2;

/**
 * Practice days a day the wheel gives a technique, before its kinship: the day's practice hours
 * counted on whichever technique can take them. 0 when none can.
 */
function practiceRate(c: Cultivator, day: number): number {
  const id =
    c.practicing && canPractice(c, c.practicing)
      ? c.practicing
      : knownTechniques(c).find((t) => canPractice(c, t.id))?.id;
  if (!id) return 0;
  return dayRates({ ...c, practicing: id }, day).practice / (1 + kinshipBonus(c, id));
}

/** "271 / 600", or "Origin" once mastery is complete. */
function progressWords(c: Cultivator, t: Technique): string {
  const m = mastery(c, t.id);
  return m.next === null ? 'Origin' : `${formatNumber(m.practice)} / ${formatNumber(m.next)}`;
}

function Lock() {
  return (
    <svg
      className="technique-lock"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      role="img"
      aria-label="Sealed"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function TechniqueList({
  c,
  selected,
  onSelect,
}: {
  c: Cultivator;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const rows = techniqueRows(c);
  // Up and down move along the list and select as they go.
  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.technique-row')];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    const next = buttons[(at + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length];
    next?.focus();
    next?.click();
  };

  return (
    <nav className="panel technique-list-panel" aria-label="Techniques known">
      <div className="technique-list-head">
        <span>Known</span>
        <span>{rows.length}</span>
      </div>
      <ul className="technique-list" onKeyDown={onKeyDown}>
        {rows.map(({ t, under }) => {
          const m = mastery(c, t.id);
          const sealed = techniqueSealed(c, t);
          const isSelected = t.id === selected;
          return (
            <li key={t.id}>
              <button
                type="button"
                className={`technique-row${isSelected ? ' is-selected' : ''}${sealed ? ' is-sealed' : ''}${under ? ' is-under' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(t.id)}
              >
                <span className="technique-row-top">
                  {under && (
                    <svg className="technique-hook" width="12" height="12" viewBox="0 0 12 12">
                      <path d="M2 0 V7 Q2 10 5 10 H12" />
                    </svg>
                  )}
                  <RarityName m={t} className="technique-row-name" />
                  <span className="hanzi technique-row-hanzi">{t.hanzi}</span>
                  <span className="technique-row-gap" />
                  {c.practicing === t.id && <span className="practicing-mark">Practicing</span>}
                  {sealed && <Lock />}
                </span>
                <span className="technique-row-bottom">
                  <span className="mastery-pips" aria-hidden="true">
                    {MASTERY.map((level, i) => (
                      <span
                        key={level.id}
                        className={`pip${i <= m.level && !sealed ? ' is-lit' : ''}`}
                      />
                    ))}
                  </span>
                  <span>{sealed ? 'Sealed' : MASTERY[m.level]!.name}</span>
                  <span className="technique-row-gap" />
                  <span className="technique-num">{progressWords(c, t)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The line's known chapters as tiles with arrows between; only when two or more are known. */
function LineStrip({
  c,
  t,
  onSelect,
}: {
  c: Cultivator;
  t: Technique;
  onSelect: (id: string) => void;
}) {
  const chapters = knownChapters(c, t);
  if (chapters.length < 2) return null;
  const lineName = techniqueChapter(t.line, 1)?.name ?? chapters[0]!.name;
  return (
    <nav className="line-strip" aria-label={`Chapters of the ${lineName} line`}>
      <span className="technique-label">The {lineName} line</span>
      <div className="line-strip-tiles">
        {chapters.map((k, i) => {
          const sealed = techniqueSealed(c, k);
          const here = k.id === t.id;
          return (
            <div key={k.id} className="line-strip-step">
              {i > 0 && (
                <svg className="line-arrow" width="28" height="12" viewBox="0 0 28 12" aria-hidden>
                  <path d="M2 6 H24 M19 1 L25 6 L19 11" />
                </svg>
              )}
              <button
                type="button"
                className={`line-tile${here ? ' is-here' : ''}${sealed ? ' is-sealed' : ''}`}
                aria-current={here ? 'true' : undefined}
                onClick={() => onSelect(k.id)}
              >
                <span className="caption">
                  Chapter {k.chapter} · tier {k.tier}
                </span>
                <span className="line-tile-name">
                  <RarityName m={k} /> <span className="hanzi">{k.hanzi}</span>
                </span>
                {sealed ? (
                  <span className="line-tile-status warn">
                    <span className="hanzi">封</span> Sealed until {REALMS[k.tier - 1]!.name}
                  </span>
                ) : (
                  <span className="line-tile-status">
                    {MASTERY[mastery(c, k.id).level]!.name} · {progressWords(c, k)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

/** Glimpse to Origin as five steps, each filling within itself, and the time to the next. */
function MasteryBlock({ c, t, rate }: { c: Cultivator; t: Technique; rate: number }) {
  const m = mastery(c, t.id);
  const sealed = techniqueSealed(c, t);
  const next = MASTERY[m.level + 1];
  const kin = kinshipBonus(c, t.id);
  const days = daysToNextLevel(c, t.id, rate);
  const ladder = LADDER_LABELS[t.ladder].toLowerCase();

  let eta: string;
  if (sealed) eta = `Practice opens when your ${ladder} reaches ${REALMS[t.tier - 1]!.name}.`;
  else if (days === null || !next) eta = 'Mastery is complete.';
  else if (days === Infinity)
    eta = `${next.name} waits on practice hours: give practice an hour on the Cultivate wheel.`;
  else if (c.practicing === t.id)
    eta = `${next.name} in ${practiceTime(days)} at ${formatRate(rate * (1 + kin))} practice days a day.`;
  else
    eta = `${next.name} in ${practiceTime(days)} if you practice it${kin > 0 ? ', kin counted' : ''}.`;

  return (
    <section className={`mastery-block${sealed ? ' is-sealed' : ''}`} aria-label="Mastery">
      <div className="mastery-block-head">
        <span className="technique-label">
          Mastery · each level adds +{CHECKS_A_LEVEL} to checks
        </span>
        <span className="technique-num">{formatNumber(m.practice)} practice days</span>
      </div>
      <ol className="mastery-steps">
        {MASTERY.map((level, i) => {
          const from = i === 0 ? 0 : masteryNeed(t, i - 1);
          const to = masteryNeed(t, i);
          const fill = i <= m.level ? 1 : i === m.level + 1 ? (m.practice - from) / (to - from) : 0;
          const state = i === m.level ? ' is-current' : i < m.level ? ' is-reached' : '';
          return (
            <li key={level.id} className={`mastery-step${state}`}>
              <div
                className="bar"
                role="progressbar"
                aria-label={`${level.name}${i === m.level ? ', the current level' : ''}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(fill * 100)}
              >
                <div className="bar-fill" style={{ width: `${fill * 100}%` }} />
              </div>
              <span className="mastery-step-name" title={level.name}>
                {level.name}
              </span>
              <span className="hanzi mastery-step-hanzi">{level.hanzi}</span>
              <span className="caption">{to === 0 ? 'at once' : `${formatNumber(to)} days`}</span>
            </li>
          );
        })}
      </ol>
      <p className="mastery-eta">{eta}</p>
    </section>
  );
}

function TechniquePage({
  c,
  t,
  rate,
  onSelect,
}: {
  c: Cultivator;
  t: Technique;
  rate: number;
  onSelect: (id: string) => void;
}) {
  const practice = useGame((s) => s.practice);
  const m = mastery(c, t.id);
  const sealed = techniqueSealed(c, t);
  const practicing = c.practicing === t.id;
  const realmName = REALMS[t.tier - 1]!.name;
  const ladder = LADDER_LABELS[t.ladder].toLowerCase();
  const r = rarity(t.rarity);
  const lineName = techniqueChapter(t.line, 1)?.name ?? t.name;
  const kin = techniqueKin(c, t.id);
  const kinBonus = kinshipBonus(c, t.id);
  const art = techniqueArt(t.id);
  const chips = [
    `${capital(ladder)} technique, tier ${t.tier} (${realmName})`,
    capital(t.form),
    capital(t.damage),
    `Power ${t.power}`,
    `${t.qiCost} qi`,
    ...(t.daos.length > 0 ? [`${t.daos.map(capital).join(', ')} Dao`] : []),
  ];

  return (
    <article className={`panel technique-page${sealed ? ' is-sealed' : ''}`}>
      <div className="technique-page-head">
        <h2>
          <RarityName m={t} /> <span className="hanzi">{t.hanzi}</span>
        </h2>
        <span className="caption">{t.pinyin}</span>
      </div>
      <p className="caption">
        {r.name} · chapter {t.chapter} of the {lineName} line
        <Why label="Lines and chapters">
          A line's next chapter needs the one before at Comprehension, and starts a mastery level
          below it, two if it is rarer. The old chapter stays known.
        </Why>
      </p>
      <LineStrip c={c} t={t} onSelect={onSelect} />
      <ul className="technique-chips">
        {chips.map((chip) => (
          <li key={chip}>{chip}</li>
        ))}
      </ul>
      <p className="technique-text">{t.text}</p>
      {sealed && (
        <p className="technique-sealed">
          Sealed until your {ladder} reaches {realmName}: you know it, but can neither use nor
          practice it yet.
        </p>
      )}
      <MasteryBlock c={c} t={t} rate={rate} />
      <dl className="technique-figures">
        <div>
          <dt>Accuracy</dt>
          <dd>×{techniqueAccuracy(c, t.id).toFixed(2)}</dd>
          {r.accuracy > 1 && <dd className="caption">×{r.accuracy} for its rarity</dd>}
        </div>
        <div>
          <dt>To checks</dt>
          <dd>+{CHECKS_A_LEVEL * (m.level + 1)}</dd>
        </div>
        <div>
          <dt>Practice speed</dt>
          <dd>{kinBonus > 0 ? `+${formatPercent(kinBonus)} kin` : 'base'}</dd>
        </div>
      </dl>
      {kin.length > 0 && (
        <p className="technique-kin">
          Kin to {kin.map((k) => k.name).join(' and ')}: practice +{formatPercent(kinBonus)}
          <Why label="How kinship works">
            Two techniques of different lines that share a Dao and a form speed each other's
            practice while one sits at Comprehension or above. Mastery doesn't carry over.
          </Why>
        </p>
      )}
      {art && (
        <section className="technique-art" aria-label="Its Art">
          <p className="caption">
            Its Art: {art.nodes.length === 1 ? 'one passive' : `${art.nodes.length} passives`},
            bought with insight and waking as it masters, the first at Comprehension.{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => goToManual(art.id, art.host)}
            >
              {art.host ? `Grafted beside the ${tree(art.host).name} tree` : 'Under Manuals'}
            </button>
          </p>
          <ul className="manual-nodes">
            {art.nodes.map((n) => (
              <ManualNodeRow key={n.id} c={c} n={n} />
            ))}
          </ul>
        </section>
      )}
      <div className="technique-page-foot">
        <span className="caption">{capital(t.source)}.</span>
        <button
          type="button"
          className="button"
          aria-pressed={practicing}
          disabled={!canPractice(c, t.id) && !practicing}
          onClick={() => practice(practicing ? null : t.id)}
        >
          {practicing ? 'Practicing · stop' : sealed ? 'Sealed' : 'Practice this'}
        </button>
      </div>
    </article>
  );
}

export function TechniquesScreen() {
  const game = useGame((s) => s.game);
  const [chosen, setChosen] = useState<string | null>(null);
  const page = useRef<HTMLDivElement>(null);
  if (!game) return null;
  const c = game.player;
  const known = knownTechniques(c);
  const rates = dayRates(c, game.calendar.day);
  const hoursOpen = hourKindOpen(c, 'practice');
  const has = (id: string | null): id is string => !!id && known.some((t) => t.id === id);
  const selected = has(chosen) ? chosen : has(c.practicing) ? c.practicing : known[0]?.id;

  const select = (id: string) => {
    setChosen(id);
    // On a phone the page sits under the list, so bring it into view.
    if (window.innerWidth < 900) page.current?.scrollIntoView({ block: 'start' });
  };

  const wheel = (
    <button type="button" className="link-button" onClick={() => go('cultivate')}>
      Set hours on the Cultivate wheel
    </button>
  );
  const status = !hoursOpen
    ? 'Practice hours open once you know a technique you can use.'
    : rates.practice > 0
      ? `Practice gets ${rates.count.practice} of 12 hours · ${formatRate(rates.practice)} practice days a day`
      : rates.count.practice === 0
        ? 'No hour of the day goes to practice.'
        : 'Practice hours go nowhere: pick a technique to practice.';

  return (
    <>
      <p className="technique-status caption">
        {hoursOpen && rates.practice > 0 && <span className="practice-dot" aria-hidden="true" />}
        <span>{status}</span>
        {hoursOpen && wheel}
      </p>
      {!selected ? (
        <section className="panel">
          <p className="muted">You know no techniques yet.</p>
        </section>
      ) : (
        <div className="technique-split">
          <TechniqueList c={c} selected={selected} onSelect={select} />
          <div ref={page} className="technique-page-col">
            <TechniquePage
              c={c}
              t={known.find((t) => t.id === selected)!}
              rate={practiceRate(c, game.calendar.day)}
              onSelect={select}
            />
          </div>
        </div>
      )}
    </>
  );
}
