// Players pick their colors (design § UI and screens): the accent, the crack light and the rarity
// palette, with presets and a picker that warns when a color is hard to read on black. Pure
// functions, so the warnings have tests; ui/settings.ts stores the choices.
import { RARITIES, type RarityId } from '../content/rarity.ts';

/** The glass every color sits on: the void behind the panels. */
export const VOID = '#040507';
export const WARN = '#e08a6a';

export const DEFAULT_ACCENT = '#d6ab4c';
export const DEFAULT_CRACK = '#7fc7d9';
export const DEFAULT_RARITY: Readonly<Record<RarityId, string>> = {
  gray: '#7b818a',
  white: '#ece8de',
  green: '#7fca8c',
  blue: '#6ea6f0',
  purple: '#b98ef2',
  gold: '#f39a3d',
  red: '#e03c50',
};

export interface ColorPreset {
  id: string;
  name: string;
  accent: string;
  crack: string;
}

/** Accent and crack light together. Each keeps its job: the accent acts, the crack light is qi. */
export const PRESETS: readonly ColorPreset[] = [
  { id: 'gold', name: 'Gold and qi', accent: DEFAULT_ACCENT, crack: DEFAULT_CRACK },
  { id: 'jade', name: 'Jade and mist', accent: '#6fcfb4', crack: '#b4c8e8' },
  { id: 'bronze', name: 'Bronze and violet', accent: '#cfa679', crack: '#9f8ff0' },
  { id: 'amber', name: 'Amber and rose', accent: '#ecc35e', crack: '#e28ca0' },
  { id: 'bright', name: 'Bright', accent: '#ffd85e', crack: '#a6ecff' },
];

/** "#abc" or "#aabbcc" as [r, g, b]; null for anything else. */
export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!;
  const n = parseInt(h, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** How far apart two colors look, roughly: a weighted RGB distance, 0 to about 765. */
export function distance(a: string, b: string): number {
  const x = parseHex(a);
  const y = parseHex(b);
  if (!x || !y) return Infinity;
  const rm = (x[0] + y[0]) / 2;
  const [dr, dg, db] = [x[0] - y[0], x[1] - y[1], x[2] - y[2]];
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/** Text needs this much contrast on black; the crack light is drawn, not read, and needs less. */
export const TEXT_CONTRAST = 4.5;
export const GLOW_CONTRAST = 3;
/** Closer than this, two colors read as the same at a glance. */
const SAME_LOOK = 60;

export type ColorJob = 'accent' | 'crack' | RarityId;

/**
 * Why a color would be a poor choice for its job, or null. Hard to read on black comes first;
 * then an accent that looks like a rarity or the warning color, which would blur what it means.
 */
export function colorWarning(
  job: ColorJob,
  hex: string,
  rarity = DEFAULT_RARITY,
  accent = DEFAULT_ACCENT,
): string | null {
  if (!parseHex(hex)) return 'Not a color the game can read.';
  const need = job === 'crack' ? GLOW_CONTRAST : TEXT_CONTRAST;
  const ratio = contrast(hex, VOID);
  if (ratio < need) {
    return job === 'crack'
      ? 'Too dark: the qi light will barely show through the glass.'
      : 'Hard to read on black.';
  }
  if (job === 'accent') {
    if (distance(hex, WARN) < SAME_LOOK) return 'Looks like the warning color.';
    const like = RARITIES.find((r) => distance(hex, rarity[r.id]) < SAME_LOOK);
    if (like) return `Looks like ${like.name.toLowerCase()} rarity, so names may read as buttons.`;
  } else if (job !== 'crack') {
    if (distance(hex, accent) < SAME_LOOK)
      return 'Looks like the accent, so names may read as buttons.';
    if (distance(hex, WARN) < SAME_LOOK) return 'Looks like the warning color.';
  }
  return null;
}
