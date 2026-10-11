// Settings live in localStorage; saves never do (design § Saves).
const KEY = 'severed-heaven.settings';

export interface Settings {
  activeSlot: number | null;
}

const defaults: Settings = { activeSlot: null };

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) } : defaults;
  } catch {
    return defaults;
  }
}

export function saveSettings(patch: Partial<Settings>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadSettings(), ...patch }));
  } catch {
    // Private windows and blocked storage: settings just don't stick.
  }
}
