// One ladder's method on the Cultivate screen (design § Cultivation, methods): its name in its
// rarity's color with its tier as a word, its mastery, what it builds, what it adds at a
// breakthrough, its upkeep and properties, and a switch among the methods known for that ladder.
// Words first, numbers behind the "?".
import { useState } from 'react';
import { ELEMENT_INFO, phaseOf } from '../content/elements.ts';
import { BRANCHES } from '../content/hours.ts';
import { MASTERY, METHOD_MASTERY } from '../content/mastery.ts';
import { nextChapter, type Method, type Upkeep } from '../content/methods.ts';
import { rarity, type Rarity } from '../content/rarity.ts';
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
import type { GameState } from '../core/state.ts';
import { formatEffect, formatNumber, formatPercent, LADDER_LABELS, tierName } from './format.ts';
import { useGame } from './store.ts';
import { Why } from './widgets.tsx';

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
      <div>
        <RarityName m={m} className="method-name" /> <span className="hanzi">{m.hanzi}</span>
      </div>
      <p className="caption">
        {r.name} · {tierName(m.tier)} · chapter {m.chapter}
        {m.element && ` · ${ELEMENT_INFO[m.element].name.toLowerCase()}`}
        <Why label={`About the ${m.name}`}>
          <span>From {m.source}.</span>
          <span>
            Its tier carries {LADDER_LABELS[which].toLowerCase()} to the peak of {tierName(m.tier)};
            above that it gains nothing. Its rarity, {r.name.toLowerCase()} ({r.note}), sets its
            speed, its growth and its bonuses.
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
      <div className="bars">
        <div className="bar-row">
          <span className="label">
            {level.name} <span className="hanzi">{level.hanzi}</span>
          </span>
          <div
            className="bar"
            role="progressbar"
            aria-label={`${m.name} mastery toward ${next?.name ?? 'its peak'}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(mastery.fraction * 100)}
          >
            <div className="bar-fill" style={{ width: `${mastery.fraction * 100}%` }} />
          </div>
          <span className="value">
            ×{METHOD_MASTERY.speed[mastery.level]}
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

/** One ladder's row: its active method, or why it has none, and the switch. */
export function MethodRow({ game, which }: { game: GameState; which: LadderId }) {
  const setMethod = useGame((s) => s.setMethod);
  const [error, setError] = useState<string | null>(null);
  const c = game.player;
  const m = ladderMethod(c, which);
  const known = knownMethods(c, which);
  const others = known.filter((k) => k.id !== m?.id);

  return (
    <li className="method">
      <span className="label">{LADDER_LABELS[which]}</span>
      <div>
        {m ? (
          <ActiveMethod game={game} which={which} m={m} />
        ) : (
          <span className="muted">
            No {ART_NAMES[which]}
            {known.length === 0 &&
              (which === 'qi'
                ? ': qi hours give nothing.'
                : `: the ${which} grows only from the world until you find one.`)}
          </span>
        )}
        {others.length > 0 && (
          <label className="method-switch">
            <span className="caption">Climb with</span>
            <select
              value={m?.id ?? ''}
              disabled={!!game.ended}
              onChange={(e) => setError(setMethod(which, e.target.value))}
            >
              {!m && <option value="">Choose a {ART_NAMES[which]}</option>}
              {known.map((k) => {
                const check = canTakeUp(c, which, k.id);
                return (
                  <option key={k.id} value={k.id} disabled={!check.ok}>
                    {k.name} · {rarity(k.rarity).name.toLowerCase()} · {tierName(k.tier)}
                    {!check.ok && ` (${check.reason.replace(/\.$/, '').toLowerCase()})`}
                  </option>
                );
              })}
            </select>
          </label>
        )}
        {error && <p className="warn">{error}</p>}
      </div>
    </li>
  );
}
