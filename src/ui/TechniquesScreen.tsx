// The Techniques screen (design § UI and screens; P2.5b, mockup A of the Techniques screen
// canvas): what you practice and what it gives. A Practicing panel on top, then a list of every
// known technique beside one technique's page: its rarity, line and chapter, the line's known
// chapters as a strip, its mastery as five steps with the insight each releases and the time to
// the next, what it gives, its kin, a line on its Art (bought on its tree, design § Cultivation,
// Where manuals live), and the button that sends practice days to it. Rarer techniques look it:
// an edge in the rarity's color from blue, a glow from purple.
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { techniqueArt, type Manual } from '../content/manuals.ts';
import { MASTERY, TECHNIQUE_MASTERY } from '../content/mastery.ts';
import { rarity, rarityRank, type RarityId } from '../content/rarity.ts';
import { REALMS } from '../content/realms.ts';
import { techniqueChapter, type Technique } from '../content/techniques.ts';
import { tree } from '../content/trees/index.ts';
import { dayRates, type DayRates } from '../core/cultivation.ts';
import { masteryBurst } from '../core/insight.ts';
import { newIds } from '../core/seen.ts';
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
import { hasLearned, nodeSealed } from '../core/trees.ts';
import { hourKindOpen } from '../core/wheel.ts';
import { formatNumber, formatPercent, formatRate, LADDER_LABELS } from './format.ts';
import { RarityName } from './MethodCard.tsx';
import { go, goToManual, useNav } from './nav.ts';
import { useGame } from './store.ts';
import {
  knownChapters,
  practiceTime,
  TECHNIQUE_ORDERS,
  techniqueFilters,
  techniqueRows,
  TOOLBAR_FROM,
  type TechniqueOrder,
} from './techniqueList.ts';
import { Why } from './widgets.tsx';

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Each mastery level adds this to checks with the technique (design § Cultivation, Mastery). */
const CHECKS_A_LEVEL = 2;

/** From blue a technique's row wears an edge in its rarity's color, and from purple a glow. */
const EDGE_FROM = rarityRank('blue');
const GLOW_FROM = rarityRank('purple');

/** The classes and color that make a rarer technique look it. */
function rarityLook(id: RarityId): { className: string; style: CSSProperties } {
  const rank = rarityRank(id);
  const className = rank >= GLOW_FROM ? ' is-rare is-glowing' : rank >= EDGE_FROM ? ' is-rare' : '';
  return { className, style: { '--rarity-color': `var(--rarity-${id})` } as CSSProperties };
}

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

/** The insight a technique's mastery level releases when reached, Aptitude and gains counted. */
function levelBurst(c: Cultivator, t: Technique, level: number): number {
  return masteryBurst(c, TECHNIQUE_MASTERY, t.tier, level);
}

/** "271 / 600", or "Origin" once mastery is complete. */
function progressWords(c: Cultivator, t: Technique): string {
  const m = mastery(c, t.id);
  return m.next === null ? 'Origin' : `${formatNumber(m.practice)} / ${formatNumber(m.next)}`;
}

/** "Mastery in 278 days, +20 insight when it lands", with what stands in the way otherwise. */
function nextLevelWords(c: Cultivator, t: Technique, rate: number): string {
  const m = mastery(c, t.id);
  const next = MASTERY[m.level + 1];
  const days = daysToNextLevel(c, t.id, rate);
  if (techniqueSealed(c, t)) {
    const ladder = LADDER_LABELS[t.ladder].toLowerCase();
    return `Practice opens when your ${ladder} reaches ${REALMS[t.tier - 1]!.name}.`;
  }
  if (days === null || !next) return 'Mastery is complete.';
  const burst = `+${formatNumber(levelBurst(c, t, m.level + 1))} insight`;
  if (days === Infinity) return `${next.name} waits on practice hours (${burst} when it lands).`;
  const kin = kinshipBonus(c, t.id) > 0 ? ', kin counted' : '';
  const ifPracticed = c.practicing === t.id ? '' : ` if you practice it${kin}`;
  return `${next.name} in ${practiceTime(days)}${ifPracticed}, ${burst} when it lands.`;
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

/**
 * What practice days go to: a row per practice slot (one for now), each with its technique's level,
 * a bar to the next, the time to it and the insight it releases.
 */
function PracticePanel({
  c,
  rates,
  rate,
  onSelect,
  onKeep,
}: {
  c: Cultivator;
  rates: DayRates;
  rate: number;
  onSelect: (id: string) => void;
  /** Keeps the page on a technique without scrolling to it, as Stop does. */
  onKeep: (id: string) => void;
}) {
  const practice = useGame((s) => s.practice);
  const hoursOpen = hourKindOpen(c, 'practice');
  const t = knownTechniques(c).find((k) => k.id === c.practicing);
  const hours = rates.count.practice;

  const wheel = (
    <button type="button" className="link-button" onClick={() => go('cultivate')}>
      Set hours on the Cultivate wheel
    </button>
  );

  if (!hoursOpen) {
    return (
      <section className="panel practice-panel" aria-label="Practicing">
        <p className="caption">Practice hours open once you know a technique you can use.</p>
      </section>
    );
  }

  return (
    <section className="panel practice-panel" aria-label="Practicing">
      <div className="practice-panel-head">
        <span className="technique-label">Practicing</span>
        <span className="caption">
          {hours === 0
            ? 'No hour of the day goes to practice.'
            : `${hours} of 12 hours${rates.practice > 0 ? ` · ${formatRate(rates.practice)} practice days a day` : ''}`}
        </span>
        {wheel}
      </div>
      <ul className="practice-slots">
        <li
          className={`practice-slot${t ? rarityLook(t.rarity).className : ' is-empty'}`}
          style={t ? rarityLook(t.rarity).style : undefined}
        >
          {t ? (
            <PracticeSlot
              c={c}
              t={t}
              rate={rate}
              onSelect={onSelect}
              onStop={() => {
                practice(null);
                onKeep(t.id);
              }}
            />
          ) : (
            <p className="caption">Nothing practiced: pick a technique below.</p>
          )}
        </li>
      </ul>
    </section>
  );
}

function PracticeSlot({
  c,
  t,
  rate,
  onSelect,
  onStop,
}: {
  c: Cultivator;
  t: Technique;
  rate: number;
  onSelect: (id: string) => void;
  onStop: () => void;
}) {
  const m = mastery(c, t.id);
  const next = MASTERY[m.level + 1];
  return (
    <>
      <div className="practice-slot-head">
        <button type="button" className="practice-slot-name" onClick={() => onSelect(t.id)}>
          <RarityName m={t} /> <span className="hanzi">{t.hanzi}</span>
        </button>
        <span className="caption">{MASTERY[m.level]!.name}</span>
        <span className="technique-row-gap" />
        <span className="technique-num caption">{progressWords(c, t)}</span>
        <button type="button" className="button button-quiet" onClick={onStop}>
          Stop
        </button>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-label={`${t.name} toward ${next?.name ?? 'its peak'}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(m.fraction * 100)}
      >
        <div className="bar-fill" style={{ width: `${m.fraction * 100}%` }} />
      </div>
      <p className="practice-slot-eta">{nextLevelWords(c, t, rate)}</p>
    </>
  );
}

function TechniqueList({
  c,
  selected,
  fresh,
  onSelect,
}: {
  c: Cultivator;
  selected: string;
  /** Techniques still new: their rows glow until selected. */
  fresh: ReadonlySet<string>;
  onSelect: (id: string) => void;
}) {
  const practice = useGame((s) => s.practice);
  const [order, setOrder] = useState<TechniqueOrder>('rarity');
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<number | null>(null);
  const [dao, setDao] = useState<string | null>(null);
  const known = knownTechniques(c);
  const toolbar = known.length > TOOLBAR_FROM;
  const rows = techniqueRows(c, toolbar ? { order, query, tier, dao } : {});
  const filters = techniqueFilters(known);
  // With nothing practiced, each row that can take practice offers it.
  const offer = !c.practicing || !known.some((t) => t.id === c.practicing);

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
        <span>
          {rows.length === known.length ? known.length : `${rows.length} of ${known.length}`}
        </span>
      </div>
      {toolbar && (
        <div className="technique-toolbar">
          <div className="technique-toolbar-row">
            <input
              type="search"
              className="technique-search"
              aria-label="Search techniques"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Order"
              value={order}
              onChange={(e) => setOrder(e.target.value as TechniqueOrder)}
            >
              {TECHNIQUE_ORDERS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          {(filters.tiers.length > 0 || filters.daos.length > 0) && (
            <div className="technique-chips-filter" role="group" aria-label="Filter">
              {filters.tiers.map((n) => (
                <button
                  key={`tier-${n}`}
                  type="button"
                  aria-pressed={tier === n}
                  onClick={() => setTier(tier === n ? null : n)}
                >
                  Tier {n}
                </button>
              ))}
              {filters.daos.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dao === d}
                  onClick={() => setDao(dao === d ? null : d)}
                >
                  {capital(d)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {rows.length === 0 && <p className="caption technique-none">Nothing matches.</p>}
      <ul className="technique-list" onKeyDown={onKeyDown}>
        {rows.map(({ t, under }) => {
          const m = mastery(c, t.id);
          const sealed = techniqueSealed(c, t);
          const isSelected = t.id === selected;
          const look = rarityLook(t.rarity);
          const accuracy = rarity(t.rarity).accuracy;
          const quick = offer && canPractice(c, t.id);
          return (
            <li key={t.id} className={quick ? 'has-quick' : undefined}>
              <button
                type="button"
                className={`technique-row${look.className}${isSelected ? ' is-selected' : ''}${sealed ? ' is-sealed' : ''}${under ? ' is-under' : ''}${fresh.has(t.id) ? ' is-new' : ''}`}
                style={look.style}
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
                  {accuracy > 1 && (
                    <span className="rarity-chip" title={`Accuracy ×${accuracy} for its rarity`}>
                      ×{accuracy}
                    </span>
                  )}
                  <span className="technique-row-gap" />
                  <span className="technique-num">{progressWords(c, t)}</span>
                </span>
              </button>
              {quick && (
                <button
                  type="button"
                  className="button button-quiet technique-quick"
                  aria-label={`Practice ${t.name}`}
                  onClick={() => practice(t.id)}
                >
                  Practice
                </button>
              )}
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

/** Glimpse to Origin as five steps, each filling within itself, with its insight, and the time to the next. */
function MasteryBlock({ c, t, rate }: { c: Cultivator; t: Technique; rate: number }) {
  const m = mastery(c, t.id);
  const sealed = techniqueSealed(c, t);
  const rateWords =
    c.practicing === t.id && !sealed && m.next !== null && rate > 0
      ? ` At ${formatRate(rate * (1 + kinshipBonus(c, t.id)))} practice days a day.`
      : '';

  return (
    <section className={`mastery-block${sealed ? ' is-sealed' : ''}`} aria-label="Mastery">
      <div className="mastery-block-head">
        <span className="technique-label">
          Mastery · each level adds +{CHECKS_A_LEVEL} to checks and releases insight
        </span>
        <span className="technique-num">{formatNumber(m.practice)} practice days</span>
      </div>
      <ol className="mastery-steps">
        {MASTERY.map((level, i) => {
          const from = i === 0 ? 0 : masteryNeed(t, i - 1);
          const to = masteryNeed(t, i);
          const fill = i <= m.level ? 1 : i === m.level + 1 ? (m.practice - from) / (to - from) : 0;
          const state = i === m.level ? ' is-current' : i < m.level ? ' is-reached' : '';
          const burst = levelBurst(c, t, i);
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
              <span className="caption mastery-step-burst">
                {burst > 0 ? `+${formatNumber(burst)} insight` : ' '}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mastery-eta">
        {nextLevelWords(c, t, rate)}
        {rateWords}
      </p>
    </section>
  );
}

/** One line on the technique's Art; its passives are bought on its tree, where the link goes. */
function ArtLine({ c, art }: { c: Cultivator; art: Manual }) {
  const learned = art.nodes.filter((n) => hasLearned(c, n.id)).length;
  const open = art.nodes.filter((n) => !hasLearned(c, n.id));
  const awake = open.filter((n) => !nodeSealed(c, n)).length;
  const wake = Math.min(...open.map((n) => n.mastery ?? 0));
  const only = art.nodes.length === 1 ? art.nodes[0]! : null;
  const status =
    open.length === 0
      ? 'all learned'
      : awake > 0
        ? `${awake === 1 ? 'one' : awake} awake to learn`
        : `${only ? 'wakes' : 'the next wakes'} at ${MASTERY[wake]!.name}`;
  return (
    <p className="technique-art caption">
      Its Art ·{' '}
      {only ? (
        <>
          <span className="technique-art-name">{only.name}</span>{' '}
          <span className="hanzi">{only.hanzi}</span>
        </>
      ) : (
        `${art.nodes.length} passives`
      )}{' '}
      · {learned} of {art.nodes.length} learned · {status}
      <Why label="Arts">
        An Art is a technique's own small tree of passives, bought with insight on the tree it
        grafts beside and waking as the technique masters, the first at Comprehension.
      </Why>{' '}
      <button type="button" className="link-button" onClick={() => goToManual(art.id, art.host)}>
        {art.host ? `Open it beside the ${tree(art.host).name} tree` : 'Open it under Manuals'}
      </button>
    </p>
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
  // The technique on the page is the one selected, so it is seen.
  const see = useGame((s) => s.see);
  useEffect(() => {
    see('technique', [t.id]);
  }, [see, t.id]);
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
  const look = rarityLook(t.rarity);
  const chips = [
    `${capital(ladder)} technique, tier ${t.tier} (${realmName})`,
    capital(t.form),
    capital(t.damage),
    `Power ${t.power}`,
    `${t.qiCost} qi`,
    ...(t.daos.length > 0 ? [`${t.daos.map(capital).join(', ')} Dao`] : []),
  ];

  return (
    <article
      className={`panel technique-page${look.className}${sealed ? ' is-sealed' : ''}`}
      style={look.style}
    >
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
      {art && <ArtLine c={c} art={art} />}
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
  // A toast's link lands on the technique it names, selected.
  const target = useNav((s) => (s.screen === 'techniques' ? s.select : null));
  const navSeq = useNav((s) => s.seq);
  const [arrived, setArrived] = useState(-1);
  if (target && navSeq !== arrived) {
    setArrived(navSeq);
    setChosen(target);
  }
  useEffect(() => {
    if (target) useNav.setState({ select: null });
  }, [target]);
  if (!game) return null;
  const c = game.player;
  const known = knownTechniques(c);
  const rates = dayRates(c, game.calendar.day);
  const rate = practiceRate(c, game.calendar.day);
  const has = (id: string | null): id is string => !!id && known.some((t) => t.id === id);
  const selected = has(chosen)
    ? chosen
    : has(c.practicing)
      ? c.practicing
      : techniqueRows(c)[0]?.t.id;

  const select = (id: string) => {
    setChosen(id);
    // On a phone the page sits under the list, so bring it into view.
    if (window.innerWidth < 900) page.current?.scrollIntoView({ block: 'start' });
  };

  if (!selected) {
    return (
      <section className="panel">
        <p className="muted">You know no techniques yet.</p>
      </section>
    );
  }

  return (
    <>
      <PracticePanel c={c} rates={rates} rate={rate} onSelect={select} onKeep={setChosen} />
      <div className="technique-split">
        <TechniqueList
          c={c}
          selected={selected}
          fresh={new Set(newIds(game, 'technique'))}
          onSelect={select}
        />
        <div ref={page} className="technique-page-col">
          <TechniquePage
            c={c}
            t={known.find((t) => t.id === selected)!}
            rate={rate}
            onSelect={select}
          />
        </div>
      </div>
    </>
  );
}
