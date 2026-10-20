// Routine › Practice (design § UI and screens; P2.5b, mockup A of the Techniques screen canvas,
// moved whole into Routine in P2.5f): what you practice and what it gives. A Practicing panel on
// top with a row per practice slot, each with its share of the day, then a list of every
// known technique beside one technique's page: its rarity, line and chapter, the line's known
// chapters as a strip, its mastery as five steps with the insight each releases and the time to
// the next, what it gives, its kin, a line on its Art (bought on its tree, design § Cultivation,
// Where manuals live), and the button that puts it in a free slot. Rarer techniques look it:
// an edge in the rarity's color from blue, a glow from purple.
import { ratesHere } from '../core/life.ts';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { techniqueArt, type Manual } from '../content/manuals.ts';
import { MASTERY, PRACTICE_SLOTS_MAX, TECHNIQUE_MASTERY } from '../content/mastery.ts';
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
  practiced,
  practiceSlots,
  practicingNow,
  techniqueAccuracy,
  techniqueKin,
  techniqueSealed,
} from '../core/techniques.ts';
import { hasLearned, nodeSealed } from '../core/trees.ts';
import { hourKindOpen } from '../core/wheel.ts';
import { formatNumber, formatPercent, formatRate, LADDER_LABELS } from './format.ts';
import { RarityName } from './MethodCard.tsx';
import { goToManual, goToTab, useNav } from './nav.ts';
import { useGame } from './store.ts';
import { rings } from './beacons.ts';
import { useBeacons } from './useBeacons.ts';
import {
  finished,
  knownChapters,
  practiceTime,
  TECHNIQUE_ORDERS,
  techniqueFilters,
  techniqueRows,
  TOOLBAR_FROM,
  type TechniqueOrder,
} from './techniqueList.ts';
import { Picker, Why } from './widgets.tsx';
import { MasteryRing, RoutineScene } from './RoutineRings.tsx';

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
 * Practice days a day the wheel gives before the slots split them: the day's practice hours
 * counted on whichever technique can take them. 0 when none can.
 */
function dayPractice(c: Cultivator, day: number): number {
  const id = practicingNow(c)[0] ?? knownTechniques(c).find((t) => canPractice(c, t.id))?.id;
  if (!id) return 0;
  return dayRates({ ...c, practicing: [id] }, day).practice;
}

/** How many ways the day is split for a technique: its slots', or theirs with it taking a slot. */
function splitFor(c: Cultivator, id: string): number {
  const now = practicingNow(c);
  if (now.includes(id)) return now.length;
  return Math.max(1, Math.min(practiceSlots(c), now.length + 1));
}

/** A slot's share of the day, as the Practicing panel and the list show it. */
const SHARE_GLYPHS: Record<number, string> = { 1: '1', 2: '½', 3: '⅓' };
const SHARE_WORDS: Record<number, string> = { 2: 'half share', 3: 'a third share' };

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
  const share = SHARE_WORDS[splitFor(c, t.id)];
  const at = share ? ` at ${share}` : '';
  const ifPracticed = practiced(c).includes(t.id) ? at : ` if you practice it${at}${kin}`;
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

/** What opens the next practice slot: the Soul tree's Split Attention first, then any point. */
function nextSlotWords(c: Cultivator): string {
  return hasLearned(c, SPLIT_NODE)
    ? 'Opens with another point of split attention'
    : 'Opens with Split Attention · Soul, tier 2';
}

/** The Soul tree's node that opens a practice slot. */
const SPLIT_NODE = 'soul-split-attention';

/**
 * What practice days go to: a row per practice slot, each with its technique's share of the day,
 * its level, a bar to the next, the time to it and the insight it releases; an empty slot asks for
 * a technique, and once the first is in use the next slot not yet open says what opens it.
 */
function PracticePanel({
  c,
  rates,
  total,
  onSelect,
  onKeep,
}: {
  c: Cultivator;
  rates: DayRates;
  /** Practice days a day before the slots split them. */
  total: number;
  onSelect: (id: string) => void;
  /** Keeps the page on a technique without scrolling to it, as Stop does. */
  onKeep: (id: string) => void;
}) {
  const stopPractice = useGame((s) => s.stopPractice);
  const hoursOpen = hourKindOpen(c, 'practice');
  const slots = practiceSlots(c);
  const inSlots = practiced(c);
  const hours = rates.count.practice;

  const wheel = (
    <button type="button" className="link-button" onClick={() => goToTab('day')}>
      Change hours on the wheel
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
            : `${hours} of 12 hours${total > 0 ? ` · ${formatRate(total)} practice days a day${slots > 1 ? ', shared between the slots' : ''}` : ''}`}
        </span>
        {wheel}
      </div>
      <ul className="practice-slots">
        {Array.from({ length: slots }, (_, i) => {
          const t = knownTechniques(c).find((k) => k.id === inSlots[i]);
          // The day splits among the slots that can practice; one that can't takes no share.
          const now = practicingNow(c);
          const split = now.length;
          const sharing = !!t && now.includes(t.id);
          return (
            <li
              key={t?.id ?? `empty-${i}`}
              className={`practice-slot${t ? rarityLook(t.rarity).className : ' is-empty'}`}
              style={t ? rarityLook(t.rarity).style : undefined}
            >
              {t ? (
                <PracticeSlot
                  c={c}
                  t={t}
                  share={sharing ? (SHARE_GLYPHS[split] ?? `1/${split}`) : '·'}
                  rate={sharing ? total / split : 0}
                  onSelect={onSelect}
                  onStop={() => {
                    stopPractice(t.id);
                    onKeep(t.id);
                  }}
                />
              ) : (
                <p className="caption practice-slot-empty">
                  <span className="practice-share" aria-hidden="true">
                    ·
                  </span>
                  {i === 0
                    ? 'Nothing practiced: pick a technique below.'
                    : 'Pick a technique below.'}
                </p>
              )}
            </li>
          );
        })}
        {slots < PRACTICE_SLOTS_MAX && inSlots.length > 0 && (
          <li className="practice-slot is-locked">
            <p className="caption practice-slot-empty">
              <span className="practice-share hanzi" aria-hidden="true">
                封
              </span>
              {nextSlotWords(c)}
              <Why label="Practice slots">
                A day&apos;s practice days split evenly among the slots: one technique practices at
                the full rate, two at half each, three at a third. Each point of split attention
                opens another slot, up to three. Slots never add practice, only spread it; kinship
                lifts each technique&apos;s own share.
              </Why>
            </p>
          </li>
        )}
      </ul>
    </section>
  );
}

function PracticeSlot({
  c,
  t,
  share,
  rate,
  onSelect,
  onStop,
}: {
  c: Cultivator;
  t: Technique;
  /** "½", the slot's share of the day. */
  share: string;
  rate: number;
  onSelect: (id: string) => void;
  onStop: () => void;
}) {
  const m = mastery(c, t.id);
  const next = MASTERY[m.level + 1];
  return (
    <>
      <div className="practice-slot-head">
        <span className="practice-share" title="Its share of the day's practice">
          {share}
        </span>
        <button type="button" className="practice-slot-name" onClick={() => onSelect(t.id)}>
          <RarityName m={t} /> <span className="hanzi">{t.hanzi}</span>
        </button>
        <span className="caption">
          {MASTERY[m.level]!.name}
          {kinshipBonus(c, t.id) > 0 && ` · kin +${formatPercent(kinshipBonus(c, t.id))}`}
        </span>
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
  const [hideFinished, setHideFinished] = useState(false);
  const known = knownTechniques(c);
  const toolbar = known.length > TOOLBAR_FROM;
  const rows = techniqueRows(c, toolbar ? { order, query, tier, dao, hideFinished } : {});
  const done = known.filter((t) => finished(c, t)).length;
  const filters = techniqueFilters(known);
  // While a slot is free, each row that can take practice offers it.
  const inSlots = practiced(c);
  const offer = inSlots.length < practiceSlots(c);
  const split = practicingNow(c).length;

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
        // The study's toolbar (A4): the search on its own line, then the tier and finished chips, with
        // the Dao and the order as two quiet pickers at the right.
        <div className="technique-toolbar">
          <input
            type="search"
            className="technique-search"
            aria-label="Search techniques"
            placeholder="Find a technique…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="technique-chips-filter" role="group" aria-label="Filter">
            <button
              type="button"
              aria-pressed={hideFinished}
              title="Leave out the techniques at Origin, whose mastery is complete"
              onClick={() => setHideFinished(!hideFinished)}
            >
              Hide finished{done > 0 && ` · ${done}`}
            </button>
            {filters.tiers.length > 0 && (
              <Picker
                label="Tier"
                value={tier === null ? '' : String(tier)}
                options={[
                  { id: '', name: 'All tiers' },
                  ...filters.tiers.map((n) => ({ id: String(n), name: `Tier ${n}` })),
                ]}
                onChange={(id) => setTier(id ? Number(id) : null)}
              />
            )}
            {filters.daos.length > 0 && (
              <Picker
                label="Dao"
                value={dao ?? ''}
                options={[
                  { id: '', name: 'Any Dao' },
                  ...filters.daos.map((d) => ({ id: d, name: capital(d) })),
                ]}
                onChange={(id) => setDao(id || null)}
              />
            )}
            <Picker
              label="Order"
              value={order}
              options={TECHNIQUE_ORDERS}
              onChange={(id) => setOrder(id)}
            />
          </div>
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
          const quick = offer && canPractice(c, t.id) && !inSlots.includes(t.id);
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
                  {inSlots.includes(t.id) && (
                    <span className="practicing-mark">
                      Practicing{split > 1 ? ` ${SHARE_GLYPHS[split] ?? `1/${split}`}` : ''}
                    </span>
                  )}
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

/** The time to the next level, under the page; the five steps themselves are the ring (A4). */
function MasteryLine({ c, t, rate }: { c: Cultivator; t: Technique; rate: number }) {
  const m = mastery(c, t.id);
  const sealed = techniqueSealed(c, t);
  const rateWords =
    practiced(c).includes(t.id) && !sealed && m.next !== null && rate > 0
      ? ` At ${formatRate(rate * (1 + kinshipBonus(c, t.id)))} practice days a day.`
      : '';
  return (
    <p className="mastery-eta">
      {nextLevelWords(c, t, rate)}
      {rateWords}
      <Why label="Mastery">
        Glimpse to Origin, round the ring: each level adds +{CHECKS_A_LEVEL} to checks and releases
        the insight under it when it lands.
      </Why>
    </p>
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
  const stopPractice = useGame((s) => s.stopPractice);
  const [error, setError] = useState<string | null>(null);
  // The technique on the page is the one selected, so it is seen.
  const see = useGame((s) => s.see);
  useEffect(() => {
    see('technique', [t.id]);
  }, [see, t.id]);
  const m = mastery(c, t.id);
  const sealed = techniqueSealed(c, t);
  const practicing = practiced(c).includes(t.id);
  const full = practiced(c).length >= practiceSlots(c);
  const ring = rings(useBeacons(), 'practice-this', { id: t.id });
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
      <MasteryLine c={c} t={t} rate={rate} />
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
          <dd>
            {splitFor(c, t.id) > 1 ? `${SHARE_GLYPHS[splitFor(c, t.id)]} share` : 'base'}
            {kinBonus > 0 && `, +${formatPercent(kinBonus)} kin`}
          </dd>
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
          className={`button${ring ? ' beacon-ring' : ''}`}
          aria-pressed={practicing}
          disabled={!practicing && (!canPractice(c, t.id) || full)}
          onClick={() => {
            if (practicing) stopPractice(t.id);
            else setError(practice(t.id));
          }}
        >
          {practicing
            ? 'Practicing · stop'
            : sealed
              ? 'Sealed'
              : !canPractice(c, t.id)
                ? 'Mastery is complete'
                : full
                  ? 'All slots in use'
                  : 'Practice this'}
        </button>
      </div>
      {error && <p className="warn">{error}</p>}
    </article>
  );
}

export function PracticeTab({ head }: { head: ReactNode }) {
  const game = useGame((s) => s.game);
  const [chosen, setChosen] = useState<string | null>(null);
  const page = useRef<HTMLDivElement>(null);
  // A toast's link lands on the technique it names, selected.
  const target = useNav((s) => (s.screen === 'routine' && s.tab === 'practice' ? s.select : null));
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
  const rates = ratesHere(game);
  const total = dayPractice(c, game.calendar.day);
  const has = (id: string | null | undefined): id is string =>
    !!id && known.some((t) => t.id === id);
  const first = practiced(c)[0];
  const selected = has(chosen) ? chosen : has(first) ? first : techniqueRows(c)[0]?.t.id;

  const select = (id: string) => {
    setChosen(id);
  };

  if (!selected) {
    return (
      <RoutineScene
        ring={null}
        page={null}
        column={
          <>
            {head}
            <p className="muted">You know no techniques yet.</p>
          </>
        }
      />
    );
  }
  const t = known.find((k) => k.id === selected)!;

  return (
    <RoutineScene
      ring={<MasteryRing c={c} t={t} />}
      page={
        <div ref={page} className="technique-page-col">
          <TechniquePage c={c} t={t} rate={total / splitFor(c, selected)} onSelect={select} />
        </div>
      }
      column={
        <>
          {head}
          <PracticePanel c={c} rates={rates} total={total} onSelect={select} onKeep={setChosen} />
          <TechniqueList
            c={c}
            selected={selected}
            fresh={new Set(newIds(game, 'technique'))}
            onSelect={select}
          />
        </>
      }
    />
  );
}
