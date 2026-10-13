// The nine combat Daos of v1 (design § The combat Daos), in the order the Trees screen lists them.
import { EARTH_DAO } from './earth.ts';
import { FIRE_DAO } from './fire.ts';
import { FIST_DAO } from './fist.ts';
import { METAL_DAO } from './metal.ts';
import { SABER_DAO } from './saber.ts';
import { SPEAR_DAO } from './spear.ts';
import { SWORD_DAO } from './sword.ts';
import { WATER_DAO } from './water.ts';
import { WOOD_DAO } from './wood.ts';

export const DAO_TREES = [
  FIRE_DAO,
  WATER_DAO,
  WOOD_DAO,
  METAL_DAO,
  EARTH_DAO,
  SWORD_DAO,
  SABER_DAO,
  SPEAR_DAO,
  FIST_DAO,
] as const;
