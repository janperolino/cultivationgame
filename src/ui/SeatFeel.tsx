// The feel pass on Cultivate (F1, Jan's calls in its talk; docs/mockups/feel-pass-study.html):
// the breakthrough's warning over the figure, the stones and insight in a row under its line of
// words (take C) with the +n rising from them, and your house's seal by your name.
import { useEffect, useState } from 'react';
import { SCENE_WINDUP_S } from '../content/scene.ts';
import {
  isOrganization,
  membershipsOf,
  membershipsView,
  organization,
} from '../core/organizations.ts';
import type { GameState } from '../core/state.ts';
import { formatNumber } from './format.ts';
import { GainFloats } from './Gains.tsx';
import { go } from './nav.ts';
import { useScene, warnWords } from './scene.ts';
import { PurseStats } from './ShellHeader.tsx';

/** How long the warning takes to fade once the race begins (theme.css, `.warn-line.is-fading`). */
const FADE_MS = 600;

/**
 * A line over the figure while a breakthrough comes: through the warning before a scene that
 * starts by itself, and through any scene's wind-up, fading as the race begins. Once each, no
 * loop; S1's cue is the scene store's (ui/scene.ts).
 */
export function WarnLine() {
  const warn = useScene((s) => s.warn);
  const play = useScene((s) => s.play);
  const windupEnd =
    play && !play.outcome ? play.started + (SCENE_WINDUP_S * 1000) / (play.pace ?? 1) : 0;
  // How far past the wind-up this scene is: 1 as the race begins and the line fades, 2 once gone.
  const [past, setPast] = useState({ end: 0, stage: 0 });
  useEffect(() => {
    if (!windupEnd) return;
    const left = Math.max(0, windupEnd - performance.now());
    const a = window.setTimeout(() => setPast({ end: windupEnd, stage: 1 }), left);
    const b = window.setTimeout(() => setPast({ end: windupEnd, stage: 2 }), left + FADE_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [windupEnd]);
  const stage = past.end === windupEnd ? past.stage : 0;
  const ladder = warn?.ladder ?? (play && !play.outcome && stage < 2 ? play.ladder : null);
  const major = !warn && !!play?.major;
  if (!ladder) return null;
  return (
    <p
      // Keyed by ladder, so the line rises once from the warning through the wind-up.
      key={ladder}
      className={`warn-line${!warn && stage === 1 ? ' is-fading' : ''}`}
      aria-live="polite"
    >
      {warnWords(ladder, major)}
    </p>
  );
}

/** The stones and insight under the figure's line of words, the +n rising from them. */
export function SeatPurse({ game }: { game: GameState }) {
  return (
    <div className="seat-purse">
      <PurseStats game={game} className="seat-purse-stats" />
      <GainFloats />
    </div>
  );
}

/**
 * Your house's seal by your name: a sect, clan, academy or the like, else a guild; a guest elder
 * shows none. Its first hanzi in red, its name, seat and standing on hover, the memberships a click.
 */
export function AffiliationSeal({ game }: { game: GameState }) {
  const held = membershipsOf(game.world, game.player.id).filter(
    (m) => !m.guest && isOrganization(m.power),
  );
  const m = held.find((x) => organization(x.power).preset.bond !== 'stack') ?? held[0];
  if (!m) return null;
  const org = organization(m.power);
  const row = membershipsView(game, game.player.id).find((r) => r.power === m.power);
  return (
    <button
      type="button"
      className="house-seal"
      aria-label={`${org.name}: open your memberships`}
      onClick={() => go('character')}
    >
      <span className="hanzi" aria-hidden="true">
        {org.hanzi.charAt(0)}
      </span>
      <span className="house-seal-tip" role="tooltip">
        <b>{org.name}</b> <span className="hanzi">{org.hanzi}</span>
        {row && (
          <small>
            {row.title.name.charAt(0).toUpperCase() + row.title.name.slice(1)} ·{' '}
            {formatNumber(row.balance)} {row.currency}
          </small>
        )}
      </span>
    </button>
  );
}
