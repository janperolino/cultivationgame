// The stage (design.md § UI and screens, The stage): every screen is laid out 1080 px tall and
// the whole UI scales by one factor, the window's height over 1080. The stage's width follows the
// window's shape from 16:10 (1728) to 21:9 (2520); everything a screen needs sits in the centre
// 1728. A window narrower than 16:10 letterboxes top and bottom, one wider than 21:9 pillarboxes.

import { create } from 'zustand';

export const STAGE_HEIGHT = 1080;
export const SAFE_WIDTH = 1728;
export const MAX_WIDTH = 2520;

export interface Stage {
  /** Window pixels per stage pixel. */
  factor: number;
  /** The stage's width in stage pixels, 1728 to 2520. */
  width: number;
  height: number;
  /** Where the stage sits in the window, in window pixels (the void around it). */
  left: number;
  top: number;
  /** The centre 1728 inside the stage, in stage pixels. */
  safeLeft: number;
  safeWidth: number;
}

export function stageFor(windowWidth: number, windowHeight: number): Stage {
  const w = Math.max(1, windowWidth);
  const h = Math.max(1, windowHeight);
  const factor = Math.min(h / STAGE_HEIGHT, w / SAFE_WIDTH);
  const width = Math.min(MAX_WIDTH, Math.max(SAFE_WIDTH, w / factor));
  return {
    factor,
    width,
    height: STAGE_HEIGHT,
    left: (w - width * factor) / 2,
    top: (h - STAGE_HEIGHT * factor) / 2,
    safeLeft: (width - SAFE_WIDTH) / 2,
    safeWidth: SAFE_WIDTH,
  };
}

/** The stage now, kept in step with the window by `startStage`. */
export const useStage = create<Stage>(() =>
  typeof window === 'undefined'
    ? stageFor(1920, 1080)
    : stageFor(window.innerWidth, window.innerHeight),
);

/** Window pixels per stage pixel, for code outside React (canvases, pointer reads). */
export function stageFactor(): number {
  return useStage.getState().factor;
}

/**
 * A point from a pointer event in an element's own stage pixels. A zoomed element's rect and the
 * pointer are in window pixels; its layout (clientWidth, a canvas's drawing) is in stage pixels.
 */
export function pointIn(e: { clientX: number; clientY: number }, el: Element) {
  const r = el.getBoundingClientRect();
  const f = stageFactor();
  return { x: (e.clientX - r.left) / f, y: (e.clientY - r.top) / f };
}

/** An element's rect in stage pixels, measured from the window's corner. */
export function rectIn(el: Element) {
  const r = el.getBoundingClientRect();
  const f = stageFactor();
  return {
    left: r.left / f,
    top: r.top / f,
    right: r.right / f,
    bottom: r.bottom / f,
    width: r.width / f,
    height: r.height / f,
  };
}

/** Canvas pixels per stage pixel: the screen's density times the stage's zoom, so 4K stays sharp. */
export function canvasDensity(cap = 2): number {
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return Math.min(cap, dpr * stageFactor());
}

/** Follows the window, writing the stage's size and zoom on the page. */
export function startStage(): void {
  const apply = () => {
    const s = stageFor(window.innerWidth, window.innerHeight);
    useStage.setState(s);
    const root = document.documentElement.style;
    root.setProperty('--stage-width', `${s.width}px`);
    root.setProperty('--stage-zoom', String(s.factor));
  };
  apply();
  window.addEventListener('resize', apply);
}

/** Fullscreen on and off, as F11 does. */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => {});
}
