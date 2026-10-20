// One-breath drawing 一笔符 at the talisman desk (design § Professions, Crafts, thin, the hands-on
// version; K5, its talk and `docs/mockups/talisman-one-breath-study.html`): the stroke path traced
// without lifting as the qi ink thins. Press on the head 符头 and draw the whole talisman in one
// breath. The brush's ink drains by time while it is down, not by distance, and the thinner it is
// the narrower the line you must stay on, so the foot is the hard part and the open curves are
// hurried to bank ink for it. Off the line a stretch is spoiled; far off, the qi snaps; lifting
// breaks the breath. core/talisman.ts reads these. Times are real seconds; places are the scene's
// own frame, 760 by 560. Starting values, measured with a bot (core/talisman.test.ts).

/** The scene's frame, and the strip of paper in it. */
export const DESK_BOX = { w: 760, h: 560 } as const;
export const PAPER = { x: 270, y: 26, w: 220, h: 508 } as const;

/** Spacing of the path's samples, in the frame's units. */
export const STEP = 4;
/** The pace the breath allows on average, and how much longer than that it lasts. */
export const PACE = 170;
export const SLACK = 1.15;
/** The line's half-width when the ink is spent and when it is full. */
export const BAND: readonly [dry: number, full: number] = [6, 16];
/** Stray past this many half-widths and the qi snaps. */
export const SNAP = 2.6;
/** A press this close to the head starts the stroke. */
export const START_REACH = 22;

/** Seconds a fresh sheet takes to lay, the finished one shows, and a laid one waits unstarted. */
export const LAY_S = 0.7;
export const SHOW_S = 1.1;
export const WAIT_S = 4;

/**
 * Each sheet moves the hand this share of the way toward its quality, the share of the line drawn
 * on it (0 if it broke). A sheet left unstarted past `WAIT_S` dries and counts as broken, so doing
 * nothing falls to 0. A sheet at this quality or better is flawless 妙.
 */
export const HAND_SETTLE = 0.35;
export const FLAWLESS = 0.9;

/**
 * The stroke paths by family, through control points the brush passes in order. Each opens with
 * the head 符头, three hooks like 敕; strikes run a bolt down the body to a knot and a sharp tail,
 * wards a square spiral turning in to the gall 符胆, passage long cloud curves off the foot.
 */
const HEAD: readonly (readonly [number, number])[] = [
  [332, 80],
  [348, 56],
  [362, 83],
  [380, 50],
  [398, 83],
  [412, 56],
  [428, 80],
  [388, 103],
  [380, 125],
];
export const STROKES: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  strikes: [
    ...HEAD,
    [324, 178],
    [436, 223],
    [324, 276],
    [436, 321],
    [364, 367],
    [332, 404],
    [380, 427],
    [420, 397],
    [380, 374],
    [380, 457],
    [356, 502],
  ],
  wards: [
    ...HEAD,
    [300, 171],
    [300, 495],
    [460, 495],
    [460, 223],
    [344, 223],
    [344, 442],
    [416, 442],
    [416, 299],
    [380, 337],
  ],
  passage: [
    ...HEAD,
    [452, 163],
    [444, 223],
    [308, 246],
    [308, 306],
    [452, 329],
    [452, 389],
    [316, 412],
    [324, 472],
    [412, 495],
    [468, 472],
  ],
};
