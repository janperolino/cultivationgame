import { statInfo, type Effect } from '../content/stats.ts';
import { realm, REALMS, stageName } from '../content/realms.ts';
import {
  GRADE_ECHO,
  GRADE_NEXT_ODDS,
  GRADE_SPEED,
  GRADES,
  type GradeId,
} from '../content/cultivation.ts';
import type { LadderId } from '../core/cultivation.ts';
import { DAYS_PER_YEAR, type Ladder } from '../core/state.ts';

export const LADDER_LABELS: Record<LadderId, string> = { qi: 'Qi', body: 'Body', soul: 'Soul' };

/** "16 years, 3 months". */
export function formatAge(years: number): string {
  const whole = Math.floor(years);
  const months = Math.floor((years - whole) * 12);
  const y = `${whole} ${whole === 1 ? 'year' : 'years'}`;
  return months ? `${y}, ${months} ${months === 1 ? 'month' : 'months'}` : y;
}

/** In-game days as the largest sensible unit: "12 days", "3.2 years". */
export function formatDays(days: number): string {
  if (days < 60) return `${Math.round(days)} ${Math.round(days) === 1 ? 'day' : 'days'}`;
  if (days < DAYS_PER_YEAR) return `${Math.round(days / 30)} months`;
  const years = days / DAYS_PER_YEAR;
  return `${years < 10 ? years.toFixed(1) : Math.round(years)} years`;
}

/** Real milliseconds as "2 h 15 min". */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} h ${min % 60} min` : `${h} h`;
}

/** A tier as a word, the realm it belongs to: "Qi Condensation". */
export function tierName(tier: number): string {
  return REALMS[tier - 1]?.name ?? `tier ${tier}`;
}

export function formatLadder(l: Ladder): string {
  return `${realm(l.realm).name}, ${stageName(l.realm, l.stage)}`;
}

export function formatWhen(ms: number | undefined | null): string {
  if (!ms) return 'never';
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Numbers in short forms past ten thousand: 1,248, 12.4k, 3.1M. Small fractions keep a digit. */
export function formatNumber(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e18) return n.toExponential(1);
  if (a >= 1e15) return `${(n / 1e15).toFixed(1)}Qa`;
  if (a >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(1)}k`;
  if (a > 0 && a < 10) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return Math.floor(n).toLocaleString();
}

/** Small rates keep two significant digits (0.083, 0.0042); from ten up they read like formatNumber. */
export function formatRate(n: number): string {
  if (Math.abs(n) >= 10) return formatNumber(n);
  return String(Number(n.toPrecision(2)));
}

export function formatPercent(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** "16 y 3 m", for tight spaces. */
export function formatAgeShort(years: number): string {
  const whole = Math.floor(years);
  const months = Math.floor((years - whole) * 12);
  return months ? `${whole} y ${months} m` : `${whole} y`;
}

/** A stat change as players read it: "Qi gain +4%", "Minor odds +3", "Lifespan +3 years". */
/** A multiplier with as few decimals as it needs: 1.1, 1.05, 1.155. */
function formatTimes(x: number): string {
  return String(Math.round(x * 1000) / 1000);
}

export function formatEffect(e: Effect): string {
  const info = statInfo(e.stat);
  const sign = e.value < 0 ? '−' : '+';
  const a = Math.abs(e.value);
  if (info.unit === 'times') return `${info.name} ×${formatTimes(1 + e.value)}`;
  const amount =
    info.unit === 'percent'
      ? `${sign}${Math.round(a * 100)}%`
      : info.unit === 'odds'
        ? `${sign}${Math.round(a * 100)} points`
        : info.unit === 'years'
          ? `${sign}${a} ${a === 1 ? 'year' : 'years'}`
          : info.unit === 'stages'
            ? `${sign}${a} ${a === 1 ? 'stage' : 'stages'}`
            : `${sign}${a}`;
  return `${info.name} ${amount}`;
}

/** "orphaned by a raid" → "Orphaned by a raid". */
export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** ["wood", "fire", "water"] → "wood, fire and water". */
export function listWords(xs: readonly string[]): string {
  return xs.length <= 1 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
}

/**
 * What a breakthrough grade gives, in a line (D2.1): "+20% speed in Foundation Establishment, +2
 * stages in a fight, +6 odds on the next major".
 */
export function gradeGives(id: GradeId, realmName: string): string {
  const stages = GRADES.find((g) => g.id === id)!.stages;
  const speed = GRADE_SPEED[id] - 1;
  const odds = GRADE_NEXT_ODDS[id];
  if (speed === 0 && stages === 0 && odds === 0) return 'nothing gained, nothing lost';
  const sign = (x: number) => (x >= 0 ? '+' : '−');
  return [
    `${sign(speed)}${Math.round(Math.abs(speed) * 100)}% speed in ${realmName}`,
    `${sign(stages)}${Math.abs(stages)} ${Math.abs(stages) === 1 ? 'stage' : 'stages'} in a fight`,
    `${sign(odds)}${Math.round(Math.abs(odds) * 100)} odds on the next major`,
  ].join(', ');
}

/**
 * What an earlier grade still gives once a later major has passed it: a third of its speed and
 * odds, for life (core/grades.ts). "+12% speed, +3 odds on every major".
 */
export function gradeEchoes(id: GradeId): string {
  const speed = (GRADE_SPEED[id] - 1) * GRADE_ECHO;
  const odds = GRADE_NEXT_ODDS[id] * GRADE_ECHO;
  if (speed === 0 && odds === 0) return 'nothing echoes on';
  const sign = (x: number) => (x >= 0 ? '+' : '−');
  return [
    `${sign(speed)}${Math.round(Math.abs(speed) * 100)}% speed`,
    `${sign(odds)}${Math.round(Math.abs(odds) * 100)} odds on every major`,
  ].join(', ');
}
