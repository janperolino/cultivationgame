import { realm, stageName } from '../content/realms.ts';
import { DAYS_PER_YEAR, type Ladder } from '../core/state.ts';

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

export function formatLadder(l: Ladder): string {
  return `${realm(l.realm).name}, ${stageName(l.realm, l.stage)}`;
}

export function formatWhen(ms: number | undefined | null): string {
  if (!ms) return 'never';
  return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
