// The world's calendar (design § How the two halves connect): the Sealed Era 封纪, the atlas's
// current era. World day 0 is the first day of 3,115, so a first life born that day comes of age
// at 12 in 3,127, the atlas's "now". The clock never restarts between lives. Years are written as
// digits, never spelled out, since they run into the thousands.

export const ERA_START_YEAR = 3115;

export const ERA = { name: 'Sealed Era', hanzi: '封纪' } as const;

export const SEASON_HANZI = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' } as const;
