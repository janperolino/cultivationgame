// Drag to pan, wheel or pinch to zoom, for a box that shows a world through a View (ui/panzoom.ts).
// The web of threads and the Trees canvas use it.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  clampView,
  pan,
  pinch,
  zoomAt,
  type Point,
  type Size,
  type View,
  type ZoomRange,
} from './panzoom.ts';
import { markMoving } from './moving.ts';
import { pointIn, stageFactor } from './stage.ts';

/** Window pixels a pointer may move and still count as a tap, whatever the stage's zoom. */
const TAP = 6;
const WHEEL_STEP = 0.0015;
export const BUTTON_STEP = 1.25;

interface Gesture {
  pointers: Map<number, Point>;
  start: Map<number, Point>;
  view: View;
  /** True once the pointers moved far enough to be a drag, so the click that follows is not a tap. */
  moved: boolean;
}

/**
 * A pannable, zoomable view of `world` inside the returned `box`. It opens on `home(screen)` once
 * the box has a size, and `recentre` goes back there; `show` moves to any view made for the screen.
 * `range` bounds the zoom, and `floor` keeps the world's bottom edge from rising off the screen's.
 */
export function usePanZoom(
  world: Size,
  home: (screen: Size) => View,
  { range, floor = false }: { range?: ZoomRange; floor?: boolean } = {},
) {
  const fit = (v: View, s: Size) => clampView(v, world, s, undefined, floor);
  const box = useRef<HTMLDivElement>(null);
  const [screen, setScreen] = useState<Size>({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const gesture = useRef<Gesture>({
    pointers: new Map(),
    start: new Map(),
    view: { x: 0, y: 0, k: 1 },
    moved: false,
  });

  // The first measurement opens the home view.
  const [homed, setHomed] = useState(false);
  if (screen.w > 0 && !homed) {
    setHomed(true);
    setView(fit(home(screen), screen));
  }

  const apply = (v: View) => setView(screen.w ? fit(v, screen) : v);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setScreen({ w: el.clientWidth, h: el.clientHeight });
    // Measured now, not only when the observer first reports, which a background tab delays.
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The wheel needs a listener that is not passive, to keep the page from scrolling.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      markMoving();
      const at = pointIn(e, el);
      const lines = e.deltaMode === 1 ? 16 : 1;
      setView((v) =>
        v
          ? clampView(
              zoomAt(v, Math.exp(-e.deltaY * lines * WHEEL_STEP), at, range),
              world,
              screen,
              undefined,
              floor,
            )
          : v,
      );
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [world, screen, range, floor]);

  const local = (e: React.PointerEvent): Point => {
    return pointIn(e, box.current!);
  };
  const restart = () => {
    const g = gesture.current;
    g.start = new Map(g.pointers);
    if (view) g.view = view;
  };

  const handlers = {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const g = gesture.current;
      if (e.pointerType === 'mouse') g.pointers.clear();
      if (g.pointers.size === 0) g.moved = false;
      g.pointers.set(e.pointerId, local(e));
      restart();
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const g = gesture.current;
      if (!g.pointers.has(e.pointerId) || !view) return;
      g.pointers.set(e.pointerId, local(e));
      markMoving();
      const ids = [...g.pointers.keys()];
      if (ids.length >= 2) {
        const [a, b] = ids as [number, number];
        g.moved = true;
        apply(
          pinch(
            g.view,
            g.start.get(a)!,
            g.start.get(b)!,
            g.pointers.get(a)!,
            g.pointers.get(b)!,
            range,
          ),
        );
        return;
      }
      const p = g.pointers.get(e.pointerId)!;
      const s = g.start.get(e.pointerId)!;
      if (!g.moved && Math.hypot(p.x - s.x, p.y - s.y) * stageFactor() < TAP) return;
      if (!g.moved) {
        g.moved = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
      }
      apply(pan(g.view, p.x - s.x, p.y - s.y));
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      gesture.current.pointers.delete(e.pointerId);
      restart();
    },
    onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
      gesture.current.pointers.delete(e.pointerId);
      restart();
    },
    // A drag ends with a click; it must not pick whoever the pointer was released over.
    onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
      if (!gesture.current.moved) return;
      e.stopPropagation();
      e.preventDefault();
      gesture.current.moved = false;
    },
  };

  return {
    box,
    view,
    screen,
    handlers,
    zoomBy: (f: number) => {
      if (view) apply(zoomAt(view, f, { x: screen.w / 2, y: screen.h / 2 }, range));
    },
    recentre: () => {
      if (screen.w) setView(fit(home(screen), screen));
    },
    show: (make: (screen: Size, now: View | null) => View) => {
      if (screen.w) apply(make(screen, view));
    },
  };
}
