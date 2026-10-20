// Going in's GLM for the app (src/ai): OpenRouter on the key typed in Settings, read fresh on every
// call, and one cost meter that keeps its totals in the settings. M8's sign-in swaps the key
// source here and nowhere else. P3.9's scenes call through `gameAi`.
import type { Ai } from '../ai/call.ts';
import { keyedProvider, typedKey } from '../ai/keys.ts';
import { CostMeter } from '../ai/openrouter.ts';
import { saveSettings, useSettings } from './settings.ts';

export const keys = typedKey(() => useSettings.getState().openRouterKey);

export const meter = new CostMeter(useSettings.getState().aiMeter);
meter.onChange = (aiMeter) => saveSettings({ aiMeter });

export const gameAi: Ai = { provider: keyedProvider(keys, { appTitle: 'Severed Heaven' }), meter };

export function hasKey(): boolean {
  return keys.key() !== null;
}
