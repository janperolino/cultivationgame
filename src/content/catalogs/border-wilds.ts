// The Border Wilds (qm-bianhuang): what the whole frontier sells, whatever town you stand in. Wall
// issue (the ash-wood spear, the boar-hide vest), the frontier's origin methods and their Foundation
// chapters, the body and soul gates (the Gate brews the Marrow-Washing Pill, so it is cheap here;
// the Soul-Condensing Pill is rare and dear, Jan's note in P3.2's talk), the shrines' soul arts,
// the guard arts and the loose formulas of the frontier's schools.
import type { Catalog } from './types.ts';

export const BORDER_WILDS: Catalog = {
  at: 'qm-bianhuang',
  layer: 'region',
  lots: [
    // Wall issue
    { thing: 'ash-wood-spear', shops: ['refiner', 'house', 'stall'] },
    { thing: 'boar-hide-vest', shops: ['refiner', 'house'] },
    // The gates for Foundation
    { thing: 'marrow-washing-pill', shops: ['alchemy', 'house'], weight: 0.4 },
    { thing: 'soul-condensing-pill', shops: ['alchemy', 'house'], weight: 0.1 },
    // Methods and their chapters
    { thing: 'method:crude-cave', shops: ['stall'], weight: 0.5 },
    { thing: 'method:cadet-spear', shops: ['stall', 'house'], weight: 0.5 },
    { thing: 'method:cadet-spear-foundation', shops: ['house'], weight: 0.15 },
    { thing: 'method:crude-cave-foundation', shops: ['house'], weight: 0.1 },
    { thing: 'method:bounty-scrap', shops: ['house'], weight: 0.4 },
    { thing: 'method:bounty-scrap-foundation', shops: ['house'], weight: 0.15 },
    { thing: 'method:stone-bearing', shops: ['stall', 'house'], weight: 0.6 },
    { thing: 'method:still-lantern', shops: ['stall', 'house'], weight: 0.6 },
    { thing: 'method:stone-bearing-foundation', shops: ['house'], weight: 0.15 },
    { thing: 'method:still-lantern-foundation', shops: ['house'], weight: 0.15 },
    // Techniques: the guard arts and the frontier's first strikes
    { thing: 'technique:bulwark-of-breath', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:iron-cloth-shirt', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:lamp-shadow-step', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:lamp-snuffing-glance', shops: ['stall'], weight: 0.3 },
    { thing: 'technique:porters-charge', shops: ['stall', 'house'], weight: 0.4 },
    { thing: 'technique:rampart-palm', shops: ['stall', 'house'], weight: 0.5 },
    { thing: 'technique:piled-bones-thrust', shops: ['stall', 'house'], weight: 0.5 },
    { thing: 'technique:alley-wind-palm', shops: ['stall'], weight: 0.4 },
    { thing: 'technique:rampart-collapse-palm', shops: ['house'], weight: 0.15 },
    // The frontier schools' formulas
    { thing: 'manual:garrison-breath-count', shops: ['stall'], weight: 0.4 },
    { thing: 'manual:butcher-sinew', shops: ['stall'], weight: 0.3 },
    { thing: 'manual:bone-wall-watch', shops: ['stall'], weight: 0.3 },
    { thing: 'manual:tide-counting', shops: ['stall', 'house'], weight: 0.3 },
  ],
};
