// The screens the side menu can reach. Later phases add entries here, gated by unlock flags.
// Cultivate is the seated figure and its breakthroughs (the Abode until P3.7's fix); Routine is the
// day wheel with its Practice and Study tabs (Cultivate until then). The Techniques screen lives in
// Routine › Practice since P2.5f, though its unlock and the seen
// record's screen id stay `techniques` (the Practice tab shows with it).
import { built } from '../core/guides.ts';
import type { GameState } from '../core/state.ts';

export type ScreenId =
  | 'cultivate'
  | 'routine'
  | 'crafts'
  | 'dwelling'
  | 'world'
  | 'journal'
  | 'trees'
  | 'bag'
  | 'character'
  | 'people'
  | 'chronicle'
  | 'settings';

export interface ScreenInfo {
  id: ScreenId;
  name: string;
  hanzi: string;
  /** The unlock flag that shows it; screens without one are always there. */
  unlock?: string;
}

export const screens: readonly ScreenInfo[] = [
  { id: 'cultivate', name: 'Cultivate', hanzi: '修炼', unlock: 'cultivate' },
  { id: 'routine', name: 'Routine', hanzi: '日课', unlock: 'routine' },
  { id: 'crafts', name: 'Crafts', hanzi: '艺', unlock: 'crafts' },
  { id: 'dwelling', name: 'Dwelling', hanzi: '居', unlock: 'dwelling' },
  { id: 'world', name: 'World', hanzi: '天下', unlock: 'world' },
  { id: 'journal', name: 'Journal', hanzi: '志', unlock: 'journal' },
  { id: 'trees', name: 'Trees', hanzi: '道树', unlock: 'trees' },
  { id: 'bag', name: 'Bag', hanzi: '行囊', unlock: 'bag' },
  { id: 'character', name: 'Character', hanzi: '根骨', unlock: 'character' },
  { id: 'people', name: 'People', hanzi: '人物', unlock: 'people' },
  { id: 'chronicle', name: 'Chronicle', hanzi: '生平', unlock: 'chronicle' },
  { id: 'settings', name: 'Settings', hanzi: '设置' },
];

/** The glyphs open from the first minute that wait for the first minor breakthrough's guide. */
export const LATE_GLYPHS: ReadonlySet<ScreenId> = new Set<ScreenId>([
  'world',
  'character',
  'people',
  'chronicle',
]);

/**
 * Whether the life has reached a screen: its unlock held, and the rail built that far. A way to a
 * screen from another (the Dwelling's Set course to the map) waits on the same gate.
 */
export function screenReached(s: GameState, id: ScreenId): boolean {
  const info = screens.find((x) => x.id === id);
  if (info?.unlock && !s.unlocks.includes(info.unlock)) return false;
  return built(s, 'rail') && (built(s, 'rail-rest') || !LATE_GLYPHS.has(id));
}
