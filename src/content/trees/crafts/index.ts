// The five craft Daos of v1 (design § Professions, The craft Dao trees), in the order the Trees screen lists them.
import { ALCHEMY_DAO } from './alchemy.ts';
import { FARMING_DAO } from './farming.ts';
import { FORMATIONS_DAO } from './formations.ts';
import { REFINING_DAO } from './refining.ts';
import { TALISMANS_DAO } from './talismans.ts';

export const CRAFT_TREES = [
  ALCHEMY_DAO,
  REFINING_DAO,
  TALISMANS_DAO,
  FORMATIONS_DAO,
  FARMING_DAO,
] as const;
