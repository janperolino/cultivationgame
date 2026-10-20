// Settings live in localStorage; saves never do (design § Saves). These are the player's, not the
// life's: text size, motion, colors and the glass, and for going in the OpenRouter key and what the
// calls have cost (src/ai, the cost meter). The clock speed belongs to the life and saves
// with the slot instead. Only this file and the save layer touch browser storage.
import { create } from 'zustand';
import { emptyTotals, type MeterTotals } from '../ai/openrouter.ts';
import { RARITY_IDS, type RarityId } from '../content/rarity.ts';
import { DEFAULT_ACCENT, DEFAULT_CRACK, DEFAULT_RARITY, parseHex } from './colors.ts';

const KEY = 'severed-heaven.settings';

export type MotionSetting = 'system' | 'reduced' | 'full';

export interface Settings {
  activeSlot: number | null;
  /** Text size as a multiple of the default. */
  textScale: number;
  /** Follow the system's reduced-motion setting, or override it. */
  motion: MotionSetting;
  accent: string;
  crack: string;
  /** Rarity colors the player changed; the rest keep the defaults. */
  rarity: Partial<Record<RarityId, string>>;
  /** How much fine web the glass carries, 0 to 3. */
  web: number;
  /** How strongly the season and weather show on the glass, 0 to 1. */
  weather: number;
  /** How bright the panels' rims are, as a multiple of the default. */
  rim: number;
  /** The player's OpenRouter key, typed in Settings; empty when none. Never in a save or a commit. */
  openRouterKey: string;
  /** What going in's calls have cost, since the meter was last reset. */
  aiMeter: MeterTotals;
}

export const TEXT_SCALES = [
  { value: 0.9, name: 'Small' },
  { value: 1, name: 'Default' },
  { value: 1.15, name: 'Large' },
  { value: 1.3, name: 'Larger' },
] as const;

export const WEB_LEVELS = ['None', 'Light', 'Heavy', 'Shattered'] as const;

export const DEFAULT_SETTINGS: Settings = {
  activeSlot: null,
  textScale: 1,
  motion: 'system',
  accent: DEFAULT_ACCENT,
  crack: DEFAULT_CRACK,
  rarity: {},
  web: 1,
  weather: 1,
  rim: 1,
  openRouterKey: '',
  aiMeter: emptyTotals(),
};

const clamp = (x: unknown, lo: number, hi: number, d: number) =>
  typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d;
const color = (x: unknown, d: string) => (typeof x === 'string' && parseHex(x) ? x : d);
const count = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0);

/** The meter's totals as stored, made safe. */
function cleanMeter(raw: unknown): MeterTotals {
  const m = (raw ?? {}) as Partial<Record<keyof MeterTotals, unknown>>;
  const byRole: MeterTotals['byRole'] = {};
  for (const [role, r] of Object.entries((m.byRole ?? {}) as Record<string, unknown>)) {
    const x = (r ?? {}) as { calls?: unknown; cost?: unknown };
    byRole[role] = { calls: count(x.calls), cost: count(x.cost) };
  }
  return {
    calls: count(m.calls),
    cost: count(m.cost),
    promptTokens: count(m.promptTokens),
    cachedTokens: count(m.cachedTokens),
    completionTokens: count(m.completionTokens),
    byRole,
  };
}

/** Whatever was stored, made safe: unknown keys dropped, bad values back to the defaults. */
export function cleanSettings(raw: Partial<Record<keyof Settings, unknown>>): Settings {
  const d = DEFAULT_SETTINGS;
  const rarity: Partial<Record<RarityId, string>> = {};
  const rawRarity = (raw.rarity ?? {}) as Record<string, unknown>;
  for (const id of RARITY_IDS) {
    if (typeof rawRarity[id] === 'string' && parseHex(rawRarity[id])) rarity[id] = rawRarity[id];
  }
  return {
    activeSlot: typeof raw.activeSlot === 'number' ? raw.activeSlot : null,
    textScale: clamp(raw.textScale, 0.8, 1.5, d.textScale),
    motion: raw.motion === 'reduced' || raw.motion === 'full' ? raw.motion : 'system',
    accent: color(raw.accent, d.accent),
    crack: color(raw.crack, d.crack),
    rarity,
    web: Math.round(clamp(raw.web, 0, 3, d.web)),
    weather: clamp(raw.weather, 0, 1, d.weather),
    rim: clamp(raw.rim, 0.3, 1.6, d.rim),
    openRouterKey: typeof raw.openRouterKey === 'string' ? raw.openRouterKey.trim() : '',
    aiMeter: cleanMeter(raw.aiMeter),
  };
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? cleanSettings(JSON.parse(raw) as Partial<Settings>) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function store(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private windows and blocked storage: settings just don't stick.
  }
}

export const useSettings = create<Settings>()(() => loadSettings());

export function saveSettings(patch: Partial<Settings>): void {
  const next = cleanSettings({ ...useSettings.getState(), ...patch });
  useSettings.setState(next, true);
  store(next);
  applySettings(next);
}

export function rarityColor(s: Settings, id: RarityId): string {
  return s.rarity[id] ?? DEFAULT_RARITY[id];
}

const systemReduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/** Whether motion is reduced: the player's choice, or the system's when they follow it. */
export function reducedMotion(s: Settings = useSettings.getState()): boolean {
  return s.motion === 'reduced' || (s.motion === 'system' && systemReduced());
}

/** Puts the settings on the page: color tokens, text size and the motion flag the CSS reads. */
export function applySettings(s: Settings = useSettings.getState()): void {
  const root = document.documentElement;
  root.style.setProperty('--accent', s.accent);
  root.style.setProperty('--crack', s.crack);
  for (const id of RARITY_IDS) root.style.setProperty(`--rarity-${id}`, rarityColor(s, id));
  root.style.setProperty('--text-scale', String(s.textScale));
  root.style.setProperty('--weather-strength', String(s.weather));
  root.style.setProperty('--rim-gain', String(s.rim));
  root.dataset.motion = reducedMotion(s) ? 'reduced' : 'full';
}

/** Applies the settings now and again whenever the system's motion setting changes. */
export function startSettings(): void {
  applySettings();
  try {
    window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .addEventListener('change', () => applySettings());
  } catch {
    // Old browsers: the setting applies at load.
  }
}
