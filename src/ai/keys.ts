// Where the OpenRouter key comes from, behind one small interface so M8's OpenRouter sign-in drops
// in beside these. Node scripts read `OPENROUTER_API_KEY` from `.env.local` (`node --env-file`);
// the browser reads the key typed into Settings, which the settings layer keeps (ui/settings.ts).
// Never Vite's `VITE_` env: that would bake the key into the build. Keys are never committed.
import { openRouterProvider, type ChatOptions, type ChatProvider } from './openrouter.ts';

export interface KeySource {
  readonly kind: 'env' | 'typed' | 'sign-in';
  /** The key now, or null when there is none: no key, no going in. */
  key(): string | null;
}

export class NoKeyError extends Error {
  constructor() {
    super('No OpenRouter key. Add one in Settings to go in.');
    this.name = 'NoKeyError';
  }
}

const clean = (k: string | null | undefined) => (k && k.trim() ? k.trim() : null);

/** The key from the environment, for the Node scripts. */
export function envKey(env: Record<string, string | undefined>): KeySource {
  return { kind: 'env', key: () => clean(env.OPENROUTER_API_KEY) };
}

/** A key the player typed, read fresh on every call so a new one takes at once. */
export function typedKey(read: () => string | null | undefined): KeySource {
  return { kind: 'typed', key: () => clean(read()) };
}

/** OpenRouter with the key read on every call; a call with no key throws `NoKeyError`. */
export function keyedProvider(
  keys: KeySource,
  defaults: Omit<ChatOptions, 'apiKey'> = {},
): ChatProvider {
  return {
    chat(request, options) {
      const apiKey = keys.key();
      if (!apiKey) return Promise.reject(new NoKeyError());
      return openRouterProvider({ ...defaults, apiKey }).chat(request, options);
    },
  };
}
