// The Trees canvas's view: a pan and a zoom, as plain math so it can be tested without a browser.
// A world point p shows on screen at p × k + (x, y).

export interface View {
  x: number;
  y: number;
  k: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 2;

export function clampZoom(k: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));
}

/** The world point under a screen point. */
export function toWorld(v: View, p: Point): Point {
  return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
}

export function pan(v: View, dx: number, dy: number): View {
  return { ...v, x: v.x + dx, y: v.y + dy };
}

/** Zooms by a factor about a screen point, which stays over the same world point. */
export function zoomAt(v: View, factor: number, at: Point): View {
  const k = clampZoom(v.k * factor);
  const w = toWorld(v, at);
  return { k, x: at.x - w.x * k, y: at.y - w.y * k };
}

/**
 * Two fingers: the view at the gesture's start, the two touches then and now. The world point
 * under the first midpoint follows the midpoint, and the zoom follows the spread.
 */
export function pinch(start: View, a0: Point, b0: Point, a1: Point, b1: Point): View {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const k = clampZoom(d0 > 0 ? (start.k * d1) / d0 : start.k);
  const w = toWorld(start, { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 });
  const m = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
  return { k, x: m.x - w.x * k, y: m.y - w.y * k };
}

/** Keeps at least `margin` pixels of the world on screen, so it can never be lost off an edge. */
export function clampView(v: View, world: Size, screen: Size, margin = 80): View {
  const clamp = (t: number, size: number, room: number) => {
    const m = Math.min(margin, size * v.k, room);
    return Math.min(room - m, Math.max(m - size * v.k, t));
  };
  return { ...v, x: clamp(v.x, world.w, screen.w), y: clamp(v.y, world.h, screen.h) };
}

/** A view at zoom k with a world point at a screen point. */
export function viewAt(k: number, world: Point, screen: Point): View {
  return { k, x: screen.x - world.x * k, y: screen.y - world.y * k };
}
