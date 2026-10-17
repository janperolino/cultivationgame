// One ladder's method on the Routine screen (design § Cultivation, methods): its name in its
// rarity's color with its tier as a word, its mastery, what it builds, what it adds at a
// breakthrough, its upkeep and properties, and a switch among the methods known for that ladder,
// folded to one line like the routine's with Change opening the list (A4, Jan's pick). Words first,
// numbers behind the "?".
import { useState, type CSSProperties } from 'react';
import { ELEMENT_INFO, phaseOf } from '../content/elements.ts';
import { BRANCHES } from '../content/hours.ts';
import { MASTERY, METHOD_MASTERY } from '../content/mastery.ts';
import { copyOf, copyTitle } from '../content/copies.ts';
import { method as methodOf, nextChapter, type Method, type Upkeep } from '../content/methods.ts';
import { rarity, rarityRank, type Rarity } from '../content/rarity.ts';
import type { LadderId } from '../core/cultivation.ts';
import { ladderGrowth, realmGrowthTotal } from '../core/growth.ts';
import {
  canTakeUp,
  knownMethods,
  knowsMethod,
  ladderMethod,
  methodCapped,
  methodFed,
  methodFitSpeed,
  methodMastery,
  methodSpeed,
} from '../core/methods.ts';
import { copyUnread, ownedCopies, readingCopy } from '../core/reading.ts';
import type { Cultivator, GameState } from '../core/state.ts';
import { formatEffect, formatNumber, formatPercent, LADDER_LABELS, tierName } from './format.ts';
import { goToTab } from './nav.ts';
import { useGame } from './store.ts';
import { rings } from './beacons.ts';
import { useBeacons } from './useBeacons.ts';
import { useCloseOutside } from './useCloseOutside.ts';
import { METHOD_SEARCH_FROM, methodTiers, orderMethods } from './methodList.ts';
import { Picker, Why } from './widgets.tsx';

const ART_NAMES: Record<LadderId, string> = {
  qi: 'cultivation method',
  body: 'tempering art',
  soul: 'nourishing art',
};

/** What each growth stat is called in a sentence. */
const GROWTH_WORDS: Record<string, string> = {
  qiPool: 'pool',
  techniquePower: 'purity',
  qiRecovery: 'recovery',
  hp: 'HP',
  physicalDamage: 'physical damage',
  regeneration: 'regeneration',
  soulDefense: 'soul defense',
  divineSense: 'divine sense',
  perception: 'perception',
};

const list = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;

/** A thing's name in its rarity's color. */
export function RarityName({
  m,
  className = '',
}: {
  m: { name: string; rarity: string };
  className?: string;
}) {
  return <span className={`rarity-${m.rarity} ${className}`}>{m.name}</span>;
}

function growthWords(m: Method): string {
  const parts = Object.entries(m.growth).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const words = parts.map(([s]) => GROWTH_WORDS[s] ?? s);
  if ((parts[0]?.[1] ?? 0) >= 0.45)
    return `Builds mostly ${words[0]}, then ${list(words.slice(1))}`;
  return `Builds ${list(words)} in step`;
}

function bonusWords(r: Rarity): string {
  const b = r.breakthrough;
  const parts: string[] = [];
  if (b.odds)
    parts.push(`${b.odds > 0 ? '+' : '−'}${Math.round(Math.abs(b.odds) * 100)} to the odds`);
  if (b.margin) parts.push(`+${b.margin} to the grade margin`);
  if (b.injury < 1) parts.push('injuries halved');
  if (b.keepBar) parts.push('no bar lost on a failure');
  return parts.length ? `At a breakthrough, ${list(parts)}` : 'No breakthrough bonus';
}

function upkeepWords(up: Upkeep | null): string {
  if (!up) return 'No upkeep';
  const parts = [
    up.stones ? `${up.stones} spirit ${up.stones === 1 ? 'stone' : 'stones'}` : '',
    ...Object.entries(up.items ?? {}).map(([id, n]) => `${n} ${id.replace(/-/g, ' ')}`),
  ].filter(Boolean);
  return `Drinks ${list(parts)} a day`;
}

function ActiveMethod({ game, which, m }: { game: GameState; which: LadderId; m: Method }) {
  const c = game.player;
  const r = rarity(m.rarity);
  const mastery = methodMastery(c, m.id);
  const level = MASTERY[mastery.level]!;
  const next = MASTERY[mastery.level + 1];
  const speed = methodSpeed(c, which);
  const capped = methodCapped(c, m);
  const fed = methodFed(c, which, game.calendar.day);
  const fit = methodFitSpeed(c, m);
  const total = realmGrowthTotal(m, fit);
  const split = Object.entries(m.growth)
    .map(([s, v]) => `${GROWTH_WORDS[s] ?? s} ${formatPercent(v ?? 0)}`)
    .join(', ');
  const sofar = Object.entries(ladderGrowth(c[which]))
    .map(([s, v]) => `${GROWTH_WORDS[s] ?? s} ${v >= 0 ? '+' : '−'}${formatPercent(Math.abs(v))}`)
    .join(', ');
  const following = nextChapter(m);

  return (
    <>
      {/* The name, then what it is with its mastery at the right, just over the bar the row's whole
          width (A4, Jan's call). */}
      <div className="method-head">
        <RarityName m={m} className="method-name" /> <span className="hanzi">{m.hanzi}</span>
      </div>
      <div className="method-sub">
        <p className="caption">
          {r.name} · {tierName(m.tier)} · chapter {m.chapter}
          {m.element && ` · ${ELEMENT_INFO[m.element].name.toLowerCase()}`}
          <Why label={`About the ${m.name}`}>
            <span>From {m.source}.</span>
            <span>
              Its tier carries {LADDER_LABELS[which].toLowerCase()} to the peak of{' '}
              {tierName(m.tier)}; above that it gains nothing. Its rarity, {r.name.toLowerCase()} (
              {r.note}), sets its speed, its growth and its bonuses.
            </span>
            {m.element && (
              <span>
                Its hours pay a quarter more at {ELEMENT_INFO[m.element].name.toLowerCase()} hours:{' '}
                {BRANCHES.filter((b) => b.element === phaseOf(m.element!))
                  .map((b) => b.hanzi)
                  .join(' ')}
                .
              </span>
            )}
          </Why>
        </p>
        <span className="method-level">
          {level.name} <span className="hanzi">{level.hanzi}</span> · ×
          {METHOD_MASTERY.speed[mastery.level]}
          <Why label="How method mastery works">
            <span>
              Every hour cultivated with it is a twelfth of a practice day:{' '}
              {formatNumber(mastery.practice)} so far
              {mastery.next !== null && `, ${next!.name} at ${formatNumber(mastery.next)}`}.
            </span>
            <span>
              Mastery sets its speed, ×0.6 at Glimpse to ×1.2 at Origin, and each level releases a
              burst of insight.
            </span>
            {!capped && (
              <span>
                Its part of the speed now: ×{speed.total.toFixed(2)} (tier ×{speed.tier}, rarity ×
                {speed.rarity.toFixed(2)}, mastery ×{speed.mastery}); layers 1–3 ignore it.
              </span>
            )}
          </Why>
        </span>
      </div>
      <div
        className="bar method-bar"
        role="progressbar"
        aria-label={`${m.name} mastery toward ${next?.name ?? 'its peak'}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(mastery.fraction * 100)}
      >
        <div className="bar-fill" style={{ width: `${mastery.fraction * 100}%` }} />
      </div>
      {capped && (
        <p className="warn">
          It carries you no further than {tierName(m.tier)}: take up{' '}
          {following && knowsMethod(c, following.id) ? `the ${following.name}` : 'its next chapter'}{' '}
          or a new method.
        </p>
      )}
      {!fed && <p className="warn">Unfed: it stalls until its upkeep is paid.</p>}
      <p className="caption">
        {growthWords(m)}. {bonusWords(r)}. {upkeepWords(m.upkeep)}.
        <Why label="What it builds">
          <span>
            Over a full realm it leaves {total >= 0 ? '+' : '−'}
            {formatPercent(Math.abs(total))} on its rarity's curve
            {fit !== 1 && `, at a fit of ×${fit}`}, split {split}. Each stage keeps the growth of
            the method that climbed it.
          </span>
          {sofar && (
            <span>
              Your {LADDER_LABELS[which].toLowerCase()} so far: {sofar}.
            </span>
          )}
        </Why>
      </p>
      {m.properties.length > 0 && (
        <p className="caption">
          {m.properties.map((p, i) => (
            <span key={p.name}>
              {i > 0 && ' · '}
              <span className={p.unique ? `rarity-${m.rarity}` : undefined}>{p.name}</span>
              <Why label={p.name}>
                <span>{p.text}</span>
                <span>{p.effects.map(formatEffect).join(', ')}, while it is active.</span>
              </Why>
            </span>
          ))}
        </p>
      )}
    </>
  );
}

/** An unread copy of a method for this ladder, the one being read first. */
function waitingCopy(c: Cultivator, which: LadderId): string | null {
  const copies = ownedCopies(c).filter((id) => {
    const of = copyOf(id);
    return of?.kind === 'method' && methodOf(of.id).ladder === which && copyUnread(c, id);
  });
  return copies.find((id) => id === readingCopy(c)) ?? copies[0] ?? null;
}

/** Where a ladder's unread art stands: being read, queued, or on the shelf. */
function waitingWords(c: Cultivator, id: string): string {
  const title = copyTitle(id);
  const name = title.charAt(0).toUpperCase() + title.slice(1);
  if (readingCopy(c) === id) return `${name} is being read now.`;
  const at = c.reading.queue.indexOf(id);
  if (at >= 0) return `${name} waits in your reading queue, place ${at + 1}.`;
  return `${name} stands unread on your shelf.`;
}

/** One ladder's row: its active method, or why it has none, and the switch. */
export function MethodRow({
  game,
  which,
  open,
  onOpen,
}: {
  game: GameState;
  which: LadderId;
  /** Climb with is open: the panel shows this row alone, with its list under it (A4). */
  open: boolean;
  onOpen: (open: boolean) => void;
}) {
  const setMethod = useGame((s) => s.setMethod);
  const [error, setError] = useState<string | null>(null);
  const setOpen = onOpen;
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<number | null>(null);
  const fold = useCloseOutside<HTMLDivElement>(open, () => setOpen(false));
  const c = game.player;
  const m = ladderMethod(c, which);
  const known = knownMethods(c, which);
  const others = known.filter((k) => k.id !== m?.id);
  const rows = orderMethods(known, known.length > METHOD_SEARCH_FROM ? { query, tier } : {});
  const tiers = methodTiers(known);
  const copy = m ? null : waitingCopy(c, which);
  const ring = rings(useBeacons(), 'climb-with', { ladder: which });

  return (
    <li className="method">
      <span className="label">{LADDER_LABELS[which]}</span>
      <div>
        {m ? (
          <ActiveMethod game={game} which={which} m={m} />
        ) : copy ? (
          <span className="muted">
            No {ART_NAMES[which]} yet. {waitingWords(c, copy)}{' '}
            <button type="button" className="link-button" onClick={() => goToTab('study')}>
              See the queue
            </button>
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
        {m && others.length === 0 && <span className="caption method-only">Only one known</span>}
        {others.length > 0 && (
          <div ref={fold} className={`routine-fold method-fold${open ? ' is-open' : ''}`}>
            <button
              type="button"
              className={`routine-fold-head${ring ? ' beacon-ring' : ''}`}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <span className="routine-fold-label">Climb with</span>
              <b>{m ? m.name : `no ${ART_NAMES[which]}`}</b>
              <span className="muted">· {known.length} known</span>
              <span className="routine-fold-chev">{open ? 'Close' : 'Change'}</span>
            </button>
            {open && (
              <div className="method-pick">
                {known.length > METHOD_SEARCH_FROM && (
                  <div className="method-pick-tools">
                    <input
                      type="search"
                      className="technique-search"
                      aria-label={`Search the ${ART_NAMES[which]}s`}
                      placeholder="Search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {tiers.length > 0 && (
                      <Picker
                        label="Tier"
                        value={tier === null ? '' : String(tier)}
                        options={[
                          { id: '', name: 'All tiers' },
                          ...tiers.map((n) => ({ id: String(n), name: `Tier ${n}` })),
                        ]}
                        onChange={(id) => setTier(id ? Number(id) : null)}
                      />
                    )}
                  </div>
                )}
                <ul className="method-pick-list">
                  {rows.map(({ m: k, under }) => {
                    const check = canTakeUp(c, which, k.id);
                    const now = k.id === m?.id;
                    const rare = rarityRank(k.rarity) >= rarityRank('blue');
                    return (
                      <li key={k.id}>
                        <button
                          type="button"
                          className={`method-pick-row${now ? ' is-now' : ''}${under ? ' is-under' : ''}${rare ? ' is-rare' : ''}`}
                          style={{ '--rarity-color': `var(--rarity-${k.rarity})` } as CSSProperties}
                          disabled={now || !check.ok || !!game.ended}
                          title={check.ok ? `Take up the ${k.name}` : check.reason}
                          onClick={() => {
                            const why = setMethod(which, k.id);
                            setError(why);
                            if (!why) setOpen(false);
                          }}
                        >
                          <span className="method-pick-name">
                            <RarityName m={k} /> <span className="hanzi">{k.hanzi}</span>
                          </span>
                          <span className="method-pick-meta">
                            {now
                              ? 'Climbing'
                              : check.ok
                                ? `${rarity(k.rarity).name} · ${tierName(k.tier)} · ch. ${k.chapter}`
                                : check.reason.replace(/.$/, '')}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {rows.length === 0 && <p className="caption">Nothing matches.</p>}
              </div>
            )}
          </div>
        )}
        {error && <p className="warn">{error}</p>}
      </div>
    </li>
  );
}
