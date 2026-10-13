import { useEffect, useRef } from 'react';
import { seasonOf } from '../core/chronicle.ts';
import { SPELL_DAYS, weatherOn } from '../core/weather.ts';
import { buildCracks, drawGlass, toHex } from './glass.ts';
import { useScene } from './scene.ts';
import { reducedMotion, useSettings } from './settings.ts';
import { useGame } from './store.ts';

const FLARE_MS = 1600;
/** The glass before any life is open. */
const IDLE_SEED = 7;

/** The cracked glass behind the shell. It flares and opens a new fracture at each breakthrough. */
export function GlassBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const seed = useGame((s) => s.game?.glass.seed ?? IDLE_SEED);
  const fractures = useGame((s) => s.game?.glass.fractures ?? 0);
  const flares = useGame((s) => s.game?.glass.flares ?? 0);
  // The web and the crack light are the player's; a change repaints the glass.
  const web = useSettings((s) => s.web);
  const crack = useSettings((s) => s.crack);
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
      const color = toHex(ctx, crack || css.getPropertyValue('--crack').trim());
      const background = css.getPropertyValue('--void').trim() || '#040507';
      drawGlass(ctx, w, h, background, buildCracks(w, h, { seed, web, fractures }), {
        glow,
        color,
      });
    };

    // A rise in the flare count on the same life is a breakthrough: flare, unless motion is reduced.
    const prev = lastFlares.current;
    lastFlares.current = { seed, flares };
    const flare = prev !== null && prev.seed === seed && flares > prev.flares;
    const reduced = reducedMotion();
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
  }, [seed, fractures, flares, web, crack]);

  return (
    <>
      <canvas ref={canvas} className="glass-canvas" aria-hidden="true" />
      <GlassSky />
      <GlassDusk />
    </>
  );
}

/**
 * The glass darkens while a breakthrough scene winds up and races, so the figure is the only
 * light, and clears as it lands (P2.4). The fade is a CSS transition, cut under reduced motion.
 */
function GlassDusk() {
  const dark = useScene((s) => !!s.play && !s.play.outcome);
  return <div className={`glass-dusk${dark ? ' is-dark' : ''}`} aria-hidden="true" />;
}

/**
 * The season's tint and the day's weather over the glass, from the calendar: a faint wash of
 * colour per season, and rain, storm, mist, wind or snow running down the glass. Still under
 * reduced motion. Nothing shows before a life is open.
 */
function GlassSky() {
  const seed = useGame((s) => s.game?.glass.seed ?? null);
  // Read the calendar only to the spell, so the overlay re-renders a few times a season.
  const spell = useGame((s) => (s.game ? Math.floor(s.game.calendar.day / SPELL_DAYS) : null));
  if (seed === null || spell === null) return null;
  const day = spell * SPELL_DAYS;
  const weather = weatherOn(seed, day);
  return (
    <div
      className={`glass-sky season-${seasonOf(day)} weather-${weather}`}
      aria-hidden="true"
      data-weather={weather}
    />
  );
}
