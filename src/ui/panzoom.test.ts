import { describe, expect, it } from 'vitest';
import { clampView, MAX_ZOOM, MIN_ZOOM, pan, pinch, toWorld, viewAt, zoomAt } from './panzoom.ts';

const view = { x: 40, y: -100, k: 1 };

describe('the Trees canvas view', () => {
  it('pans by the drag', () => {
    expect(pan(view, 15, -5)).toEqual({ x: 55, y: -105, k: 1 });
  });

  it('zooms about the cursor, which stays over the same world point', () => {
    const at = { x: 300, y: 200 };
    const before = toWorld(view, at);
    const z = zoomAt(view, 1.5, at);
    expect(z.k).toBeCloseTo(1.5);
    expect(toWorld(z, at).x).toBeCloseTo(before.x);
    expect(toWorld(z, at).y).toBeCloseTo(before.y);
  });

  it('stops zooming at its limits', () => {
    expect(zoomAt(view, 100, { x: 0, y: 0 }).k).toBe(MAX_ZOOM);
    expect(zoomAt(view, 0.001, { x: 0, y: 0 }).k).toBe(MIN_ZOOM);
  });

  it('pinches: the spread sets the zoom and the midpoint carries the world with it', () => {
    const a0 = { x: 100, y: 100 };
    const b0 = { x: 200, y: 100 };
    const under = toWorld(view, { x: 150, y: 100 });
    // Fingers spread to twice the distance and drift 30 px right.
    const p = pinch(view, a0, b0, { x: 80, y: 100 }, { x: 280, y: 100 });
    expect(p.k).toBeCloseTo(2);
    const now = toWorld(p, { x: 180, y: 100 });
    expect(now.x).toBeCloseTo(under.x);
    expect(now.y).toBeCloseTo(under.y);
  });

  it('never lets the world slide off screen', () => {
    const world = { w: 900, h: 2000 };
    const screen = { w: 375, h: 600 };
    const lost = clampView({ x: 5000, y: -9000, k: 1 }, world, screen, 80);
    expect(lost.x).toBe(375 - 80);
    expect(lost.y).toBe(80 - 2000);
    const fine = { x: -200, y: -300, k: 1 };
    expect(clampView(fine, world, screen, 80)).toEqual(fine);
  });

  it('puts a world point at a screen point', () => {
    const v = viewAt(0.5, { x: 400, y: 100 }, { x: 200, y: 20 });
    expect(v.x + 400 * 0.5).toBe(200);
    expect(v.y + 100 * 0.5).toBe(20);
  });

  it("keeps the world's bottom from rising off the screen's with a floor", () => {
    const world = { w: 2000, h: 1000 };
    const screen = { w: 400, h: 600 };
    // Dragged far up: without a floor, only a margin of the world stays; with one, its bottom
    // edge stays at the screen's.
    const up = { x: 0, y: -5000, k: 1 };
    expect(clampView(up, world, screen).y).toBe(80 - 1000);
    expect(clampView(up, world, screen, 80, true).y).toBe(600 - 1000);
    // A world shorter than the screen sits on its bottom.
    expect(clampView({ x: 0, y: 0, k: 0.2 }, world, screen, 80, true).y).toBe(600 - 200);
  });
});
