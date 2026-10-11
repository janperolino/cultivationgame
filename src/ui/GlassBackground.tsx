import { useEffect, useRef } from 'react';
import { buildCracks, drawGlass, toHex } from './glass.ts';
import { useGame } from './store.ts';

/** The fine web's default weight; Settings changes it in P1.5. */
const WEB = 1;
const FLARE_MS = 1600;
/** The glass before any life is open. */
const IDLE_SEED = 7;

/** The cracked glass behind the shell. It flares and opens a new fracture at each breakthrough. */
export function GlassBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const seed = useGame((s) => s.game?.glass.seed ?? IDLE_SEED);
  const fractures = useGame((s) => s.game?.glass.fractures ?? 0);
  const flares = useGame((s) => s.game?.glass.flares ?? 0);
  const lastFlares = useRef<{ seed: number; flares: number } | null>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let glow = 1;

    const paint = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pw = Math.max(1, Math.round(w * dpr));
      const ph = Math.max(1, Math.round(h * dpr));
      if (el.width !== pw || el.height !== ph) {
        el.width = pw;
        el.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const css = getComputedStyle(document.documentElement);
      const color = toHex(ctx, css.getPropertyValue('--crack').trim());
      const background = css.getPropertyValue('--void').trim() || '#040507';
      drawGlass(ctx, w, h, background, buildCracks(w, h, { seed, web: WEB, fractures }), {
        glow,
        color,
      });
    };

    // A rise in the flare count on the same life is a breakthrough: flare, unless motion is reduced.
    const prev = lastFlares.current;
    lastFlares.current = { seed, flares };
    const flare = prev !== null && prev.seed === seed && flares > prev.flares;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (flare && !reduced) {
      const t0 = performance.now();
      const frame = (t: number) => {
        const p = Math.min(1, (t - t0) / FLARE_MS);
        glow = 1 + 3.2 * Math.sin(Math.PI * p) * (1 - p * 0.35);
        paint();
        if (p < 1) raf = requestAnimationFrame(frame);
        else glow = 1;
      };
      raf = requestAnimationFrame(frame);
    } else {
      paint();
    }

    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    };
    window.addEventListener('resize', onResize);
    void document.fonts?.ready.then(onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [seed, fractures, flares]);

  return <canvas ref={canvas} className="glass-canvas" aria-hidden="true" />;
}
