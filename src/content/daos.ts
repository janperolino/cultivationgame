// The combat Daos of v1 (design § The combat Daos): the five element Daos and the four weapon
// Daos, each a tree in content/trees/daos/. An action counts a Dao when it is tagged with it, and
// an element Dao also counts every action of its own damage type. Lightning, Wind and Ice stay
// listed as tags on techniques with no tree yet.
import type { DamageType } from './techniques.ts';

export const COMBAT_DAO_IDS = [
  'fire',
  'water',
  'wood',
  'metal',
  'earth',
  'sword',
  'saber',
  'spear',
  'fist',
] as const;
export type CombatDaoId = (typeof COMBAT_DAO_IDS)[number];

export interface CombatDaoInfo {
  id: CombatDaoId;
  name: string;
  hanzi: string;
  /** The damage type an element Dao counts on every action; weapon Daos count their tag alone. */
  damage?: DamageType;
}

export const COMBAT_DAOS: Record<CombatDaoId, CombatDaoInfo> = {
  fire: { id: 'fire', name: 'Fire', hanzi: '火', damage: 'fire' },
  water: { id: 'water', name: 'Water', hanzi: '水', damage: 'water' },
  wood: { id: 'wood', name: 'Wood', hanzi: '木', damage: 'wood' },
  metal: { id: 'metal', name: 'Metal', hanzi: '金', damage: 'metal' },
  earth: { id: 'earth', name: 'Earth', hanzi: '土', damage: 'earth' },
  sword: { id: 'sword', name: 'Sword', hanzi: '剑' },
  saber: { id: 'saber', name: 'Saber', hanzi: '刀' },
  spear: { id: 'spear', name: 'Spear', hanzi: '枪' },
  fist: { id: 'fist', name: 'Fist', hanzi: '拳' },
};

export function isCombatDao(id: string): id is CombatDaoId {
  return (COMBAT_DAO_IDS as readonly string[]).includes(id);
}

/** The Daos an action counts: its own tags, and the element Dao of its damage type. */
export function actionDaos(tags: readonly string[], type: DamageType | null): string[] {
  const out = new Set(tags);
  for (const d of COMBAT_DAO_IDS) if (type && COMBAT_DAOS[d].damage === type) out.add(d);
  return [...out];
}

/** What each Dao's own stats do: power, hit, crit, cost and pierce on the actions it counts. */
export const DAO_STAT_KINDS = ['Power', 'Hit', 'Crit', 'Cost', 'Pierce'] as const;
export type DaoStatKind = (typeof DAO_STAT_KINDS)[number];
